import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { ActionService } from './action.service';
import { GameStateService } from '../game-state/game-state.service';
import { ActionValidatorService } from './action-validator.service';
import { ActionResolverService } from './action-resolver.service';
import { PhaseService } from '../phase/phase.service';
import { RedisService } from '../redis/redis.service';
import { GameTimerService } from '../game-state/game-timer.service';
import { ResourceService } from '../game-mechanics/resource.service';
import { BotService } from './bot.service';
import {
    UseFaceData,
    UseSkillData,
    UseSpellData,
    ExtraActionData,
    ToggleReadyMovementData,
} from './types/action-evens-data';
import {
    GAME_ERROR_CODE,
    GameException,
} from '../game-state/types/game-exceptions';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { PHASE } from '../game-state/types/phase';
import { TIMER_TYPE } from '../game-state/types/timer';
import { RESOURCE } from '../game-mechanics/types/resource';
import { LOG_TYPE } from './types/log';
import { SKILL } from '../artifact/types/skill';
import { AnimationData } from './types/animation';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';


jest.mock('../game-mechanics/constants/faces', () => ({
    FACES: {
        sword: { sword: 10, target: 0, heal: 0, description: 'Melee attack' },
    },
}));

jest.mock('../artifact/constants/artifacts', () => ({
    ARTIFACTS: {
        arcane_shield: { id: 'arcane_shield', name: 'Arcane Shield' },
    },
}));

