import { Injectable } from '@nestjs/common';
import { Lobby, LOBBY_STATE_TYPE, LobbyStateType } from 'src/lobby/types/lobby';
import { RedisService } from 'src/redis/redis.service';
import { MINIPHASE, PHASE } from './types/phase';
import { ConnectionGame, CONNECTIONGAME, Game, Player } from './types/game';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { LobbyService } from 'src/lobby/lobby.service';
import { GAME_ERROR_CODE, GameException } from './types/game-exceptions';
import { LOBBY_ERROR_CODE, LobbyException } from 'src/lobby/types/lobby-exceptions';
import { EnemyForClient, GameForClient } from './types/game-for-client';
import { GAMEPATH } from './constants/game-redis-paths';
import { LOBBYPATH } from 'src/lobby/types/lobby-redis-paths';
import { GameForLogic } from './types/game-for-logic';
import { ARTIFACT } from 'src/artifact/types/artifact';
import { SKILLS } from 'src/artifact/constants/skills';
import { SPELL, SPELLTYPE } from 'src/spell/types/spell';
import { SPELLS } from 'src/spell/constants/spells';
import { SpellHelper } from 'src/spell/spell.helper';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';

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
            {
                artifactId: ARTIFACTS[ARTIFACT.INTIMIDATOR].id,
                maxHp: ARTIFACTS[ARTIFACT.INTIMIDATOR].hp,
                skillCost: ARTIFACTS[ARTIFACT.INTIMIDATOR].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.INTIMIDATOR].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].id,
                maxHp: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].hp,
                skillCost: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.ARCANE_SHIELD].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.FROST_BOW].id,
                maxHp: ARTIFACTS[ARTIFACT.FROST_BOW].hp,
                skillCost: ARTIFACTS[ARTIFACT.FROST_BOW].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.FROST_BOW].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.REGENERATION_POTION].id,
                maxHp: ARTIFACTS[ARTIFACT.REGENERATION_POTION].hp,
                skillCost: ARTIFACTS[ARTIFACT.REGENERATION_POTION].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.REGENERATION_POTION].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.SWIFT_BOOTS].id,
                maxHp: ARTIFACTS[ARTIFACT.SWIFT_BOOTS].hp,
                skillCost: ARTIFACTS[ARTIFACT.SWIFT_BOOTS].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.SWIFT_BOOTS].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.INTIMIDATOR].id,
                maxHp: ARTIFACTS[ARTIFACT.INTIMIDATOR].hp,
                skillCost: ARTIFACTS[ARTIFACT.INTIMIDATOR].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.INTIMIDATOR].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].id,
                maxHp: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].hp,
                skillCost: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.ARCANE_SHIELD].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.FROST_BOW].id,
                maxHp: ARTIFACTS[ARTIFACT.FROST_BOW].hp,
                skillCost: ARTIFACTS[ARTIFACT.FROST_BOW].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.FROST_BOW].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.REGENERATION_POTION].id,
                maxHp: ARTIFACTS[ARTIFACT.REGENERATION_POTION].hp,
                skillCost: ARTIFACTS[ARTIFACT.REGENERATION_POTION].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.REGENERATION_POTION].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.SWIFT_BOOTS].id,
                maxHp: ARTIFACTS[ARTIFACT.SWIFT_BOOTS].hp,
                skillCost: ARTIFACTS[ARTIFACT.SWIFT_BOOTS].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.SWIFT_BOOTS].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.INTIMIDATOR].id,
                maxHp: ARTIFACTS[ARTIFACT.INTIMIDATOR].hp,
                skillCost: ARTIFACTS[ARTIFACT.INTIMIDATOR].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.INTIMIDATOR].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].id,
                maxHp: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].hp,
                skillCost: ARTIFACTS[ARTIFACT.ARCANE_SHIELD].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.ARCANE_SHIELD].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.FROST_BOW].id,
                maxHp: ARTIFACTS[ARTIFACT.FROST_BOW].hp,
                skillCost: ARTIFACTS[ARTIFACT.FROST_BOW].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.FROST_BOW].skills![0]].cost
            },
            {
                artifactId: ARTIFACTS[ARTIFACT.REGENERATION_POTION].id,
                maxHp: ARTIFACTS[ARTIFACT.REGENERATION_POTION].hp,
                skillCost: ARTIFACTS[ARTIFACT.REGENERATION_POTION].skills === null ? 0 : SKILLS[ARTIFACTS[ARTIFACT.REGENERATION_POTION].skills![0]].cost
            }
        ]

        const defaultSpells = {
            [SPELLTYPE.LIGHT]: {
                [SPELL.TOUCH_OF_LIGHT]: SpellHelper.getDefaultSpellState(SPELL.TOUCH_OF_LIGHT)
            },
            [SPELLTYPE.DARK]: {

            },
            [SPELLTYPE.DESTRUCTION]: {
                [SPELL.PIERCING_BOLT]: SpellHelper.getDefaultSpellState(SPELL.PIERCING_BOLT)
            }
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
            temporaryArtifacts: {}
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
            temporaryArtifacts: {}
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
            },
            end: null,
            miniPhase: MINIPHASE.MOVEMENT,
            constants: {
                maxCountArtifactsOnLine: MAX_COUNT_ARTIFACTS_ON_LINE
            }
        }, this.GAME_TTL)

        await this.redisService.setJson<LobbyStateType>(`lobby:${lobbyId}`, LOBBYPATH.getStatePath(), LOBBY_STATE_TYPE.PLAYING, this.GAME_TTL);

        await this.redisService.addToSortedSet(
            'games:index',
            Date.now(),
            lobbyId,
            this.GAME_TTL
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
            enemy: enemyForClient,
            end: game.end,
            miniPhase: game.miniPhase,
            constants: game.constants
        }

        return gameForClient;
    }

    async getGameForLogicById(gameId: string, userId: number): Promise<GameForLogic | null> {
        const key = this.getKeyGame(gameId);
        const game = await this.redisService.getJson<Game>(key);

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

        const gameForClient: GameForLogic = {
            id: game.id,
            name: game.name,
            phase: game.phase,
            currentTurn: game.currentTurn,
            logs: game.logs,
            player: game.players[userId],
            enemy: game.players[enemyKey],
            end: game.end,
            miniPhase: game.miniPhase,
            constants: game.constants
        }

        return gameForClient;
    }

    async saveGameForLogic(gameState: GameForLogic, key: string) {
        const game: Game = {
            id: gameState.id,
            name: gameState.name,
            phase: gameState.phase,
            currentTurn: gameState.currentTurn,
            logs: gameState.logs,
            players: {
                [gameState.player.id]: gameState.player,
                [gameState.enemy.id]: gameState.enemy
            },
            end: gameState.end,
            miniPhase: gameState.miniPhase,
            constants: gameState.constants
        }


        await this.redisService.setJson<Game>(
            key, 
            ".", 
            game
        );

        const lobbyKey = await this.lobbyService.getLobbyKey(gameState.id);
        const lobbyIndexesKey = await this.lobbyService.getLobbyIndexesKey();

        await this.redisService.expire(lobbyKey, this.GAME_TTL);
        await this.redisService.expire(lobbyIndexesKey, this.GAME_TTL);
    }

    async saveGameForLogicInTransaction(
        gameState: GameForLogic, 
        key: string, 
        multi: any
    ): Promise<void> {
        const game: Game = {
            id: gameState.id,
            name: gameState.name,
            phase: gameState.phase,
            currentTurn: gameState.currentTurn,
            logs: gameState.logs,
            players: {
                [gameState.player.id]: gameState.player,
                [gameState.enemy.id]: gameState.enemy
            },
            end: gameState.end,
            miniPhase: gameState.miniPhase,
            constants: gameState.constants
        };

        await this.redisService.jsonSetInTransaction(multi, key, ".", game);
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
