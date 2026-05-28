import { Test, TestingModule } from '@nestjs/testing';
import { SocketConnectionGateway } from './socket-connection.gateway';
import { SocketConnectionService } from './socket-connection.service';
import { WebSocketAuthMiddleware } from '../auth/middlewares/websocket-auth.middleware';
import { Server, Socket } from 'socket.io';
import { LOBBY_ROOMS_NAME } from '../lobby/types/lobby-rooms-name';
import { LOBBY_EVENT_NAME } from '../lobby/types/lobby-events-name';

const createMockSocket = (
    userId: string = 'user-123',
    id: string = 'socket-123',
): any => ({
    id,
    data: { userId },
    handshake: {
        headers: {},
        query: {},
    },
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
    leave: jest.fn(),
});

describe('SocketConnectionGateway', () => {
    let gateway: SocketConnectionGateway;
    let socketConnectionService: jest.Mocked<SocketConnectionService>;
    let webSocketAuthMiddleware: jest.Mocked<WebSocketAuthMiddleware>;
    let mockServer: Server;

    const mockSocketConnectionService = {
        setPlayerOnline: jest.fn(),
        setPlayerOffline: jest.fn(),
        getOnlinePlayers: jest.fn(),
    };

    const mockWebSocketAuthMiddleware = {
        use: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SocketConnectionGateway,
                {
                    provide: SocketConnectionService,
                    useValue: mockSocketConnectionService,
                },
                {
                    provide: WebSocketAuthMiddleware,
                    useValue: mockWebSocketAuthMiddleware,
                },
            ],
        }).compile();

        gateway = module.get<SocketConnectionGateway>(SocketConnectionGateway);
        socketConnectionService = module.get(SocketConnectionService);
        webSocketAuthMiddleware = module.get(WebSocketAuthMiddleware);

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            in: jest.fn().mockReturnThis(),
            use: jest.fn(),
        } as any;
        gateway.server = mockServer;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('afterInit', () => {
        it('should set up WebSocket middleware', () => {
            const server = { use: jest.fn() } as any;
            const next = jest.fn();
            const socket = createMockSocket();

            gateway.afterInit(server);

            expect(server.use).toHaveBeenCalled();

            const middleware = server.use.mock.calls[0][0];
            middleware(socket, next);

            expect(webSocketAuthMiddleware.use).toHaveBeenCalledWith(
                socket,
                next,
            );
        });
    });

    describe('handleConnection', () => {
        const userId = 'user-123';
        const mockSocket = createMockSocket(userId);
        const onlinePlayersCount = 5;

        beforeEach(() => {
            mockSocketConnectionService.setPlayerOnline.mockResolvedValue(
                undefined,
            );
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue([
                'user1',
                'user2',
                'user3',
                'user4',
                'user5',
            ]);
        });

        it('should handle connection successfully', async () => {
            await gateway.handleConnection(mockSocket);

            expect(
                mockSocketConnectionService.setPlayerOnline,
            ).toHaveBeenCalledWith(userId);
            expect(
                mockSocketConnectionService.getOnlinePlayers,
            ).toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                onlinePlayersCount,
            );
        });

        it('should handle connection when getOnlinePlayers returns empty array', async () => {
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue([]);

            await gateway.handleConnection(mockSocket);

            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                0,
            );
        });

        it('should handle errors from setPlayerOnline', async () => {
            const error = new Error('Redis error');
            mockSocketConnectionService.setPlayerOnline.mockRejectedValue(
                error,
            );

            await expect(gateway.handleConnection(mockSocket)).rejects.toThrow(
                error,
            );
        });
    });

    describe('handleDisconnect', () => {
        const userId = 'user-123';
        const mockSocket = createMockSocket(userId);
        const onlinePlayersCount = 4;

        beforeEach(() => {
            mockSocketConnectionService.setPlayerOffline.mockResolvedValue(
                undefined,
            );
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue([
                'user1',
                'user2',
                'user3',
                'user4',
            ]);
        });

        it('should handle disconnect successfully', async () => {
            await gateway.handleDisconnect(mockSocket);

            expect(
                mockSocketConnectionService.setPlayerOffline,
            ).toHaveBeenCalledWith(userId);
            expect(
                mockSocketConnectionService.getOnlinePlayers,
            ).toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith(LOBBY_ROOMS_NAME.HALL);
            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                onlinePlayersCount,
            );
        });

        it('should handle disconnect when getOnlinePlayers returns empty array', async () => {
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue([]);

            await gateway.handleDisconnect(mockSocket);

            expect(mockServer.emit).toHaveBeenCalledWith(
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                0,
            );
        });

        it('should handle errors from setPlayerOffline', async () => {
            const error = new Error('Redis error');
            mockSocketConnectionService.setPlayerOffline.mockRejectedValue(
                error,
            );

            await expect(gateway.handleDisconnect(mockSocket)).rejects.toThrow(
                error,
            );
        });
    });

    describe('Integration with multiple connections', () => {
        it('should update online players count after multiple connections', async () => {
            const socket1 = createMockSocket('user-1', 'socket-1');
            const socket2 = createMockSocket('user-2', 'socket-2');
            const socket3 = createMockSocket('user-3', 'socket-3');

            mockSocketConnectionService.setPlayerOnline.mockResolvedValue(
                undefined,
            );
            mockSocketConnectionService.getOnlinePlayers
                .mockResolvedValueOnce(['user-1'])
                .mockResolvedValueOnce(['user-1', 'user-2'])
                .mockResolvedValueOnce(['user-1', 'user-2', 'user-3']);

            await gateway.handleConnection(socket1);
            expect(mockServer.emit).toHaveBeenNthCalledWith(
                1,
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                1,
            );

            await gateway.handleConnection(socket2);
            expect(mockServer.emit).toHaveBeenNthCalledWith(
                2,
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                2,
            );

            await gateway.handleConnection(socket3);
            expect(mockServer.emit).toHaveBeenNthCalledWith(
                3,
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                3,
            );
        });

        it('should update online players count after multiple disconnects', async () => {
            const socket1 = createMockSocket('user-1', 'socket-1');
            const socket2 = createMockSocket('user-2', 'socket-2');

            mockSocketConnectionService.setPlayerOffline.mockResolvedValue(
                undefined,
            );
            mockSocketConnectionService.getOnlinePlayers
                .mockResolvedValueOnce(['user-2'])
                .mockResolvedValueOnce([]);

            await gateway.handleDisconnect(socket1);
            expect(mockServer.emit).toHaveBeenNthCalledWith(
                1,
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                1,
            );

            await gateway.handleDisconnect(socket2);
            expect(mockServer.emit).toHaveBeenNthCalledWith(
                2,
                LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED,
                0,
            );
        });
    });

    describe('Error handling', () => {
        it('should handle connection with undefined userId', async () => {
            const socketWithoutUser = {
                data: {},
                id: 'socket-no-user',
            } as Socket;
            const error = new Error('User ID is required');

            mockSocketConnectionService.setPlayerOnline.mockRejectedValue(
                error,
            );

            await expect(
                gateway.handleConnection(socketWithoutUser),
            ).rejects.toThrow(error);
        });

        it('should handle disconnect with undefined userId', async () => {
            const socketWithoutUser = {
                data: {},
                id: 'socket-no-user',
            } as Socket;
            const error = new Error('User ID is required');

            mockSocketConnectionService.setPlayerOffline.mockRejectedValue(
                error,
            );

            await expect(
                gateway.handleDisconnect(socketWithoutUser),
            ).rejects.toThrow(error);
        });
    });

    describe('WebSocketServer', () => {
        it('should have server property set', () => {
            expect(gateway.server).toBeDefined();
            expect(gateway.server).toBe(mockServer);
        });
    });
});