describe('ActionService', () => {
    let service: ActionService;
    let gameStateService: jest.Mocked<GameStateService>;
    let actionValidatorService: jest.Mocked<ActionValidatorService>;
    let actionResolverService: jest.Mocked<ActionResolverService>;
    let phaseService: jest.Mocked<PhaseService>;
    let redisService: jest.Mocked<RedisService>;
    let gameTimerService: jest.Mocked<GameTimerService>;
    let resourceService: jest.Mocked<ResourceService>;
    let botService: jest.Mocked<BotService>;

    const createMockArtifact = (id: string = 'artifact-1') => ({
        id,
        artifactId: 'arcane_shield',
        face: 'sword',
        state: 'ready_to_use',
        currentHp: 30,
        maxHp: 30,
        position: 1,
        line: 'front',
        skillCost: 2,
        effects: [],
        availableActions: null,
        extraData: { lastStateBeforeRoot: 'ready_to_use' },
    });

    const createMockPlayer = (id: string = 'player-1') => ({
        id,
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
            'artifact-1': createMockArtifact('artifact-1'),
        },
        spells: {
            light: {},
            dark: {},
            destruction: {},
        },
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
    });

    const createMockGameState = (): any => ({
        id: 'game-123',
        phase: PHASE.BATTLE,
        name: 'Test Game',
        currentTurn: 'player-1',
        logs: [],
        player: createMockPlayer('player-1'),
        enemy: createMockPlayer('player-2'),
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

    const mockGameStateService = {
        getKeyGame: jest.fn(),
        getGameForLogicById: jest.fn(),
        saveGameForLogic: jest.fn(),
        saveGameForLogicInTransaction: jest.fn(),
    };

    const mockActionValidatorService = {
        useFaceValidator: jest.fn(),
        useSkillValidator: jest.fn(),
        useSpellValidator: jest.fn(),
        endTurnValidator: jest.fn(),
        giveUpValidator: jest.fn(),
        drawValidator: jest.fn(),
        endRoundValidator: jest.fn(),
        extraActionValidator: jest.fn(),
        toggleReadyMovementValidator: jest.fn(),
    };

    const mockActionResolverService = {
        useFaceResolve: jest.fn(),
        useSkillResolve: jest.fn(),
        useSpellResolve: jest.fn(),
        endTurnResolve: jest.fn(),
        giveUpResolve: jest.fn(),
        offerDrawResolve: jest.fn(),
        cancelDrawResolve: jest.fn(),
        endRoundResolve: jest.fn(),
        extraActionResolve: jest.fn(),
        toggleReadyMovementResolve: jest.fn(),
        autoToggleReadyMovementResolve: jest.fn(),
        autoGiveUpResolve: jest.fn(),
    };

    const mockPhaseService = {
        calculateNewState: jest.fn(),
    };

    const mockRedisService = {
        watch: jest.fn(),
        unwatch: jest.fn(),
        multi: jest.fn(),
        execMulti: jest.fn(),
    };

    const mockGameTimerService = {
        stopAllTimers: jest.fn(),
        startTimer: jest.fn(),
    };

    const mockResourceService = {
        decreaseResource: jest.fn(),
        addResource: jest.fn(),
    };

    const mockBotService = {
        doRandomAction: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        mockGameStateService.getKeyGame.mockReturnValue('game:game-123');
        mockRedisService.multi.mockReturnValue({} as any);
        mockRedisService.execMulti.mockResolvedValue(['OK']);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionService,
                {
                    provide: GameStateService,
                    useValue: mockGameStateService,
                },
                {
                    provide: ActionValidatorService,
                    useValue: mockActionValidatorService,
                },
                {
                    provide: ActionResolverService,
                    useValue: mockActionResolverService,
                },
                {
                    provide: PhaseService,
                    useValue: mockPhaseService,
                },
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
                {
                    provide: GameTimerService,
                    useValue: mockGameTimerService,
                },
                {
                    provide: ResourceService,
                    useValue: mockResourceService,
                },
                {
                    provide: BotService,
                    useValue: mockBotService,
                },
            ],
        }).compile();

        service = module.get<ActionService>(ActionService);
        gameStateService = module.get(GameStateService);
        actionValidatorService = module.get(ActionValidatorService);
        actionResolverService = module.get(ActionResolverService);
        phaseService = module.get(PhaseService);
        redisService = module.get(RedisService);
        gameTimerService = module.get(GameTimerService);
        resourceService = module.get(ResourceService);
        botService = module.get(BotService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('useFace', () => {
        const userId = 'player-1';
        const useFaceData: UseFaceData = {
            gameId: 'game-123',
            artifactGameId: 'artifact-1',
            attackTarget: null,
            healTarget: null,
        };
        const animations: AnimationData[] = [];

        it('should use face successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockPhaseService.calculateNewState.mockResolvedValue(undefined);
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.useFace(useFaceData, userId, animations);

            expect(gameStateService.getGameForLogicById).toHaveBeenCalledWith(
                'game-123',
                userId,
            );
            expect(actionValidatorService.useFaceValidator).toHaveBeenCalled();
            expect(actionResolverService.useFaceResolve).toHaveBeenCalled();
            expect(phaseService.calculateNewState).toHaveBeenCalled();
            expect(gameStateService.saveGameForLogic).toHaveBeenCalled();
        });

        it('should throw GAME_NOT_FOUND if game not found', async () => {
            mockGameStateService.getGameForLogicById.mockResolvedValue(null);

            await expect(
                service.useFace(useFaceData, userId, animations),
            ).rejects.toThrow(GameException);
        });

        it('should throw UNKNOWN_ARTIFACT if artifact not found', async () => {
            const mockGameState = createMockGameState();
            mockGameState.player.artifacts = {};
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await expect(
                service.useFace(useFaceData, userId, animations),
            ).rejects.toThrow(ActionException);
        });
    });

    describe('useSkill', () => {
        const userId = 'player-1';
        const useSkillData: UseSkillData = {
            skillId: SKILL.FEAR,
            gameId: 'game-123',
            artifactGameId: 'artifact-1',
            targets: [[], []],
        };
        const animations: AnimationData[] = [];

        it('should use skill successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockPhaseService.calculateNewState.mockResolvedValue(undefined);
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.useSkill(useSkillData, userId, animations);

            expect(gameStateService.getGameForLogicById).toHaveBeenCalled();
            expect(actionValidatorService.useSkillValidator).toHaveBeenCalled();
            expect(actionResolverService.useSkillResolve).toHaveBeenCalled();
            expect(phaseService.calculateNewState).toHaveBeenCalled();
        });

        it('should throw GAME_NOT_FOUND if game not found', async () => {
            mockGameStateService.getGameForLogicById.mockResolvedValue(null);

            await expect(
                service.useSkill(useSkillData, userId, animations),
            ).rejects.toThrow(GameException);
        });
    });

    describe('useSpell', () => {
        const userId = 'player-1';
        const useSpellData: UseSpellData = {
            spellId: SKILL.FEAR as any,
            gameId: 'game-123',
            targets: [[], []],
        };
        const animations: AnimationData[] = [];

        it('should use spell successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockPhaseService.calculateNewState.mockResolvedValue(undefined);
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.useSpell(useSpellData, userId, animations);

            expect(gameStateService.getGameForLogicById).toHaveBeenCalled();
            expect(actionValidatorService.useSpellValidator).toHaveBeenCalled();
            expect(actionResolverService.useSpellResolve).toHaveBeenCalled();
            expect(phaseService.calculateNewState).toHaveBeenCalled();
        });
    });

    describe('endTurn', () => {
        const userId = 'player-1';
        const gameId = 'game-123';
        const animations: AnimationData[] = [];

        it('should end turn successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
            mockGameTimerService.startTimer.mockResolvedValue(undefined);
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.endTurn(gameId, userId, animations);

            expect(actionValidatorService.endTurnValidator).toHaveBeenCalled();
            expect(actionResolverService.endTurnResolve).toHaveBeenCalled();
            expect(gameTimerService.stopAllTimers).toHaveBeenCalled();
        });

        it('should start timer if timerTurn is configured', async () => {
            const mockGameState = createMockGameState();
            mockGameState.constants.timerTurn = 30;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
            mockGameTimerService.startTimer.mockResolvedValue(undefined);

            await service.endTurn(gameId, userId, animations);

            expect(gameTimerService.startTimer).toHaveBeenCalledWith(
                gameId,
                TIMER_TYPE.TURN,
                30,
            );
        });

        it('should trigger bot action if enemy is bot', async () => {
            const mockGameState = createMockGameState();
            mockGameState.enemy.isBot = true;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockBotService.doRandomAction.mockResolvedValue(undefined);

            await service.endTurn(gameId, userId, animations);

            expect(botService.doRandomAction).toHaveBeenCalledWith(
                mockGameState,
                animations,
            );
        });
    });

    describe('giveUp', () => {
        const userId = 'player-1';
        const gameId = 'game-123';

        it('should give up successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.giveUp(gameId, userId);

            expect(actionValidatorService.giveUpValidator).toHaveBeenCalled();
            expect(actionResolverService.giveUpResolve).toHaveBeenCalled();
        });
    });

    describe('offerDraw', () => {
        const userId = 'player-1';
        const gameId = 'game-123';

        it('should offer draw successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.offerDraw(gameId, userId);

            expect(actionValidatorService.drawValidator).toHaveBeenCalled();
            expect(actionResolverService.offerDrawResolve).toHaveBeenCalled();
        });
    });

    describe('cancelDraw', () => {
        const userId = 'player-1';
        const gameId = 'game-123';

        it('should cancel draw successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.cancelDraw(gameId, userId);

            expect(actionValidatorService.drawValidator).toHaveBeenCalled();
            expect(actionResolverService.cancelDrawResolve).toHaveBeenCalled();
        });
    });

    describe('endRound', () => {
        const userId = 'player-1';
        const gameId = 'game-123';

        it('should end round successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.endRound(gameId, userId);

            expect(actionValidatorService.endRoundValidator).toHaveBeenCalled();
            expect(actionResolverService.endRoundResolve).toHaveBeenCalled();
        });
    });

    describe('extraAction', () => {
        const userId = 'player-1';
        const extraActionData: ExtraActionData = {
            gameId: 'game-123',
            artifactGameId: 'artifact-1',
            type: 'throw_dice',
            details: null,
        };
        const animations: AnimationData[] = [];

        it('should execute extra action successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockPhaseService.calculateNewState.mockResolvedValue(undefined);
            mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

            await service.extraAction(extraActionData, userId, animations);

            expect(
                actionValidatorService.extraActionValidator,
            ).toHaveBeenCalled();
            expect(actionResolverService.extraActionResolve).toHaveBeenCalled();
            expect(phaseService.calculateNewState).toHaveBeenCalled();
        });
    });

    describe('toggleReadyMovement', () => {
        const userId = 'player-1';
        const toggleReadyData: ToggleReadyMovementData = {
            gameId: 'game-123',
            artifactsWithNewPosition: {},
        };

        it('should toggle ready movement successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(
                false,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);

            await service.toggleReadyMovement(toggleReadyData, userId);

            expect(redisService.watch).toHaveBeenCalled();
            expect(
                actionValidatorService.toggleReadyMovementValidator,
            ).toHaveBeenCalled();
            expect(
                actionResolverService.toggleReadyMovementResolve,
            ).toHaveBeenCalled();
        });

        it('should stop timers and start turn timer if endMovement is true', async () => {
            const mockGameState = createMockGameState();
            mockGameState.constants.timerTurn = 30;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(
                true,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);
            mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
            mockGameTimerService.startTimer.mockResolvedValue(undefined);

            await service.toggleReadyMovement(toggleReadyData, userId);

            expect(gameTimerService.stopAllTimers).toHaveBeenCalled();
            expect(gameTimerService.startTimer).toHaveBeenCalledWith(
                'game-123',
                TIMER_TYPE.TURN,
                30,
            );
        });

        it('should retry on transaction failure', async () => {
            const mockGameState = createMockGameState();
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(
                false,
            );
            mockRedisService.execMulti
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(['OK']);

            await service.toggleReadyMovement(toggleReadyData, userId);

            expect(redisService.watch).toHaveBeenCalledTimes(2);
        });
    });

    describe('autoToggleReadyMovement', () => {
        const userId = 'player-1';
        const gameId = 'game-123';

        it('should auto toggle ready movement successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameState.player.isReady = false;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(
                false,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);

            await service.autoToggleReadyMovement(gameId, userId);

            expect(redisService.watch).toHaveBeenCalled();
            expect(
                actionResolverService.autoToggleReadyMovementResolve,
            ).toHaveBeenCalled();
        });

        it('should return early if player is already ready', async () => {
            const mockGameState = createMockGameState();
            mockGameState.player.isReady = true;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            await service.autoToggleReadyMovement(gameId, userId);

            expect(
                actionResolverService.autoToggleReadyMovementResolve,
            ).not.toHaveBeenCalled();
        });
    });

    describe('autoEndTurn', () => {
        const userId = 'player-1';
        const gameId = 'game-123';

        it('should auto end turn successfully', async () => {
            const mockGameState = createMockGameState();
            mockGameState.currentTurn = 'player-1';
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockActionResolverService.endTurnResolve.mockResolvedValue(
                undefined,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);
            mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
            mockGameTimerService.startTimer.mockResolvedValue(undefined);

            const result = await service.autoEndTurn(gameId, userId);

            expect(result).toBe(true);
            expect(actionResolverService.endTurnResolve).toHaveBeenCalled();
        });

        it('should return false if not current player turn', async () => {
            const mockGameState = createMockGameState();
            mockGameState.currentTurn = 'player-2';
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );

            const result = await service.autoEndTurn(gameId, userId);

            expect(result).toBe(false);
        });

        it('should decrease resources if any resource is >= 10', async () => {
            const mockGameState = createMockGameState();
            mockGameState.currentTurn = 'player-1';
            mockGameState.player.resources[RESOURCE.AGILITY] = 15;
            mockGameStateService.getGameForLogicById.mockResolvedValue(
                mockGameState,
            );
            mockActionResolverService.endTurnResolve.mockResolvedValue(
                undefined,
            );
            mockRedisService.execMulti.mockResolvedValue(['OK']);

            await service.autoEndTurn(gameId, userId);

            expect(resourceService.decreaseResource).toHaveBeenCalledWith(
                mockGameState.player,
                RESOURCE.AGILITY,
                10,
                expect.any(Array),
            );
        });
    });

    describe('autoEndTurn - additional coverage', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should handle all resource types for decrease (RAGE, LIGHT_MANA, DARK_MANA, DESTRUCTION_MANA)', async () => {
        const resourceTypes = [
        { resource: RESOURCE.RAGE, value: 15 },
        { resource: RESOURCE.LIGHT_MANA, value: 15 },
        { resource: RESOURCE.DARK_MANA, value: 15 },
        { resource: RESOURCE.DESTRUCTION_MANA, value: 15 },
        ];

        for (const { resource, value } of resourceTypes) {
        jest.clearAllMocks();
        
        const mockGameState = createMockGameState();
        mockGameState.currentTurn = 'player-1';
        mockGameState.player.resources[RESOURCE.AGILITY] = 5;
        mockGameState.player.resources[RESOURCE.RAGE] = 5;
        mockGameState.player.resources[RESOURCE.LIGHT_MANA] = 5;
        mockGameState.player.resources[RESOURCE.DARK_MANA] = 5;
        mockGameState.player.resources[RESOURCE.DESTRUCTION_MANA] = 5;
        mockGameState.player.resources[resource] = value;
        
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
        mockRedisService.execMulti.mockResolvedValue(['OK']);
        mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
        mockGameTimerService.startTimer.mockResolvedValue(undefined);

        await service.autoEndTurn(gameId, userId);

        expect(resourceService.decreaseResource).toHaveBeenCalledWith(
            mockGameState.player,
            resource,
            10,
            expect.any(Array)
        );
        }
    });

    it('should add log entry when decreasing resources', async () => {
        const mockGameState = createMockGameState();
        mockGameState.currentTurn = 'player-1';
        mockGameState.player.resources[RESOURCE.AGILITY] = 15;
        mockGameState.logs = [];
        
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
        mockRedisService.execMulti.mockResolvedValue(['OK']);
        mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
        mockGameTimerService.startTimer.mockResolvedValue(undefined);

        await service.autoEndTurn(gameId, userId);

        expect(mockGameState.logs.length).toBeGreaterThan(0);
        expect(mockGameState.logs[0].type).toBe(LOG_TYPE.SYSTEM);
    });

    it('should handle transaction failure and retry', async () => {
        const mockGameState = createMockGameState();
        mockGameState.currentTurn = 'player-1';
        mockGameState.player.resources[RESOURCE.AGILITY] = 15;
        
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
        mockRedisService.execMulti
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(['OK']);

        const result = await service.autoEndTurn(gameId, userId);

        expect(result).toBe(true);
        expect(redisService.watch).toHaveBeenCalledTimes(2);
    });

    it('should throw CommonException after max retries', async () => {
        const mockGameState = createMockGameState();
        mockGameState.currentTurn = 'player-1';
        mockGameState.player.resources[RESOURCE.AGILITY] = 15;
        
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
        mockRedisService.execMulti.mockResolvedValue(null);

        await expect(service.autoEndTurn(gameId, userId)).rejects.toThrow(CommonException);
    });
    });

    describe('autoToggleReadyMovement - additional coverage', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should handle transaction failure and retry', async () => {
        const mockGameState = createMockGameState();
        mockGameState.player.isReady = false;
        
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
        mockRedisService.execMulti
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(['OK']);

        await service.autoToggleReadyMovement(gameId, userId);

        expect(redisService.watch).toHaveBeenCalledTimes(2);
    });

    it('should throw CommonException after max retries', async () => {
        const mockGameState = createMockGameState();
        mockGameState.player.isReady = false;
        
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
        mockRedisService.execMulti.mockResolvedValue(null);

        await expect(service.autoToggleReadyMovement(gameId, userId)).rejects.toThrow(CommonException);
    });
    });

    describe('toggleReadyMovement - additional coverage', () => {
    const userId = 'player-1';
    const toggleReadyData: ToggleReadyMovementData = {
        gameId: 'game-123',
        artifactsWithNewPosition: {},
    };

    it('should throw CommonException after max retries', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(false);
        mockRedisService.execMulti.mockResolvedValue(null);

        await expect(service.toggleReadyMovement(toggleReadyData, userId)).rejects.toThrow(CommonException);
    });

    it('should handle non-GameException errors in catch block', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(false);
        mockRedisService.execMulti.mockRejectedValue(new Error('Redis error'));

        await expect(service.toggleReadyMovement(toggleReadyData, userId)).rejects.toThrow(CommonException);
    });
    });

    describe('useFace - additional error coverage', () => {
    const userId = 'player-1';
    const useFaceData: UseFaceData = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        attackTarget: null,
        healTarget: null,
    };
    const animations: AnimationData[] = [];

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.ARTIFACT_NOT_READY);
        actionValidatorService.useFaceValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.useFace(useFaceData, userId, animations)).rejects.toThrow(ActionException);
    });

    it('should handle resolver throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const resolverError = new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        actionResolverService.useFaceResolve.mockImplementation(() => {
        throw resolverError;
        });

        await expect(service.useFace(useFaceData, userId, animations)).rejects.toThrow(ActionException);
    });
    });

    describe('useSkill - additional error coverage', () => {
    const userId = 'player-1';
    const useSkillData: UseSkillData = {
        skillId: SKILL.FEAR,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [[], []],
    };
    const animations: AnimationData[] = [];

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.ARTIFACT_NOT_READY);
        actionValidatorService.useSkillValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.useSkill(useSkillData, userId, animations)).rejects.toThrow(ActionException);
    });
    });

    describe('useSpell - additional error coverage', () => {
    const userId = 'player-1';
    const useSpellData: UseSpellData = {
        spellId: SKILL.FEAR as any,
        gameId: 'game-123',
        targets: [[], []],
    };
    const animations: AnimationData[] = [];

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
        actionValidatorService.useSpellValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.useSpell(useSpellData, userId, animations)).rejects.toThrow(ActionException);
    });
    });

    describe('extraAction - additional error coverage', () => {
    const userId = 'player-1';
    const extraActionData: ExtraActionData = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        type: 'throw_dice',
        details: null,
    };
    const animations: AnimationData[] = [];

    it('should handle artifact not found', async () => {
        const mockGameState = createMockGameState();
        mockGameState.player.artifacts = {};
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

        await expect(service.extraAction(extraActionData, userId, animations)).rejects.toThrow(ActionException);
    });

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        actionValidatorService.extraActionValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.extraAction(extraActionData, userId, animations)).rejects.toThrow(ActionException);
    });
    });

    describe('giveUp - additional error coverage', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        actionValidatorService.giveUpValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.giveUp(gameId, userId)).rejects.toThrow(ActionException);
    });
    });

    describe('offerDraw - additional error coverage', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        actionValidatorService.drawValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.offerDraw(gameId, userId)).rejects.toThrow(ActionException);
    });
    });

    describe('cancelDraw - additional error coverage', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        actionValidatorService.drawValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.cancelDraw(gameId, userId)).rejects.toThrow(ActionException);
    });
    });

    describe('endRound - additional error coverage', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should handle validator throwing error', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        
        const validatorError = new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        actionValidatorService.endRoundValidator.mockImplementation(() => {
        throw validatorError;
        });

        await expect(service.endRound(gameId, userId)).rejects.toThrow(ActionException);
    });
    });

    describe('autoGiveUp', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should auto give up successfully', async () => {
        const mockGameState = createMockGameState();
        mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
        mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

        await service.autoGiveUp(gameId, userId);

        expect(actionResolverService.autoGiveUpResolve).toHaveBeenCalledWith(mockGameState);
    });

    it('should throw GAME_NOT_FOUND if game not found', async () => {
        mockGameStateService.getGameForLogicById.mockResolvedValue(null);

        await expect(service.autoGiveUp(gameId, userId)).rejects.toThrow(GameException);
    });
    });

