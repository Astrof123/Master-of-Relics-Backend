import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { PhaseService } from './phase.service';
import { ResourceService } from '../game-mechanics/resource.service';
import { ArtifactStateService } from '../game-mechanics/artifact-state.service';
import { DiceService } from '../game-mechanics/dice.service';
import { ArtifactService } from '../artifact/artifact.service';
import { SpellService } from '../spell/spell.service';
import { CollectionService } from '../collection/collection.service';
import { LobbyService } from '../lobby/lobby.service';
import { GameTimerService } from '../game-state/game-timer.service';
import { UsersStatsService } from '../users/users-stats.service';
import { GameEffectsService } from '../game-mechanics/game-effects.service';
import { LOG_TYPE } from '../action/types/log';
import { ARTIFACT_STATE } from '../game-state/types/game';
import { MINIPHASE, PHASE } from '../game-state/types/phase';
import { TIMER_TYPE } from '../game-state/types/timer';
import { LOBBY_STATE_TYPE } from '../lobby/types/lobby';
import { DRAW_PRIZE, LOSER_PRIZE, WINNER_PRIZE } from '../game-mechanics/constants/settings';

jest.mock('crypto', () => ({
  randomInt: jest.fn(() => 1),
}));

const createMockGameState = (playerId: string = 'player-1', enemyId: string = 'player-2', isBot: boolean = false): any => ({
  id: 'game-123',
  phase: PHASE.BATTLE,
  miniPhase: MINIPHASE.MOVEMENT,
  currentTurn: playerId,
  logs: [],
  player: {
    id: playerId,
    name: 'Player1',
    isReady: false,
    offerDraw: false,
    artifacts: {
      'artifact-1': { id: 'artifact-1', state: ARTIFACT_STATE.READY_TO_USE, currentHp: 30 },
      'artifact-2': { id: 'artifact-2', state: ARTIFACT_STATE.BREAKEN, currentHp: 0 },
    },
    spells: {
      light: { spell1: { cooldown: true }, spell2: { cooldown: false } },
      dark: { spell1: { cooldown: false } },
      destruction: { spell1: { cooldown: true } },
    },
    movePoints: 0,
  },
  enemy: {
    id: enemyId,
    name: isBot ? 'Bot' : 'Player2',
    isBot: isBot,
    isReady: false,
    offerDraw: false,
    artifacts: {
      'artifact-3': { id: 'artifact-3', state: ARTIFACT_STATE.READY_TO_USE, currentHp: 25 },
      'artifact-4': { id: 'artifact-4', state: ARTIFACT_STATE.READY_TO_USE, currentHp: 20 },
    },
    spells: {
      light: { spell1: { cooldown: false } },
      dark: { spell1: { cooldown: true } },
      destruction: { spell1: { cooldown: false } },
    },
    movePoints: 0,
  },
  constants: {
    timerMovement: 30,
    isNewRound: false,
  },
  end: null,
});

