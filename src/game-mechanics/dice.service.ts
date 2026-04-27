import { Injectable } from "@nestjs/common";
import { randomInt } from "crypto";
import { LogHelper } from "src/action/helpers/logHelper";
import { ARTIFACTS } from "src/artifact/constants/artifacts";
import { Player } from "src/game-state/types/game";
import { GameForLogic } from "src/game-state/types/game-for-logic";

Injectable()
export class DiceService {
    constructor (

    ) {}

    throwDice(player: Player, artifactGameId: string, artifactId: string, logParts: string[]): Player {
        const randomNum = randomInt(0, 6);
        player.artifacts[artifactGameId].face = ARTIFACTS[artifactId].faces[randomNum];

        logParts.push(LogHelper.getThrowDiceLog(randomNum))

        return player;
    }

    updateDicesNewRound(gameState: GameForLogic): GameForLogic {
        for (const [key, artifact] of Object.entries(gameState.player.artifacts)) {
            gameState.player = this.throwDice(gameState.player, artifact.id, artifact.artifactId, []);
        }

        for (const [key, artifact] of Object.entries(gameState.enemy.artifacts)) {
            gameState.enemy = this.throwDice(gameState.enemy, artifact.id, artifact.artifactId, []);
        }

        return gameState;
    }
}