describe('autoEndTurn - additional branch coverage', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should decrease RAGE when AGILITY is low but RAGE >= 10', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 5;
    mockGameState.player.resources[RESOURCE.RAGE] = 15;
    mockGameState.player.resources[RESOURCE.LIGHT_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DARK_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DESTRUCTION_MANA] = 5;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoEndTurn(gameId, userId);

    expect(resourceService.decreaseResource).toHaveBeenCalledWith(
      mockGameState.player,
      RESOURCE.RAGE,
      10,
      expect.any(Array)
    );
  });

  it('should decrease LIGHT_MANA when AGILITY and RAGE are low but LIGHT_MANA >= 10', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 5;
    mockGameState.player.resources[RESOURCE.RAGE] = 5;
    mockGameState.player.resources[RESOURCE.LIGHT_MANA] = 15;
    mockGameState.player.resources[RESOURCE.DARK_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DESTRUCTION_MANA] = 5;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoEndTurn(gameId, userId);

    expect(resourceService.decreaseResource).toHaveBeenCalledWith(
      mockGameState.player,
      RESOURCE.LIGHT_MANA,
      10,
      expect.any(Array)
    );
  });

  it('should decrease DARK_MANA when AGILITY, RAGE, LIGHT_MANA are low but DARK_MANA >= 10', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 5;
    mockGameState.player.resources[RESOURCE.RAGE] = 5;
    mockGameState.player.resources[RESOURCE.LIGHT_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DARK_MANA] = 15;
    mockGameState.player.resources[RESOURCE.DESTRUCTION_MANA] = 5;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoEndTurn(gameId, userId);

    expect(resourceService.decreaseResource).toHaveBeenCalledWith(
      mockGameState.player,
      RESOURCE.DARK_MANA,
      10,
      expect.any(Array)
    );
  });

  it('should decrease DESTRUCTION_MANA when all other resources are low', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 5;
    mockGameState.player.resources[RESOURCE.RAGE] = 5;
    mockGameState.player.resources[RESOURCE.LIGHT_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DARK_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DESTRUCTION_MANA] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoEndTurn(gameId, userId);

    expect(resourceService.decreaseResource).toHaveBeenCalledWith(
      mockGameState.player,
      RESOURCE.DESTRUCTION_MANA,
      10,
      expect.any(Array)
    );
  });

  it('should not decrease any resource when all resources are below 10', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 5;
    mockGameState.player.resources[RESOURCE.RAGE] = 5;
    mockGameState.player.resources[RESOURCE.LIGHT_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DARK_MANA] = 5;
    mockGameState.player.resources[RESOURCE.DESTRUCTION_MANA] = 5;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoEndTurn(gameId, userId);

    expect(resourceService.decreaseResource).not.toHaveBeenCalled();
  });

  it('should increment skippedMoves after endTurnResolve', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    mockGameState.player.extraData.skippedMoves = 0;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockImplementation((gameState, player) => {
      return Promise.resolve();
    });
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoEndTurn(gameId, userId);

    expect(mockGameState.player.extraData.skippedMoves).toBe(1);
  });
});

