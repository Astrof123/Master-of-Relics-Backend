
import { Test, TestingModule } from '@nestjs/testing';
import { ActionGateway } from './action.gateway';
import { ActionService } from './action.service';
import { Server, Socket } from 'socket.io';
import { ACTION_EVENT_NAME } from './types/action-events-name';
import { GAME_EVENT_NAME } from '../game-state/types/game-events-name';
import {
    UseFaceData,
    UseSkillData,
    UseSpellData,
    ExtraActionData,
    ToggleReadyMovementData,
} from './types/action-evens-data';
import { AnimationData } from './types/animation';
import { SKILL } from '../artifact/types/skill';


const createMockSocket = (userId: string = 'user-123'): any => ({
    data: { userId },
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    id: 'socket-123',
});

describe('ActionGateway', () => {
    let gateway: ActionGateway;
    let actionService: jest.Mocked<ActionService>;
    let mockServer: Server;

    const mockActionService = {
        useFace: jest.fn(),
        useSkill: jest.fn(),
        useSpell: jest.fn(),
        endTurn: jest.fn(),
        giveUp: jest.fn(),
        offerDraw: jest.fn(),
        cancelDraw: jest.fn(),
        endRound: jest.fn(),
        extraAction: jest.fn(),
        toggleReadyMovement: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionGateway,
                {
                    provide: ActionService,
                    useValue: mockActionService,
                },
            ],
        }).compile();

        gateway = module.get<ActionGateway>(ActionGateway);
        actionService = module.get(ActionService);

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

    describe('handleUseFace', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();
        const useFaceData: UseFaceData = {
            gameId,
            artifactGameId: 'artifact-1',
            attackTarget: 'enemy-artifact',
            healTarget: null,
        };

        it('should handle use face successfully', async () => {
            const animations: AnimationData[] = [
                {
                    playerId: 'enemy',
                    artifactGameId: 'enemy-artifact',
                    animation: 'hit',
                    value: 15,
                },
            ];

            mockActionService.useFace.mockImplementation(
                async (data, uid, anims) => {
                    anims.push(...animations);
                },
            );

            await gateway.handleUseFace(mockSocket, useFaceData, mockCallback);

            expect(actionService.useFace).toHaveBeenCalledWith(
                useFaceData,
                userId,
                expect.any(Array),
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockServer.emit).toHaveBeenCalledWith(
                ACTION_EVENT_NAME.ANIMATION,
                animations[0],
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно использовали грань',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.useFace.mockRejectedValue(error);

            await gateway.handleUseFace(mockSocket, useFaceData, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleSkill', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();
        const useSkillData: UseSkillData = {
            skillId: SKILL.FEAR,
            gameId,
            artifactGameId: 'artifact-1',
            targets: [[], []],
        };

        it('should handle use skill successfully', async () => {
            const animations: AnimationData[] = [
                {
                    playerId: 'enemy',
                    artifactGameId: 'enemy-artifact',
                    animation: 'hit',
                    value: 10,
                },
            ];

            mockActionService.useSkill.mockImplementation(
                async (data, uid, anims) => {
                    anims.push(...animations);
                },
            );

            await gateway.handleSkill(mockSocket, useSkillData, mockCallback);

            expect(actionService.useSkill).toHaveBeenCalledWith(
                useSkillData,
                userId,
                expect.any(Array),
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockServer.emit).toHaveBeenCalledWith(
                ACTION_EVENT_NAME.ANIMATION,
                animations[0],
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно использовали грань',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.useSkill.mockRejectedValue(error);

            await gateway.handleSkill(mockSocket, useSkillData, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleSpell', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();
        const useSpellData: UseSpellData = {
            spellId: SKILL.FEAR as any,
            gameId,
            targets: [[], []],
        };

        it('should handle use spell successfully', async () => {
            const animations: AnimationData[] = [
                {
                    playerId: 'player',
                    artifactGameId: 'ally-artifact',
                    animation: 'heal',
                    value: 20,
                },
            ];

            mockActionService.useSpell.mockImplementation(
                async (data, uid, anims) => {
                    anims.push(...animations);
                },
            );

            await gateway.handleSpell(mockSocket, useSpellData, mockCallback);

            expect(actionService.useSpell).toHaveBeenCalledWith(
                useSpellData,
                userId,
                expect.any(Array),
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockServer.emit).toHaveBeenCalledWith(
                ACTION_EVENT_NAME.ANIMATION,
                animations[0],
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно использовали заклинание',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.useSpell.mockRejectedValue(error);

            await gateway.handleSpell(mockSocket, useSpellData, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleEndTurn', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should handle end turn successfully', async () => {
            const animations: AnimationData[] = [];

            mockActionService.endTurn.mockImplementation(
                async (gid, uid, anims) => {
                },
            );

            await gateway.handleEndTurn(mockSocket, gameId, mockCallback);

            expect(actionService.endTurn).toHaveBeenCalledWith(
                gameId,
                userId,
                expect.any(Array),
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно закончили ход',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.endTurn.mockRejectedValue(error);

            await gateway.handleEndTurn(mockSocket, gameId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleGiveUp', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should handle give up successfully', async () => {
            mockActionService.giveUp.mockResolvedValue(undefined);

            await gateway.handleGiveUp(mockSocket, gameId, mockCallback);

            expect(actionService.giveUp).toHaveBeenCalledWith(gameId, userId);
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно сдались',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.giveUp.mockRejectedValue(error);

            await gateway.handleGiveUp(mockSocket, gameId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleOfferDraw', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should handle offer draw successfully', async () => {
            mockActionService.offerDraw.mockResolvedValue(undefined);

            await gateway.handleOfferDraw(mockSocket, gameId, mockCallback);

            expect(actionService.offerDraw).toHaveBeenCalledWith(
                gameId,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно предложили ничью',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.offerDraw.mockRejectedValue(error);

            await gateway.handleOfferDraw(mockSocket, gameId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleCancelDraw', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should handle cancel draw successfully', async () => {
            mockActionService.cancelDraw.mockResolvedValue(undefined);

            await gateway.handleCancelDraw(mockSocket, gameId, mockCallback);

            expect(actionService.cancelDraw).toHaveBeenCalledWith(
                gameId,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно отменили ничью',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.cancelDraw.mockRejectedValue(error);

            await gateway.handleCancelDraw(mockSocket, gameId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleEndRound', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should handle end round successfully', async () => {
            mockActionService.endRound.mockResolvedValue(undefined);

            await gateway.handleEndRound(mockSocket, gameId, mockCallback);

            expect(actionService.endRound).toHaveBeenCalledWith(gameId, userId);
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно закончили ход',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.endRound.mockRejectedValue(error);

            await gateway.handleEndRound(mockSocket, gameId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleExtraAction', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();
        const extraActionData: ExtraActionData = {
            gameId,
            artifactGameId: 'artifact-1',
            type: 'throw_dice',
            details: null,
        };

        it('should handle extra action successfully', async () => {
            const animations: AnimationData[] = [];

            mockActionService.extraAction.mockImplementation(
                async (data, uid, anims) => {
                },
            );

            await gateway.handleExtraAction(
                mockSocket,
                extraActionData,
                mockCallback,
            );

            expect(actionService.extraAction).toHaveBeenCalledWith(
                extraActionData,
                userId,
                expect.any(Array),
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно использовали дополнительное действие',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.extraAction.mockRejectedValue(error);

            await gateway.handleExtraAction(
                mockSocket,
                extraActionData,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleToggleReadyMovement', () => {
        const userId = 'user-123';
        const gameId = 'game-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();
        const toggleReadyData: ToggleReadyMovementData = {
            gameId,
            artifactsWithNewPosition: {},
        };

        it('should handle toggle ready movement successfully', async () => {
            mockActionService.toggleReadyMovement.mockResolvedValue(undefined);

            await gateway.handleToggleReadyMovement(
                mockSocket,
                toggleReadyData,
                mockCallback,
            );

            expect(actionService.toggleReadyMovement).toHaveBeenCalledWith(
                toggleReadyData,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(`game-${gameId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                GAME_EVENT_NAME.GAME_STATE_UPDATED,
                gameId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно переключили готовность',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockActionService.toggleReadyMovement.mockRejectedValue(error);

            await gateway.handleToggleReadyMovement(
                mockSocket,
                toggleReadyData,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });
});
