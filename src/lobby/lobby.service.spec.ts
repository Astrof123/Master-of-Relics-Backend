import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';
import { RedisService } from 'src/redis/redis.service';
import { UsersService } from 'src/users/users.service';
import { INVITE_STATUS, LOBBY_STATE_TYPE } from './types/lobby';
import { MAX_TIMER_VALUE, MIN_TIMER_VALUE } from './constants/settings';

const createMockUser = (
    id: string,
    nickname: string,
    options?: Partial<any>,
): any => ({
    id,
    nickname,
    login: `login_${id}`,
    friendCode: '1234567890',
    password: 'hashed_password',
    banReason: null,
    bannedUntil: null,
    createdAt: new Date(),
    deletedAt: null,
    isAdmin: false,
    isSuperAdmin: false,
    gold: 0,
    collections: [],
    decks: [],
    reports: [],
    reportsSended: [],
    inviteCode: null,
    stats: null,
    requester: [],
    addressee: [],
    ...options,
});

describe('LobbyService', () => {
    let service: LobbyService;

    const mockRedisService = {
        setJson: jest.fn(),
        getJson: jest.fn(),
        delete: jest.fn(),
        addToSortedSet: jest.fn(),
        removeFromSortedSet: jest.fn(),
        getSortedSetRange: jest.fn(),
        addToSet: jest.fn(),
        removeFromSet: jest.fn(),
        getSetMembers: jest.fn(),
    };

    const mockUsersService = {
        findOne: jest.fn(),
        getFriends: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyService,
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        service = module.get<LobbyService>(LobbyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getLobbyKey', () => {
        it('should return correct lobby key', () => {
            expect(service.getLobbyKey('lobby-123')).toBe('lobby:lobby-123');
        });
    });

    describe('getLobbyIndexesKey', () => {
        it('should return correct indexes key', () => {
            expect(service.getLobbyIndexesKey()).toBe('lobbies:index');
        });
    });

    describe('changeLobbyState', () => {
        const lobbyId = 'lobby-123';
        const newState = LOBBY_STATE_TYPE.PLAYING;

        it('should change lobby state successfully', async () => {
            mockRedisService.getJson.mockResolvedValue({ id: lobbyId });
            mockRedisService.setJson.mockResolvedValue(undefined);

            await service.changeLobbyState(lobbyId, newState);

            expect(mockRedisService.getJson).toHaveBeenCalledWith(
                `lobby:${lobbyId}`,
            );
            expect(mockRedisService.setJson).toHaveBeenCalled();
        });

        it('should throw LOBBY_NOT_FOUND if lobby does not exist', async () => {
            mockRedisService.getJson.mockResolvedValue(null);

            await expect(
                service.changeLobbyState(lobbyId, newState),
            ).rejects.toThrow();
        });
    });

    describe('createLobby', () => {
        const userId = 'user-123';
        const createLobbyData = {
            name: 'Test Lobby',
            isPrivate: false,
            withTimers: true,
            timerTurn: 30,
            timerMovement: 20,
            timerDraft: 15,
        };

        beforeEach(() => {
            mockRedisService.getSortedSetRange.mockResolvedValue([]);
            mockRedisService.getJson.mockResolvedValue(null);
            mockRedisService.setJson.mockResolvedValue(undefined);
            mockRedisService.addToSortedSet.mockResolvedValue(undefined);
        });

        it('should create lobby successfully', async () => {
            const mockUser = createMockUser(userId, 'TestUser');
            mockUsersService.findOne.mockResolvedValue(mockUser);

            const lobbyId = await service.createLobby(createLobbyData, userId);

            expect(typeof lobbyId).toBe('string');
            expect(lobbyId).toBeTruthy();
            expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
            expect(mockRedisService.setJson).toHaveBeenCalled();
            expect(mockRedisService.addToSortedSet).toHaveBeenCalled();
        });

        it('should throw error if name is too short', async () => {
            const invalidData = { ...createLobbyData, name: 'ab' };
            await expect(
                service.createLobby(invalidData, userId),
            ).rejects.toThrow();
        });

        it('should throw error if name is too long', async () => {
            const invalidData = { ...createLobbyData, name: 'a'.repeat(21) };
            await expect(
                service.createLobby(invalidData, userId),
            ).rejects.toThrow();
        });

        it('should throw error if user is banned', async () => {
            const bannedUser = createMockUser(userId, 'TestUser', {
                bannedUntil: new Date(),
            });
            mockUsersService.findOne.mockResolvedValue(bannedUser);

            await expect(
                service.createLobby(createLobbyData, userId),
            ).rejects.toThrow();
        });

        it('should throw error if user already in lobby', async () => {
            const mockUser = createMockUser(userId, 'TestUser');
            mockUsersService.findOne.mockResolvedValue(mockUser);

            jest.spyOn(service, 'getLobbyByUserId').mockResolvedValue({
                id: 'existing',
                players: { [userId]: {} },
            } as any);

            await expect(
                service.createLobby(createLobbyData, userId),
            ).rejects.toThrow();

            jest.restoreAllMocks();
        });

        it('should clamp timer values to MIN and MAX', async () => {
            const mockUser = createMockUser(userId, 'TestUser');
            mockUsersService.findOne.mockResolvedValue(mockUser);

            const extremeData = {
                ...createLobbyData,
                timerTurn: 10,
                timerMovement: 500,
                timerDraft: 5,
            };

            await service.createLobby(extremeData, userId);

            const setJsonCall = mockRedisService.setJson.mock.calls[0];
            const lobbyData = setJsonCall[2];

            expect(lobbyData.options.timerTurn).toBe(MIN_TIMER_VALUE);
            expect(lobbyData.options.timerMovement).toBe(MAX_TIMER_VALUE);
            expect(lobbyData.options.timerDraft).toBe(MIN_TIMER_VALUE);
        });
    });

    describe('joinLobby', () => {
        const userId = 'user-123';
        const lobbyId = 'lobby-123';

        beforeEach(() => {
            mockRedisService.setJson.mockResolvedValue(undefined);
            jest.spyOn(service, 'getLobbyByUserId').mockResolvedValue(null);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should join lobby successfully', async () => {
            const mockUser = createMockUser(userId, 'TestUser');
            const mockLobby = {
                id: lobbyId,
                state: LOBBY_STATE_TYPE.WAITING,
                players: {},
            };

            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockUsersService.findOne.mockResolvedValue(mockUser);

            await service.joinLobby(lobbyId, userId);
            expect(mockRedisService.setJson).toHaveBeenCalled();
        });

        it('should throw error if user already in lobby', async () => {
            jest.spyOn(service, 'getLobbyByUserId').mockResolvedValue({
                id: 'other',
                players: { [userId]: {} },
            } as any);

            await expect(service.joinLobby(lobbyId, userId)).rejects.toThrow();
        });

        it('should throw error if lobby does not exist', async () => {
            mockRedisService.getJson.mockResolvedValue(null);

            await expect(service.joinLobby(lobbyId, userId)).rejects.toThrow();
        });

        it('should throw error if game already started', async () => {
            const mockLobby = {
                id: lobbyId,
                state: LOBBY_STATE_TYPE.PLAYING,
                players: {},
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);

            await expect(service.joinLobby(lobbyId, userId)).rejects.toThrow();
        });

        it('should throw error if lobby is full', async () => {
            const mockLobby = {
                id: lobbyId,
                state: LOBBY_STATE_TYPE.WAITING,
                players: { player1: {}, player2: {} },
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);

            await expect(service.joinLobby(lobbyId, userId)).rejects.toThrow();
        });

        it('should throw error if user is banned', async () => {
            const bannedUser = createMockUser(userId, 'TestUser', {
                bannedUntil: new Date(),
            });
            const mockLobby = {
                id: lobbyId,
                state: LOBBY_STATE_TYPE.WAITING,
                players: {},
            };

            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockUsersService.findOne.mockResolvedValue(bannedUser);

            await expect(service.joinLobby(lobbyId, userId)).rejects.toThrow();
        });
    });

    describe('leaveLobby', () => {
        const userId = 'user-123';
        const lobbyId = 'lobby-123';

        it('should leave lobby successfully when not host', async () => {
            const mockLobby = {
                id: lobbyId,
                players: {
                    [userId]: { id: userId, isHost: false },
                    other: { id: 'other', isHost: true },
                },
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockRedisService.delete.mockResolvedValue(undefined);

            await service.leaveLobby(lobbyId, userId);
            expect(mockRedisService.delete).toHaveBeenCalled();
        });

        it('should transfer host when host leaves', async () => {
            const otherUserId = 'other-user';
            const mockLobby = {
                id: lobbyId,
                players: {
                    [userId]: { id: userId, isHost: true },
                    [otherUserId]: { id: otherUserId, isHost: false },
                },
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockRedisService.setJson.mockResolvedValue(undefined);
            mockRedisService.delete.mockResolvedValue(undefined);

            await service.leaveLobby(lobbyId, userId);
            expect(mockRedisService.setJson).toHaveBeenCalled();
        });

        it('should delete lobby when last player leaves', async () => {
            const mockLobby = {
                id: lobbyId,
                players: { [userId]: { id: userId, isHost: true } },
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockRedisService.delete.mockResolvedValue(undefined);
            mockRedisService.removeFromSortedSet.mockResolvedValue(undefined);

            await service.leaveLobby(lobbyId, userId);
            expect(mockRedisService.delete).toHaveBeenCalled();
            expect(mockRedisService.removeFromSortedSet).toHaveBeenCalled();
        });

        it('should throw error if lobby does not exist', async () => {
            mockRedisService.getJson.mockResolvedValue(null);
            await expect(service.leaveLobby(lobbyId, userId)).rejects.toThrow();
        });

        it('should throw error if player not in lobby', async () => {
            const mockLobby = { id: lobbyId, players: {} };
            mockRedisService.getJson.mockResolvedValue(mockLobby);
            await expect(service.leaveLobby(lobbyId, userId)).rejects.toThrow();
        });
    });

    describe('toggleReadyLobby', () => {
        const userId = 'user-123';
        const lobbyId = 'lobby-123';

        it('should toggle ready state', async () => {
            const mockLobby = {
                id: lobbyId,
                state: LOBBY_STATE_TYPE.WAITING,
                players: { [userId]: { id: userId, isReady: false } },
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockRedisService.setJson.mockResolvedValue(undefined);

            await service.toggleReadyLobby(lobbyId, userId);
            expect(mockRedisService.setJson).toHaveBeenCalled();
        });

        it('should throw error if lobby does not exist', async () => {
            mockRedisService.getJson.mockResolvedValue(null);
            await expect(
                service.toggleReadyLobby(lobbyId, userId),
            ).rejects.toThrow();
        });

        it('should throw error if game already started', async () => {
            const mockLobby = {
                id: lobbyId,
                state: LOBBY_STATE_TYPE.PLAYING,
                players: {},
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);
            await expect(
                service.toggleReadyLobby(lobbyId, userId),
            ).rejects.toThrow();
        });

        it('should throw error if player not in lobby', async () => {
            const mockLobby = {
                id: lobbyId,
                state: LOBBY_STATE_TYPE.WAITING,
                players: {},
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);
            await expect(
                service.toggleReadyLobby(lobbyId, userId),
            ).rejects.toThrow();
        });
    });

    describe('getAllLobbyIds', () => {
        it('should return all lobby ids', async () => {
            const mockIds = ['lobby-1', 'lobby-2'];
            mockRedisService.getSortedSetRange.mockResolvedValue(mockIds);

            const result = await service.getAllLobbyIds();
            expect(result).toEqual(mockIds);
        });
    });

    describe('getLobbyById', () => {
        it('should return lobby if exists', async () => {
            const mockLobby = {
                id: 'lobby-123',
                players: {},
                state: LOBBY_STATE_TYPE.WAITING,
            };
            mockRedisService.getJson.mockResolvedValue(mockLobby);

            const result = await service.getLobbyById('lobby-123');
            expect(result).toEqual(mockLobby);
        });

        it('should return null if lobby does not exist', async () => {
            mockRedisService.getJson.mockResolvedValue(null);
            const result = await service.getLobbyById('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('deleteLobby', () => {
        const lobbyId = 'lobby-123';

        it('should delete lobby successfully', async () => {
            mockRedisService.getJson.mockResolvedValue({ id: lobbyId });
            mockRedisService.delete.mockResolvedValue(undefined);
            mockRedisService.removeFromSortedSet.mockResolvedValue(undefined);

            await service.deleteLobby(lobbyId);
            expect(mockRedisService.delete).toHaveBeenCalled();
        });

        it('should throw error if lobby does not exist', async () => {
            mockRedisService.getJson.mockResolvedValue(null);
            await expect(service.deleteLobby(lobbyId)).rejects.toThrow();
        });
    });

    describe('inviteFriend', () => {
        const currentUserId = 'user-123';
        const inviteData = { lobbyId: 'lobby-123', friendId: 'friend-456' };

        it('should invite friend successfully', async () => {
            const mockLobby = { id: 'lobby-123' };
            const mockFriend = createMockUser('friend-456', 'Friend');
            const mockCurrentUser = createMockUser('user-123', 'CurrentUser');

            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockUsersService.findOne
                .mockResolvedValueOnce(mockFriend)
                .mockResolvedValueOnce(mockCurrentUser);
            mockRedisService.addToSet.mockResolvedValue(undefined);

            await service.inviteFriend(inviteData, currentUserId);
            expect(mockRedisService.addToSet).toHaveBeenCalled();
        });

        it('should throw error if lobby does not exist', async () => {
            mockRedisService.getJson.mockResolvedValue(null);
            await expect(
                service.inviteFriend(inviteData, currentUserId),
            ).rejects.toThrow();
        });
    });
    describe('getAllLobbies', () => {
        const userId = 'user-123';

        it('should return all lobbies with code for user\'s own lobby', async () => {
            const mockLobbyIds = ['lobby-1', 'lobby-2'];
            const mockLobby1 = {
            id: 'lobby-1',
            name: 'Lobby 1',
            players: { [userId]: { id: userId } },
            state: LOBBY_STATE_TYPE.WAITING,
            isPrivate: false,
            code: 'CODE123',
            options: {},
            };
            const mockLobby2 = {
            id: 'lobby-2',
            name: 'Lobby 2',
            players: { 'other-user': { id: 'other-user' } },
            state: LOBBY_STATE_TYPE.WAITING,
            isPrivate: true,
            code: 'CODE456',
            options: {},
            };

            mockRedisService.getSortedSetRange.mockResolvedValue(mockLobbyIds);
            mockRedisService.getJson
            .mockResolvedValueOnce(mockLobby1)
            .mockResolvedValueOnce(mockLobby2);

            const result = await service.getAllLobbies(userId);

            expect(result).toHaveLength(2);
            expect(result[0].code).toBe('CODE123');
            expect(result[1].code).toBeNull();
        });

        it('should filter out END state lobbies', async () => {
            const mockLobbyIds = ['lobby-1', 'lobby-2'];
            const mockLobby1 = {
            id: 'lobby-1',
            name: 'Lobby 1',
            players: {},
            state: LOBBY_STATE_TYPE.WAITING,
            isPrivate: false,
            code: 'CODE123',
            options: {},
            };
            const mockLobby2 = {
            id: 'lobby-2',
            name: 'Lobby 2',
            players: {},
            state: LOBBY_STATE_TYPE.END,
            isPrivate: false,
            code: 'CODE456',
            options: {},
            };

            mockRedisService.getSortedSetRange.mockResolvedValue(mockLobbyIds);
            mockRedisService.getJson
            .mockResolvedValueOnce(mockLobby1)
            .mockResolvedValueOnce(mockLobby2);

            const result = await service.getAllLobbies(userId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('lobby-1');
        });

        it('should handle empty lobby list', async () => {
            mockRedisService.getSortedSetRange.mockResolvedValue([]);

            const result = await service.getAllLobbies(userId);

            expect(result).toEqual([]);
        });
        });

        describe('getLobbyByCode', () => {
        it('should return lobby with matching code and single player', async () => {
            const mockLobbyIds = ['lobby-1', 'lobby-2'];
            const mockLobby1 = {
            id: 'lobby-1',
            code: 'ABC123',
            state: LOBBY_STATE_TYPE.WAITING,
            players: { player1: {} },
            };
            const mockLobby2 = {
            id: 'lobby-2',
            code: 'ABC123',
            state: LOBBY_STATE_TYPE.WAITING,
            players: { player1: {}, player2: {} },
            };

            mockRedisService.getSortedSetRange.mockResolvedValue(mockLobbyIds);
            mockRedisService.getJson
            .mockResolvedValueOnce(mockLobby1)
            .mockResolvedValueOnce(mockLobby2);

            const result = await service.getLobbyByCode('ABC123');

            expect(result).toEqual(mockLobby1);
        });

        it('should return null if no lobby matches', async () => {
            mockRedisService.getSortedSetRange.mockResolvedValue([]);

            const result = await service.getLobbyByCode('NOCODE');

            expect(result).toBeNull();
        });

        it('should filter out END state lobbies', async () => {
            const mockLobbyIds = ['lobby-1'];
            const mockLobby1 = {
            id: 'lobby-1',
            code: 'ABC123',
            state: LOBBY_STATE_TYPE.END,
            players: { player1: {} },
            };

            mockRedisService.getSortedSetRange.mockResolvedValue(mockLobbyIds);
            mockRedisService.getJson.mockResolvedValue(mockLobby1);

            const result = await service.getLobbyByCode('ABC123');

            expect(result).toBeNull();
        });
        });

        describe('getLobbyByUserId', () => {
        const userId = 'user-123';

        it('should return lobby where user is a player', async () => {
            const mockLobbyIds = ['lobby-1', 'lobby-2'];
            const mockLobby1 = {
            id: 'lobby-1',
            state: LOBBY_STATE_TYPE.WAITING,
            players: { [userId]: {} },
            };
            const mockLobby2 = {
            id: 'lobby-2',
            state: LOBBY_STATE_TYPE.WAITING,
            players: { 'other-user': {} },
            };

            mockRedisService.getSortedSetRange.mockResolvedValue(mockLobbyIds);
            mockRedisService.getJson
            .mockResolvedValueOnce(mockLobby1)
            .mockResolvedValueOnce(mockLobby2);

            const result = await service.getLobbyByUserId(userId);

            expect(result).toEqual(mockLobby1);
        });

        it('should return null if user not in any lobby', async () => {
            mockRedisService.getSortedSetRange.mockResolvedValue([]);

            const result = await service.getLobbyByUserId(userId);

            expect(result).toBeNull();
        });

        it('should filter out END state lobbies', async () => {
            const mockLobbyIds = ['lobby-1'];
            const mockLobby1 = {
            id: 'lobby-1',
            state: LOBBY_STATE_TYPE.END,
            players: { [userId]: {} },
            };

            mockRedisService.getSortedSetRange.mockResolvedValue(mockLobbyIds);
            mockRedisService.getJson.mockResolvedValue(mockLobby1);

            const result = await service.getLobbyByUserId(userId);

            expect(result).toBeNull();
        });
        });

        describe('deleteInvitation', () => {
        it('should delete invitation from Redis', async () => {
            const lobbyInvitation = {
            id: 'inv-1',
            addresseeId: 'user-123',
            lobbyId: 'lobby-1',
            requesterNickname: 'Requester',
            requesterId: 'user-456',
            };

            mockRedisService.removeFromSet.mockResolvedValue(undefined);

            await service.deleteInvitation(lobbyInvitation);

            expect(mockRedisService.removeFromSet).toHaveBeenCalledWith(
            `user:${lobbyInvitation.addresseeId}:invitations`,
            JSON.stringify(lobbyInvitation)
            );
        });
        });

        describe('getInvitations', () => {
        const userId = 'user-123';

        it('should return valid invitations', async () => {
            const mockInvitations = [
            JSON.stringify({ id: 'inv-1', lobbyId: 'lobby-1', addresseeId: userId }),
            JSON.stringify({ id: 'inv-2', lobbyId: 'lobby-2', addresseeId: userId }),
            ];
            const mockLobby1 = { id: 'lobby-1', players: { host: {} } };
            const mockLobby2 = { id: 'lobby-2', players: { host: {}, player2: {} } };

            mockRedisService.getSetMembers.mockResolvedValue(mockInvitations);
            mockRedisService.getJson
            .mockResolvedValueOnce(mockLobby1)
            .mockResolvedValueOnce(mockLobby2);

            const result = await service.getInvitations(userId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('inv-1');
        });

        it('should return empty array when no invitations', async () => {
            mockRedisService.getSetMembers.mockResolvedValue([]);

            const result = await service.getInvitations(userId);

            expect(result).toEqual([]);
        });

        it('should skip invitations where lobby no longer exists', async () => {
            const mockInvitations = [
            JSON.stringify({ id: 'inv-1', lobbyId: 'lobby-1', addresseeId: userId }),
            ];

            mockRedisService.getSetMembers.mockResolvedValue(mockInvitations);
            mockRedisService.getJson.mockResolvedValue(null);

            const result = await service.getInvitations(userId);

            expect(result).toEqual([]);
        });
        });

        describe('getFriendsForInvite', () => {
        const userId = 'user-123';

        it('should return friends with invite status', async () => {
            const mockFriends = [
            { friendId: 'friend-1', nickname: 'Friend1', isOnline: true },
            { friendId: 'friend-2', nickname: 'Friend2', isOnline: false },
            ];
            const mockInvitations = [
            { id: 'inv-1', requesterId: userId, addresseeId: 'friend-1' },
            ];

            mockUsersService.getFriends.mockResolvedValue(mockFriends as any);
            jest.spyOn(service, 'getInvitations').mockResolvedValue(mockInvitations as any);

            const result = await service.getFriendsForInvite(userId);

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe(INVITE_STATUS.OFFER);
        });

        it('should return empty array when user has no friends', async () => {
            mockUsersService.getFriends.mockResolvedValue([]);
            jest.spyOn(service, 'getInvitations').mockResolvedValue([]);

            const result = await service.getFriendsForInvite(userId);

            expect(result).toEqual([]);
        });
        });

        describe('joinLobbyByInvitation', () => {
        const userId = 'user-123';
        const invitationId = 'inv-123';

        it('should return invitation if valid', async () => {
            const mockInvitations = [
            JSON.stringify({ id: 'inv-123', lobbyId: 'lobby-1', addresseeId: userId }),
            ];
            const mockLobby = { id: 'lobby-1', players: { host: {} } };

            mockRedisService.getSetMembers.mockResolvedValue(mockInvitations);
            mockRedisService.getJson.mockResolvedValue(mockLobby);

            const result = await service.joinLobbyByInvitation(invitationId, userId);

            expect(result).toEqual({ id: 'inv-123', lobbyId: 'lobby-1', addresseeId: userId });
        });

        it('should throw INVITATION_NOT_FOUND if invitation does not exist', async () => {
            mockRedisService.getSetMembers.mockResolvedValue([]);

            await expect(service.joinLobbyByInvitation(invitationId, userId)).rejects.toThrow();
        });

        it('should throw INVITATION_EXPIRED if lobby is full', async () => {
            const mockInvitations = [
            JSON.stringify({ id: 'inv-123', lobbyId: 'lobby-1', addresseeId: userId }),
            ];
            const mockLobby = { id: 'lobby-1', players: { host: {}, player2: {} } };

            mockRedisService.getSetMembers.mockResolvedValue(mockInvitations);
            mockRedisService.getJson.mockResolvedValue(mockLobby);

            await expect(service.joinLobbyByInvitation(invitationId, userId)).rejects.toThrow();
        });

        it('should throw INVITATION_EXPIRED if lobby no longer exists', async () => {
            const mockInvitations = [
            JSON.stringify({ id: 'inv-123', lobbyId: 'lobby-1', addresseeId: userId }),
            ];

            mockRedisService.getSetMembers.mockResolvedValue(mockInvitations);
            mockRedisService.getJson.mockResolvedValue(null);

            await expect(service.joinLobbyByInvitation(invitationId, userId)).rejects.toThrow();
        });

        it('should throw INVITATION_EXPIRED if addresseeId does not match', async () => {
            const mockInvitations = [
            JSON.stringify({ id: 'inv-123', lobbyId: 'lobby-1', addresseeId: 'other-user' }),
            ];
            const mockLobby = { id: 'lobby-1', players: { host: {} } };

            mockRedisService.getSetMembers.mockResolvedValue(mockInvitations);
            mockRedisService.getJson.mockResolvedValue(mockLobby);

            await expect(service.joinLobbyByInvitation(invitationId, userId)).rejects.toThrow();
        });
        });

        describe('updateOptionsLobby', () => {
        const userId = 'user-123';
        const lobbyId = 'lobby-123';

        it('should update lobby options successfully', async () => {
            const mockLobby = {
            id: lobbyId,
            name: 'Test Lobby',
            players: { [userId]: { id: userId, isHost: true } },
            code: 'ABC123',
            isPrivate: false,
            state: LOBBY_STATE_TYPE.WAITING,
            };
            const updateData = {
            lobbyId,
            withTimers: true,
            timerTurn: 45,
            timerMovement: 30,
            timerDraft: 20,
            };

            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockRedisService.setJson.mockResolvedValue(undefined);

            const result = await service.updateOptionsLobby(updateData, userId);

            expect(result).toBe(lobbyId);
            expect(mockRedisService.setJson).toHaveBeenCalled();
        });

        it('should throw LOBBY_NOT_FOUND if lobby does not exist', async () => {
            const updateData = { lobbyId, withTimers: true, timerTurn: 30, timerMovement: 20, timerDraft: 15 };
            
            mockRedisService.getJson.mockResolvedValue(null);

            await expect(service.updateOptionsLobby(updateData, userId)).rejects.toThrow();
        });

        it('should throw LOBBY_ALREADY_STARTED if game already started', async () => {
            const mockLobby = { id: lobbyId, state: LOBBY_STATE_TYPE.PLAYING };
            const updateData = { lobbyId, withTimers: true, timerTurn: 30, timerMovement: 20, timerDraft: 15 };
            
            mockRedisService.getJson.mockResolvedValue(mockLobby);

            await expect(service.updateOptionsLobby(updateData, userId)).rejects.toThrow();
        });

        it('should set timers to null when withTimers is false', async () => {
            const mockLobby = {
            id: lobbyId,
            name: 'Test Lobby',
            players: { [userId]: { id: userId, isHost: true } },
            code: 'ABC123',
            isPrivate: false,
            state: LOBBY_STATE_TYPE.WAITING,
            };
            const updateData = {
            lobbyId,
            withTimers: false,
            timerTurn: 45,
            timerMovement: 30,
            timerDraft: 20,
            };

            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockRedisService.setJson.mockResolvedValue(undefined);

            await service.updateOptionsLobby(updateData, userId);

            const setJsonCall = mockRedisService.setJson.mock.calls[0];
            const lobbyData = setJsonCall[2];
            
            expect(lobbyData.options.timerTurn).toBeNull();
            expect(lobbyData.options.timerMovement).toBeNull();
            expect(lobbyData.options.timerDraft).toBeNull();
        });

        it('should clamp timer values to MIN and MAX', async () => {
            const mockLobby = {
            id: lobbyId,
            name: 'Test Lobby',
            players: { [userId]: { id: userId, isHost: true } },
            code: 'ABC123',
            isPrivate: false,
            state: LOBBY_STATE_TYPE.WAITING,
            };
            const updateData = {
            lobbyId,
            withTimers: true,
            timerTurn: 10,
            timerMovement: 500,
            timerDraft: 5,
            };

            mockRedisService.getJson.mockResolvedValue(mockLobby);
            mockRedisService.setJson.mockResolvedValue(undefined);

            await service.updateOptionsLobby(updateData, userId);

            const setJsonCall = mockRedisService.setJson.mock.calls[0];
            const lobbyData = setJsonCall[2];
            
            expect(lobbyData.options.timerTurn).toBe(MIN_TIMER_VALUE);
            expect(lobbyData.options.timerMovement).toBe(MAX_TIMER_VALUE);
            expect(lobbyData.options.timerDraft).toBe(MIN_TIMER_VALUE);
        });
        });
});