describe('autoEndTurn - error handling branch coverage', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should throw GameException when non-retryable error occurs', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockRejectedValue(new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND));
    mockRedisService.unwatch.mockResolvedValue(undefined);

    await expect(service.autoEndTurn(gameId, userId)).rejects.toThrow(GameException);
  });

  it('should throw CommonException after max retries on execMulti failure', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(null);

    await expect(service.autoEndTurn(gameId, userId)).rejects.toThrow(CommonException);
  });
});

describe('autoToggleReadyMovement - additional branch coverage', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should start timer when endMovement is true', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    mockGameState.constants.timerTurn = 30;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(true);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoToggleReadyMovement(gameId, userId);

    expect(gameTimerService.stopAllTimers).toHaveBeenCalled();
    expect(gameTimerService.startTimer).toHaveBeenCalledWith(gameId, TIMER_TYPE.TURN, 30);
  });

  it('should not start timer when timerTurn is null', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    mockGameState.constants.timerTurn = null;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(true);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);

    await service.autoToggleReadyMovement(gameId, userId);

    expect(gameTimerService.stopAllTimers).toHaveBeenCalled();
    expect(gameTimerService.startTimer).not.toHaveBeenCalled();
  });

  it('should throw GameException when non-retryable error occurs', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockRejectedValue(new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND));
    mockRedisService.unwatch.mockResolvedValue(undefined);

    await expect(service.autoToggleReadyMovement(gameId, userId)).rejects.toThrow(GameException);
  });
});

