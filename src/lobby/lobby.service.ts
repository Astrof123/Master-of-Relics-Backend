import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { Lobby, LOBBY_STATE_TYPE, LobbyPlayer } from './types/lobby';
import { CreateLobbyData } from './types/lobby-evens-data';
import { UsersService } from 'src/users/users.service';
import { LOBBY_ERROR_CODE, LobbyError } from './types/lobby-errors';

@Injectable()
export class LobbyService {
    private readonly MAX_PLAYERS = 2;
    private readonly LOBBY_TTL = 60 * 60 * 6;

    constructor(
        private readonly redisService: RedisService,
        private readonly usersService: UsersService
    ) {}

    async createLobby(lobbyData: CreateLobbyData, userId: number): Promise<string> {
        
        if (!lobbyData.name || lobbyData.name.length < 3 || lobbyData.name.length > 20) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_INCORRECT_NAME);
        }
        
        const lobbyId = uuidv4();
        const key = `lobby:${lobbyId}`;
        
        const user = await this.usersService.findOne(userId);

        const existingLobby = await this.getLobbyByUserId(userId);
        
        if (existingLobby) {
            throw new LobbyError(LOBBY_ERROR_CODE.PLAYER_ALREADY_IN_LOBBY);
        }

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
            state: LOBBY_STATE_TYPE.WAITING,
            options: {
                mode: 'classic'
            }
        }, this.LOBBY_TTL);    

        await this.redisService.addToSortedSet(
            'lobbies:index',
            Date.now(),
            lobbyId
        );
        
        return lobbyId;
    }

    async joinLobby(lobbyId: string, userId: number): Promise<void> {
        const key = `lobby:${lobbyId}`;

        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        if (lobby.state !== LOBBY_STATE_TYPE.WAITING) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_ALREADY_STARTED);
        }

        if (lobby.players[userId]) {
            throw new LobbyError(LOBBY_ERROR_CODE.PLAYER_ALREADY_IN_LOBBY);
        }

        if (Object.keys(lobby.players).length >= this.MAX_PLAYERS) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_FULL);
        }
        
        const user = await this.usersService.findOne(userId);

        const newPlayer: LobbyPlayer = {
            id: userId,
            nickname: user.nickname,
            isHost: false,
            isReady: false
        };

        await this.redisService.setJson(key, `.players.${userId}`, newPlayer);
    }

    async leaveLobby(lobbyId: string, userId: number): Promise<void> {
        const key = `lobby:${lobbyId}`;
        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        const lobbyPlayer = lobby.players[userId];

        if (!lobbyPlayer) {
            throw new LobbyError(LOBBY_ERROR_CODE.PLAYER_NOT_IN_LOBBY);
        }
        
        if (Object.keys(lobby.players).length > 1) {
            if (lobbyPlayer.isHost) {
                const otherPlayerId = Object.values(lobby.players).find(player => player.id !== userId)?.id;
                await this.redisService.setJson(key, `.players.${otherPlayerId}.isHost`, true);
            }

            await this.redisService.delete(key, `.players.${userId}`);
        }
        else {
            await this.deleteLobby(lobbyId)
        }
    }

    async toggleReadyLobby(lobbyId: string, userId: number): Promise<void> {
        const key = `lobby:${lobbyId}`;
        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        if (lobby.state !== LOBBY_STATE_TYPE.WAITING) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_ALREADY_STARTED);
        }

        const lobbyPlayer = lobby.players[userId];

        if (!lobbyPlayer) {
            throw new LobbyError(LOBBY_ERROR_CODE.PLAYER_NOT_IN_LOBBY);
        }
        
        const newReadyState = !lobbyPlayer.isReady;
        await this.redisService.setJson(key, `.players.${userId}.isReady`, newReadyState);
    }

    async getAllLobbyIds(): Promise<string[]> {
        return await this.redisService.getSortedSetRange(
            'lobbies:index',
            0,
            -1
        );
    }

    async getAllLobbies(): Promise<Lobby[]> {
        const lobbyIds = await this.getAllLobbyIds();
        
        const lobbyPromises = lobbyIds.map(id => 
            this.redisService.getJson<Lobby>(`lobby:${id}`)
        );
        
        const lobbies = await Promise.all(lobbyPromises);
        return lobbies.filter(lobby => lobby !== null);
    }

    async getLobbyById(lobbyId: string): Promise<Lobby | null> {
        const key = `lobby:${lobbyId}`;
        return this.redisService.getJson<Lobby>(key);
    }

    async getLobbyByUserId(userId: number): Promise<Lobby|null> {
        const lobbyIds = await this.getAllLobbyIds();
        
        const lobbyPromises = lobbyIds.map(id => 
            this.redisService.getJson<Lobby>(`lobby:${id}`)
        );
        
        let lobbies = await Promise.all(lobbyPromises);
        let filteredLobbies = lobbies.filter(lobby => lobby !== null);
        return filteredLobbies.find(lobby => lobby.players[userId]) ?? null;
    }

    async deleteLobby(lobbyId: string): Promise<void> {
        const key = `lobby:${lobbyId}`;

        const lobby = await this.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyError(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        await this.redisService.delete(key);
        await this.redisService.removeFromSortedSet('lobbies:index', lobbyId);
    }
}
