import { Test, TestingModule } from '@nestjs/testing';
import { DraftService } from './draft.service';
import { GameStateService } from '../game-state/game-state.service';
import { RedisService } from '../redis/redis.service';
import { PhaseService } from '../phase/phase.service';
import { GameTimerService } from '../game-state/game-timer.service';
import { ArtifactService } from '../artifact/artifact.service';
import { PickArtifactData } from './types/draft-evens-data';
import {
    GAME_ERROR_CODE,
    GameException,
} from '../game-state/types/game-exceptions';
import { DRAFT_ERROR_CODE, DraftException } from './types/draft-exceptions';
import { PHASE } from '../game-state/types/phase';
import { TIMER_TYPE } from '../game-state/types/timer';
import { DRAFT_COUNT_ARTIFACTS } from './constants/draft';

jest.mock('crypto', () => ({
    randomInt: jest.fn(() => 0),
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-1234'),
}));

jest.mock('../artifact/constants/artifacts', () => ({
    ARTIFACTS: {
        arcane_shield: {
            id: 'arcane_shield',
            hp: 30,
            skills: ['shield'],
            price: 100,
            isForSale: true,
        },
        moon_staff: {
            id: 'moon_staff',
            hp: 25,
            skills: ['heal'],
            price: 150,
            isForSale: true,
        },
        axe_of_the_berserker: {
            id: 'axe_of_the_berserker',
            hp: 40,
            skills: ['rage'],
            price: 200,
            isForSale: true,
        },
    },
}));

jest.mock('../artifact/constants/skills', () => ({
    SKILLS: {
        shield: { cost: 2 },
        heal: { cost: 3 },
        rage: { cost: 1 },
    },
}));

const createMockGameState = (
    userId: string,
    enemyId: string = 'enemy-1',
): any => ({
    id: 'game-123',
    phase: PHASE.DRAFT,
    end: null,
    player: {
        id: userId,
        name: 'Player1',
        isReady: false,
        draft: {
            pickedArtifact: null,
            deck: [
                { artifactId: 'arcane_shield', maxHp: 30, skillCost: 2 },
                { artifactId: 'moon_staff', maxHp: 25, skillCost: 3 },
            ],
        },
        artifacts: {},
    },
    enemy: {
        id: enemyId,
        name: 'Player2',
        isBot: false,
        isReady: false,
        draft: {
            pickedArtifact: null,
            deck: [
                { artifactId: 'axe_of_the_berserker', maxHp: 40, skillCost: 1 },
            ],
        },
        artifacts: {},
    },
    constants: {
        timerDraft: 30,
    },
});