describe('toggleReadyMovement - additional branch coverage', () => {
  const userId = 'player-1';
  const toggleReadyData: ToggleReadyMovementData = {
    gameId: 'game-123',
    artifactsWithNewPosition: {},
  };

  it('should start timer when endMovement is true and timerTurn exists', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = 30;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(true);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.toggleReadyMovement(toggleReadyData, userId);

    expect(gameTimerService.stopAllTimers).toHaveBeenCalled();
    expect(gameTimerService.startTimer).toHaveBeenCalledWith('game-123', TIMER_TYPE.TURN, 30);
  });

  it('should not start timer when timerTurn is null', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = null;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(true);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);

    await service.toggleReadyMovement(toggleReadyData, userId);

    expect(gameTimerService.stopAllTimers).toHaveBeenCalled();
    expect(gameTimerService.startTimer).not.toHaveBeenCalled();
  });
});

describe('endTurn - additional branch coverage', () => {
  const userId = 'player-1';
  const gameId = 'game-123';
  const animations: AnimationData[] = [];

  it('should not start timer when timerTurn is null', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = null;
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

    await service.endTurn(gameId, userId, animations);

    expect(gameTimerService.startTimer).not.toHaveBeenCalled();
  });

  it('should start timer when timerTurn exists', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = 45;
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);
    mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

    await service.endTurn(gameId, userId, animations);

    expect(gameTimerService.startTimer).toHaveBeenCalledWith(gameId, TIMER_TYPE.TURN, 45);
  });

  it('should handle bot action when enemy is bot even if timerTurn is null', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = null;
    mockGameState.enemy.isBot = true;
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockBotService.doRandomAction.mockResolvedValue(undefined);
    mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

    await service.endTurn(gameId, userId, animations);

    expect(botService.doRandomAction).toHaveBeenCalledWith(mockGameState, animations);
  });
});

