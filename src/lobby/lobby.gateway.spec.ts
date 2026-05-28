import { Test, TestingModule } from '@nestjs/testing';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { GameStateService } from '../game-state/game-state.service';
import { SocketConnectionService } from '../socket-connection/socket-connection.service';
import { Server, Socket } from 'socket.io';
import { LOBBY_EVENT_NAME } from './types/lobby-events-name';
import { LOBBY_ROOMS_NAME } from './types/lobby-rooms-name';
import { LOBBY_STATE_TYPE } from './types/lobby';

const createMockSocket = (userId: string = 'user-123'): any => ({
    data: { userId },
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    id: 'socket-123',
});

describe('LobbyGateway', () => {
    let gateway: LobbyGateway;
    let lobbyService: jest.Mocked<LobbyService>;
    let gameStateService: jest.Mocked<GameStateService>;
    let socketConnectionService: jest.Mocked<SocketConnectionService>;
    let mockServer: Server;

    const mockLobbyService = {
        getAllLobbies: jest.fn(),
        getLobbyByUserId: jest.fn(),
        getInvitations: jest.fn(),
        createLobby: jest.fn(),
        getLobbyById: jest.fn(),
        updateOptionsLobby: jest.fn(),
        joinLobby: jest.fn(),
        getLobbyByCode: jest.fn(),
        deleteLobby: jest.fn(),
        toggleReadyLobby: jest.fn(),
        leaveLobby: jest.fn(),
        inviteFriend: jest.fn(),
        getFriendsForInvite: jest.fn(),
        deleteInvitation: jest.fn(),
        joinLobbyByInvitation: jest.fn(),
    };

    const mockGameStateService = {
        deleteGame: jest.fn(),
    };

    const mockSocketConnectionService = {
        getOnlinePlayers: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyGateway,
                {
                    provide: LobbyService,
                    useValue: mockLobbyService,
                },
                {
                    provide: GameStateService,
                    useValue: mockGameStateService,
                },
                {
                    provide: SocketConnectionService,
                    useValue: mockSocketConnectionService,
                },
            ],
        }).compile();

        gateway = module.get<LobbyGateway>(LobbyGateway);
        lobbyService = module.get(LobbyService);
        gameStateService = module.get(GameStateService);
        socketConnectionService = module.get(SocketConnectionService);

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

    describe('handleJoinHall', () => {
        const userId = 'user-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        beforeEach(() => {
            mockLobbyService.getAllLobbies.mockResolvedValue([]);
            mockLobbyService.getLobbyByUserId.mockResolvedValue(null);
            mockLobbyService.getInvitations.mockResolvedValue([]);
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue([
                'user-1',
                'user-2',
            ]);
        });

        it('should successfully join hall', async () => {
            await gateway.handleJoinHall(mockSocket, null, mockCallback);

            expect(mockSocket.join).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockSocket.join).toHaveBeenCalledWith(`user:${userId}`);
            expect(mockLobbyService.getAllLobbies).toHaveBeenCalledWith(userId);
            expect(mockLobbyService.getLobbyByUserId).toHaveBeenCalledWith(
                userId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: {
                    lobbies: [],
                    currentLobby: null,
                    onlinePlayers: 2,
                    invitations: [],
                },
                message: 'Вы успешно вошли в холл',
            });
        });

        it('should join lobby room if user already in lobby', async () => {
            const mockLobby = { id: 'lobby-123', name: 'Test Lobby' };
            mockLobbyService.getLobbyByUserId.mockResolvedValue(
                mockLobby as any,
            );

            await gateway.handleJoinHall(mockSocket, null, mockCallback);

            expect(mockSocket.join).toHaveBeenCalledWith(
                `lobby-${mockLobby.id}`,
            );
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.getAllLobbies.mockRejectedValue(error);

            await gateway.handleJoinHall(mockSocket, null, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleGetLobbyList', () => {
        const userId = 'user-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should return lobby list', async () => {
            const mockLobbies = [{ id: 'lobby-1' }, { id: 'lobby-2' }];
            mockLobbyService.getAllLobbies.mockResolvedValue(
                mockLobbies as any,
            );

            await gateway.handleGetLobbyList(mockSocket, null, mockCallback);

            expect(mockLobbyService.getAllLobbies).toHaveBeenCalledWith(userId);
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: { lobbies: mockLobbies },
                message: 'Вы успешно получили лобби',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.getAllLobbies.mockRejectedValue(error);

            await gateway.handleGetLobbyList(mockSocket, null, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleCreateLobby', () => {
        const userId = 'user-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();
        const createLobbyData = {
            name: 'Test Lobby',
            isPrivate: false,
            withTimers: true,
            timerTurn: 30,
            timerMovement: 20,
            timerDraft: 15,
        };

        it('should create lobby successfully', async () => {
            const lobbyId = 'new-lobby-123';
            const mockLobby = { id: lobbyId, name: 'Test Lobby' };

            mockLobbyService.createLobby.mockResolvedValue(lobbyId);
            mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

            await gateway.handleCreateLobby(
                mockSocket,
                createLobbyData,
                mockCallback,
            );

            expect(mockLobbyService.createLobby).toHaveBeenCalledWith(
                createLobbyData,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED,
            );
            expect(mockSocket.join).toHaveBeenCalledWith(`lobby-${lobbyId}`);
            expect(mockServer.to).toHaveBeenCalledWith(`lobby-${lobbyId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.LOBBY_UPDATE,
                mockLobby,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно создали лобби',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.createLobby.mockRejectedValue(error);

            await gateway.handleCreateLobby(
                mockSocket,
                createLobbyData,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleUpdateOptionsLobby', () => {
        const userId = 'user-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();
        const updateData = {
            lobbyId: 'lobby-123',
            withTimers: true,
            timerTurn: 45,
            timerMovement: 30,
            timerDraft: 20,
        };

        it('should update lobby options successfully', async () => {
            const lobbyId = 'lobby-123';
            const mockLobby = { id: lobbyId, name: 'Test Lobby' };

            mockLobbyService.updateOptionsLobby.mockResolvedValue(lobbyId);
            mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

            await gateway.handleUpdateOptionsLobby(
                mockSocket,
                updateData,
                mockCallback,
            );

            expect(mockLobbyService.updateOptionsLobby).toHaveBeenCalledWith(
                updateData,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно поменяли настройки лобби',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.updateOptionsLobby.mockRejectedValue(error);

            await gateway.handleUpdateOptionsLobby(
                mockSocket,
                updateData,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleJoinLobby', () => {
        const userId = 'user-123';
        const lobbyId = 'lobby-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should join lobby successfully', async () => {
            const mockLobby = { id: lobbyId, name: 'Test Lobby' };

            mockLobbyService.joinLobby.mockResolvedValue(undefined);
            mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

            await gateway.handleJoinLobby(mockSocket, lobbyId, mockCallback);

            expect(mockLobbyService.joinLobby).toHaveBeenCalledWith(
                lobbyId,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED,
            );
            expect(mockSocket.join).toHaveBeenCalledWith(`lobby-${lobbyId}`);
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно вошли в лобби',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.joinLobby.mockRejectedValue(error);

            await gateway.handleJoinLobby(mockSocket, lobbyId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleJoinLobbyByCode', () => {
        const userId = 'user-123';
        const code = 'ABC123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should join lobby by code successfully', async () => {
            const mockLobby = { id: 'lobby-123', name: 'Test Lobby' };

            mockLobbyService.getLobbyByCode.mockResolvedValue(mockLobby as any);
            mockLobbyService.joinLobby.mockResolvedValue(undefined);
            mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

            await gateway.handleJoinLobbyByCode(mockSocket, code, mockCallback);

            expect(mockLobbyService.getLobbyByCode).toHaveBeenCalledWith(code);
            expect(mockLobbyService.joinLobby).toHaveBeenCalledWith(
                mockLobby.id,
                userId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно вошли в лобби',
            });
        });

        it('should return error if lobby not found', async () => {
            mockLobbyService.getLobbyByCode.mockResolvedValue(null);

            await gateway.handleJoinLobbyByCode(mockSocket, code, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                data: null,
                message: 'Лобби не найдено',
            });
            expect(mockLobbyService.joinLobby).not.toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.getLobbyByCode.mockRejectedValue(error);

            await gateway.handleJoinLobbyByCode(mockSocket, code, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleToggleReadyLobby', () => {
        const userId = 'user-123';
        const lobbyId = 'lobby-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should toggle ready state successfully', async () => {
            const mockLobby = { id: lobbyId, name: 'Test Lobby' };

            mockLobbyService.toggleReadyLobby.mockResolvedValue(undefined);
            mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

            await gateway.handleToggleReadyLobby(
                mockSocket,
                lobbyId,
                mockCallback,
            );

            expect(mockLobbyService.toggleReadyLobby).toHaveBeenCalledWith(
                lobbyId,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно переключили готовность',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.toggleReadyLobby.mockRejectedValue(error);

            await gateway.handleToggleReadyLobby(
                mockSocket,
                lobbyId,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleLeaveLobby', () => {
        const userId = 'user-123';
        const lobbyId = 'lobby-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should leave lobby successfully', async () => {
            const mockLobby = { id: lobbyId, name: 'Test Lobby' };

            mockLobbyService.leaveLobby.mockResolvedValue(undefined);
            mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

            await gateway.handleLeaveLobby(mockSocket, lobbyId, mockCallback);

            expect(mockLobbyService.leaveLobby).toHaveBeenCalledWith(
                lobbyId,
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED,
            );
            expect(mockSocket.leave).toHaveBeenCalledWith(`lobby-${lobbyId}`);
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно вышли из лобби',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.leaveLobby.mockRejectedValue(error);

            await gateway.handleLeaveLobby(mockSocket, lobbyId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleInviteFriend', () => {
        const userId = 'user-123';
        const friendId = 'friend-456';
        const inviteData = { lobbyId: 'lobby-123', friendId };
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should invite friend successfully', async () => {
            const mockInvitations = [{ id: 'inv-1' }];

            mockLobbyService.inviteFriend.mockResolvedValue(undefined);
            mockLobbyService.getInvitations.mockResolvedValue(
                mockInvitations as any,
            );

            await gateway.handleInviteFriend(
                mockSocket,
                inviteData,
                mockCallback,
            );

            expect(mockLobbyService.inviteFriend).toHaveBeenCalledWith(
                inviteData,
                userId,
            );
            expect(mockLobbyService.getInvitations).toHaveBeenCalledWith(
                friendId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(`user:${friendId}`);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.YOU_INVITED,
                mockInvitations,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно пригласили друга',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.inviteFriend.mockRejectedValue(error);

            await gateway.handleInviteFriend(
                mockSocket,
                inviteData,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleGetFriendsForInvite', () => {
        const userId = 'user-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should return friends for invite', async () => {
            const mockFriends = [{ friendId: 'friend-1', status: 'offer' }];
            mockLobbyService.getFriendsForInvite.mockResolvedValue(
                mockFriends as any,
            );

            await gateway.handleGetFriendsForInvite(
                mockSocket,
                null,
                mockCallback,
            );

            expect(mockLobbyService.getFriendsForInvite).toHaveBeenCalledWith(
                userId,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: mockFriends,
                message: 'Вы успешно получили список друзей для приглашения',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.getFriendsForInvite.mockRejectedValue(error);

            await gateway.handleGetFriendsForInvite(
                mockSocket,
                null,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleDeclineInvitation', () => {
        const userId = 'user-123';
        const lobbyInvitation = {
            id: 'inv-1',
            addresseeId: userId,
            lobbyId: 'lobby-123',
        };
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should decline invitation successfully', async () => {
            const mockInvitations = [{ id: 'inv-2' }];

            mockLobbyService.deleteInvitation.mockResolvedValue(undefined);
            mockLobbyService.getInvitations.mockResolvedValue(
                mockInvitations as any,
            );

            await gateway.handleDeclineInvitation(
                mockSocket,
                lobbyInvitation as any,
                mockCallback,
            );

            expect(mockLobbyService.deleteInvitation).toHaveBeenCalledWith(
                lobbyInvitation,
            );
            expect(mockLobbyService.getInvitations).toHaveBeenCalledWith(
                userId,
            );
            expect(mockServer.to).toHaveBeenCalledWith(
                `user:${lobbyInvitation.addresseeId}`,
            );
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.YOU_INVITED,
                mockInvitations,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно отклонили предложение',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.deleteInvitation.mockRejectedValue(error);

            await gateway.handleDeclineInvitation(
                mockSocket,
                lobbyInvitation as any,
                mockCallback,
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                }),
            );
        });
    });

    describe('handleJoinLobbyByInvitation', () => {
        const userId = 'user-123';
        const invitationId = 'inv-123';
        const mockSocket = createMockSocket(userId);
        const mockCallback = jest.fn();

        it('should join lobby by invitation successfully', async () => {
            const mockInvitation = {
                id: invitationId,
                lobbyId: 'lobby-123',
                addresseeId: userId,
            };
            const mockLobby = { id: 'lobby-123', name: 'Test Lobby' };
            const mockInvitations = [{ id: 'inv-2' }];

            mockLobbyService.joinLobbyByInvitation.mockResolvedValue(
                mockInvitation as any,
            );
            mockLobbyService.joinLobby.mockResolvedValue(undefined);
            mockLobbyService.deleteInvitation.mockResolvedValue(undefined);
            mockLobbyService.getInvitations.mockResolvedValue(
                mockInvitations as any,
            );
            mockLobbyService.getLobbyById.mockResolvedValue(mockLobby as any);

            await gateway.handleJoinLobbyByInvitation(
                mockSocket,
                invitationId,
                mockCallback,
            );

            expect(mockLobbyService.joinLobbyByInvitation).toHaveBeenCalledWith(
                invitationId,
                userId,
            );
            expect(mockLobbyService.joinLobby).toHaveBeenCalledWith(
                mockInvitation.lobbyId,
                userId,
            );
            expect(mockLobbyService.deleteInvitation).toHaveBeenCalledWith(
                mockInvitation,
            );
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED,
            );
            expect(mockSocket.join).toHaveBeenCalledWith(
                `lobby-${mockInvitation.lobbyId}`,
            );
            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'Вы успешно вошли в лобби',
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Test error');
            mockLobbyService.joinLobbyByInvitation.mockRejectedValue(error);

            await gateway.handleJoinLobbyByInvitation(
                mockSocket,
                invitationId,
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
