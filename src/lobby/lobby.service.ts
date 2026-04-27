import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { FriendForInvite, INVITE_STATUS, Lobby, LOBBY_STATE_TYPE, LobbyInvitation, LobbyPlayer, LobbyStateType } from './types/lobby';
import { CreateLobbyData, InviteFriendData, UpdateOptionsLobbyData } from './types/lobby-evens-data';
import { UsersService } from 'src/users/users.service';
import { LOBBY_ERROR_CODE, LobbyException } from './types/lobby-exceptions';
import { LOBBYPATH } from './types/lobby-redis-paths';
import * as crypto from 'crypto';
import { uid } from 'uid';
import { UserNotFoundException } from 'src/users/exceptions/users.exception';
import { MAX_TIMER_VALUE, MIN_TIMER_VALUE } from './constants/settings';

@Injectable()
export class LobbyService {
    private readonly MAX_PLAYERS = 2;
    private readonly LOBBY_TTL = 60 * 60 * 24;
    private readonly LOBBY_INVITE_TTL = 60 * 5;

    constructor(
        private readonly redisService: RedisService,
        private readonly usersService: UsersService
    ) {}

    getLobbyKey(lobbyId: string) {
        return `lobby:${lobbyId}`
    }

    getLobbyIndexesKey() {
        return `lobbies:index`
    }

    async changeLobbyState(lobbyId: string, newState: LobbyStateType) {
        const key = this.getLobbyKey(lobbyId);
        const existingLobby = await this.getLobbyById(lobbyId);
        
        if (!existingLobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        await this.redisService.setJson<LobbyStateType>(key, LOBBYPATH.getStatePath(), newState, this.LOBBY_TTL);
    }

    async createLobby(lobbyData: CreateLobbyData, userId: number): Promise<string> {
        
        if (!lobbyData.name || lobbyData.name.length < 3 || lobbyData.name.length > 20) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_INCORRECT_NAME);
        }
        
        const lobbyId = uuidv4();
        const key = this.getLobbyKey(lobbyId);
        
        const user = await this.usersService.findOne(userId);

        const existingLobby = await this.getLobbyByUserId(userId);
        
