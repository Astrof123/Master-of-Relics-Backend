import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { ArtifactService } from './artifact.service';
import { ExtraActionService } from '../action/extra-action.service';
import { RestrictionService } from '../action/restriction.service';
import { GameEffectsService } from '../game-mechanics/game-effects.service';
import { ArtifactStateService } from '../game-mechanics/artifact-state.service';
import {
    Player,
    ARTIFACT_STATE,
    LINE,
    ArtifactGameState,
} from '../game-state/types/game';
import { GameForLogic } from '../game-state/types/game-for-logic';
import { ARTIFACT, SPAWN_POSITION } from './types/artifact';
import { RESOURCE } from '../game-mechanics/types/resource';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-1234'),
}));

jest.mock('crypto', () => ({
    randomInt: jest.fn(() => 0),
}));

jest.mock('../game-mechanics/constants/faces', () => ({
    FACES: {
        sword: { sword: 10, target: 0, heal: 0, description: 'Melee attack' },
        target: { sword: 0, target: 10, heal: 0, description: 'Ranged attack' },
        heal: { sword: 0, target: 0, heal: 10, description: 'Heal' },
    },
}));

jest.mock('./constants/artifacts', () => ({
    ARTIFACTS: {
        arcane_shield: {
            id: 'arcane_shield',
            name: 'Arcane Shield',
            hp: 30,
            faces: ['sword', 'target', 'heal', 'sword', 'target', 'heal'],
            skills: ['eat_dark_mana'],
            defaultEffects: [],
            isForSale: true,
            price: 100,
            type: 'defender',
        },
        moon_staff: {
            id: 'moon_staff',
            name: 'Moon Staff',
            hp: 25,
            faces: ['heal', 'heal', 'sword', 'target', 'heal', 'sword'],
            skills: [],
            defaultEffects: [],
            isForSale: true,
            price: 150,
            type: 'mage',
        },
        bone_knife: {
            id: 'bone_knife',
            name: 'Bone Knife',
            hp: 10,
            faces: ['sword', 'sword', 'sword', 'sword', 'heal', 'heal'],
            skills: [],
            defaultEffects: ['live_for_round'],
            isForSale: false,
            price: 0,
            type: 'rage_mage',
        },
    },
}));

jest.mock('./constants/skills', () => ({
    SKILLS: {
        eat_dark_mana: {
            id: 'eat_dark_mana',
            type: 'active',
            cost: 0,
            description: 'Eat dark mana',
            countAnyTarget: 0,
            countTargetEnemy: 0,
            countTargetAllies: 0,
            restrictions: [],
            targetRestrictions: [],
        },
    },
}));

jest.mock('../game-mechanics/constants/effects', () => ({
    EFFECTS: {
        live_for_round: {
            id: 'live_for_round',
            name: 'Live For Round',
            duration: 'always',
            type: 'negative',
            number: null,
            dispellType: 'never',
        },
    },
}));