describe('PhaseService', () => {
  let service: PhaseService;
  let resourceService: jest.Mocked<ResourceService>;
  let artifactStateService: jest.Mocked<ArtifactStateService>;
  let diceService: jest.Mocked<DiceService>;
  let artifactService: jest.Mocked<ArtifactService>;
  let spellService: jest.Mocked<SpellService>;
  let collectionService: jest.Mocked<CollectionService>;
  let lobbyService: jest.Mocked<LobbyService>;
  let gameTimerService: jest.Mocked<GameTimerService>;
  let usersStatsService: jest.Mocked<UsersStatsService>;
  let gameEffectsService: jest.Mocked<GameEffectsService>;

  const mockResourceService = {
    addResourceNewRound: jest.fn(),
    calculateNewTurnMovePoints: jest.fn(() => 3),
  };

  const mockArtifactStateService = {
    updateStateNewRound: jest.fn(),
  };

  const mockDiceService = {
    updateDicesNewRound: jest.fn(),
  };

  const mockArtifactService = {
    calculateAvailableActions: jest.fn(),
  };

  const mockSpellService = {
    calculateSpellActions: jest.fn(),
  };

  const mockCollectionService = {
    giveGold: jest.fn(),
  };

  const mockLobbyService = {
    changeLobbyState: jest.fn(),
  };

  const mockGameTimerService = {
    stopAllTimers: jest.fn(),
    startTimer: jest.fn(),
  };

  const mockUsersStatsService = {
    setWin: jest.fn(),
    setLose: jest.fn(),
  };

  const mockGameEffectsService = {
    checkNewRoundEffects: jest.fn(),
    calculateNewStateEffects: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhaseService,
        {
          provide: ResourceService,
          useValue: mockResourceService,
        },
        {
          provide: ArtifactStateService,
          useValue: mockArtifactStateService,
        },
        {
          provide: DiceService,
          useValue: mockDiceService,
        },
        {
          provide: ArtifactService,
          useValue: mockArtifactService,
        },
        {
          provide: SpellService,
          useValue: mockSpellService,
        },
        {
          provide: CollectionService,
          useValue: mockCollectionService,
        },
        {
          provide: LobbyService,
          useValue: mockLobbyService,
        },
        {
          provide: GameTimerService,
          useValue: mockGameTimerService,
        },
        {
          provide: UsersStatsService,
          useValue: mockUsersStatsService,
        },
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
      ],
    }).compile();

    service = module.get<PhaseService>(PhaseService);
    resourceService = module.get(ResourceService);
    artifactStateService = module.get(ArtifactStateService);
    diceService = module.get(DiceService);
    artifactService = module.get(ArtifactService);
    spellService = module.get(SpellService);
    collectionService = module.get(CollectionService);
    lobbyService = module.get(LobbyService);
    gameTimerService = module.get(GameTimerService);
    usersStatsService = module.get(UsersStatsService);
    gameEffectsService = module.get(GameEffectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('newRound', () => {
    const playerId = 'player-1';
    const enemyId = 'player-2';

    it('should start a new round successfully', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockResourceService.calculateNewTurnMovePoints.mockReturnValue(3);

      const result = await service.newRound(mockGameState);

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({
        text: 'Новый раунд.',
        type: LOG_TYPE.SYSTEM,
      });
      expect(result.player.isReady).toBe(false);
      expect(result.enemy.isReady).toBe(false);
      expect(result.constants.isNewRound).toBe(true);
      expect(result.miniPhase).toBe(MINIPHASE.MOVEMENT);
      
      expect(resourceService.addResourceNewRound).toHaveBeenCalledWith(mockGameState);
      expect(gameEffectsService.checkNewRoundEffects).toHaveBeenCalledWith(mockGameState);
      expect(artifactStateService.updateStateNewRound).toHaveBeenCalledWith(mockGameState);
      expect(diceService.updateDicesNewRound).toHaveBeenCalledWith(mockGameState);
      expect(gameTimerService.stopAllTimers).toHaveBeenCalledWith('game-123');
      expect(gameTimerService.startTimer).toHaveBeenCalledWith('game-123', TIMER_TYPE.MOVEMENT, 30);
    });

    it('should reset spell cooldowns for both players', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockResourceService.calculateNewTurnMovePoints.mockReturnValue(3);

      await service.newRound(mockGameState);

      expect(mockGameState.player.spells.light.spell1.cooldown).toBe(false);
      expect(mockGameState.player.spells.light.spell2.cooldown).toBe(false);
      expect(mockGameState.player.spells.dark.spell1.cooldown).toBe(false);
      expect(mockGameState.player.spells.destruction.spell1.cooldown).toBe(false);

      expect(mockGameState.enemy.spells.light.spell1.cooldown).toBe(false);
      expect(mockGameState.enemy.spells.dark.spell1.cooldown).toBe(false);
      expect(mockGameState.enemy.spells.destruction.spell1.cooldown).toBe(false);
    });

    it('should set current turn to player when player goes first', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockResourceService.calculateNewTurnMovePoints.mockReturnValue(3);
      jest.spyOn(service, 'setFirstPlayer').mockReturnValue(playerId);

      await service.newRound(mockGameState);

      expect(mockGameState.currentTurn).toBe(playerId);
      expect(artifactService.calculateAvailableActions).toHaveBeenCalled();
    });

    it('should set current turn to enemy when enemy goes first', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockResourceService.calculateNewTurnMovePoints.mockReturnValue(3);
      jest.spyOn(service, 'setFirstPlayer').mockReturnValue(enemyId);

      await service.newRound(mockGameState);

      expect(mockGameState.currentTurn).toBe(enemyId);
    });

    it('should not start timer if timerMovement is null', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.constants.timerMovement = null;
      mockResourceService.calculateNewTurnMovePoints.mockReturnValue(3);

      await service.newRound(mockGameState);

      expect(gameTimerService.startTimer).not.toHaveBeenCalled();
    });
  });

  describe('checkEndGame', () => {
    const playerId = 'player-1';
    const enemyId = 'player-2';

    it('should return false if both players have non-breaken artifacts', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.READY_TO_USE },
        'artifact-2': { state: ARTIFACT_STATE.COOLDOWN },
      };
      mockGameState.enemy.artifacts = {
        'artifact-3': { state: ARTIFACT_STATE.READY_TO_USE },
      };

      const result = await service.checkEndGame(mockGameState);

      expect(result).toBe(false);
      expect(mockGameState.end).toBeNull();
    });

    it('should return true and set winner to enemy when player has no non-breaken artifacts', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.BREAKEN },
        'artifact-2': { state: ARTIFACT_STATE.BREAKEN },
      };
      mockGameState.enemy.artifacts = {
        'artifact-3': { state: ARTIFACT_STATE.READY_TO_USE },
      };

      const result = await service.checkEndGame(mockGameState);

      expect(result).toBe(true);
      expect(mockGameState.end.winner).toBe(enemyId);
    });

    it('should return true and set winner to player when enemy has no non-breaken artifacts', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.READY_TO_USE },
      };
      mockGameState.enemy.artifacts = {
        'artifact-3': { state: ARTIFACT_STATE.BREAKEN },
        'artifact-4': { state: ARTIFACT_STATE.BREAKEN },
      };

      const result = await service.checkEndGame(mockGameState);

      expect(result).toBe(true);
      expect(mockGameState.end.winner).toBe(playerId);
    });

    it('should return true and set winner to null when both players have no non-breaken artifacts', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.BREAKEN },
      };
      mockGameState.enemy.artifacts = {
        'artifact-3': { state: ARTIFACT_STATE.BREAKEN },
      };

      const result = await service.checkEndGame(mockGameState);

      expect(result).toBe(true);
      expect(mockGameState.end.winner).toBeNull();
    });
  });

  describe('setEndGame', () => {
    const playerId = 'player-1';
    const enemyId = 'player-2';

    beforeEach(() => {
      mockCollectionService.giveGold.mockResolvedValue(undefined);
      mockUsersStatsService.setWin.mockResolvedValue(undefined);
      mockUsersStatsService.setLose.mockResolvedValue(undefined);
      mockLobbyService.changeLobbyState.mockResolvedValue(undefined);
    });

    it('should set end game with player as winner', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);

      await service.setEndGame(mockGameState, playerId);

      expect(mockGameState.end).toEqual({
        winner: playerId,
        winner_prize: WINNER_PRIZE,
        loser_prize: LOSER_PRIZE,
        draw_prize: 0,
      });
      expect(mockGameState.player.offerDraw).toBe(false);
      expect(mockGameState.enemy.offerDraw).toBe(false);
      expect(collectionService.giveGold).toHaveBeenCalledWith(playerId, WINNER_PRIZE);
      expect(collectionService.giveGold).toHaveBeenCalledWith(enemyId, LOSER_PRIZE);
      expect(usersStatsService.setWin).toHaveBeenCalledWith(playerId);
      expect(usersStatsService.setLose).toHaveBeenCalledWith(enemyId);
      expect(lobbyService.changeLobbyState).toHaveBeenCalledWith('game-123', LOBBY_STATE_TYPE.END);
    });

    it('should set end game with enemy as winner', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);

      await service.setEndGame(mockGameState, enemyId);

      expect(mockGameState.end).toEqual({
        winner: enemyId,
        winner_prize: WINNER_PRIZE,
        loser_prize: LOSER_PRIZE,
        draw_prize: 0,
      });
      expect(collectionService.giveGold).toHaveBeenCalledWith(playerId, LOSER_PRIZE);
      expect(collectionService.giveGold).toHaveBeenCalledWith(enemyId, WINNER_PRIZE);
      expect(usersStatsService.setWin).toHaveBeenCalledWith(enemyId);
      expect(usersStatsService.setLose).toHaveBeenCalledWith(playerId);
    });

    it('should set draw when winner is null', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);

      await service.setEndGame(mockGameState, null);

      expect(mockGameState.end).toEqual({
        winner: null,
        winner_prize: 0,
        loser_prize: 0,
        draw_prize: DRAW_PRIZE,
      });
      expect(collectionService.giveGold).toHaveBeenCalledWith(playerId, DRAW_PRIZE);
      expect(collectionService.giveGold).toHaveBeenCalledWith(enemyId, DRAW_PRIZE);
      expect(usersStatsService.setWin).not.toHaveBeenCalled();
      expect(usersStatsService.setLose).toHaveBeenCalled();
    });

    it('should not give gold or update stats when enemy is bot', async () => {
      const mockGameState = createMockGameState(playerId, enemyId, true);

      await service.setEndGame(mockGameState, playerId);

      expect(mockGameState.end).toEqual({
        winner: playerId,
        winner_prize: 0,
        loser_prize: 0,
        draw_prize: 0,
      });
      expect(collectionService.giveGold).not.toHaveBeenCalled();
      expect(usersStatsService.setWin).not.toHaveBeenCalled();
      expect(usersStatsService.setLose).not.toHaveBeenCalled();
    });
  });

  describe('calculateNewState', () => {
    const playerId = 'player-1';
    const enemyId = 'player-2';

    it('should calculate new state for player', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      const player = mockGameState.player;
      jest.spyOn(service, 'checkEndGame').mockResolvedValue(false);

      await service.calculateNewState(mockGameState, player);

      expect(artifactService.calculateAvailableActions).toHaveBeenCalledWith(
        mockGameState,
        player,
        mockGameState.enemy
      );
      expect(spellService.calculateSpellActions).toHaveBeenCalledWith(
        mockGameState,
        player,
        mockGameState.enemy
      );
      expect(gameEffectsService.calculateNewStateEffects).toHaveBeenCalledWith(
        mockGameState,
        player,
        mockGameState.enemy
      );
    });

    it('should calculate new state for enemy', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      const enemy = mockGameState.enemy;
      jest.spyOn(service, 'checkEndGame').mockResolvedValue(false);

      await service.calculateNewState(mockGameState, enemy);

      expect(artifactService.calculateAvailableActions).toHaveBeenCalledWith(
        mockGameState,
        enemy,
        mockGameState.player
      );
    });

    it('should not check end game if skipCheckEnd is true', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      const player = mockGameState.player;
      const checkEndGameSpy = jest.spyOn(service, 'checkEndGame');

      await service.calculateNewState(mockGameState, player, true);

      expect(checkEndGameSpy).not.toHaveBeenCalled();
    });

    it('should return early if game ended', async () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      const player = mockGameState.player;
      jest.spyOn(service, 'checkEndGame').mockResolvedValue(true);

      await service.calculateNewState(mockGameState, player);

      expect(artifactService.calculateAvailableActions).not.toHaveBeenCalled();
      expect(spellService.calculateSpellActions).not.toHaveBeenCalled();
      expect(gameEffectsService.calculateNewStateEffects).not.toHaveBeenCalled();
    });
  });

  describe('setFirstPlayer', () => {
    const playerId = 'player-1';
    const enemyId = 'player-2';

    it('should return player when enemy is bot', () => {
      const mockGameState = createMockGameState(playerId, enemyId, true);

      const result = service.setFirstPlayer(mockGameState);

      expect(result).toBe(playerId);
    });

    it('should return enemy when player has more artifacts', () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.READY_TO_USE },
        'artifact-2': { state: ARTIFACT_STATE.READY_TO_USE },
        'artifact-3': { state: ARTIFACT_STATE.BREAKEN },
      };
      mockGameState.enemy.artifacts = {
        'artifact-4': { state: ARTIFACT_STATE.READY_TO_USE },
      };

      const result = service.setFirstPlayer(mockGameState);

      expect(result).toBe(enemyId);
    });

    it('should return player when enemy has more artifacts', () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.READY_TO_USE },
      };
      mockGameState.enemy.artifacts = {
        'artifact-2': { state: ARTIFACT_STATE.READY_TO_USE },
        'artifact-3': { state: ARTIFACT_STATE.READY_TO_USE },
        'artifact-4': { state: ARTIFACT_STATE.BREAKEN },
      };

      const result = service.setFirstPlayer(mockGameState);

      expect(result).toBe(playerId);
    });

    it('should compare total HP when artifact counts are equal', () => {
      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 30 },
        'artifact-2': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 25 },
      };
      mockGameState.enemy.artifacts = {
        'artifact-3': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 20 },
        'artifact-4': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 30 },
      };

      const result = service.setFirstPlayer(mockGameState);

      expect(result).toBe(enemyId);
    });

    it('should use random when counts and HP are equal', () => {
      const { randomInt } = require('crypto');
      randomInt.mockReturnValue(1);

      const mockGameState = createMockGameState(playerId, enemyId);
      mockGameState.player.artifacts = {
        'artifact-1': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 30 },
        'artifact-2': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 20 },
      };
      mockGameState.enemy.artifacts = {
        'artifact-3': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 30 },
        'artifact-4': { state: ARTIFACT_STATE.READY_TO_USE, currentHp: 20 },
      };

      const result = service.setFirstPlayer(mockGameState);

      expect(result).toBe(playerId);
    });
  });
});