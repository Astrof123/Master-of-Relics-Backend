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
import { UseFaceData, UseSkillData, UseSpellData, ExtraActionData, ToggleReadyMovementData } from './types/action-evens-data';
import { GAME_ERROR_CODE, GameException } from '../game-state/types/game-exceptions';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { PHASE } from '../game-state/types/phase';
import { TIMER_TYPE } from '../game-state/types/timer';
import { RESOURCE } from '../game-mechanics/types/resource';
import { LOG_TYPE } from './types/log';
import { SKILL } from '../artifact/types/skill';
import { AnimationData } from './types/animation';

// Mock dependencies
jest.mock('../game-mechanics/constants/faces', () => ({
  FACES: {
    'sword': { sword: 10, target: 0, heal: 0, description: 'Melee attack' },
  },
}));

jest.mock('../artifact/constants/artifacts', () => ({
  ARTIFACTS: {
    'arcane_shield': { id: 'arcane_shield', name: 'Arcane Shield' },
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
    extraData: { skippedMoves: 0 },
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
    constants: { maxCountArtifactsOnLine: 6, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false },
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockPhaseService.calculateNewState.mockResolvedValue(undefined);
      mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

      await service.useFace(useFaceData, userId, animations);

      expect(gameStateService.getGameForLogicById).toHaveBeenCalledWith('game-123', userId);
      expect(actionValidatorService.useFaceValidator).toHaveBeenCalled();
      expect(actionResolverService.useFaceResolve).toHaveBeenCalled();
      expect(phaseService.calculateNewState).toHaveBeenCalled();
      expect(gameStateService.saveGameForLogic).toHaveBeenCalled();
    });

    it('should throw GAME_NOT_FOUND if game not found', async () => {
      mockGameStateService.getGameForLogicById.mockResolvedValue(null);

      await expect(service.useFace(useFaceData, userId, animations)).rejects.toThrow(GameException);
    });

    it('should throw UNKNOWN_ARTIFACT if artifact not found', async () => {
      const mockGameState = createMockGameState();
      mockGameState.player.artifacts = {};
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

      await expect(service.useFace(useFaceData, userId, animations)).rejects.toThrow(ActionException);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
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

      await expect(service.useSkill(useSkillData, userId, animations)).rejects.toThrow(GameException);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockGameTimerService.stopAllTimers.mockResolvedValue(undefined);
      mockGameTimerService.startTimer.mockResolvedValue(undefined);

      await service.endTurn(gameId, userId, animations);

      expect(gameTimerService.startTimer).toHaveBeenCalledWith(gameId, TIMER_TYPE.TURN, 30);
    });

    it('should trigger bot action if enemy is bot', async () => {
      const mockGameState = createMockGameState();
      mockGameState.enemy.isBot = true;
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockBotService.doRandomAction.mockResolvedValue(undefined);

      await service.endTurn(gameId, userId, animations);

      expect(botService.doRandomAction).toHaveBeenCalledWith(mockGameState, animations);
    });
  });

  describe('giveUp', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should give up successfully', async () => {
      const mockGameState = createMockGameState();
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockPhaseService.calculateNewState.mockResolvedValue(undefined);
      mockGameStateService.saveGameForLogic.mockResolvedValue(undefined);

      await service.extraAction(extraActionData, userId, animations);

      expect(actionValidatorService.extraActionValidator).toHaveBeenCalled();
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(false);
      mockRedisService.execMulti.mockResolvedValue(['OK']);

      await service.toggleReadyMovement(toggleReadyData, userId);

      expect(redisService.watch).toHaveBeenCalled();
      expect(actionValidatorService.toggleReadyMovementValidator).toHaveBeenCalled();
      expect(actionResolverService.toggleReadyMovementResolve).toHaveBeenCalled();
    });

    it('should stop timers and start turn timer if endMovement is true', async () => {
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

    it('should retry on transaction failure', async () => {
      const mockGameState = createMockGameState();
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockActionResolverService.toggleReadyMovementResolve.mockResolvedValue(false);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockActionResolverService.autoToggleReadyMovementResolve.mockResolvedValue(false);
      mockRedisService.execMulti.mockResolvedValue(['OK']);

      await service.autoToggleReadyMovement(gameId, userId);

      expect(redisService.watch).toHaveBeenCalled();
      expect(actionResolverService.autoToggleReadyMovementResolve).toHaveBeenCalled();
    });

    it('should return early if player is already ready', async () => {
      const mockGameState = createMockGameState();
      mockGameState.player.isReady = true;
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

      await service.autoToggleReadyMovement(gameId, userId);

      expect(actionResolverService.autoToggleReadyMovementResolve).not.toHaveBeenCalled();
    });
  });

  describe('autoEndTurn', () => {
    const userId = 'player-1';
    const gameId = 'game-123';

    it('should auto end turn successfully', async () => {
      const mockGameState = createMockGameState();
      mockGameState.currentTurn = 'player-1';
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
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
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);

      const result = await service.autoEndTurn(gameId, userId);

      expect(result).toBe(false);
    });

    it('should decrease resources if any resource is >= 10', async () => {
      const mockGameState = createMockGameState();
      mockGameState.currentTurn = 'player-1';
      mockGameState.player.resources[RESOURCE.AGILITY] = 15;
      mockGameStateService.getGameForLogicById.mockResolvedValue(mockGameState);
      mockActionResolverService.endTurnResolve.mockResolvedValue(undefined);
      mockRedisService.execMulti.mockResolvedValue(['OK']);

      await service.autoEndTurn(gameId, userId);

      expect(resourceService.decreaseResource).toHaveBeenCalledWith(
        mockGameState.player,
        RESOURCE.AGILITY,
        10,
        expect.any(Array)
      );
    });
  });
});