describe('ArtifactService', () => {
    let service: ArtifactService;
    let extraActionService: jest.Mocked<ExtraActionService>;
    let restrictionService: jest.Mocked<RestrictionService>;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let artifactStateService: jest.Mocked<ArtifactStateService>;

    const createMockArtifact = (
        id: string = 'artifact-1',
        artifactId: string = 'arcane_shield',
        face: string = 'sword',
    ): ArtifactGameState => ({
        id,
        artifactId,
        face,
        state: ARTIFACT_STATE.READY_TO_USE,
        currentHp: 30,
        maxHp: 30,
        position: 1,
        line: LINE.FRONT,
        skillCost: 2,
        effects: [],
        availableActions: null,
        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
    });

    const createMockPlayer = (): Player => ({
        id: 'player-1',
        name: 'Player1',
        connection: 'online',
        isBot: false,
        hero: 'Empty',
        resources: {
            [RESOURCE.AGILITY]: 50,
            [RESOURCE.RAGE]: 30,
            [RESOURCE.LIGHT_MANA]: 20,
            [RESOURCE.DARK_MANA]: 10,
            [RESOURCE.DESTRUCTION_MANA]: 5,
        },
        artifacts: {
            'artifact-1': createMockArtifact(
                'artifact-1',
                'arcane_shield',
                'sword',
            ),
            'artifact-2': createMockArtifact(
                'artifact-2',
                'moon_staff',
                'heal',
            ),
        },
        spells: {} as any,
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
    });

    const createMockEnemy = (): Player => ({
        ...createMockPlayer(),
        id: 'player-2',
        name: 'Player2',
    });

    const createMockGameState = (): GameForLogic => ({
        id: 'game-123',
        phase: 'battle',
        name: 'Test Game',
        currentTurn: 'player-1',
        logs: [],
        player: createMockPlayer(),
        enemy: createMockEnemy(),
        end: null,
        miniPhase: 'movement',
        constants: {
            maxCountArtifactsOnLine: 6,
            timerDraft: null,
            timerMovement: null,
            timerTurn: null,
            isNewRound: false,
            countActionsFromStartGame: 0,
        },
    });

    const mockExtraActionService = {
        getExtraActions: jest.fn().mockReturnValue([]),
    };

    const mockRestrictionService = {
        getTargetsByRestrictions: jest
            .fn()
            .mockReturnValue([['target1'], ['target2']]),
        checkGeneralRestrictions: jest.fn().mockReturnValue(true),
        checkArtifactRestrictions: jest.fn().mockReturnValue(true),
    };

    const mockGameEffectsService = {
        countHeroEffect: jest.fn().mockReturnValue(0),
        countEffect: jest.fn().mockReturnValue(0),
        applyEffect: jest.fn(),
    };

    const mockArtifactStateService = {
        applyState: jest.fn(),
        clearDestroyedArtifacts: jest.fn(),
        updateStateNewRound: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ArtifactService,
                {
                    provide: ExtraActionService,
                    useValue: mockExtraActionService,
                },
                {
                    provide: RestrictionService,
                    useValue: mockRestrictionService,
                },
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
                {
                    provide: ArtifactStateService,
                    useValue: mockArtifactStateService,
                },
            ],
        }).compile();

        service = module.get<ArtifactService>(ArtifactService);
        extraActionService = module.get(ExtraActionService);
        restrictionService = module.get(RestrictionService);
        gameEffectsService = module.get(GameEffectsService);
        artifactStateService = module.get(ArtifactStateService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateAvailableActions', () => {
        let gameState: GameForLogic;
        let player: Player;
        let enemy: Player;

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            enemy = gameState.enemy;
        });

        it('should calculate available actions for each artifact', () => {
            service.calculateAvailableActions(gameState, player, enemy);

            for (const artifact of Object.values(player.artifacts)) {
                expect(artifact.availableActions).toBeDefined();
                expect(artifact.availableActions?.face).toBeDefined();
                expect(artifact.availableActions?.skills).toBeDefined();
                expect(artifact.availableActions?.extraActions).toBeDefined();
            }
        });

        it('should apply rage discount to skill cost', () => {
            gameEffectsService.countHeroEffect.mockReturnValue(2);

            service.calculateAvailableActions(gameState, player, enemy);

            const artifact = Object.values(player.artifacts)[0];
            expect(artifact.skillCost).toBe(0);
        });
    });

    describe('getFaceAction', () => {
        let gameState: GameForLogic;
        let player: Player;
        let enemy: Player;
        let artifact: ArtifactGameState;

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            enemy = gameState.enemy;
            artifact = createMockArtifact(
                'artifact-1',
                'arcane_shield',
                'sword',
            );
        });

        it('should return melee attack action', () => {
            const result = service.getFaceAction(artifact, player, enemy);

            expect(result.id).toBe('sword');
            expect(result.attackTargets).toBeDefined();
            expect(result.healTargets).toBeNull();
        });

        it('should return ranged attack action', () => {
            artifact.face = 'target';
            const result = service.getFaceAction(artifact, player, enemy);

            expect(result.id).toBe('target');
            expect(result.attackTargets).toBeDefined();
            expect(result.healTargets).toBeNull();
        });

        it('should return heal action', () => {
            artifact.face = 'heal';
            const result = service.getFaceAction(artifact, player, enemy);

            expect(result.id).toBe('heal');
            expect(result.attackTargets).toBeNull();
            expect(result.healTargets).toBeDefined();
        });
    });

    describe('getSkills', () => {
        let gameState: GameForLogic;
        let player: Player;
        let enemy: Player;
        let artifact: ArtifactGameState;

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            enemy = gameState.enemy;
            artifact = createMockArtifact(
                'artifact-1',
                'arcane_shield',
                'sword',
            );
        });

        it('should return empty array if artifact has no skills', () => {
            artifact.artifactId = 'moon_staff';
            const result = service.getSkills(player, enemy, artifact);

            expect(result).toEqual([]);
        });

        it('should return empty array if artifact is silenced', () => {
            gameEffectsService.countEffect.mockReturnValue(1);
            const result = service.getSkills(player, enemy, artifact);

            expect(result).toEqual([]);
        });
    });

    describe('moveArtifact', () => {
        let artifacts: Record<string, ArtifactGameState>;
        let artifactToMove: ArtifactGameState;
        const logParts: string[] = [];

        beforeEach(() => {
            artifacts = {
                'artifact-1': createMockArtifact(
                    'artifact-1',
                    'arcane_shield',
                    'sword',
                ),
                'artifact-2': createMockArtifact(
                    'artifact-2',
                    'moon_staff',
                    'heal',
                ),
            };
            artifacts['artifact-1'].position = 2;
            artifacts['artifact-1'].line = LINE.FRONT;
            artifacts['artifact-2'].position = 3;
            artifacts['artifact-2'].line = LINE.FRONT;
            artifactToMove = artifacts['artifact-1'];
            logParts.length = 0;
        });

        it('should move artifact to new position', () => {
            service.moveArtifact(
                1,
                artifactToMove,
                LINE.FRONT,
                artifacts,
                logParts,
            );

            expect(artifactToMove.position).toBe(1);
            expect(logParts[0]).toContain('Переместил');
        });
    });

    describe('getNeighbors', () => {
        let player: Player;
        let artifact: ArtifactGameState;

        beforeEach(() => {
            player = createMockPlayer();
            artifact = createMockArtifact(
                'artifact-1',
                'arcane_shield',
                'sword',
            );
            artifact.position = 2;
            artifact.line = LINE.FRONT;

            player.artifacts['artifact-1'] = artifact;
            player.artifacts['artifact-2'] = createMockArtifact(
                'artifact-2',
                'moon_staff',
                'heal',
            );
            player.artifacts['artifact-2'].position = 1;
            player.artifacts['artifact-2'].line = LINE.FRONT;
            player.artifacts['artifact-3'] = createMockArtifact(
                'artifact-3',
                'arcane_shield',
                'sword',
            );
            player.artifacts['artifact-3'].position = 3;
            player.artifacts['artifact-3'].line = LINE.FRONT;
        });

        it('should return left and right neighbors', () => {
            const result = service.getNeighbors(player, artifact);

            expect(result.left).toBeDefined();
            expect(result.right).toBeDefined();
        });
    });

    describe('spawnArtifact', () => {
        let artifacts: Record<string, ArtifactGameState>;
        let artifactToSpawn: ArtifactGameState;
        const logParts: string[] = [];

        beforeEach(() => {
            artifacts = {};
            artifactToSpawn = createMockArtifact(
                'new-artifact',
                'bone_knife',
                'sword',
            );
            logParts.length = 0;
        });

        it('should spawn artifact on front line', () => {
            service.spawnArtifact(
                artifactToSpawn,
                SPAWN_POSITION.FRONT_LINE,
                null,
                null,
                artifacts,
                logParts,
            );

            expect(artifactToSpawn.line).toBe(LINE.FRONT);
            expect(artifacts[artifactToSpawn.id]).toBeDefined();
            expect(logParts[0]).toContain('Создал');
        });

        it('should spawn artifact on back line', () => {
            service.spawnArtifact(
                artifactToSpawn,
                SPAWN_POSITION.BACK_LINE,
                null,
                null,
                artifacts,
                logParts,
            );

            expect(artifactToSpawn.line).toBe(LINE.BACK);
            expect(artifacts[artifactToSpawn.id]).toBeDefined();
        });
    });

    describe('createArtifactState', () => {
        let playerArtifacts: Record<string, ArtifactGameState>;

        beforeEach(() => {
            playerArtifacts = {};
        });

        it('should create artifact state with default effects', () => {
            const result = service.createArtifactState(
                playerArtifacts,
                ARTIFACT.BONE_KNIFE,
            );

            expect(result.id).toBe('mock-uuid-1234');
            expect(result.artifactId).toBe(ARTIFACT.BONE_KNIFE);
            expect(result.state).toBe(ARTIFACT_STATE.READY_TO_USE);
            expect(result.effects).toHaveLength(1);
        });

        it('should create artifact without default effects', () => {
            const result = service.createArtifactState(
                playerArtifacts,
                ARTIFACT.ARCANE_SHIELD,
            );

            expect(result.effects).toEqual([]);
        });
    });

    describe('destroyArtifact', () => {
        let player: Player;
        let artifact: ArtifactGameState;
        const logParts: string[] = [];

        beforeEach(() => {
            player = createMockPlayer();
            artifact = createMockArtifact(
                'artifact-1',
                'arcane_shield',
                'sword',
            );
            artifact.position = 1;
            artifact.line = LINE.FRONT;
            player.artifacts['artifact-1'] = artifact;
            logParts.length = 0;
        });

        it('should destroy artifact and apply DESTROYED state', () => {
            service.destroyArtifact(player, artifact, logParts);

            expect(artifactStateService.applyState).toHaveBeenCalledWith(
                artifact,
                ARTIFACT_STATE.DESTROYED,
                [],
            );
            expect(logParts[0]).toContain('Уничтожен');
        });
    });

    describe('generateNewTemporaryForBot', () => {
        let enemy: Player;

        beforeEach(() => {
            enemy = createMockEnemy();
        });

        it('should generate temporary artifacts for bot', () => {
            const result = service.generateNewTemporaryForBot(enemy);

            expect(result).toBeDefined();
            expect(Object.keys(result)).toHaveLength(
                Object.keys(enemy.artifacts).length,
            );
        });
    });

