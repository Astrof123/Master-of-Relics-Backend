import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { Lobby, LOBBY_STATE_TYPE, LobbyPlayer, LobbyStateType } from './types/lobby';
import { CreateLobbyData } from './types/lobby-evens-data';
import { UsersService } from 'src/users/users.service';
import { LOBBY_ERROR_CODE, LobbyException } from './types/lobby-exceptions';
import { LOBBYPATH } from './types/lobby-redis-paths';
import * as crypto from 'crypto';
import { uid } from 'uid';

@Injectable()
export class LobbyService {
    private readonly MAX_PLAYERS = 2;
    private readonly LOBBY_TTL = 60 * 60 * 24;

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

        const code = lobbyData.isPrivate ? uid(6).toUpperCase() : null;

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
        
        if (lobby.isPrivate) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_IS_PRIVATE);
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
}
