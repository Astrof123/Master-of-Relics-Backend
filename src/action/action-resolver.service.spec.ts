// action-resolver.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { ActionResolverService } from './action-resolver.service';
import { ResourceService } from '../game-mechanics/resource.service';
import { CombatService } from '../game-mechanics/combat.service';
import { ArtifactStateService } from '../game-mechanics/artifact-state.service';
import { PhaseService } from '../phase/phase.service';
import { SkillsStrategyFactory } from '../artifact/skills.factory';
import { SpellStrategyFactory } from '../spell/spell.factory';
import { ExtraActionService } from './extra-action.service';
import { GameTimerService } from '../game-state/game-timer.service';
import { GameEffectsService } from '../game-mechanics/game-effects.service';
import { ArtifactService } from '../artifact/artifact.service';
import {
    Player,
    ArtifactGameState,
    ARTIFACT_STATE,
    ArtifactAvailableActions,
    SpellGameState,
} from '../game-state/types/game';
import {
    UseFaceData,
    UseSkillData,
    UseSpellData,
    ExtraActionData,
    ToggleReadyMovementData,
} from './types/action-evens-data';
import { MINIPHASE } from '../game-state/types/phase';
import { RESOURCE } from '../game-mechanics/types/resource';
import { DAMAGE } from '../game-mechanics/types/combat';
import { ANIMATION, AnimationData } from './types/animation';
import { LOG_TYPE } from './types/log';
import { EXTRA_ACTION } from './types/action';
import { SKILL } from '../artifact/types/skill';
import { SPELL } from '../spell/types/spell';
import { FACES } from '../game-mechanics/constants/faces';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

// Mock FACES
jest.mock('../game-mechanics/constants/faces', () => ({
    FACES: {
        sword: {
            sword: 10,
            target: 0,
            heal: 0,
            description: 'Melee attack',
            agility: 0,
            rage: 0,
            light_mana: 0,
            dark_mana: 0,
            destruction_mana: 0,
        },
        heal: {
            sword: 0,
            target: 0,
            heal: 10,
            description: 'Heal',
            agility: 0,
            rage: 0,
            light_mana: 0,
            dark_mana: 0,
            destruction_mana: 0,
        },
    },
}));

// Mock ARTIFACTS
jest.mock('../artifact/constants/artifacts', () => ({
    ARTIFACTS: {
        arcane_shield: { id: 'arcane_shield', name: 'Arcane Shield' },
        moon_staff: { id: 'moon_staff', name: 'Moon Staff' },
    },
}));

// Mock SKILLS
jest.mock('../artifact/constants/skills', () => ({
    SKILLS: {
        fear: { cost: 15 },
    },
}));

// Mock SPELLS
jest.mock('../spell/constants/spells', () => ({
    SPELLS: {
        piercing_bolt: { name: 'Piercing Bolt', type: 'destruction', cost: 15 },
    },
}));

// Mock SpellHelper
jest.mock('../spell/spell.helper', () => ({
    SpellHelper: {
        getResource: jest.fn(() => 'destruction_mana'),
    },
}));