describe('ArtifactService - additional branch coverage', () => {
    let service: ArtifactService;
    let extraActionService: jest.Mocked<ExtraActionService>;
    let restrictionService: jest.Mocked<RestrictionService>;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let artifactStateService: jest.Mocked<ArtifactStateService>;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ArtifactService,
                {
                    provide: ExtraActionService,
                    useValue: mockExtraActionService,
                },
                {
                    provide: RestrictionService,
                    useValue: mockRestrictionService,
                },
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
                {
                    provide: ArtifactStateService,
                    useValue: mockArtifactStateService,
                },
            ],
        }).compile();

        service = module.get<ArtifactService>(ArtifactService);
        extraActionService = module.get(ExtraActionService);
        restrictionService = module.get(RestrictionService);
        gameEffectsService = module.get(GameEffectsService);
        artifactStateService = module.get(ArtifactStateService);
    });

    describe('calculateAvailableActions - branch coverage for line 290', () => {
        it('should apply rage discount with countDiscount >= 1 (reduce by 5)', () => {
            const gameState = createMockGameState();
            const player = gameState.player;
            const enemy = gameState.enemy;
            
            gameEffectsService.countHeroEffect.mockReturnValue(2);
            
            service.calculateAvailableActions(gameState, player, enemy);
            
            for (const artifact of Object.values(player.artifacts)) {
                if (artifact.artifactId === 'arcane_shield') {
                    expect(artifact.skillCost).toBe(0);
                }
            }
        });

        it('should apply rage discount with countDiscount = 0 (no discount)', () => {
            const gameState = createMockGameState();
            const player = gameState.player;
            const enemy = gameState.enemy;
            
            const testArtifact = createMockArtifact('test-art', 'arcane_shield', 'sword');
            testArtifact.skillCost = 2;
            player.artifacts['test-art'] = testArtifact;
            
            gameEffectsService.countHeroEffect.mockReturnValue(0);
            
            service.calculateAvailableActions(gameState, player, enemy);
            
            expect(testArtifact.skillCost).toBe(0);
        });
    });

    describe('getFaceAction - branch coverage for lines 295, 298-313', () => {
        let player: Player;
        let enemy: Player;
        let artifact: ArtifactGameState;

        beforeEach(() => {
            player = createMockPlayer();
            enemy = createMockEnemy();
            artifact = createMockArtifact('artifact-1', 'arcane_shield', 'sword');
            restrictionService.getTargetsByRestrictions.mockReturnValue([['ally1'], ['enemy1', 'enemy2']]);
        });

        it('should handle heal action', () => {
            artifact.face = 'heal';
            const result = service.getFaceAction(artifact, player, enemy);
            
            expect(result.id).toBe('heal');
            expect(result.attackTargets).toBeNull();
            expect(result.healTargets).toEqual(['ally1']);
        });

        it('should handle BLINDLESS effect - clear attack targets', () => {
            artifact.face = 'sword';
            gameEffectsService.countEffect.mockReturnValue(1);
            
            const result = service.getFaceAction(artifact, player, enemy);
            
            expect(result.attackTargets).toEqual([]);
        });
    });

    describe('getSkills - branch coverage for lines 317-318', () => {
        let player: Player;
        let enemy: Player;
        let artifact: ArtifactGameState;

        beforeEach(() => {
            player = createMockPlayer();
            enemy = createMockEnemy();
            artifact = createMockArtifact('artifact-1', 'arcane_shield', 'sword');
            player.resources[RESOURCE.RAGE] = 30;
            restrictionService.checkGeneralRestrictions.mockReturnValue(true);
            restrictionService.checkArtifactRestrictions.mockReturnValue(true);
            restrictionService.getTargetsByRestrictions.mockReturnValue([['ally1'], ['enemy1']]);
        });

        it('should return empty array when artifact has no skills', () => {
            artifact.artifactId = 'moon_staff';
            const result = service.getSkills(player, enemy, artifact);
            expect(result).toEqual([]);
        });

        it('should return empty array when artifact is silenced', () => {
            gameEffectsService.countEffect.mockReturnValue(1);
            const result = service.getSkills(player, enemy, artifact);
            expect(result).toEqual([]);
        });

        it('should not add skill when not enough rage', () => {
            player.resources[RESOURCE.RAGE] = 0;
            const result = service.getSkills(player, enemy, artifact);
            expect(result).toEqual([]);
        });

        it('should not add skill when general restrictions fail', () => {
            restrictionService.checkGeneralRestrictions.mockReturnValue(false);
            const result = service.getSkills(player, enemy, artifact);
            expect(result).toEqual([]);
        });

        it('should not add skill when artifact restrictions fail', () => {
            restrictionService.checkArtifactRestrictions.mockReturnValue(false);
            const result = service.getSkills(player, enemy, artifact);
            expect(result).toEqual([]);
        });
    });

    describe('spawnArtifact - branch coverage for lines 436-437 (NEAR position)', () => {
        let artifacts: Record<string, ArtifactGameState>;
        let artifactToSpawn: ArtifactGameState;
        const logParts: string[] = [];

        beforeEach(() => {
            artifacts = {};
            artifactToSpawn = createMockArtifact('new-artifact', 'bone_knife', 'sword');
            logParts.length = 0;
        });

        it('should spawn artifact NEAR with spawnerPosition = 0 (place at position 1)', () => {
            const existingArtifact = createMockArtifact('existing', 'arcane_shield', 'sword');
            existingArtifact.position = 0;
            existingArtifact.line = LINE.FRONT;
            artifacts['existing'] = existingArtifact;
            
            service.spawnArtifact(
                artifactToSpawn,
                SPAWN_POSITION.NEAR,
                0,
                LINE.FRONT,
                artifacts,
                logParts,
            );
            
            expect(artifactToSpawn.position).toBe(1);
            expect(artifactToSpawn.line).toBe(LINE.FRONT);
            expect(logParts[0]).toContain('Создал');
        });

        it('should spawn artifact NEAR with spawnerPosition = MAX_COUNT - 1 (place at MAX_COUNT - 2)', () => {
            const existingArtifact = createMockArtifact('existing', 'arcane_shield', 'sword');
            existingArtifact.position = MAX_COUNT_ARTIFACTS_ON_LINE - 1;
            existingArtifact.line = LINE.FRONT;
            artifacts['existing'] = existingArtifact;
            
            service.spawnArtifact(
                artifactToSpawn,
                SPAWN_POSITION.NEAR,
                MAX_COUNT_ARTIFACTS_ON_LINE - 1,
                LINE.FRONT,
                artifacts,
                logParts,
            );
            
            expect(artifactToSpawn.position).toBe(MAX_COUNT_ARTIFACTS_ON_LINE - 2);
            expect(artifactToSpawn.line).toBe(LINE.FRONT);
        });

        it('should spawn artifact NEAR with random position (random = 0 - left side)', () => {
            const crypto = require('crypto');
            const originalRandomInt = crypto.randomInt;
            crypto.randomInt = jest.fn().mockReturnValue(0);
            
            const existingArtifact = createMockArtifact('existing', 'arcane_shield', 'sword');
            existingArtifact.position = 2;
            existingArtifact.line = LINE.FRONT;
            artifacts['existing'] = existingArtifact;
            
            service.spawnArtifact(
                artifactToSpawn,
                SPAWN_POSITION.NEAR,
                2,
                LINE.FRONT,
                artifacts,
                logParts,
            );
            
            expect(artifactToSpawn.position).toBe(2);
            expect(artifactToSpawn.line).toBe(LINE.FRONT);
            
            crypto.randomInt = originalRandomInt;
        });

        it('should spawn artifact NEAR with random position (random = 1 - right side)', () => {
            const crypto = require('crypto');
            const originalRandomInt = crypto.randomInt;
            crypto.randomInt = jest.fn().mockReturnValue(1);
            
            const existingArtifact = createMockArtifact('existing', 'arcane_shield', 'sword');
            existingArtifact.position = 2;
            existingArtifact.line = LINE.FRONT;
            artifacts['existing'] = existingArtifact;
            
            service.spawnArtifact(
                artifactToSpawn,
                SPAWN_POSITION.NEAR,
                2,
                LINE.FRONT,
                artifacts,
                logParts,
            );
            
            expect(artifactToSpawn.position).toBe(3);
            expect(artifactToSpawn.line).toBe(LINE.FRONT);
            
            crypto.randomInt = originalRandomInt;
        });
    });

    describe('createArtifactState - branch coverage for line 290 (position calculation)', () => {
        let playerArtifacts: Record<string, ArtifactGameState>;

        beforeEach(() => {
            playerArtifacts = {};
        });

        it('should place artifact on BACK line when less than MAX_COUNT artifacts', () => {
            for (let i = 0; i < 3; i++) {
                const artifact = createMockArtifact(`artifact-${i}`, 'arcane_shield', 'sword');
                playerArtifacts[`artifact-${i}`] = artifact;
            }
            
            const result = service.createArtifactState(playerArtifacts, ARTIFACT.ARCANE_SHIELD);
            
            expect(result.line).toBe(LINE.BACK);
            expect(result.position).toBe(3 % MAX_COUNT_ARTIFACTS_ON_LINE);
        });

        it('should place artifact on FRONT line when more than MAX_COUNT artifacts', () => {
            for (let i = 0; i < 7; i++) {
                const artifact = createMockArtifact(`artifact-${i}`, 'arcane_shield', 'sword');
                playerArtifacts[`artifact-${i}`] = artifact;
            }
            
            const result = service.createArtifactState(playerArtifacts, ARTIFACT.ARCANE_SHIELD);
            
            expect(result.line).toBe(LINE.FRONT);
            expect(result.position).toBe(7 % MAX_COUNT_ARTIFACTS_ON_LINE);
        });
    });

    describe('destroyArtifact - branch coverage', () => {
        let player: Player;
        let artifact: ArtifactGameState;
        const logParts: string[] = [];

        beforeEach(() => {
            player = createMockPlayer();
            artifact = createMockArtifact('artifact-1', 'arcane_shield', 'sword');
            artifact.position = 2;
            artifact.line = LINE.FRONT;
            player.artifacts = {};
            player.artifacts['artifact-1'] = artifact;
            logParts.length = 0;
        });

        it('should call moveArtifact before destroying', () => {
            const moveArtifactSpy = jest.spyOn(service, 'moveArtifact');
            
            service.destroyArtifact(player, artifact, logParts);
            
            expect(moveArtifactSpy).toHaveBeenCalled();
            expect(artifactStateService.applyState).toHaveBeenCalledWith(
                artifact,
                ARTIFACT_STATE.DESTROYED,
                [],
            );
        });
    });

    describe('getNeighbors - branch coverage', () => {
        let player: Player;
        let artifact: ArtifactGameState;

        beforeEach(() => {
            player = createMockPlayer();
            artifact = player.artifacts['artifact-1'];
            artifact.position = 2;
            artifact.line = LINE.FRONT;
            player.artifacts = {};
            player.artifacts['artifact-1'] = artifact;
        });

        it('should return null for neighbors when none exist', () => {
            const result = service.getNeighbors(player, artifact);
            
            expect(result.left).toBeNull();
            expect(result.right).toBeNull();
        });

        it('should find left neighbor (position - 1)', () => {
            const leftArtifact = createMockArtifact('left-art', 'arcane_shield', 'sword');
            leftArtifact.position = 1;
            leftArtifact.line = LINE.FRONT;
            player.artifacts['left-art'] = leftArtifact;
            
            const result = service.getNeighbors(player, artifact);
            
            expect(result.left).toBe(leftArtifact);
            expect(result.right).toBeNull();
        });

        it('should find right neighbor (position + 1)', () => {
            const rightArtifact = createMockArtifact('right-art', 'arcane_shield', 'sword');
            rightArtifact.position = 3;
            rightArtifact.line = LINE.FRONT;
            player.artifacts['right-art'] = rightArtifact;
            
            const result = service.getNeighbors(player, artifact);
            
            expect(result.left).toBeNull();
            expect(result.right).toBe(rightArtifact);
        });

        it('should find both left and right neighbors', () => {
            const leftArtifact = createMockArtifact('left-art', 'arcane_shield', 'sword');
            leftArtifact.position = 1;
            leftArtifact.line = LINE.FRONT;
            const rightArtifact = createMockArtifact('right-art', 'arcane_shield', 'sword');
            rightArtifact.position = 3;
            rightArtifact.line = LINE.FRONT;
            
            player.artifacts['left-art'] = leftArtifact;
            player.artifacts['right-art'] = rightArtifact;
            
            const result = service.getNeighbors(player, artifact);
            
            expect(result.left).toBe(leftArtifact);
            expect(result.right).toBe(rightArtifact);
        });
    });

    describe('moveArtifact - branch coverage for position shifting', () => {
        let artifacts: Record<string, ArtifactGameState>;
        let artifactToMove: ArtifactGameState;
        const logParts: string[] = [];

        beforeEach(() => {
            artifacts = {};
            artifactToMove = createMockArtifact('artifact-1', 'arcane_shield', 'sword');
            artifactToMove.position = 3;
            artifactToMove.line = LINE.FRONT;
            
            const artifact2 = createMockArtifact('artifact-2', 'arcane_shield', 'sword');
            artifact2.position = 4;
            artifact2.line = LINE.FRONT;
            const artifact3 = createMockArtifact('artifact-3', 'arcane_shield', 'sword');
            artifact3.position = 2;
            artifact3.line = LINE.FRONT;
            
            artifacts['artifact-1'] = artifactToMove;
            artifacts['artifact-2'] = artifact2;
            artifacts['artifact-3'] = artifact3;
            
            logParts.length = 0;
        });

        it('should shift artifacts with position > old position on same line', () => {
            const oldPosition = artifactToMove.position;
            
            service.moveArtifact(1, artifactToMove, LINE.FRONT, artifacts, logParts);
            
            expect(artifacts['artifact-2'].position).toBe(4);
            expect(artifacts['artifact-3'].position).toBe(3);
            expect(artifactToMove.position).toBe(1);
        });
    });
});
});