describe('DraftService', () => {
    let service: DraftService;
    let gameStateService: jest.Mocked<GameStateService>;
    let redisService: jest.Mocked<RedisService>;
    let phaseService: jest.Mocked<PhaseService>;
    let gameTimerService: jest.Mocked<GameTimerService>;
    let artifactService: jest.Mocked<ArtifactService>;

    const mockGameStateService = {
        getKeyGame: jest.fn(),
        getGameForLogicById: jest.fn(),
        saveGameForLogicInTransaction: jest.fn(),
    };

    const mockRedisService = {
        setJson: jest.fn(),
        watch: jest.fn(),
        unwatch: jest.fn(),
        multi: jest.fn(),
        execMulti: jest.fn(),
    };

    const mockPhaseService = {
        newRound: jest.fn(),
    };

    const mockGameTimerService = {
        startTimer: jest.fn(),
    };

    const mockArtifactService = {
        createArtifactState: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        mockGameStateService.getKeyGame.mockReturnValue('game:game-123');
        mockRedisService.multi.mockReturnValue({} as any);
        mockRedisService.execMulti.mockResolvedValue(['OK']);
        mockArtifactService.createArtifactState.mockImplementation(
            (artifacts, artifactId) => ({
                id: 'artifact-uuid',
                artifactId,
                state: 'ready_to_use',
                currentHp: 30,
                maxHp: 30,
                position: 1,
                line: 'front',
                skillCost: 2,
                effects: [],
                extraData: { lastStateBeforeRoot: null },
            }),
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DraftService,
                {
                    provide: GameStateService,
                    useValue: mockGameStateService,
                },
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
                {
                    provide: PhaseService,
                    useValue: mockPhaseService,
                },
                {
                    provide: GameTimerService,
                    useValue: mockGameTimerService,
                },
                {
                    provide: ArtifactService,
                    useValue: mockArtifactService,
                },
            ],
        }).compile();

        service = module.get<DraftService>(DraftService);
        gameStateService = module.get(GameStateService);
        redisService = module.get(RedisService);
        phaseService = module.get(PhaseService);
        gameTimerService = module.get(GameTimerService);
        artifactService = module.get(ArtifactService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('pickArtifact', () => {
        const userId = 'user-123';
        const pickArtifactData: PickArtifactData = {
            gameId: 'game-123',
            artifactId: 'arcane_shield',
        };

        it('should pick artifact successfully', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.setJson.mockResolvedValue(undefined);

            await service.pickArtifact(pickArtifactData, userId);

            expect(
                mockGameStateService.getGameForLogicById,
            ).toHaveBeenCalledWith('game-123', userId);
            expect(mockRedisService.setJson).toHaveBeenCalled();
        });

        it('should throw GAME_NOT_FOUND if game not found', async () => {
            mockGameStateService.getGameForLogicById.mockResolvedValue(null);

            await expect(
                service.pickArtifact(pickArtifactData, userId),
            ).rejects.toThrow(GameException);
        });

        it('should throw PHASE_NOT_DRAFT if not in draft phase', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.phase = PHASE.BATTLE;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await expect(
                service.pickArtifact(pickArtifactData, userId),
            ).rejects.toThrow(DraftException);
        });

        it('should throw GAME_OVER if game ended', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.end = {
                winner: 'user-123',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await expect(
                service.pickArtifact(pickArtifactData, userId),
            ).rejects.toThrow(DraftException);
        });

        it('should throw ARTIFACT_NOT_FOUND if artifact not in deck', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            const invalidData = {
                ...pickArtifactData,
                artifactId: 'non_existent',
            };

            await expect(
                service.pickArtifact(invalidData, userId),
            ).rejects.toThrow(DraftException);
        });
    });

    describe('toggleReadyDraft', () => {
        const userId = 'user-123';
        const gameId = 'game-123';

        it('should toggle ready draft successfully', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.isReady = false;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameState.enemy.isReady = false;
            mockGameState.enemy.draft.pickedArtifact = null;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);

            await service.toggleReadyDraft(gameId, userId);

            expect(mockRedisService.watch).toHaveBeenCalledWith(
                'game:game-123',
            );
            expect(
                mockGameStateService.saveGameForLogicInTransaction,
            ).toHaveBeenCalled();
        });

        it('should throw GAME_NOT_FOUND if game not found', async () => {
            mockGameStateService.getGameForLogicById.mockResolvedValue(null);

            await expect(
                service.toggleReadyDraft(gameId, userId),
            ).rejects.toThrow(GameException);
        });

        it('should throw PHASE_NOT_DRAFT if not in draft phase', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.phase = PHASE.BATTLE;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await expect(
                service.toggleReadyDraft(gameId, userId),
            ).rejects.toThrow(DraftException);
        });

        it('should throw GAME_OVER if game ended', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.end = {
                winner: 'user-123',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await expect(
                service.toggleReadyDraft(gameId, userId),
            ).rejects.toThrow(DraftException);
        });

        it('should throw NOT_PICKED_ARTIFACT if no artifact picked', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.draft.pickedArtifact = null;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await expect(
                service.toggleReadyDraft(gameId, userId),
            ).rejects.toThrow(DraftException);
        });

        it('should retry on transaction failure', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.execMulti
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(['OK']);

            await service.toggleReadyDraft(gameId, userId);

            expect(
                mockGameStateService.saveGameForLogicInTransaction,
            ).toHaveBeenCalledTimes(2);
        });

        it('should finish draft and transition to battle when both players ready', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.isReady = false;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameState.enemy.isReady = true;
            mockGameState.enemy.draft.pickedArtifact = 'axe_of_the_berserker';
            mockGameState.player.artifacts = {};
            mockGameState.enemy.artifacts = {};
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);

            await service.toggleReadyDraft(gameId, userId);

            expect(artifactService.createArtifactState).toHaveBeenCalledTimes(
                2,
            );
        });

        it('should start timer when draft finished', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.isReady = false;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameState.enemy.isReady = true;
            mockGameState.enemy.draft.pickedArtifact = 'axe_of_the_berserker';
            mockGameState.player.artifacts = {};
            mockGameState.enemy.artifacts = {};
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);
            mockGameTimerService.startTimer.mockResolvedValue(undefined);

            await service.toggleReadyDraft(gameId, userId);

            expect(mockGameTimerService.startTimer).toHaveBeenCalledWith(
                gameId,
                TIMER_TYPE.DRAFT,
                30,
            );
        });
    });

    describe('autoFinishDraft', () => {
        const userId = 'user-123';
        const gameId = 'game-123';

        it('should auto finish draft for player', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.isReady = false;
            mockGameState.player.draft.pickedArtifact = null;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);

            await service.autoFinishDraft(gameId, userId);

            expect(mockGameStateService.getGameForLogicById).toHaveBeenCalled();
            expect(
                mockGameStateService.saveGameForLogicInTransaction,
            ).toHaveBeenCalled();
        });

        it('should return early if not in draft phase', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.phase = PHASE.BATTLE;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await service.autoFinishDraft(gameId, userId);

            expect(
                mockGameStateService.saveGameForLogicInTransaction,
            ).not.toHaveBeenCalled();
        });

        it('should return early if game ended', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.end = {
                winner: 'user-123',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await service.autoFinishDraft(gameId, userId);

            expect(
                mockGameStateService.saveGameForLogicInTransaction,
            ).not.toHaveBeenCalled();
        });

        it('should return early if player already ready', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.isReady = true;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await service.autoFinishDraft(gameId, userId);

            expect(
                mockGameStateService.saveGameForLogicInTransaction,
            ).not.toHaveBeenCalled();
        });

        it('should pick random artifact if none picked', async () => {
            const { randomInt } = require('crypto');
            randomInt.mockReturnValue(1);

            const mockGameState = createMockGameState(userId);
            mockGameState.player.isReady = false;
            mockGameState.player.draft.pickedArtifact = null;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);

            await service.autoFinishDraft(gameId, userId);

            expect(randomInt).toHaveBeenCalled();
        });

        it('should retry on transaction failure', async () => {
            const mockGameState = createMockGameState(userId);
            mockGameState.player.isReady = false;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockRedisService.execMulti
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(['OK']);

            await service.autoFinishDraft(gameId, userId);

            expect(
                mockGameStateService.saveGameForLogicInTransaction,
            ).toHaveBeenCalledTimes(2);
        });
    });

    describe('applyFinishDraftIfNeeded', () => {
        const userId = 'user-123';
        const enemyId = 'enemy-1';

        it('should finish draft when both players are ready and have picked artifacts', async () => {
            const mockGameState = createMockGameState(userId, enemyId);
            mockGameState.player.isReady = true;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameState.enemy.isReady = true;
            mockGameState.enemy.draft.pickedArtifact = 'axe_of_the_berserker';
            mockGameState.player.artifacts = {};
            mockGameState.enemy.artifacts = {};

            const result = await (service as any).applyFinishDraftIfNeeded(
                mockGameState,
            );

            expect(result).toBe(true);
            expect(artifactService.createArtifactState).toHaveBeenCalledTimes(
                2,
            );
            expect(mockGameState.player.draft.pickedArtifact).toBeNull();
            expect(mockGameState.enemy.draft.pickedArtifact).toBeNull();
            expect(mockGameState.player.isReady).toBe(false);
            expect(mockGameState.enemy.isReady).toBe(false);
        });

        it('should auto pick for bot', async () => {
            const mockGameState = createMockGameState(userId, enemyId);
            mockGameState.player.isReady = true;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameState.enemy.isBot = true;
            mockGameState.enemy.isReady = false;
            mockGameState.enemy.draft.pickedArtifact = null;
            mockGameState.player.artifacts = {};
            mockGameState.enemy.artifacts = {};

            const result = await (service as any).applyFinishDraftIfNeeded(
                mockGameState,
            );

            expect(result).toBe(true);
            expect(mockGameState.enemy.draft.pickedArtifact).toBeDefined();
        });

        it('should not finish draft if player not ready', async () => {
            const mockGameState = createMockGameState(userId, enemyId);
            mockGameState.player.isReady = false;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameState.enemy.isReady = true;
            mockGameState.enemy.draft.pickedArtifact = 'axe_of_the_berserker';

            const result = await (service as any).applyFinishDraftIfNeeded(
                mockGameState,
            );

            expect(result).toBe(false);
            expect(artifactService.createArtifactState).not.toHaveBeenCalled();
        });

        it('should not finish draft if enemy not ready', async () => {
            const mockGameState = createMockGameState(userId, enemyId);
            mockGameState.player.isReady = true;
            mockGameState.player.draft.pickedArtifact = 'arcane_shield';
            mockGameState.enemy.isReady = false;
            mockGameState.enemy.draft.pickedArtifact = 'axe_of_the_berserker';

            const result = await (service as any).applyFinishDraftIfNeeded(
                mockGameState,
            );

            expect(result).toBe(false);
        });
    });
});
