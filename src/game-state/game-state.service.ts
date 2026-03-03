import { Injectable } from '@nestjs/common';
import { Lobby, LOBBY_STATE_TYPE, LobbyStateType } from 'src/lobby/types/lobby';
import { RedisService } from 'src/redis/redis.service';
import { PHASE } from './types/phase';
import { ConnectionGame, CONNECTIONGAME, Game, Player } from './types/game';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { LobbyService } from 'src/lobby/lobby.service';
import { GAME_ERROR_CODE, GameException } from './types/game-exceptions';
import { LOBBY_ERROR_CODE, LobbyException } from 'src/lobby/types/lobby-exceptions';
import { EnemyForClient, GameForClient } from './types/game-for-client';
import { SPELLS } from 'src/spell/constants/spells';
import { GAMEPATH } from './types/game-redis-paths';
import { LOBBYPATH } from 'src/lobby/types/lobby-redis-paths';

@Injectable()
export class GameStateService {
    private readonly GAME_TTL = 60 * 60 * 24;

    constructor(
        private readonly redisService: RedisService,
        private readonly lobbyService: LobbyService
    ) {}

    getKeyGame(gameId: string): string {
        return `game:${gameId}`
    }

    async createGameSessionState(lobbyId: string, userId: number): Promise<string> {
        const lobby = await this.lobbyService.getLobbyById(lobbyId);

        if (!lobby) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FOUND);
        }

        if (lobby.state !== LOBBY_STATE_TYPE.WAITING) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_ALREADY_STARTED);
        }

        if (!lobby.players[userId]) {
            throw new LobbyException(LOBBY_ERROR_CODE.PLAYER_NOT_IN_LOBBY);
        }

        if (!lobby.players[userId].isHost) {
            throw new LobbyException(LOBBY_ERROR_CODE.PLAYER_NOT_HOST);
        }

        const enemyKey = Object.keys(lobby.players).find(key => Number(key) !== userId);

        if (enemyKey === undefined) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_FULL);
        }

        if (!lobby.players[userId].isReady || !lobby.players[enemyKey].isReady) {
            throw new LobbyException(LOBBY_ERROR_CODE.LOBBY_NOT_ALL_READY);
        }

        const key = this.getKeyGame(lobbyId);

        // ДОБАВИТЬ ПОТОМ КОЛОДУ ИГРОКА, А НЕ ИЗ ОБЩЕГО
        const defaultDeck = [
            ARTIFACTS[1].id,
            ARTIFACTS[2].id,
            ARTIFACTS[3].id,
            ARTIFACTS[4].id,
            ARTIFACTS[5].id,
            ARTIFACTS[1].id,
            ARTIFACTS[2].id,
            ARTIFACTS[3].id,
            ARTIFACTS[4].id,
            ARTIFACTS[5].id,
            ARTIFACTS[1].id,
            ARTIFACTS[2].id,
            ARTIFACTS[3].id,
            ARTIFACTS[4].id,
        ]

        const defaultSpells = {
            light: [],
            dark: [],
            destruction: []
        }

        const player1: Player = {
            id: lobby.players[userId].id,
            name: lobby.players[userId].nickname,
            connection: CONNECTIONGAME.OFFLINE,
            hero: "Empty",
            resources: {
                rage: 0,
                agility: 0,
                light_mana: 0,
                dark_mana: 0,
                destruction_mana: 0
            },
            artifacts: {},
            spells: defaultSpells,
            effects: [],
            isReady: false,
            movePoints: 0,
            draft: {
                pickedArtifact: null,
                deck: defaultDeck
            },
            availableActions: {}
        }

        const player2: Player = {
            id: lobby.players[enemyKey].id,
            name: lobby.players[enemyKey].nickname,
            connection: CONNECTIONGAME.OFFLINE,
            hero: "Empty",
            resources: {
                rage: 0,
                agility: 0,
                light_mana: 0,
                dark_mana: 0,
                destruction_mana: 0
            },
            artifacts: {},
            spells: defaultSpells,
            effects: [],
            isReady: false,
            movePoints: 0,
            draft: {
                pickedArtifact: null,
                deck: defaultDeck.reverse()
            },
            availableActions: {}
        }

        await this.redisService.setJson<Game>(key, ".", {
            id: lobby.id,
            phase: PHASE.DRAFT,
            name: lobby.name,
            currentTurn: lobby.players[userId].id,
            logs: [],
            players: {
                [lobby.players[userId].id]: player1,
                [lobby.players[enemyKey].id]: player2,
            }
        }, this.GAME_TTL)

        await this.redisService.setJson<LobbyStateType>(`lobby:${lobbyId}`, LOBBYPATH.getStatePath(), LOBBY_STATE_TYPE.PLAYING, this.GAME_TTL);

        await this.redisService.addToSortedSet(
            'games:index',
            Date.now(),
            lobbyId
        );

        return lobbyId;
    }

    async getGameById(gameId: string): Promise<Game | null> {
        const key = this.getKeyGame(gameId);
        const game = await this.redisService.getJson<Game>(key);

        return game;
    }

    async getGameForClientById(gameId: string, userId: number): Promise<GameForClient | null> {
        const key = this.getKeyGame(gameId);
        const game = await this.redisService.getJson<Game>(key);

        console.log(game?.players[userId].draft)

        if (game === null) {
            return null;
        }

        if (!game.players[userId]) {
            throw new GameException(GAME_ERROR_CODE.PLAYER_NOT_IN_GAME);
        }

        const enemyKey = Object.keys(game.players).find(key => Number(key) !== userId);

        if (enemyKey === undefined) {
            throw new GameException(GAME_ERROR_CODE.ENEMY_NOT_FOUND);
        }

        const enemyForClient: EnemyForClient = {
            id: game.players[enemyKey].id,
            name: game.players[enemyKey].name,
            connection: game.players[enemyKey].connection,
            hero: game.players[enemyKey].hero,
            resources: game.players[enemyKey].resources,
            artifacts: game.players[enemyKey].artifacts,
            effects: game.players[enemyKey].effects,
            isReady: game.players[enemyKey].isReady,
            movePoints: game.players[enemyKey].movePoints,
            draft: {
                deck: game.players[enemyKey].draft.deck
            }
        }

        const gameForClient: GameForClient = {
            id: game.id,
            name: game.name,
            phase: game.phase,
            currentTurn: game.currentTurn,
            logs: game.logs,
            player: game.players[userId],
            enemy: enemyForClient
        }

        return gameForClient;
    }

    async setPlayerConnectionStatus(status: ConnectionGame, gameId: string, userId: number): Promise<void> {
        const key = this.getKeyGame(gameId);
        const path = GAMEPATH.getPlayerConnectionPath(userId);
        await this.redisService.setJson<ConnectionGame>(key, path, status, this.GAME_TTL);
    }

    async getGameByUserId(userId: number): Promise<Lobby|null> {
        const lobbyIds = await this.getAllGameIds();
        
        const lobbyPromises = lobbyIds.map(id => 
            this.redisService.getJson<Lobby>(`game:${id}`)
        );
        
        let lobbies = await Promise.all(lobbyPromises);
        let filteredLobbies = lobbies.filter(lobby => lobby !== null);
        return filteredLobbies.find(lobby => lobby.players[userId]) ?? null;
    }

    async getAllGameIds(): Promise<string[]> {
        return await this.redisService.getSortedSetRange(
            'games:index',
            0,
            -1
        );
    }

    async deleteGame(gameId: string): Promise<void> {
        const key = this.getKeyGame(gameId);

        const game = await this.getGameById(gameId);

        if (!game) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        await this.redisService.delete(key);
        await this.redisService.removeFromSortedSet('games:index', gameId);
    }
}
