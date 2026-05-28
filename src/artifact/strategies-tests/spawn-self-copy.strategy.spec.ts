import { Test, TestingModule } from '@nestjs/testing';
import { SpawnSelfCopyStrategy } from '../strategies/spawn-self-copy.strategy';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ArtifactService } from '../artifact.service';
import {
    ArtifactGameState,
    Player,
    ARTIFACT_STATE,
    LINE,
    Line,
} from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { ARTIFACT, SPAWN_POSITION } from '../types/artifact';
import { EFFECT } from '../../game-mechanics/types/effect';

jest.mock('../../game-mechanics/constants/effects', () => ({
    EFFECTS: {
        copy: { id: 'copy', name: 'Copy' },
    },
}));

describe('SpawnSelfCopyStrategy', () => {
    let strategy: SpawnSelfCopyStrategy;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let artifactService: jest.Mocked<ArtifactService>;

    const createMockArtifact = (
        id: string = 'artifact-1',
        position: number = 1,
        line: Line = LINE.FRONT,
    ): ArtifactGameState => ({
        id,
        artifactId: 'illusion_blade',
        face: 'sword',
        state: ARTIFACT_STATE.READY_TO_USE,
        currentHp: 30,
        maxHp: 30,
        position,
        line,
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
            agility: 50,
            rage: 30,
            light_mana: 20,
            dark_mana: 10,
            destruction_mana: 5,
        },
        artifacts: {
            'artifact-1': createMockArtifact('artifact-1', 1, LINE.FRONT),
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

    const createMockGameState = (): GameForLogic => ({
        id: 'game-123',
        phase: 'battle',
        name: 'Test Game',
        currentTurn: 'player-1',
        logs: [],
        player: createMockPlayer(),
        enemy: createMockPlayer(),
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

    const mockGameEffectsService = {
        applyEffect: jest.fn(),
        removeEffect: jest.fn(),
        countEffect: jest.fn(),
        getEffect: jest.fn(),
        getHeroEffects: jest.fn(),
        applyHeroEffect: jest.fn(),
        removeHeroEffect: jest.fn(),
    };

    const mockArtifactService = {
        createArtifactState: jest.fn(),
        spawnArtifact: jest.fn(),
        getNeighbors: jest.fn(),
        moveArtifact: jest.fn(),
        destroyArtifact: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SpawnSelfCopyStrategy,
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

        strategy = module.get<SpawnSelfCopyStrategy>(SpawnSelfCopyStrategy);
        gameEffectsService = module.get(GameEffectsService);
        artifactService = module.get(ArtifactService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return SPAWN_SELF_COPY', () => {
            expect(strategy.getSkillType()).toBe(SKILL.SPAWN_SELF_COPY);
        });
    });

    describe('execute', () => {
        let gameState: GameForLogic;
        let player: Player;
        let artifact: ArtifactGameState;
        let data: UseSkillData;
        let animations: AnimationData[];
        let logParts: string[];
        let mockSelfCopy: ArtifactGameState;

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            artifact = player.artifacts['artifact-1'];
            data = {
                skillId: SKILL.SPAWN_SELF_COPY,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
            logParts = [];

            mockSelfCopy = {
                id: 'copy-1',
                artifactId: ARTIFACT.ILLUSION_BLADE,
                face: 'sword',
                state: ARTIFACT_STATE.READY_TO_USE,
                currentHp: 30,
                maxHp: 30,
                position: 1,
                line: LINE.FRONT,
                skillCost: 2,
                effects: [],
                availableActions: null,
                extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
            };

            mockArtifactService.createArtifactState.mockReturnValue(
                mockSelfCopy,
            );
            mockArtifactService.spawnArtifact.mockReturnValue(undefined);
        });

        it('should create a copy of the artifact', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(
                mockArtifactService.createArtifactState,
            ).toHaveBeenCalledWith(player.artifacts, ARTIFACT.ILLUSION_BLADE);
        });

        it('should set copy HP to 1', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(mockSelfCopy.currentHp).toBe(1);
        });

        it('should spawn copy near the original artifact', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(mockArtifactService.spawnArtifact).toHaveBeenCalledWith(
                mockSelfCopy,
                SPAWN_POSITION.NEAR,
                artifact.position,
                artifact.line,
                player.artifacts,
                logParts,
            );
        });

        it('should apply COPY effect to the spawned copy', () => {
            const {
                EFFECTS,
            } = require('../../game-mechanics/constants/effects');

            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(gameEffectsService.applyEffect).toHaveBeenCalledWith(
                mockSelfCopy,
                EFFECTS['copy'],
                [],
            );
        });
    });
});
