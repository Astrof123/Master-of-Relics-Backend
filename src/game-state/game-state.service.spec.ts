
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { forwardRef } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { RedisService } from '../redis/redis.service';
import { LobbyService } from '../lobby/lobby.service';
import { GameTimerService } from './game-timer.service';
import { DeckService } from '../collection/deck.service';
import { ArtifactStateService } from '../game-mechanics/artifact-state.service';
import { LOBBY_STATE_TYPE } from '../lobby/types/lobby';
import { LOBBY_ERROR_CODE, LobbyException } from '../lobby/types/lobby-exceptions';
import { GAME_ERROR_CODE, GameException } from './types/game-exceptions';
import { PHASE, MINIPHASE } from './types/phase';
import { CONNECTIONGAME, ARTIFACT_STATE } from './types/game';
import { TIMER_TYPE } from './types/timer';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from '../game-mechanics/constants/settings';


jest.mock('../artifact/constants/artifacts', () => ({
  ARTIFACTS: {
    'arcane_shield': { id: 'arcane_shield', hp: 30, skills: ['shield'], price: 100, isForSale: true },
    'moon_staff': { id: 'moon_staff', hp: 25, skills: ['heal'], price: 150, isForSale: true },
  },
}));

jest.mock('../artifact/constants/skills', () => ({
  SKILLS: {
    'shield': { cost: 2 },
    'heal': { cost: 3 },
  },
}));

jest.mock('../spell/constants/spells', () => ({
  SPELLS: {},
}));

jest.mock('../spell/spell.helper', () => ({
  SpellHelper: {
    getDefaultSpellState: jest.fn(() => ({})),
  },
}));

const createMockLobby = (id: string, userId: string, enemyId: string, isReady: boolean = true): any => ({
  id,
  name: 'Test Lobby',
  state: LOBBY_STATE_TYPE.WAITING,
  players: {
    [userId]: { id: userId, nickname: 'Player1', isHost: true, isReady },
    [enemyId]: { id: enemyId, nickname: 'Player2', isHost: false, isReady },
  },
  options: {
    timerDraft: 30,
    timerMovement: 20,
    timerTurn: 15,
  },
});

const createMockDeckResponse = () => ({
  decks: [
    {
      id: 1,
      isActive: true,
      cards: [
        { innerCardId: 'arcane_shield', id: 1 },
        { innerCardId: 'moon_staff', id: 2 },
      ],
    },
  ],
});

