import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { LOG_TYPE } from 'src/action/types/log';
import { ArtifactService } from 'src/artifact/artifact.service';
import { CollectionService } from 'src/collection/collection.service';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { DRAW_PRIZE, LOSER_PRIZE, WINNER_PRIZE } from 'src/game-mechanics/constants/settings';
import { DiceService } from 'src/game-mechanics/dice.service';
import { ResourceService } from 'src/game-mechanics/resource.service';
import { GameTimerService } from 'src/game-state/game-timer.service';
import { ARTIFACT_STATE, LogState } from 'src/game-state/types/game';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { MINIPHASE, PHASE } from 'src/game-state/types/phase';
import { TIMER_TYPE } from 'src/game-state/types/timer';
import { LobbyService } from 'src/lobby/lobby.service';
import { LOBBY_STATE_TYPE } from 'src/lobby/types/lobby';
import { SpellService } from 'src/spell/spell.service';
import { UsersStatsService } from 'src/users/users-stats.service';

@Injectable()
export class PhaseService {
    constructor(
        private readonly resourceService: ResourceService,
        private readonly artifactStateService: ArtifactStateService,
        private readonly diceService: DiceService,
        private readonly artifactService: ArtifactService,
        private readonly spellService: SpellService,
        private readonly collectionService: CollectionService,
        private readonly lobbyService: LobbyService,
        private readonly gameTimerService: GameTimerService,
        private readonly usersStatsService: UsersStatsService
    ) {}
    
    async newRound(gameState: GameForLogic) {
        const logItem: LogState = {
            text: `Новый раунд.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

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

        await this.gameTimerService.stopAllTimers(gameState.id);
        if (gameState.constants.timerMovement) {
            await this.gameTimerService.startTimer(gameState.id, TIMER_TYPE.MOVEMENT, gameState.constants.timerMovement);
        }
        

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
            await this.setEndGame(gameState, null);
            return true;
        }
        else if (!hasPlayerNotBreaken) {
            await this.setEndGame(gameState, gameState.enemy.id);
            return true;
        }
        else if (!hasEnemyNotBreaken) {
            await this.setEndGame(gameState, gameState.player.id);
            return true;
        }

        return false;
    }

    async setEndGame(gameState: GameForLogic, winner: number | null) {
        const logItem: LogState = {
            text: `Игра окончена.`,
            type: LOG_TYPE.SYSTEM
        }
        
        gameState.logs.push(logItem);

        gameState.player.offerDraw = false;
        gameState.enemy.offerDraw = false;

        gameState.end = {
            winner: winner,
            winner_prize: winner ? WINNER_PRIZE : 0,
            loser_prize: winner ? LOSER_PRIZE : 0,
            draw_prize: !winner ? DRAW_PRIZE : 0,
        }
        
        await this.collectionService.giveGold(
            gameState.player.id,  
            winner == gameState.player.id ? WINNER_PRIZE : !winner ? DRAW_PRIZE : LOSER_PRIZE
        );
        await this.collectionService.giveGold(
            gameState.enemy.id,  
            winner == gameState.enemy.id ? WINNER_PRIZE : !winner ? DRAW_PRIZE : LOSER_PRIZE
        );

        await this.usersStatsService.setWin(winner == gameState.player.id ? gameState.player.id : gameState.enemy.id);
        await this.usersStatsService.setLose(winner == gameState.player.id ? gameState.enemy.id : gameState.player.id);
        await this.lobbyService.changeLobbyState(gameState.id, LOBBY_STATE_TYPE.END)
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
        
        gameState.player.temporaryArtifacts = JSON.parse(JSON.stringify(gameState.player.artifacts));
        gameState.enemy.temporaryArtifacts = JSON.parse(JSON.stringify(gameState.enemy.artifacts));
        
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
