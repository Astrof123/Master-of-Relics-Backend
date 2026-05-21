
import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { GameTimerService } from './game-timer.service';
import { GameStateService } from './game-state.service';
import { TimerType, TIMER_TYPE } from './types/timer';
import { GAME_EVENT_NAME } from './types/game-events-name';
import { Server } from 'socket.io';

describe('GameTimerService', () => {
  let service: GameTimerService;
  let gameStateService: jest.Mocked<GameStateService>;
  let mockServer: Server;

  const mockGameStateService = {
    startGameTimer: jest.fn(),
    getTimerInfo: jest.fn(),
    cancelGameTimer: jest.fn(),
    cancelAllGameTimers: jest.fn(),
    getGameById: jest.fn(),
    getActiveTimer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameTimerService,
        {
          provide: GameStateService,
          useValue: mockGameStateService,
        },
      ],
    }).compile();

    service = module.get<GameTimerService>(GameTimerService);
    gameStateService = module.get(GameStateService);

   
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setServer', () => {
    it('should set server instance', () => {
      service.setServer(mockServer);
      expect(service['server']).toBe(mockServer);
    });
  });

  describe('startTimer', () => {
    const gameId = 'game-123';
    const timerType: TimerType = TIMER_TYPE.DRAFT;
    const duration = 60;

    beforeEach(() => {
      service.setServer(mockServer);
    });

    it('should start timer and emit TIMER_START event', async () => {
      const mockTimerInfo = {
        active: true,
        remaining: 60,
        startedAt: Date.now(),
        duration: 60,
        timerType,
        timeOnServer: Date.now(),
      };

      mockGameStateService.startGameTimer.mockResolvedValue(undefined);
      mockGameStateService.getTimerInfo.mockResolvedValue(mockTimerInfo as any);

      await service.startTimer(gameId, timerType, duration);

      expect(mockGameStateService.startGameTimer).toHaveBeenCalledWith(gameId, timerType, duration);
      expect(mockGameStateService.getTimerInfo).toHaveBeenCalledWith(gameId, timerType);
      expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(GAME_EVENT_NAME.TIMER_START, {
        gameId,
        timerType,
        active: mockTimerInfo.active,
        remaining: mockTimerInfo.remaining,
        startedAt: mockTimerInfo.startedAt,
        duration: mockTimerInfo.duration,
        timeOnServer: mockTimerInfo.timeOnServer,
      });
    });

    it('should not emit event if server is not set', async () => {
      service.setServer(null as any);
      mockGameStateService.startGameTimer.mockResolvedValue(undefined);
      mockGameStateService.getTimerInfo.mockResolvedValue({} as any);

      await service.startTimer(gameId, timerType, duration);

      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('should handle timer info being null', async () => {
    mockGameStateService.startGameTimer.mockResolvedValue(undefined);
    mockGameStateService.getTimerInfo.mockResolvedValue(null);

    await service.startTimer(gameId, timerType, duration);

    expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
    expect(mockServer.emit).toHaveBeenCalledWith(GAME_EVENT_NAME.TIMER_START, {
        gameId,
        timerType,
    });
    });

    it('should log timer start', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockGameStateService.startGameTimer.mockResolvedValue(undefined);
      mockGameStateService.getTimerInfo.mockResolvedValue({} as any);

      await service.startTimer(gameId, timerType, duration);

      expect(loggerSpy).toHaveBeenCalledWith(`Starting ${timerType} timer for game ${gameId}`);
    });
  });

  describe('stopTimer', () => {
    const gameId = 'game-123';
    const timerType: TimerType = TIMER_TYPE.DRAFT;

    beforeEach(() => {
      service.setServer(mockServer);
    });

    it('should stop timer and emit timer:cancel event', async () => {
      mockGameStateService.cancelGameTimer.mockResolvedValue(undefined);

      await service.stopTimer(gameId, timerType);

      expect(mockGameStateService.cancelGameTimer).toHaveBeenCalledWith(gameId, timerType);
      expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('timer:cancel', {
        gameId,
        timerType,
      });
    });

    it('should not emit event if server is not set', async () => {
      service.setServer(null as any);
      mockGameStateService.cancelGameTimer.mockResolvedValue(undefined);

      await service.stopTimer(gameId, timerType);

      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('should log timer stop', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockGameStateService.cancelGameTimer.mockResolvedValue(undefined);

      await service.stopTimer(gameId, timerType);

      expect(loggerSpy).toHaveBeenCalledWith(`Stopping ${timerType} timer for game ${gameId}`);
    });
  });

  describe('stopAllTimers', () => {
    const gameId = 'game-123';

    beforeEach(() => {
      service.setServer(mockServer);
    });

    it('should stop all timers and emit timer:cancel-all event', async () => {
      mockGameStateService.cancelAllGameTimers.mockResolvedValue(undefined);

      await service.stopAllTimers(gameId);

      expect(mockGameStateService.cancelAllGameTimers).toHaveBeenCalledWith(gameId);
      expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('timer:cancel-all', {
        gameId,
      });
    });

    it('should not emit event if server is not set', async () => {
      service.setServer(null as any);
      mockGameStateService.cancelAllGameTimers.mockResolvedValue(undefined);

      await service.stopAllTimers(gameId);

      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('should log all timers stop', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockGameStateService.cancelAllGameTimers.mockResolvedValue(undefined);

      await service.stopAllTimers(gameId);

      expect(loggerSpy).toHaveBeenCalledWith(`Stopping all timers for game ${gameId}`);
    });
  });

  describe('syncTimersOnRecovery', () => {
    const gameId = 'game-123';

    it('should sync timers on recovery when game exists', async () => {
      const mockGame = { id: gameId, name: 'Test Game' };
      const mockActiveTimer = TIMER_TYPE.TURN;

      mockGameStateService.getGameById.mockResolvedValue(mockGame as any);
      mockGameStateService.getActiveTimer.mockResolvedValue(mockActiveTimer);

      await service.syncTimersOnRecovery(gameId);

      expect(mockGameStateService.getGameById).toHaveBeenCalledWith(gameId);
      expect(mockGameStateService.getActiveTimer).toHaveBeenCalledWith(gameId);
    });

    it('should return early if game not found', async () => {
      mockGameStateService.getGameById.mockResolvedValue(null);

      await service.syncTimersOnRecovery(gameId);

      expect(mockGameStateService.getGameById).toHaveBeenCalledWith(gameId);
      expect(mockGameStateService.getActiveTimer).not.toHaveBeenCalled();
    });

    it('should handle no active timer', async () => {
      const mockGame = { id: gameId, name: 'Test Game' };

      mockGameStateService.getGameById.mockResolvedValue(mockGame as any);
      mockGameStateService.getActiveTimer.mockResolvedValue(null);

      await service.syncTimersOnRecovery(gameId);

      expect(mockGameStateService.getActiveTimer).toHaveBeenCalledWith(gameId);
    });
  });

  describe('Integration with server', () => {
    const gameId = 'game-123';
    const timerType: TimerType = TIMER_TYPE.DRAFT;
    const duration = 60;

    it('should work correctly with server set after initialization', async () => {

      mockGameStateService.startGameTimer.mockResolvedValue(undefined);
      mockGameStateService.getTimerInfo.mockResolvedValue({ active: true, remaining: 60, startedAt: Date.now(), duration: 60, timeOnServer: Date.now() } as any);

      await service.startTimer(gameId, timerType, duration);
      expect(mockServer.to).not.toHaveBeenCalled();

      service.setServer(mockServer);

      await service.startTimer(gameId, timerType, duration);
      expect(mockServer.to).toHaveBeenCalled();
    });

    it('should emit to correct room for each timer type', async () => {
      service.setServer(mockServer);

      const timerTypes: TimerType[] = [TIMER_TYPE.DRAFT, TIMER_TYPE.MOVEMENT, TIMER_TYPE.TURN];

      for (const type of timerTypes) {
        mockGameStateService.startGameTimer.mockResolvedValue(undefined);
        mockGameStateService.getTimerInfo.mockResolvedValue({ active: true, remaining: 60, startedAt: Date.now(), duration: 60, timeOnServer: Date.now() } as any);

        await service.startTimer(gameId, type, duration);

        expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
      }
    });
  });
});