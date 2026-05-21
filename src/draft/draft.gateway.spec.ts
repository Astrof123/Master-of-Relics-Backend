import { Test, TestingModule } from '@nestjs/testing';
import { DraftGateway } from './draft.gateway';
import { DraftService } from './draft.service';
import { Server, Socket } from 'socket.io';
import { DRAFT_EVENT_NAME } from './types/draft-events-name';
import { GAME_EVENT_NAME } from '../game-state/types/game-events-name';
import { PickArtifactData } from './types/draft-evens-data';
import { DraftException, DRAFT_ERROR_CODE } from './types/draft-exceptions';
import { GameException, GAME_ERROR_CODE } from '../game-state/types/game-exceptions';


const createMockSocket = (userId: string = 'user-123'): any => ({
  data: { userId },
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  id: 'socket-123',
});

describe('DraftGateway', () => {
  let gateway: DraftGateway;
  let draftService: jest.Mocked<DraftService>;
  let mockServer: Server;

  const mockDraftService = {
    pickArtifact: jest.fn(),
    toggleReadyDraft: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DraftGateway,
        {
          provide: DraftService,
          useValue: mockDraftService,
        },
      ],
    }).compile();

    gateway = module.get<DraftGateway>(DraftGateway);
    draftService = module.get(DraftService);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      in: jest.fn().mockReturnThis(),
    } as any;
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handlePickArtifact', () => {
    const userId = 'user-123';
    const mockSocket = createMockSocket(userId);
    const mockCallback = jest.fn();
    const pickArtifactData: PickArtifactData = {
      gameId: 'game-123',
      artifactId: 'arcane_shield',
    };

    it('should pick artifact successfully', async () => {
      draftService.pickArtifact.mockResolvedValue(undefined);

      await gateway.handlePickArtifact(mockSocket, pickArtifactData, mockCallback);

      expect(draftService.pickArtifact).toHaveBeenCalledWith(pickArtifactData, userId);
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: "Вы успешно выбрали карту",
      });
    });

    it('should handle ARTIFACT_NOT_FOUND error', async () => {
      const error = new DraftException(DRAFT_ERROR_CODE.ARTIFACT_NOT_FOUND);
      draftService.pickArtifact.mockRejectedValue(error);

      await gateway.handlePickArtifact(mockSocket, pickArtifactData, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: error.message,
        error: {
          code: error.code,
        },
      });
    });

    it('should handle PHASE_NOT_DRAFT error', async () => {
      const error = new DraftException(DRAFT_ERROR_CODE.PHASE_NOT_DRAFT);
      draftService.pickArtifact.mockRejectedValue(error);

      await gateway.handlePickArtifact(mockSocket, pickArtifactData, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: { code: DRAFT_ERROR_CODE.PHASE_NOT_DRAFT },
      }));
    });

    it('should handle GAME_NOT_FOUND error', async () => {
      const error = new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
      draftService.pickArtifact.mockRejectedValue(error);

      await gateway.handlePickArtifact(mockSocket, pickArtifactData, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: { code: GAME_ERROR_CODE.GAME_NOT_FOUND },
      }));
    });

    it('should handle generic errors', async () => {
      const error = new Error('Unexpected error');
      draftService.pickArtifact.mockRejectedValue(error);

      await gateway.handlePickArtifact(mockSocket, pickArtifactData, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: "Внутренняя ошибка сервера",
      }));
    });
  });

  describe('handleToggleReadyDraft', () => {
    const userId = 'user-123';
    const gameId = 'game-123';
    const mockSocket = createMockSocket(userId);
    const mockCallback = jest.fn();

    it('should toggle ready draft successfully', async () => {
      draftService.toggleReadyDraft.mockResolvedValue(undefined);

      await gateway.handleToggleReadyDraft(mockSocket, gameId, mockCallback);

      expect(draftService.toggleReadyDraft).toHaveBeenCalledWith(gameId, userId);
      expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(GAME_EVENT_NAME.GAME_STATE_UPDATED, gameId);
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: "Вы успешно закончили выбор",
      });
    });

    it('should handle NOT_PICKED_ARTIFACT error', async () => {
      const error = new DraftException(DRAFT_ERROR_CODE.NOT_PICKED_ARTIFACT);
      draftService.toggleReadyDraft.mockRejectedValue(error);

      await gateway.handleToggleReadyDraft(mockSocket, gameId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: error.message,
        error: {
          code: error.code,
        },
      });
      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('should handle GAME_NOT_FOUND error', async () => {
      const error = new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
      draftService.toggleReadyDraft.mockRejectedValue(error);

      await gateway.handleToggleReadyDraft(mockSocket, gameId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: { code: GAME_ERROR_CODE.GAME_NOT_FOUND },
      }));
    });

    it('should handle GAME_OVER error', async () => {
      const error = new DraftException(DRAFT_ERROR_CODE.GAME_OVER);
      draftService.toggleReadyDraft.mockRejectedValue(error);

      await gateway.handleToggleReadyDraft(mockSocket, gameId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: { code: DRAFT_ERROR_CODE.GAME_OVER },
      }));
    });

    it('should handle generic errors', async () => {
      const error = new Error('Unexpected error');
      draftService.toggleReadyDraft.mockRejectedValue(error);

      await gateway.handleToggleReadyDraft(mockSocket, gameId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: "Внутренняя ошибка сервера",
      }));
    });
  });
});