describe('GameStateService', () => {
  let service: GameStateService;
  let redisService: jest.Mocked<RedisService>;
  let lobbyService: jest.Mocked<LobbyService>;
  let gameTimerService: jest.Mocked<GameTimerService>;
  let deckService: jest.Mocked<DeckService>;
  let artifactStateService: jest.Mocked<ArtifactStateService>;

  const mockRedisService = {
    setJson: jest.fn(),
    getJson: jest.fn(),
    delete: jest.fn(),
    addToSortedSet: jest.fn(),
    removeFromSortedSet: jest.fn(),
    getSortedSetRange: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    jsonSetInTransaction: jest.fn(),
  };

  const mockLobbyService = {
    getLobbyById: jest.fn(),
    getLobbyKey: jest.fn(),
    getLobbyIndexesKey: jest.fn(),
  };

  const mockGameTimerService = {
    startTimer: jest.fn(),
  };

  const mockDeckService = {
    getUserDecks: jest.fn(),
    getBotGameDeck: jest.fn(),
  };

  const mockArtifactStateService = {
    clearDestroyedArtifacts: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameStateService,
        {
          provide: RedisService,
          useValue: mockRedisService,
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
          provide: DeckService,
          useValue: mockDeckService,
        },
        {
          provide: ArtifactStateService,
          useValue: mockArtifactStateService,
        },
      ],
    }).compile();

    service = module.get<GameStateService>(GameStateService);
    redisService = module.get(RedisService);
    lobbyService = module.get(LobbyService);
    gameTimerService = module.get(GameTimerService);
    deckService = module.get(DeckService);
    artifactStateService = module.get(ArtifactStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKeyGame', () => {
    it('should return correct game key', () => {
      expect(service.getKeyGame('game-123')).toBe('game:game-123');
    });
  });

  describe('createGameSessionState', () => {
    const lobbyId = 'lobby-123';
    const userId = 'user-1';
    const enemyId = 'user-2';

    it('should create game session successfully', async () => {
      const mockLobby = createMockLobby(lobbyId, userId, enemyId);
      const mockDeckResponse = createMockDeckResponse();

      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);
      deckService.getUserDecks.mockResolvedValue(mockDeckResponse as any);
      mockRedisService.setJson.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockGameTimerService.startTimer.mockResolvedValue(undefined);

      const result = await service.createGameSessionState(lobbyId, userId);

      expect(result).toBe(lobbyId);
      expect(mockLobbyService.getLobbyById).toHaveBeenCalledWith(lobbyId);
      expect(deckService.getUserDecks).toHaveBeenCalledTimes(2);
      expect(mockRedisService.setJson).toHaveBeenCalled();
      expect(mockRedisService.addToSortedSet).toHaveBeenCalled();
    });

    it('should throw LOBBY_NOT_FOUND if lobby not found', async () => {
      mockLobbyService.getLobbyById.mockResolvedValue(null);

      await expect(service.createGameSessionState(lobbyId, userId)).rejects.toThrow(LobbyException);
    });

    it('should throw LOBBY_ALREADY_STARTED if lobby state is not waiting', async () => {
      const mockLobby = { ...createMockLobby(lobbyId, userId, enemyId), state: LOBBY_STATE_TYPE.PLAYING };
      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);

      await expect(service.createGameSessionState(lobbyId, userId)).rejects.toThrow(LobbyException);
    });

    it('should throw PLAYER_NOT_IN_LOBBY if user not in lobby', async () => {
      const mockLobby = { ...createMockLobby(lobbyId, userId, enemyId), players: {} };
      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);

      await expect(service.createGameSessionState(lobbyId, userId)).rejects.toThrow(LobbyException);
    });

    it('should throw PLAYER_NOT_HOST if user is not host', async () => {
      const mockLobby = createMockLobby(lobbyId, userId, enemyId);
      mockLobby.players[userId].isHost = false;
      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);

      await expect(service.createGameSessionState(lobbyId, userId)).rejects.toThrow(LobbyException);
    });

    it('should throw LOBBY_NOT_FULL if no enemy', async () => {
      const mockLobby = {
        id: lobbyId,
        state: LOBBY_STATE_TYPE.WAITING,
        players: { [userId]: { id: userId, isHost: true, isReady: true } },
      };
      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);

      await expect(service.createGameSessionState(lobbyId, userId)).rejects.toThrow(LobbyException);
    });

    it('should throw LOBBY_NOT_ALL_READY if players not ready', async () => {
      const mockLobby = createMockLobby(lobbyId, userId, enemyId, false);
      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);

      await expect(service.createGameSessionState(lobbyId, userId)).rejects.toThrow(LobbyException);
    });

    it('should start draft timer if configured', async () => {
      const mockLobby = createMockLobby(lobbyId, userId, enemyId);
      const mockDeckResponse = createMockDeckResponse();

      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);
      deckService.getUserDecks.mockResolvedValue(mockDeckResponse as any);
      mockRedisService.setJson.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);
      mockGameTimerService.startTimer.mockResolvedValue(undefined);

      await service.createGameSessionState(lobbyId, userId);

      expect(mockGameTimerService.startTimer).toHaveBeenCalledWith(lobbyId, TIMER_TYPE.DRAFT, 30);
    });
  });

  describe('createGameSessionWithBotState', () => {
    const lobbyId = 'lobby-123';
    const userId = 'user-1';

    it('should create game session with bot successfully', async () => {
      const mockLobby = {
        id: lobbyId,
        state: LOBBY_STATE_TYPE.WAITING,
        players: { [userId]: { id: userId, nickname: 'Player1', isHost: true, isReady: true } },
        options: { timerDraft: null, timerMovement: null, timerTurn: null },
      };
      const mockDeckResponse = createMockDeckResponse();
      const mockBotDeck = [{ artifactId: 'bot_card', maxHp: 30, skillCost: 2 }];

      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby);
      deckService.getUserDecks.mockResolvedValue(mockDeckResponse as any);
      deckService.getBotGameDeck.mockResolvedValue(mockBotDeck as any);
      mockRedisService.setJson.mockResolvedValue(undefined);
      mockRedisService.addToSortedSet.mockResolvedValue(undefined);

      const result = await service.createGameSessionWithBotState(lobbyId, userId);

      expect(result).toBe(lobbyId);
      expect(deckService.getBotGameDeck).toHaveBeenCalled();
    });

    it('should throw LOBBY_NOT_FOUND if lobby not found', async () => {
      mockLobbyService.getLobbyById.mockResolvedValue(null);

      await expect(service.createGameSessionWithBotState(lobbyId, userId)).rejects.toThrow(LobbyException);
    });
  });

  describe('getGameById', () => {
    it('should return game if exists', async () => {
      const mockGame = { id: 'game-123', name: 'Test Game' };
      mockRedisService.getJson.mockResolvedValue(mockGame);

      const result = await service.getGameById('game-123');

      expect(result).toEqual(mockGame);
      expect(mockRedisService.getJson).toHaveBeenCalledWith('game:game-123');
    });

    it('should return null if game not found', async () => {
      mockRedisService.getJson.mockResolvedValue(null);

      const result = await service.getGameById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getGameForClientById', () => {
    const gameId = 'game-123';
    const userId = 'user-1';
    const enemyId = 'user-2';

    it('should return game for client', async () => {
      const mockGame = {
        id: gameId,
        name: 'Test Game',
        phase: PHASE.DRAFT,
        currentTurn: userId,
        logs: [],
        players: {
          [userId]: { id: userId, name: 'Player1', connection: CONNECTIONGAME.OFFLINE, resources: {}, artifacts: {}, effects: [], isReady: false, movePoints: 0, draft: { deck: [] }, offerDraw: false },
          [enemyId]: { id: enemyId, name: 'Player2', connection: CONNECTIONGAME.OFFLINE, resources: {}, artifacts: {}, effects: [], isReady: false, movePoints: 0, draft: { deck: [] }, offerDraw: false },
        },
        end: null,
        miniPhase: MINIPHASE.MOVEMENT,
        constants: { maxCountArtifactsOnLine: MAX_COUNT_ARTIFACTS_ON_LINE, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false },
      };

      mockRedisService.getJson.mockResolvedValue(mockGame);

      const result = await service.getGameForClientById(gameId, userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(gameId);
    });

    it('should return null if game not found', async () => {
      mockRedisService.getJson.mockResolvedValue(null);

      const result = await service.getGameForClientById(gameId, userId);

      expect(result).toBeNull();
    });

    it('should throw PLAYER_NOT_IN_GAME if user not in game', async () => {
      const mockGame = {
        id: gameId,
        players: { [enemyId]: {} },
      };
      mockRedisService.getJson.mockResolvedValue(mockGame);

      await expect(service.getGameForClientById(gameId, userId)).rejects.toThrow(GameException);
    });

    it('should throw ENEMY_NOT_FOUND if no enemy', async () => {
      const mockGame = {
        id: gameId,
        players: { [userId]: {} },
      };
      mockRedisService.getJson.mockResolvedValue(mockGame);

      await expect(service.getGameForClientById(gameId, userId)).rejects.toThrow(GameException);
    });
  });

  describe('getGameForLogicById', () => {
    const gameId = 'game-123';
    const userId = 'user-1';
    const enemyId = 'user-2';

    it('should return game for logic', async () => {
      const mockGame = {
        id: gameId,
        name: 'Test Game',
        phase: PHASE.DRAFT,
        currentTurn: userId,
        logs: [],
        players: {
          [userId]: { id: userId, name: 'Player1' },
          [enemyId]: { id: enemyId, name: 'Player2' },
        },
        end: null,
        miniPhase: MINIPHASE.MOVEMENT,
        constants: {},
      };

      mockRedisService.getJson.mockResolvedValue(mockGame);

      const result = await service.getGameForLogicById(gameId, userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(gameId);
    });
  });

  describe('saveGameForLogic', () => {
    const gameId = 'game-123';
    const key = `game:${gameId}`;
    const mockGameState = {
      id: gameId,
      name: 'Test Game',
      phase: PHASE.DRAFT,
      currentTurn: 'user-1',
      logs: [],
      player: { id: 'user-1', name: 'Player1', artifacts: {} },
      enemy: { id: 'user-2', name: 'Player2', artifacts: {} },
      end: null,
      miniPhase: MINIPHASE.MOVEMENT,
      constants: { isNewRound: false },
    };

    it('should save game state', async () => {
      mockLobbyService.getLobbyKey.mockReturnValue(`lobby:${gameId}`);
      mockLobbyService.getLobbyIndexesKey.mockReturnValue('lobbies:index');
      mockRedisService.setJson.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);

      await service.saveGameForLogic(mockGameState as any, key);

      expect(artifactStateService.clearDestroyedArtifacts).toHaveBeenCalled();
      expect(mockRedisService.setJson).toHaveBeenCalled();
    });
  });

  describe('setPlayerConnectionStatus', () => {
    const gameId = 'game-123';
    const userId = 'user-1';

    it('should set player connection status', async () => {
      mockRedisService.setJson.mockResolvedValue(undefined);

      await service.setPlayerConnectionStatus(CONNECTIONGAME.ONLINE, gameId, userId);

      expect(mockRedisService.setJson).toHaveBeenCalled();
    });
  });

  describe('getGameByUserId', () => {
    const userId = 'user-1';

    it('should return game where user is a player', async () => {
      const mockGameIds = ['game-1', 'game-2'];
      const mockGame1 = { id: 'game-1', players: { [userId]: {} } };
      const mockGame2 = { id: 'game-2', players: { 'other': {} } };

      mockRedisService.getSortedSetRange.mockResolvedValue(mockGameIds);
      mockRedisService.getJson
        .mockResolvedValueOnce(mockGame1)
        .mockResolvedValueOnce(mockGame2);

      const result = await service.getGameByUserId(userId);

      expect(result).toEqual(mockGame1);
    });

    it('should return null if user not in any game', async () => {
      mockRedisService.getSortedSetRange.mockResolvedValue([]);

      const result = await service.getGameByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('getAllGameIds', () => {
    it('should return all game ids', async () => {
      const mockIds = ['game-1', 'game-2'];
      mockRedisService.getSortedSetRange.mockResolvedValue(mockIds);

      const result = await service.getAllGameIds();

      expect(result).toEqual(mockIds);
    });
  });

  describe('deleteGame', () => {
    const gameId = 'game-123';

    it('should delete game successfully', async () => {
      mockRedisService.getJson.mockResolvedValue({ id: gameId });
      mockRedisService.delete.mockResolvedValue(undefined);
      mockRedisService.removeFromSortedSet.mockResolvedValue(undefined);

      await service.deleteGame(gameId);

      expect(mockRedisService.delete).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockRedisService.removeFromSortedSet).toHaveBeenCalledWith('games:index', gameId);
    });

    it('should throw GAME_NOT_FOUND if game not found', async () => {
      mockRedisService.getJson.mockResolvedValue(null);

      await expect(service.deleteGame(gameId)).rejects.toThrow(GameException);
    });
  });

  describe('Timer methods', () => {
    const gameId = 'game-123';

    describe('startGameTimer', () => {
      it('should start timer with specified duration', async () => {
        mockRedisService.setJson.mockResolvedValue(undefined);

        const result = await service.startGameTimer(gameId, TIMER_TYPE.DRAFT, 60);

        expect(result).toBe(`timer:${gameId}:draft`);
        expect(mockRedisService.setJson).toHaveBeenCalled();
      });

      it('should use default duration if not specified', async () => {
        mockRedisService.setJson.mockResolvedValue(undefined);

        await service.startGameTimer(gameId, TIMER_TYPE.DRAFT, 0);

        expect(mockRedisService.setJson).toHaveBeenCalled();
      });
    });

    describe('cancelGameTimer', () => {
      it('should cancel timer', async () => {
        mockRedisService.delete.mockResolvedValue(undefined);

        await service.cancelGameTimer(gameId, TIMER_TYPE.DRAFT);

        expect(mockRedisService.delete).toHaveBeenCalledWith(`timer:${gameId}:draft`);
      });
    });

    describe('cancelAllGameTimers', () => {
      it('should cancel all timers', async () => {
        mockRedisService.delete.mockResolvedValue(undefined);

        await service.cancelAllGameTimers(gameId);

        expect(mockRedisService.delete).toHaveBeenCalledTimes(3);
      });
    });

    describe('getTimerRemaining', () => {
      it('should return remaining time', async () => {
        mockRedisService.ttl.mockResolvedValue(30);

        const result = await service.getTimerRemaining(gameId, TIMER_TYPE.DRAFT);

        expect(result).toBe(30);
      });
    });

    describe('isTimerActive', () => {
      it('should return true if timer active', async () => {
        mockRedisService.ttl.mockResolvedValue(30);

        const result = await service.isTimerActive(gameId, TIMER_TYPE.DRAFT);

        expect(result).toBe(true);
      });

      it('should return false if timer not active', async () => {
        mockRedisService.ttl.mockResolvedValue(-2);

        const result = await service.isTimerActive(gameId, TIMER_TYPE.DRAFT);

        expect(result).toBe(false);
      });
    });

    describe('getTimerInfo', () => {
      it('should return timer info', async () => {
        const mockTimerData = {
          gameId,
          type: TIMER_TYPE.DRAFT,
          startedAt: Date.now(),
          duration: 60,
        };
        mockRedisService.getJson.mockResolvedValue(mockTimerData);
        mockRedisService.ttl.mockResolvedValue(30);

        const result = await service.getTimerInfo(gameId, TIMER_TYPE.DRAFT);

        expect(result).not.toBeNull();
        expect(result?.active).toBe(true);
        expect(result?.remaining).toBe(30);
      });

      it('should return null if no timer', async () => {
        mockRedisService.getJson.mockResolvedValue(null);
        mockRedisService.ttl.mockResolvedValue(-2);

        const result = await service.getTimerInfo(gameId, TIMER_TYPE.DRAFT);

        expect(result).toBeNull();
      });
    });

    describe('getActiveTimer', () => {
      it('should return active timer type', async () => {
        mockRedisService.ttl
          .mockResolvedValueOnce(-2)
          .mockResolvedValueOnce(30)
          .mockResolvedValueOnce(-2);

        const result = await service.getActiveTimer(gameId);

        expect(result).toBe(TIMER_TYPE.MOVEMENT);
      });

      it('should return null if no active timers', async () => {
        mockRedisService.ttl
          .mockResolvedValueOnce(-2)
          .mockResolvedValueOnce(-2)
          .mockResolvedValueOnce(-2);

        const result = await service.getActiveTimer(gameId);

        expect(result).toBeNull();
      });
    });
  });
});