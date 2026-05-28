import { Test, TestingModule } from '@nestjs/testing';
import { SpawnBonesStrategy } from '../strategies/spawn-bones.strategy';
import { ArtifactStateService } from '../../game-mechanics/artifact-state.service';
import { ArtifactService } from '../artifact.service';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
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

describe('SpawnBonesStrategy', () => {
    let strategy: SpawnBonesStrategy;
    let artifactStateService: jest.Mocked<ArtifactStateService>;
    let artifactService: jest.Mocked<ArtifactService>;
    let gameEffectsService: jest.Mocked<GameEffectsService>;

    const createMockArtifact = (
        id: string = 'artifact-1',
        position: number = 1,
        line: Line = LINE.FRONT,
    ): ArtifactGameState => ({
        id,
        artifactId: 'bonelord',
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

    const mockArtifactStateService = {
        applyState: jest.fn(),
        clearDestroyedArtifacts: jest.fn(),
        updateStateNewRound: jest.fn(),
    };

    const mockArtifactService = {
        createArtifactState: jest.fn(),
        spawnArtifact: jest.fn(),
        getNeighbors: jest.fn(),
        moveArtifact: jest.fn(),
        destroyArtifact: jest.fn(),
    };

    const mockGameEffectsService = {
        applyEffect: jest.fn(),
        removeEffect: jest.fn(),
        countEffect: jest.fn(),
        getEffect: jest.fn(),
        getHeroEffects: jest.fn(),
        applyHeroEffect: jest.fn(),
        removeHeroEffect: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SpawnBonesStrategy,
                {
                    provide: ArtifactStateService,
                    useValue: mockArtifactStateService,
                },
                {
                    provide: ArtifactService,
                    useValue: mockArtifactService,
                },
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
            ],
        }).compile();

        strategy = module.get<SpawnBonesStrategy>(SpawnBonesStrategy);
        artifactStateService = module.get(ArtifactStateService);
        artifactService = module.get(ArtifactService);
        gameEffectsService = module.get(GameEffectsService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return SPAWN_BONES', () => {
            expect(strategy.getSkillType()).toBe(SKILL.SPAWN_BONES);
        });
    });

    describe('execute', () => {
        let gameState: GameForLogic;
        let player: Player;
        let artifact: ArtifactGameState;
        let data: UseSkillData;
        let animations: AnimationData[];
        let logParts: string[];
        let mockBoneKnife: ArtifactGameState;

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            artifact = player.artifacts['artifact-1'];
            data = {
                skillId: SKILL.SPAWN_BONES,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
            logParts = [];

            mockBoneKnife = {
                id: 'bone-1',
                artifactId: ARTIFACT.BONE_KNIFE,
                face: 'sword',
                state: ARTIFACT_STATE.READY_TO_USE,
                currentHp: 10,
                maxHp: 10,
                position: 1,
                line: LINE.FRONT,
                skillCost: 0,
                effects: [],
                availableActions: null,
                extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
            };

            mockArtifactService.createArtifactState.mockReturnValue(
                mockBoneKnife,
            );
            mockArtifactService.spawnArtifact.mockReturnValue(undefined);
            mockArtifactStateService.applyState.mockReturnValue(undefined);
        });

        it('should create and spawn two Bone Knife artifacts', () => {
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
            ).toHaveBeenCalledTimes(2);
            expect(
                mockArtifactService.createArtifactState,
            ).toHaveBeenCalledWith(player.artifacts, ARTIFACT.BONE_KNIFE);
        });

        it('should spawn both bones on front line', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(mockArtifactService.spawnArtifact).toHaveBeenCalledTimes(2);
            expect(mockArtifactService.spawnArtifact).toHaveBeenCalledWith(
                mockBoneKnife,
                SPAWN_POSITION.FRONT_LINE,
                artifact.position,
                artifact.line,
                player.artifacts,
                logParts,
            );
        });

        it('should apply COOLDOWN state to second bone', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(mockArtifactStateService.applyState).toHaveBeenCalledWith(
                mockBoneKnife,
                ARTIFACT_STATE.COOLDOWN,
                [],
            );
        });
    });
});