        if (existingLobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.PLAYER_ALREADY_IN_LOBBY);
        }

        let timerDraft = lobbyData.timerDraft < MIN_TIMER_VALUE ? MIN_TIMER_VALUE : lobbyData.timerDraft;
        timerDraft = timerDraft > MAX_TIMER_VALUE ? MAX_TIMER_VALUE : timerDraft;

        let timerTurn = lobbyData.timerTurn < MIN_TIMER_VALUE ? MIN_TIMER_VALUE : lobbyData.timerTurn;
        timerTurn = timerTurn > MAX_TIMER_VALUE ? MAX_TIMER_VALUE : timerTurn;

        let timerMovement = lobbyData.timerMovement < MIN_TIMER_VALUE ? MIN_TIMER_VALUE : lobbyData.timerMovement;
        timerMovement = timerMovement > MAX_TIMER_VALUE ? MAX_TIMER_VALUE : timerMovement;

        const code = uid(6).toUpperCase();

        await this.redisService.setJson<Lobby>(key, ".", {
            id: lobbyId,
            name: lobbyData.name,
            players: {
                [userId]: {
                    id: userId,
                    nickname: user.nickname,
                    isHost: true,
                    isReady: false
                }
            },
            code: code,
            isPrivate: lobbyData.isPrivate,
            state: LOBBY_STATE_TYPE.WAITING,
            options: {
                withTimers: lobbyData.withTimers,
                timerDraft: lobbyData.withTimers ? timerDraft : null,
                timerTurn: lobbyData.withTimers ? timerTurn : null,
                timerMovement: lobbyData.withTimers ? timerMovement : null,
                mode: 'classic'
            }
        }, this.LOBBY_TTL);

        await this.redisService.addToSortedSet(
            this.getLobbyIndexesKey(),
            Date.now(),
            lobbyId,
            this.LOBBY_TTL
        );
        
        return lobbyId;
    }

    async updateOptionsLobby(lobbyOptions: UpdateOptionsLobbyData, userId: number): Promise<string> {
        const key = this.getLobbyKey(lobbyOptions.lobbyId);
        const lobby = await this.getLobbyById(lobbyOptions.lobbyId);

        if (!lobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        if (lobby.state !== LOBBY_STATE_TYPE.WAITING) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_ALREADY_STARTED);
        }

        let timerDraft = lobbyOptions.timerDraft < MIN_TIMER_VALUE ? MIN_TIMER_VALUE : lobbyOptions.timerDraft;
        timerDraft = timerDraft > MAX_TIMER_VALUE ? MAX_TIMER_VALUE : timerDraft;

        let timerTurn = lobbyOptions.timerTurn < MIN_TIMER_VALUE ? MIN_TIMER_VALUE : lobbyOptions.timerTurn;
        timerTurn = timerTurn > MAX_TIMER_VALUE ? MAX_TIMER_VALUE : timerTurn;

        let timerMovement = lobbyOptions.timerMovement < MIN_TIMER_VALUE ? MIN_TIMER_VALUE : lobbyOptions.timerMovement;
        timerMovement = timerMovement > MAX_TIMER_VALUE ? MAX_TIMER_VALUE : timerMovement;

        await this.redisService.setJson<Lobby>(key, ".", {
            id: lobby.id,
            name: lobby.name,
            players: lobby.players,
            code: lobby.code,
            isPrivate: lobby.isPrivate,
            state: lobby.state,
            options: {
                withTimers: lobbyOptions.withTimers,
                timerDraft: lobbyOptions.withTimers ? timerDraft : null,
                timerTurn: lobbyOptions.withTimers ? timerTurn : null,
                timerMovement: lobbyOptions.withTimers ? timerMovement : null,
                mode: 'classic'
            }
        }, this.LOBBY_TTL);
        
        return lobby.id;
    }

    async joinLobby(lobbyId: string, userId: number): Promise<void> {
        const key = this.getLobbyKey(lobbyId);

        const lobbyByUserId = await this.getLobbyByUserId(userId);

        if (lobbyByUserId !== null) {            
            throw new LobbyException(LOBBY_ERROR_CODE.PLAYER_ALREADY_IN_LOBBY);
        }

        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        if (lobby.state !== LOBBY_STATE_TYPE.WAITING) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_ALREADY_STARTED);
        }

        if (lobby.players[userId]) {
            throw new LobbyException(LOBBY_ERROR_CODE.PLAYER_ALREADY_IN_LOBBY);
        }

        if (Object.keys(lobby.players).length >= this.MAX_PLAYERS) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_FULL);
        }

        const user = await this.usersService.findOne(userId);

        const newPlayer: LobbyPlayer = {
            id: userId,
            nickname: user.nickname,
            isHost: false,
            isReady: false
        };

        await this.redisService.setJson(key, LOBBYPATH.getPlayerPath(userId), newPlayer);
    }

    async leaveLobby(lobbyId: string, userId: number): Promise<void> {
        const key = this.getLobbyKey(lobbyId);
        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        const lobbyPlayer = lobby.players[userId];

        if (!lobbyPlayer) {
            throw new LobbyException(LOBBY_ERROR_CODE.PLAYER_NOT_IN_LOBBY);
        }
        
        if (Object.keys(lobby.players).length > 1) {
            if (lobbyPlayer.isHost) {
                const otherPlayerId = Object.values(lobby.players).find(player => player.id !== userId)?.id;

                if (otherPlayerId) {
                    await this.redisService.setJson(key, LOBBYPATH.getHostPath(otherPlayerId), true);
                }
            }

            await this.redisService.delete(key, `.players.${userId}`);
        }
        else {
            await this.deleteLobby(lobbyId)
        }
    }

    async toggleReadyLobby(lobbyId: string, userId: number): Promise<void> {
        const key = this.getLobbyKey(lobbyId);
        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        if (lobby.state !== LOBBY_STATE_TYPE.WAITING) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_ALREADY_STARTED);
        }

        const lobbyPlayer = lobby.players[userId];

        if (!lobbyPlayer) {
            throw new LobbyException(LOBBY_ERROR_CODE.PLAYER_NOT_IN_LOBBY);
        }
        
        const newReadyState = !lobbyPlayer.isReady;
        const path = LOBBYPATH.getPlayerReadyPath(userId);
        await this.redisService.setJson(key, path, newReadyState);
    }

    async getAllLobbyIds(): Promise<string[]> {
        return await this.redisService.getSortedSetRange(
            this.getLobbyIndexesKey(),
            0,
            -1
        );
    }

    async getAllLobbies(userId: number): Promise<Lobby[]> {
        const lobbyIds = await this.getAllLobbyIds();
        
        const lobbyPromises = lobbyIds.map(id => 
            this.redisService.getJson<Lobby>(`lobby:${id}`)
        );
        
        const lobbies = await Promise.all(lobbyPromises);
        let filteredLobbies = lobbies.filter(lobby => lobby !== null);
        filteredLobbies = filteredLobbies.filter(lobby => lobby.state !== LOBBY_STATE_TYPE.END);

        filteredLobbies = filteredLobbies.map(lobby => {
            if (Object.values(lobby.players).find(l => l.id === userId)) {
                return lobby;
            }
            else {
                const lobbyWithoutCode: Lobby = {
                    id: lobby.id,
                    name: lobby.name,
                    players: lobby.players, 
                    isPrivate: lobby.isPrivate,
                    code: null, 
                    options: lobby.options,
                    state: lobby.state
                }

                return lobbyWithoutCode;
            }
        })

        return filteredLobbies;
    }

    async getLobbyById(lobbyId: string): Promise<Lobby | null> {
        const key = this.getLobbyKey(lobbyId);
        return await this.redisService.getJson<Lobby>(key);
    }

    async getLobbyByCode(code: string): Promise<Lobby | null> {
        const lobbyIds = await this.getAllLobbyIds();
        
        const lobbyPromises = lobbyIds.map(id => 
            this.redisService.getJson<Lobby>(`lobby:${id}`)
        );
        
        const lobbies = await Promise.all(lobbyPromises);
        let filteredLobbies = lobbies.filter(lobby => lobby !== null);
        filteredLobbies = filteredLobbies.filter(lobby => lobby.state !== LOBBY_STATE_TYPE.END);
        
        return filteredLobbies.find(l => l.code === code && Object.keys(l.players).length === 1) ?? null;
    }

    async getLobbyByUserId(userId: number): Promise<Lobby|null> {
        const lobbyIds = await this.getAllLobbyIds();
        
        const lobbyPromises = lobbyIds.map(id => 
            this.redisService.getJson<Lobby>(`lobby:${id}`)
        );
        
        let lobbies = await Promise.all(lobbyPromises);
        let filteredLobbies = lobbies.filter(lobby => lobby !== null);
        filteredLobbies = filteredLobbies.filter(lobby => lobby.state !== LOBBY_STATE_TYPE.END);
        return filteredLobbies.find(lobby => lobby.players[userId]) ?? null;
    }

    async deleteLobby(lobbyId: string): Promise<void> {
        const key = this.getLobbyKey(lobbyId);

        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        await this.redisService.delete(key);
        await this.redisService.removeFromSortedSet(this.getLobbyIndexesKey(), lobbyId);
    }

    async inviteFriend(data: InviteFriendData, currentUserId: number) {
        const lobby = await this.getLobbyById(data.lobbyId);

        if (!lobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }   

        const invitedUser = await this.usersService.findOne(data.friendId);
        const currentUser = await this.usersService.findOne(currentUserId);

        const invitationId = uuidv4();
        const lobbyInvite: LobbyInvitation = {
            id: invitationId,
            addresseeId: invitedUser.id,
            lobbyId: lobby.id,
            requesterNickname: currentUser.nickname,
            requesterId: currentUser.id
        }

        await this.redisService.addToSet(`user:${invitedUser.id}:invitations`, JSON.stringify(lobbyInvite), this.LOBBY_INVITE_TTL)
    }

    async deleteInvitation(lobbyInvitation: LobbyInvitation) {
        await this.redisService.removeFromSet(
            `user:${lobbyInvitation.addresseeId}:invitations`, 
            JSON.stringify(lobbyInvitation)
        );
    }

    async getInvitations(currentUserId: number) {
        let invitations = await this.redisService.getSetMembers(`user:${currentUserId}:invitations`);
        const playerInvitations: LobbyInvitation[] = []

        for (const invitation of invitations) {
            const parsed: LobbyInvitation = JSON.parse(invitation);
            const lobby = await this.getLobbyById(parsed.lobbyId);

            if (lobby && Object.keys(lobby.players).length === 1 && parsed.addresseeId === currentUserId) {
                playerInvitations.push(parsed);
            }
        }

        return playerInvitations;
    }

    async getFriendsForInvite(currentUserId: number): Promise<FriendForInvite[]> {
        const friends = await this.usersService.getFriends(currentUserId);

        const friendsForInvite: FriendForInvite[] = []; 
        for (const friend of friends) {
            const invitations = await this.getInvitations(friend.friendId);

            if (invitations.find(invitation => invitation.requesterId === currentUserId)) {
                friendsForInvite.push({
                    friendId: friend.friendId,
                    status: INVITE_STATUS.OFFER,
                    friendNickname: friend.nickname,
                    isOnline: friend.isOnline
                })
            }
            else {
                friendsForInvite.push({
                    friendId: friend.friendId,
                    status: INVITE_STATUS.NO_OFFER,
                    friendNickname: friend.nickname,
                    isOnline: friend.isOnline
                })            
            }
        }
        return friendsForInvite;
    }

    async joinLobbyByInvitation(invitationId: string, currentUserId: number) {
        let invitations = await this.redisService.getSetMembers(`user:${currentUserId}:invitations`);
        const parsedInvitations: LobbyInvitation[] = invitations.map(invitation => JSON.parse(invitation));
        const invitation = parsedInvitations.find(inv => inv.id === invitationId);

        if (!invitation) {
            throw new LobbyException(LOBBY_ERROR_CODE.INVITATION_NOT_FOUND);
        }
        
        const lobby = await this.getLobbyById(invitation.lobbyId);

        if (!lobby || Object.keys(lobby.players).length !== 1 || invitation.addresseeId !== currentUserId) {
            throw new LobbyException(LOBBY_ERROR_CODE.INVITATION_EXPIRED);
        }

        return invitation;
    }
}
