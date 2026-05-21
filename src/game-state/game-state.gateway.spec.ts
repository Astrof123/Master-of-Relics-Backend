
import { Test, TestingModule } from '@nestjs/testing';
import { GameStateGateway } from './game-state.gateway';
import { GameStateService } from './game-state.service';
import { LobbyService } from '../lobby/lobby.service';
import { GameTimerService } from './game-timer.service';
import { DraftService } from '../draft/draft.service';
import { ActionService } from '../action/action.service';
import { Server, Socket } from 'socket.io';
import { GAME_EVENT_NAME } from './types/game-events-name';
import { LOBBY_EVENT_NAME } from '../lobby/types/lobby-events-name';
import { LOBBY_ROOMS_NAME } from '../lobby/types/lobby-rooms-name';
import { CONNECTIONGAME } from './types/game';
import { TIMER_TYPE } from './types/timer';
import { PHASE, MINIPHASE } from './types/phase';
import { GameException, GAME_ERROR_CODE } from './types/game-exceptions';
import Redis from 'ioredis';


const mockRedisClient = {
  duplicate: jest.fn(),
  on: jest.fn(),
  punsubscribe: jest.fn(),
  quit: jest.fn(),
  psubscribe: jest.fn(),
};


const createMockSocket = (userId: string = 'user-123'): any => ({
  data: { userId },
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  id: 'socket-123',
});