describe('ActionResolverService', () => {
    let service: ActionResolverService;
    let resourceService: jest.Mocked<ResourceService>;
    let combatService: jest.Mocked<CombatService>;
    let artifactStateService: jest.Mocked<ArtifactStateService>;
    let phaseService: jest.Mocked<PhaseService>;
    let skillsFactory: jest.Mocked<SkillsStrategyFactory>;
    let spellsFactory: jest.Mocked<SpellStrategyFactory>;
    let extraActionService: jest.Mocked<ExtraActionService>;
    let gameTimerService: jest.Mocked<GameTimerService>;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let artifactServiceMock: jest.Mocked<ArtifactService>;

    const createMockFace = (): {
        id: string;
        description: string;
        attackTargets: string[] | null;
        healTargets: string[] | null;
    } => ({
        id: 'sword',
        description: 'Melee attack',
        attackTargets: ['enemy-artifact'],
        healTargets: null,
    });

    const createMockAvailableActions = (): ArtifactAvailableActions => ({
        face: createMockFace(),
        skills: [],
        extraActions: [],
    });

    const createMockArtifact = (
        id: string = 'artifact-1',
        artifactId: string = 'arcane_shield',
        face: string = 'sword',
    ): ArtifactGameState => ({
        id,
        artifactId,
        face: face as any,
        state: ARTIFACT_STATE.READY_TO_USE,
        currentHp: 30,
        maxHp: 30,
        position: 1,
        line: 'front',
        skillCost: 2,
        effects: [],
        availableActions: createMockAvailableActions(),
        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
    });

    const createMockSpellState = (): SpellGameState => ({
        id: 'piercing_bolt',
        description: 'Piercing Bolt',
        cost: 15,
        cooldown: false,
        canUse: true,
        possibleTargets: [[], []],
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
    });

    const createMockPlayer = (
        id: string = 'player-1',
        name: string = 'Player1',
    ): Player => ({
        id,
        name,
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
            'artifact-1': createMockArtifact('artifact-1'),
            'enemy-artifact': createMockArtifact('enemy-artifact'),
        },
        spells: {
            light: {},
            dark: {},
            destruction: {
                piercing_bolt: createMockSpellState(),
            },
        },
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
    });

    const createMockGameState = (): GameForLogic => ({
        id: 'game-123',
        phase: 'battle',
        name: 'Test Game',
        currentTurn: 'player-1',
        logs: [],
        player: createMockPlayer('player-1', 'Player1'),
        enemy: createMockPlayer('player-2', 'Player2'),
        end: null,
        miniPhase: MINIPHASE.MOVEMENT,
        constants: {
            maxCountArtifactsOnLine: 6,
            timerDraft: null,
            timerMovement: null,
            timerTurn: null,
            isNewRound: false,
            countActionsFromStartGame: 0,
        },
    });

    const mockResourceService = {
        addResource: jest.fn(),
        decreaseResource: jest.fn(),
        calculateNewTurnMovePoints: jest.fn().mockReturnValue(3),
    };

    const mockCombatService = {
        calculateFaceDamage: jest.fn().mockReturnValue(25),
        applyDamage: jest.fn(),
        calculateFaceHeal: jest.fn().mockReturnValue(15),
        applyHealing: jest.fn(),
    };

    const mockArtifactStateService = {
        applyState: jest.fn(),
    };

    const mockPhaseService = {
        calculateNewState: jest.fn(),
        setEndGame: jest.fn(),
        newRound: jest.fn(),
    };

    const mockSkillsFactory = {
        getStrategy: jest.fn(),
    };

    const mockSpellsFactory = {
        getStrategy: jest.fn(),
    };

    const mockExtraActionService = {
        getHandler: jest.fn(),
    };

    const mockGameTimerService = {
        stopAllTimers: jest.fn(),
    };

    const mockGameEffectsService = {
        countHeroEffect: jest.fn().mockReturnValue(0),
        removeHeroEffect: jest.fn(),
        countEffect: jest.fn().mockReturnValue(0),
    };

    const mockArtifactService = {
        generateNewTemporaryForBot: jest.fn().mockReturnValue({}),
    };

    const mockStrategy = {
        execute: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        mockSkillsFactory.getStrategy.mockReturnValue(mockStrategy);
        mockSpellsFactory.getStrategy.mockReturnValue(mockStrategy);
        mockExtraActionService.getHandler.mockReturnValue(jest.fn());

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionResolverService,
                {
                    provide: ResourceService,
                    useValue: mockResourceService,
                },
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
                {
                    provide: ArtifactStateService,
                    useValue: mockArtifactStateService,
                },
                {
                    provide: PhaseService,
                    useValue: mockPhaseService,
                },
                {
                    provide: SkillsStrategyFactory,
                    useValue: mockSkillsFactory,
                },
                {
                    provide: SpellStrategyFactory,
                    useValue: mockSpellsFactory,
                },
                {
                    provide: ExtraActionService,
                    useValue: mockExtraActionService,
                },
                {
                    provide: GameTimerService,
                    useValue: mockGameTimerService,
                },
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
                {
                    provide: ArtifactService,
                    useValue: mockArtifactService,
                },
            ],
        }).compile();

        service = module.get<ActionResolverService>(ActionResolverService);
        resourceService = module.get(ResourceService);
        combatService = module.get(CombatService);
        artifactStateService = module.get(ArtifactStateService);
        phaseService = module.get(PhaseService);
        skillsFactory = module.get(SkillsStrategyFactory);
        spellsFactory = module.get(SpellStrategyFactory);
        extraActionService = module.get(ExtraActionService);
        gameTimerService = module.get(GameTimerService);
        gameEffectsService = module.get(GameEffectsService);
        artifactServiceMock = module.get(ArtifactService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('useFaceResolve', () => {
        let gameState: GameForLogic;
        let player: Player;
        let artifact: ArtifactGameState;
        let data: UseFaceData;
        let animations: AnimationData[];

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            artifact = player.artifacts['artifact-1'];
            data = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                attackTarget: 'enemy-artifact',
                healTarget: null,
            };
            animations = [];
        });

        it('should resolve use face with attack', () => {
            service.useFaceResolve(
                gameState,
                player,
                artifact,
                data,
                animations,
            );

            expect(combatService.calculateFaceDamage).toHaveBeenCalled();
            expect(combatService.applyDamage).toHaveBeenCalled();
            expect(animations[0]).toEqual({
                playerId: gameState.enemy.id,
                artifactGameId: 'enemy-artifact',
                animation: ANIMATION.HIT,
                value: 25,
            });
            expect(player.movePoints).toBe(0);
            expect(artifactStateService.applyState).toHaveBeenCalledWith(
                artifact,
                ARTIFACT_STATE.COOLDOWN,
                [],
            );
        });

        it('should resolve use face with heal', () => {
            data.attackTarget = null;
            data.healTarget = 'artifact-1';
            artifact.availableActions!.face = {
                id: 'heal',
                description: 'Heal',
                attackTargets: null,
                healTargets: ['artifact-1'],
            };
            artifact.face = 'heal' as any;

            service.useFaceResolve(
                gameState,
                player,
                artifact,
                data,
                animations,
            );

            expect(combatService.calculateFaceHeal).toHaveBeenCalled();
            expect(combatService.applyHealing).toHaveBeenCalled();
            expect(animations[0]).toEqual({
                playerId: player.id,
                artifactGameId: 'artifact-1',
                animation: ANIMATION.HEAL,
                value: 15,
            });
        });
    });

    describe('endTurnResolve', () => {
        let gameState: GameForLogic;
        let player: Player;

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            gameState.enemy.isReady = false;
        });

        it('should switch turn to enemy if enemy is not ready', async () => {
            await service.endTurnResolve(gameState, player);

            expect(gameState.currentTurn).toBe(gameState.enemy.id);
            expect(gameState.logs[0].text).toContain('закончил ход');
        });

        it('should keep current turn to player if enemy is ready', async () => {
            gameState.enemy.isReady = true;
            await service.endTurnResolve(gameState, player);

            expect(gameState.currentTurn).toBe(player.id);
        });
    });

    describe('giveUpResolve', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
        });

        it('should resolve give up', async () => {
            await service.giveUpResolve(gameState);

            expect(gameState.logs[0].text).toContain('сдался');
            expect(phaseService.setEndGame).toHaveBeenCalledWith(
                gameState,
                gameState.enemy.id,
            );
            expect(gameTimerService.stopAllTimers).toHaveBeenCalledWith(
                gameState.id,
            );
        });
    });

    describe('autoGiveUpResolve', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
        });

        it('should resolve auto give up', async () => {
            await service.autoGiveUpResolve(gameState);

            expect(gameState.logs[0].text).toContain(
                'проиграл из-за пропуска ходов',
            );
            expect(phaseService.setEndGame).toHaveBeenCalledWith(
                gameState,
                gameState.enemy.id,
            );
            expect(gameTimerService.stopAllTimers).toHaveBeenCalledWith(
                gameState.id,
            );
        });
    });

    describe('cancelDrawResolve', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
            gameState.player.offerDraw = true;
            gameState.enemy.offerDraw = true;
        });

        it('should cancel draw', async () => {
            await service.cancelDrawResolve(gameState);

            expect(gameState.logs[0].text).toContain('отменил ничью');
            expect(gameState.player.offerDraw).toBe(false);
            expect(gameState.enemy.offerDraw).toBe(false);
        });
    });

    describe('offerDrawResolve', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
        });

        it('should offer draw', async () => {
            await service.offerDrawResolve(gameState);

            expect(gameState.logs[0].text).toContain('предложил ничью');
            expect(gameState.player.offerDraw).toBe(true);
        });

        it('should end game if enemy also offered draw', async () => {
            gameState.enemy.offerDraw = true;
            await service.offerDrawResolve(gameState);

            expect(phaseService.setEndGame).toHaveBeenCalledWith(
                gameState,
                null,
            );
        });
    });

    describe('useSkillResolve', () => {
        let gameState: GameForLogic;
        let player: Player;
        let artifact: ArtifactGameState;
        let data: UseSkillData;
        let animations: AnimationData[];

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            artifact = player.artifacts['artifact-1'];
            data = {
                skillId: SKILL.FEAR,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
        });

        it('should resolve use skill', () => {
            service.useSkillResolve(
                gameState,
                player,
                artifact,
                data,
                animations,
            );

            expect(skillsFactory.getStrategy).toHaveBeenCalledWith(SKILL.FEAR);
            expect(mockStrategy.execute).toHaveBeenCalled();
            expect(resourceService.decreaseResource).toHaveBeenCalledWith(
                player,
                RESOURCE.RAGE,
                artifact.skillCost,
                expect.any(Array),
            );
            expect(player.movePoints).toBe(0);
        });
    });

    describe('endRoundResolve', () => {
        let gameState: GameForLogic;
        let player: Player;

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
        });

        it('should end round', async () => {
            await service.endRoundResolve(gameState, player);

            expect(player.isReady).toBe(true);
            expect(gameState.logs[1].text).toContain('закончил раунд');
        });

        it('should start new round if enemy is ready', async () => {
            gameState.enemy.isReady = true;
            await service.endRoundResolve(gameState, player);

            expect(phaseService.newRound).toHaveBeenCalledWith(gameState);
        });

        it('should start new round if enemy is bot', async () => {
            gameState.enemy.isBot = true;
            await service.endRoundResolve(gameState, player);

            expect(phaseService.newRound).toHaveBeenCalledWith(gameState);
        });
    });

    describe('extraActionResolve', () => {
        let gameState: GameForLogic;
        let artifact: ArtifactGameState;
        let data: ExtraActionData;
        let animations: AnimationData[];
        let mockHandler: jest.Mock;

        beforeEach(() => {
            gameState = createMockGameState();
            artifact = gameState.player.artifacts['artifact-1'];
            data = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                type: EXTRA_ACTION.THROW_DICE,
                details: null,
            };
            animations = [];
            mockHandler = jest.fn();
            mockExtraActionService.getHandler.mockReturnValue(mockHandler);
        });

        it('should resolve extra action', () => {
            service.extraActionResolve(gameState, artifact, data, animations);

            expect(mockExtraActionService.getHandler).toHaveBeenCalledWith(
                EXTRA_ACTION.THROW_DICE,
            );
            expect(mockHandler).toHaveBeenCalled();
            expect(resourceService.decreaseResource).toHaveBeenCalled();
        });
    });

    describe('toggleReadyMovementResolve', () => {
        let gameState: GameForLogic;
        let data: ToggleReadyMovementData;

        beforeEach(() => {
            gameState = createMockGameState();
            data = {
                gameId: 'game-123',
                artifactsWithNewPosition: {},
            };
        });

        it('should toggle ready movement', async () => {
            const result = await service.toggleReadyMovementResolve(
                gameState,
                data,
            );

            expect(gameState.player.temporaryArtifacts).toBe(
                data.artifactsWithNewPosition,
            );
            expect(gameState.player.isReady).toBe(true);
            expect(result).toBe(false);
        });

        it('should finish movement phase when both ready', async () => {
            gameState.enemy.isReady = true;
            const result = await service.toggleReadyMovementResolve(
                gameState,
                data,
            );

            expect(gameState.miniPhase).toBe(MINIPHASE.BATTLE);
            expect(gameState.enemy.isReady).toBe(false);
            expect(gameState.player.isReady).toBe(false);
            expect(result).toBe(true);
        });
    });

    describe('autoToggleReadyMovementResolve', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
            gameState.player.temporaryArtifacts = {};
            gameState.enemy.temporaryArtifacts = {};
        });

        it('should auto toggle ready movement', async () => {
            const result =
                await service.autoToggleReadyMovementResolve(gameState);

            expect(gameState.player.isReady).toBe(true);
            expect(result).toBe(false);
        });

        it('should finish movement phase when both ready', async () => {
            gameState.enemy.isReady = true;
            const result =
                await service.autoToggleReadyMovementResolve(gameState);

            expect(gameState.miniPhase).toBe(MINIPHASE.BATTLE);
            expect(result).toBe(true);
        });
    });
});