describe('useFace - branch coverage for error handling', () => {
  const userId = 'player-1';
  const useFaceData: UseFaceData = {
    gameId: 'game-123',
    artifactGameId: 'artifact-1',
    attackTarget: null,
    healTarget: null,
  };
  const animations: AnimationData[] = [];

  it('should rethrow ActionException from validator', async () => {
    const mockGameState = createMockGameState();
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    
    actionValidatorService.useFaceValidator.mockImplementation(() => {
      throw new ActionException(ACTION_ERROR_CODE.ARTIFACT_NOT_READY);
    });

    await expect(service.useFace(useFaceData, userId, animations)).rejects.toThrow(ActionException);
  });

  it('should rethrow ActionException from resolver', async () => {
    const mockGameState = createMockGameState();
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    
    actionResolverService.useFaceResolve.mockImplementation(() => {
      throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
    });

    await expect(service.useFace(useFaceData, userId, animations)).rejects.toThrow(ActionException);
  });
});

describe('useSkill - branch coverage for error handling', () => {
  const userId = 'player-1';
  const useSkillData: UseSkillData = {
    skillId: SKILL.FEAR,
    gameId: 'game-123',
    artifactGameId: 'artifact-1',
    targets: [[], []],
  };
  const animations: AnimationData[] = [];

  it('should rethrow ActionException from resolver', async () => {
    const mockGameState = createMockGameState();
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    
    actionResolverService.useSkillResolve.mockImplementation(() => {
      throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
    });

    await expect(service.useSkill(useSkillData, userId, animations)).rejects.toThrow(ActionException);
  });
});

describe('useSpell - branch coverage for error handling', () => {
  const userId = 'player-1';
  const useSpellData: UseSpellData = {
    spellId: SKILL.FEAR as any,
    gameId: 'game-123',
    targets: [[], []],
  };
  const animations: AnimationData[] = [];

  it('should rethrow ActionException from resolver', async () => {
    const mockGameState = createMockGameState();
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    
    actionResolverService.useSpellResolve.mockImplementation(() => {
      throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
    });

    await expect(service.useSpell(useSpellData, userId, animations)).rejects.toThrow(ActionException);
  });
});

describe('extraAction - branch coverage for error handling', () => {
  const userId = 'player-1';
  const extraActionData: ExtraActionData = {
    gameId: 'game-123',
    artifactGameId: 'artifact-1',
    type: 'throw_dice',
    details: null,
  };
  const animations: AnimationData[] = [];

  it('should rethrow ActionException from resolver', async () => {
    const mockGameState = createMockGameState();
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    
    actionResolverService.extraActionResolve.mockImplementation(() => {
      throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
    });

    await expect(service.extraAction(extraActionData, userId, animations)).rejects.toThrow(ActionException);
  });
});

describe('giveUp - branch coverage', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should handle saveGameForLogic failure gracefully', async () => {
    const mockGameState = createMockGameState();
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.giveUpResolve.mockResolvedValue(undefined);
    mockGameStateService.saveGameForLogic.mockRejectedValue(new Error('Save failed'));

    await expect(service.giveUp(gameId, userId)).rejects.toThrow();
  });
});