describe('GameStateGateway', () => {
  let gateway: GameStateGateway;
  let gameStateService: jest.Mocked<GameStateService>;
  let lobbyService: jest.Mocked<LobbyService>;
  let gameTimerService: jest.Mocked<GameTimerService>;
  let draftService: jest.Mocked<DraftService>;
  let actionService: jest.Mocked<ActionService>;
  let mockServer: Server;

  const mockGameStateService = {
    getGameById: jest.fn(),
    getGameForClientById: jest.fn(),
    createGameSessionState: jest.fn(),
    createGameSessionWithBotState: jest.fn(),
    setPlayerConnectionStatus: jest.fn(),
    getGameByUserId: jest.fn(),
    getActiveTimer: jest.fn(),
    getTimerInfo: jest.fn(),
    deleteGame: jest.fn(),
  };

  const mockLobbyService = {
    getLobbyById: jest.fn(),
  };

  const mockGameTimerService = {
    setServer: jest.fn(),
    startTimer: jest.fn(),
    stopAllTimers: jest.fn(),
  };

  const mockDraftService = {
    autoFinishDraft: jest.fn(),
  };

  const mockActionService = {
    autoToggleReadyMovement: jest.fn(),
    autoEndTurn: jest.fn(),
    autoGiveUp: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisClient.duplicate.mockReturnValue(mockRedisClient);
    mockRedisClient.on.mockImplementation((event, callback) => {});
    mockRedisClient.psubscribe.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameStateGateway,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
        {
          provide: GameStateService,
          useValue: mockGameStateService,
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
          provide: DraftService,
          useValue: mockDraftService,
        },
        {
          provide: ActionService,
          useValue: mockActionService,
        },
      ],
    }).compile();

    gateway = module.get<GameStateGateway>(GameStateGateway);
    gameStateService = module.get(GameStateService);
    lobbyService = module.get(LobbyService);
    gameTimerService = module.get(GameTimerService);
    draftService = module.get(DraftService);
    actionService = module.get(ActionService);

    mockServer = { to: jest.fn().mockReturnThis(), emit: jest.fn(), in: jest.fn().mockReturnThis() } as any;
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should initialize timer service and subscribe to expired keys', async () => {
      await gateway.afterInit();

      expect(gameTimerService.setServer).toHaveBeenCalledWith(mockServer);
      expect(mockRedisClient.duplicate).toHaveBeenCalled();
      expect(mockRedisClient.psubscribe).toHaveBeenCalledWith('__keyevent@0__:expired');
    });
  });

  describe('handleExpiredKey', () => {
    it('should handle draft timer expiration', async () => {
      const gameId = 'game-123';
      const key = `timer:${gameId}:draft`;
      const mockGameState = { id: gameId, phase: PHASE.DRAFT, end: null, players: {} };

      mockGameStateService.getGameById.mockResolvedValue(mockGameState as any);

      await (gateway as any).handleExpiredKey(key);

      expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(GAME_EVENT_NAME.TIMER_EXPIRED, {
        gameId,
        timerType: TIMER_TYPE.DRAFT,
        timestamp: expect.any(Number),
      });
    });

    it('should handle movement timer expiration', async () => {
      const gameId = 'game-123';
      const key = `timer:${gameId}:movement`;
      const mockGameState = { id: gameId, miniPhase: MINIPHASE.MOVEMENT, end: null, players: {} };

      mockGameStateService.getGameById.mockResolvedValue(mockGameState as any);

      await (gateway as any).handleExpiredKey(key);

      expect(mockServer.emit).toHaveBeenCalled();
    });

    it('should handle turn timer expiration', async () => {
      const gameId = 'game-123';
      const key = `timer:${gameId}:turn`;
      const mockGameState = { id: gameId, miniPhase: MINIPHASE.BATTLE, end: null, players: {}, currentTurn: 'user-123' };
      const mockPlayer = { id: 'user-123', extraData: { skippedMoves: 0 } };

      mockGameStateService.getGameById.mockResolvedValue(mockGameState as any);
      mockActionService.autoEndTurn.mockResolvedValue(true);

      await (gateway as any).handleExpiredKey(key);

      expect(mockServer.emit).toHaveBeenCalled();
    });

    it('should ignore non-timer keys', async () => {
      await (gateway as any).handleExpiredKey('other-key');
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    const userId = 'user-123';
    const mockSocket = createMockSocket(userId);

    it('should handle player disconnect and update connection status', async () => {
      const mockGame = { id: 'game-123', players: { [userId]: {} } };
      const mockGameForClient = {
        player: { name: 'Player1' },
        enemy: { name: 'Player2', connection: CONNECTIONGAME.ONLINE },
      };

      mockGameStateService.getGameByUserId.mockResolvedValue(mockGame as any);
      mockGameStateService.getGameForClientById.mockResolvedValue(mockGameForClient as any);

      await gateway.handleDisconnect(mockSocket);

      expect(mockGameStateService.setPlayerConnectionStatus).toHaveBeenCalledWith(
        CONNECTIONGAME.OFFLINE,
        mockGame.id,
        userId
      );
      expect(mockSocket.to).toHaveBeenCalledWith(`game-${mockGame.id}`);
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it('should do nothing if user not in game', async () => {
      mockGameStateService.getGameByUserId.mockResolvedValue(null);

      await gateway.handleDisconnect(mockSocket);

      expect(mockGameStateService.setPlayerConnectionStatus).not.toHaveBeenCalled();
    });
  });

  describe('handleCreateGame', () => {
    const userId = 'user-123';
    const lobbyId = 'lobby-123';
    const gameId = 'game-123';
    const mockSocket = createMockSocket(userId);
    const mockCallback = jest.fn();

    it('should create game successfully', async () => {
      const mockLobby = { id: lobbyId, name: 'Test Lobby' };

      mockGameStateService.createGameSessionState.mockResolvedValue(gameId);
      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

      await gateway.handleCreateGame(mockSocket, lobbyId, mockCallback);

      expect(mockGameStateService.createGameSessionState).toHaveBeenCalledWith(lobbyId, userId);
      expect(mockSocket.to).toHaveBeenCalledWith(`lobby-${gameId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(LOBBY_EVENT_NAME.GAME_STARTED, gameId);
      expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
      expect(mockServer.emit).toHaveBeenCalledWith(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED);
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: { gameId },
        message: "Вы успешно начали матч",
      });
    });

    it('should handle errors', async () => {
      const error = new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
      mockGameStateService.createGameSessionState.mockRejectedValue(error);

      await gateway.handleCreateGame(mockSocket, lobbyId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });
  });

  describe('handleCreateGameWithBot', () => {
    const userId = 'user-123';
    const lobbyId = 'lobby-123';
    const gameId = 'game-123';
    const mockSocket = createMockSocket(userId);
    const mockCallback = jest.fn();

    it('should create game with bot successfully', async () => {
      const mockLobby = { id: lobbyId, name: 'Test Lobby' };

      mockGameStateService.createGameSessionWithBotState.mockResolvedValue(gameId);
      mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

      await gateway.handleCreateGameWithBot(mockSocket, lobbyId, mockCallback);

      expect(mockGameStateService.createGameSessionWithBotState).toHaveBeenCalledWith(lobbyId, userId);
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: { gameId },
        message: "Вы успешно начали матч с ботом",
      });
    });
  });

  describe('handleJoinGame', () => {
    const userId = 'user-123';
    const gameId = 'game-123';
    const mockSocket = createMockSocket(userId);
    const mockCallback = jest.fn();

    it('should join game successfully', async () => {
      const mockGame = {
        id: gameId,
        player: { name: 'Player1' },
        enemy: { name: 'Player2', connection: CONNECTIONGAME.OFFLINE },
      };
      const mockTimerInfo = { active: true, remaining: 30 };

      mockGameStateService.getGameForClientById.mockResolvedValue(mockGame as any);
      mockGameStateService.setPlayerConnectionStatus.mockResolvedValue(undefined);
      mockGameStateService.getActiveTimer.mockResolvedValue(TIMER_TYPE.TURN);
      mockGameStateService.getTimerInfo.mockResolvedValue(mockTimerInfo as any);

      await gateway.handleJoinGame(mockSocket, gameId, mockCallback);

      expect(mockGameStateService.getGameForClientById).toHaveBeenCalledWith(gameId, userId);
      expect(mockSocket.join).toHaveBeenCalledWith(`game-${gameId}`);
      expect(mockGameStateService.setPlayerConnectionStatus).toHaveBeenCalledWith(
        CONNECTIONGAME.ONLINE,
        gameId,
        userId
      );
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: {
          gameState: mockGame,
          playersOnline: expect.any(Object),
          timer: mockTimerInfo,
        },
        message: "Вы успешно подключились к игре",
      });
    });

    it('should throw error if game not found', async () => {
      mockGameStateService.getGameForClientById.mockResolvedValue(null);

      await gateway.handleJoinGame(mockSocket, gameId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });
  });

  describe('handleGetGameState', () => {
    const userId = 'user-123';
    const gameId = 'game-123';
    const mockSocket = createMockSocket(userId);
    const mockCallback = jest.fn();

    it('should return game state successfully', async () => {
      const mockGame = { id: gameId, name: 'Test Game' };

      mockGameStateService.getGameForClientById.mockResolvedValue(mockGame as any);

      await gateway.handleGetGameState(mockSocket, gameId, mockCallback);

      expect(mockGameStateService.getGameForClientById).toHaveBeenCalledWith(gameId, userId);
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: { gameState: mockGame },
        message: "Вы успешно получили игровое состояние",
      });
    });

    it('should throw error if game not found', async () => {
      mockGameStateService.getGameForClientById.mockResolvedValue(null);

      await gateway.handleGetGameState(mockSocket, gameId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });
  });

  describe('Timer handlers', () => {
    const gameId = 'game-123';

    describe('handleDraftTimeout', () => {
      it('should auto finish draft for players not ready', async () => {
        const mockGameState = {
          id: gameId,
          phase: PHASE.DRAFT,
          end: null,
          players: {
            'user-1': { id: 'user-1', isReady: false },
            'user-2': { id: 'user-2', isReady: true },
          },
        };

        mockGameStateService.getGameById.mockResolvedValue(mockGameState as any);
        draftService.autoFinishDraft.mockResolvedValue(undefined);

        await (gateway as any).handleDraftTimeout(gameId);

        expect(draftService.autoFinishDraft).toHaveBeenCalledWith(gameId, 'user-1');
        expect(draftService.autoFinishDraft).not.toHaveBeenCalledWith(gameId, 'user-2');
      });
    });

    describe('handleMovementTimeout', () => {
      it('should auto toggle ready for players not ready', async () => {
        const mockGameState = {
          id: gameId,
          miniPhase: MINIPHASE.MOVEMENT,
          end: null,
          players: {
            'user-1': { id: 'user-1', isReady: false },
            'user-2': { id: 'user-2', isReady: true },
          },
        };

        mockGameStateService.getGameById.mockResolvedValue(mockGameState as any);
        actionService.autoToggleReadyMovement.mockResolvedValue(undefined);

        await (gateway as any).handleMovementTimeout(gameId);

        expect(actionService.autoToggleReadyMovement).toHaveBeenCalledWith(gameId, 'user-1');
        expect(actionService.autoToggleReadyMovement).not.toHaveBeenCalledWith(gameId, 'user-2');
      });
    });

    describe('handleTurnTimeout', () => {
      it('should auto end turn for current player', async () => {
        const mockGameState = {
          id: gameId,
          miniPhase: MINIPHASE.BATTLE,
          end: null,
          currentTurn: 'user-1',
          players: {
            'user-1': { id: 'user-1', extraData: { skippedMoves: 0 } },
            'user-2': { id: 'user-2', extraData: { skippedMoves: 0 } },
          },
        };

        mockGameStateService.getGameById.mockResolvedValue(mockGameState as any);
        actionService.autoEndTurn.mockResolvedValue(true);

        await (gateway as any).handleTurnTimeout(gameId);

        expect(actionService.autoEndTurn).toHaveBeenCalledWith(gameId, 'user-1');
        expect(actionService.autoEndTurn).not.toHaveBeenCalledWith(gameId, 'user-2');
      });

      it('should auto give up if player skipped too many turns', async () => {
        const mockGameState = {
          id: gameId,
          miniPhase: MINIPHASE.BATTLE,
          end: null,
          currentTurn: 'user-1',
          players: {
            'user-1': { id: 'user-1', extraData: { skippedMoves: 4 } },
            'user-2': { id: 'user-2', extraData: { skippedMoves: 0 } },
          },
        };

        mockGameStateService.getGameById.mockResolvedValue(mockGameState as any);
        actionService.autoEndTurn.mockResolvedValue(true);

        await (gateway as any).handleTurnTimeout(gameId);

        expect(actionService.autoGiveUp).toHaveBeenCalledWith(gameId, 'user-1');
      });
    });
  });
});