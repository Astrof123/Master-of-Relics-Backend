import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { ArtifactService } from 'src/artifact/artifact.service';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { DiceService } from 'src/game-mechanics/dice.service';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';
import { ResourceService } from 'src/game-mechanics/resource.service';
import { GameStateService } from 'src/game-state/game-state.service';
import { GameForClient } from 'src/game-state/types/game-for-client';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class PhaseService {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly redisService: RedisService,
        private readonly resourceService: ResourceService,
        private readonly artifactStateService: ArtifactStateService,
        private readonly diceService: DiceService,
        private readonly artifactService: ArtifactService,
    ) {}
    
    newRound(gameState: GameForLogic) {
        gameState.player.isReady = false;
        gameState.enemy.isReady = false;

        this.resourceService.addResourceNewRound(gameState);
        this.artifactStateService.updateStateNewRound(gameState);
        this.diceService.updateDicesNewRound(gameState);
        gameState.currentTurn = this.setFirstPlayer(gameState);
        gameState.player.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.player);
        gameState.enemy.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.enemy);

        if (gameState.currentTurn === gameState.player.id) {
            this.artifactService.calculateAvailableActions(gameState, gameState.player, gameState.enemy);
        }
        else {
            this.artifactService.calculateAvailableActions(gameState, gameState.enemy, gameState.player);
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
