import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { ArtifactService } from 'src/artifact/artifact.service';
import { CollectionService } from 'src/collection/collection.service';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { DRAW_PRIZE, LOSER_PRIZE, WINNER_PRIZE } from 'src/game-mechanics/constants/settings';
import { DiceService } from 'src/game-mechanics/dice.service';
import { ResourceService } from 'src/game-mechanics/resource.service';
import { ARTIFACT_STATE } from 'src/game-state/types/game';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { MINIPHASE, PHASE } from 'src/game-state/types/phase';
import { LobbyService } from 'src/lobby/lobby.service';
import { LOBBY_STATE_TYPE } from 'src/lobby/types/lobby';
import { SpellService } from 'src/spell/spell.service';

@Injectable()
export class PhaseService {
    constructor(
        private readonly resourceService: ResourceService,
        private readonly artifactStateService: ArtifactStateService,
        private readonly diceService: DiceService,
        private readonly artifactService: ArtifactService,
        private readonly spellService: SpellService,
        private readonly collectionService: CollectionService,
        private readonly lobbyService: LobbyService
    ) {}
    
    async newRound(gameState: GameForLogic) {
        gameState.player.isReady = false;
        gameState.enemy.isReady = false;

        this.resourceService.addResourceNewRound(gameState);
        this.artifactStateService.updateStateNewRound(gameState);
        this.diceService.updateDicesNewRound(gameState);
        gameState.currentTurn = this.setFirstPlayer(gameState);
        gameState.player.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.player);
        gameState.enemy.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.enemy);

        Object.values(gameState.player.spells).forEach(spells => {
            Object.values(spells).forEach(spell => {
                spell.cooldown = false;
            });            
        });

        Object.values(gameState.enemy.spells).forEach(spells => {
            Object.values(spells).forEach(spell => {
                spell.cooldown = false;
            });            
        });

        gameState.miniPhase = MINIPHASE.MOVEMENT;

        if (gameState.currentTurn === gameState.player.id) {
            await this.calculateNewState(gameState, false);
        }
        else {
            await this.calculateNewState(gameState, true);
        }

        gameState.player.temporaryArtifacts = gameState.player.artifacts;
        gameState.enemy.temporaryArtifacts = gameState.enemy.artifacts;

        return gameState;
    }

    async checkEndGame(gameState: GameForLogic): Promise<boolean> {
        let hasPlayerNotBreaken = false;
        Object.values(gameState.player.artifacts).forEach(artifact => {
            if (artifact.state !== ARTIFACT_STATE.BREAKEN) {
                hasPlayerNotBreaken = true;
                return;
            }
        });

        let hasEnemyNotBreaken = false;
        Object.values(gameState.enemy.artifacts).forEach(artifact => {
            if (artifact.state !== ARTIFACT_STATE.BREAKEN) {
                hasEnemyNotBreaken = true;
                return;
            }
        });

        if (!hasEnemyNotBreaken && !hasPlayerNotBreaken) {
            gameState.end = {
                winner: null,
                winner_prize: 0,
                loser_prize: 0,
                draw_prize: DRAW_PRIZE,
            }

            await this.collectionService.giveGold(gameState.enemy.id, DRAW_PRIZE);
            await this.collectionService.giveGold(gameState.player.id, DRAW_PRIZE);
            await this.lobbyService.changeLobbyState(gameState.id, LOBBY_STATE_TYPE.END)

            return true;
        }
        else if (!hasPlayerNotBreaken) {
            gameState.end = {
                winner: gameState.enemy.id,
                winner_prize: WINNER_PRIZE,
                loser_prize: LOSER_PRIZE,
                draw_prize: 0,
            }
            await this.collectionService.giveGold(gameState.player.id, LOSER_PRIZE);
            await this.collectionService.giveGold(gameState.enemy.id, WINNER_PRIZE);
            await this.lobbyService.changeLobbyState(gameState.id, LOBBY_STATE_TYPE.END)
            return true;
        }
        else if (!hasEnemyNotBreaken) {
            gameState.end = {
                winner: gameState.player.id,
                winner_prize: WINNER_PRIZE,
                loser_prize: LOSER_PRIZE,
                draw_prize: 0,
            }
            await this.collectionService.giveGold(gameState.player.id, WINNER_PRIZE);
            await this.collectionService.giveGold(gameState.enemy.id, LOSER_PRIZE);
            await this.lobbyService.changeLobbyState(gameState.id, LOBBY_STATE_TYPE.END)

            return true;
        }

        return false;
    }

    async calculateNewState(gameState: GameForLogic, isForEnemy: boolean, skipCheckEnd = false) {
        if (!skipCheckEnd) {
            const isEnd = await this.checkEndGame(gameState);

            if (isEnd) {
                return;
            }
        }

        if (isForEnemy) {
            this.artifactService.calculateAvailableActions(gameState, gameState.enemy, gameState.player);
            this.spellService.calculateSpellActions(gameState, gameState.enemy, gameState.player);
        }
        else {
            this.artifactService.calculateAvailableActions(gameState, gameState.player, gameState.enemy);
            this.spellService.calculateSpellActions(gameState, gameState.player, gameState.enemy);
        }
        
        return gameState;
    }

    setFirstPlayer(gameState: GameForLogic): number {
        if (Object.keys(gameState.player.artifacts).length > Object.keys(gameState.enemy.artifacts).length) {
            return gameState.enemy.id;
        }
        else if (Object.keys(gameState.player.artifacts).length < Object.keys(gameState.enemy.artifacts).length) {
            return gameState.player.id;
        }

        let countPlayerHp = 0;
        let countEnemyHp = 0;

        for (const [key, artifact] of Object.entries(gameState.player.artifacts)) {
            countPlayerHp += artifact.currentHp;
        }

        for (const [key, artifact] of Object.entries(gameState.enemy.artifacts)) {
            countEnemyHp += artifact.currentHp;
        }

        if (countPlayerHp > countEnemyHp) {
            return gameState.enemy.id;
        }
        else if (countPlayerHp < countEnemyHp) {
            return gameState.player.id;
        }

        return randomInt(1, 3) === 1 ? gameState.player.id : gameState.enemy.id;
    }
}