describe('autoGiveUp - branch coverage', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should call autoGiveUpResolve and save game', async () => {
    const mockGameState = createMockGameState();
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoGiveUpResolve.mockResolvedValue(undefined);
    mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

    await service.autoGiveUp(gameId, userId);

    expect(actionResolverService.autoGiveUpResolve).toHaveBeenCalledWith(mockGameState);
    expect(gameStateService.saveGameForLogic).toHaveBeenCalled();
  });
});


describe('autoEndTurn - line 355 (when results === null retry logic with max retries)', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should retry when execMulti returns null and eventually succeed', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    const result = await service.autoEndTurn(gameId, userId);

    expect(result).toBe(true);
    expect(redisService.watch).toHaveBeenCalledTimes(3);
    expect(mockRedisService.execMulti).toHaveBeenCalledTimes(3);
  });

  it('should throw CommonException when execMulti returns null after max retries', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(null);

    await expect(service.autoEndTurn(gameId, userId)).rejects.toThrow(CommonException);
    expect(redisService.watch).toHaveBeenCalledTimes(5);
    expect(mockRedisService.execMulti).toHaveBeenCalledTimes(5);
  });
});

describe('autoEndTurn - line 370 (catch block error handling)', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should retry on non-GameException error and eventually throw CommonException', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById
      .mockResolvedValueOnce(mockGameState)
      .mockResolvedValueOnce(mockGameState)
      .mockResolvedValueOnce(mockGameState);
    
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    
    mockRedisService.execMulti.mockRejectedValue(new Error('Redis connection error'));
    mockRedisService.unwatch.mockResolvedValue(undefined);

    await expect(service.autoEndTurn(gameId, userId)).rejects.toThrow(CommonException);
    expect(redisService.unwatch).toHaveBeenCalledTimes(5);
  });

  it('should retry and succeed after recoverable error', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    
    mockRedisService.execMulti
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce(['OK']);
    mockRedisService.unwatch.mockResolvedValue(undefined);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    const result = await service.autoEndTurn(gameId, userId);

    expect(result).toBe(true);
    expect(redisService.watch).toHaveBeenCalledTimes(2);
  });
});

describe('autoToggleReadyMovement - line 404-405 (endMovement true with timer)', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should start timer when endMovement true and timerTurn exists', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    mockGameState.constants.timerTurn = 30;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(true);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoToggleReadyMovement(gameId, userId);

    expect(gameTimerService.stopAllTimers).toHaveBeenCalledWith(gameId);
    expect(gameTimerService.startTimer).toHaveBeenCalledWith(gameId, TIMER_TYPE.TURN, 30);
  });

  it('should not start timer when endMovement false', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    mockGameState.constants.timerTurn = 30;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
    mockRedisService.execMulti.mockResolvedValue(['OK']);

    await service.autoToggleReadyMovement(gameId, userId);

    expect(gameTimerService.stopAllTimers).not.toHaveBeenCalled();
    expect(gameTimerService.startTimer).not.toHaveBeenCalled();
  });
});

describe('toggleReadyMovement - line 450 (endMovement true with timer)', () => {
  const userId = 'player-1';
  const toggleReadyData: ToggleReadyMovementData = {
    gameId: 'game-123',
    artifactsWithNewPosition: {},
  };

  it('should start timer when endMovement true and timerTurn exists', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = 60;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(true);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.toggleReadyMovement(toggleReadyData, userId);

    expect(gameTimerService.stopAllTimers).toHaveBeenCalledWith('game-123');
    expect(gameTimerService.startTimer).toHaveBeenCalledWith('game-123', TIMER_TYPE.TURN, 60);
  });

  it('should not start timer when endMovement false', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = 60;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(false);
    mockRedisService.execMulti.mockResolvedValue(['OK']);

    await service.toggleReadyMovement(toggleReadyData, userId);

    expect(gameTimerService.stopAllTimers).not.toHaveBeenCalled();
    expect(gameTimerService.startTimer).not.toHaveBeenCalled();
  });

  it('should retry on execMulti null and succeed', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = 60;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(true);
    mockRedisService.execMulti
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.toggleReadyMovement(toggleReadyData, userId);

    expect(redisService.watch).toHaveBeenCalledTimes(2);
    expect(mockRedisService.execMulti).toHaveBeenCalledTimes(2);
  });
});

describe('autoToggleReadyMovement - line 478-479 (retry logic with max retries)', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should retry when execMulti returns null and eventually succeed', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
    mockRedisService.execMulti
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(['OK']);

    await service.autoToggleReadyMovement(gameId, userId);

    expect(redisService.watch).toHaveBeenCalledTimes(2);
  });

  it('should throw CommonException when execMulti returns null after max retries', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
    mockRedisService.execMulti.mockResolvedValue(null);

    await expect(service.autoToggleReadyMovement(gameId, userId)).rejects.toThrow(CommonException);
    expect(redisService.watch).toHaveBeenCalledTimes(5);
  });
});

describe('autoEndTurn - line 582 (endTurnResolve call verification)', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should call endTurnResolve with correct parameters', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    await service.autoEndTurn(gameId, userId);

    expect(mockActionResolverService.endTurnResolve).toHaveBeenCalledWith(
      mockGameState,
      mockGameState.player
    );
  });
});

describe('autoEndTurn - line 596 (return true after success)', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should return true when auto end turn succeeds', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-1';
    mockGameState.player.resources[RESOURCE.AGILITY] = 15;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockRedisService.execMulti.mockResolvedValue(['OK']);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);

    const result = await service.autoEndTurn(gameId, userId);

    expect(result).toBe(true);
  });

  it('should return false when not current player turn (early return)', async () => {
    const mockGameState = createMockGameState();
    mockGameState.currentTurn = 'player-2';
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

    const result = await service.autoEndTurn(gameId, userId);

    expect(result).toBe(false);
    expect(mockActionResolverService.endTurnResolve).not.toHaveBeenCalled();
  });
});

describe('toggleReadyMovement - retry logic with non-GameException', () => {
  const userId = 'player-1';
  const toggleReadyData: ToggleReadyMovementData = {
    gameId: 'game-123',
    artifactsWithNewPosition: {},
  };

  it('should retry on non-GameException error and eventually succeed', async () => {
    const mockGameState = createMockGameState();
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(false);
    
    mockRedisService.execMulti
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce(['OK']);
    mockRedisService.unwatch.mockResolvedValue(undefined);

    await service.toggleReadyMovement(toggleReadyData, userId);

    expect(redisService.watch).toHaveBeenCalledTimes(2);
  });

  it('should throw CommonException on non-GameException error after max retries', async () => {
    const mockGameState = createMockGameState();
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(false);
    mockRedisService.execMulti.mockRejectedValue(new Error('Persistent error'));
    mockRedisService.unwatch.mockResolvedValue(undefined);

    await expect(service.toggleReadyMovement(toggleReadyData, userId)).rejects.toThrow(CommonException);
    expect(redisService.watch).toHaveBeenCalledTimes(5);
  });
});

describe('autoToggleReadyMovement - retry logic with non-GameException', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should retry on non-GameException error and eventually succeed', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
    
    mockRedisService.execMulti
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce(['OK']);
    mockRedisService.unwatch.mockResolvedValue(undefined);

    await service.autoToggleReadyMovement(gameId, userId);

    expect(redisService.watch).toHaveBeenCalledTimes(2);
  });

  it('should throw CommonException on non-GameException error after max retries', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = false;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
    mockRedisService.execMulti.mockRejectedValue(new Error('Persistent error'));
    mockRedisService.unwatch.mockResolvedValue(undefined);

    await expect(service.autoToggleReadyMovement(gameId, userId)).rejects.toThrow(CommonException);
    expect(redisService.watch).toHaveBeenCalledTimes(5);
  });
});

describe('endTurn - timer start when timerTurn exists and enemy is bot', () => {
  const userId = 'player-1';
  const gameId = 'game-123';
  const animations: AnimationData[] = [];

  it('should start timer and handle bot action when enemy is bot', async () => {
    const mockGameState = createMockGameState();
    mockGameState.constants.timerTurn = 30;
    mockGameState.enemy.isBot = true;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
    mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
    mockGameTimerService.startTimer.mockResolvedValue(undefined);
    mockBotService.doRandomAction.mockResolvedValue(undefined);
    mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

    await service.endTurn(gameId, userId, animations);

    expect(gameTimerService.startTimer).toHaveBeenCalledWith(gameId, TIMER_TYPE.TURN, 30);
    expect(botService.doRandomAction).toHaveBeenCalledWith(mockGameState, animations);
  });
});

describe('useFace - artifact not found branch', () => {
  const userId = 'player-1';
  const useFaceData: UseFaceData = {
    gameId: 'game-123',
    artifactGameId: 'non-existent-artifact',
    attackTarget: null,
    healTarget: null,
  };
  const animations: AnimationData[] = [];

  it('should throw UNKNOWN_ARTIFACT when artifact not found', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.artifacts = {};
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

    await expect(service.useFace(useFaceData, userId, animations)).rejects.toThrow(ActionException);
    expect(actionValidatorService.useFaceValidator).not.toHaveBeenCalled();
  });
});

describe('useSkill - artifact not found branch', () => {
  const userId = 'player-1';
  const useSkillData: UseSkillData = {
    skillId: SKILL.FEAR,
    gameId: 'game-123',
    artifactGameId: 'non-existent-artifact',
    targets: [[], []],
  };
  const animations: AnimationData[] = [];

  it('should throw UNKNOWN_ARTIFACT when artifact not found', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.artifacts = {};
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

    await expect(service.useSkill(useSkillData, userId, animations)).rejects.toThrow(ActionException);
    expect(actionValidatorService.useSkillValidator).not.toHaveBeenCalled();
  });
});

describe('extraAction - artifact not found branch', () => {
  const userId = 'player-1';
  const extraActionData: ExtraActionData = {
    gameId: 'game-123',
    artifactGameId: 'non-existent-artifact',
    type: 'throw_dice',
    details: null,
  };
  const animations: AnimationData[] = [];

  it('should throw UNKNOWN_ARTIFACT when artifact not found', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.artifacts = {};
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

    await expect(service.extraAction(extraActionData, userId, animations)).rejects.toThrow(ActionException);
    expect(actionValidatorService.extraActionValidator).not.toHaveBeenCalled();
  });
});

describe('autoToggleReadyMovement - early return when player is already ready', () => {
  const userId = 'player-1';
  const gameId = 'game-123';

  it('should return early without resolving when player.isReady is true', async () => {
    const mockGameState = createMockGameState();
    mockGameState.player.isReady = true;
    
    mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
    mockRedisService.watch.mockResolvedValue(undefined);

    await service.autoToggleReadyMovement(gameId, userId);

    expect(mockActionResolverService.autoToggleReadyMovementResolve).not.toHaveBeenCalled();
    expect(mockRedisService.execMulti).not.toHaveBeenCalled();
  });
});


});
