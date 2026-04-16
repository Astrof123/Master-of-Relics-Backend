import { Injectable } from "@nestjs/common";
import { GameStateService } from "src/game-state/game-state.service";
import { GameForClient } from "src/game-state/types/game-for-client";
import { RedisService } from "src/redis/redis.service";
import { GAME_MECHANICS_PATH } from "./constants/game-mechanics-redis-paths";
import { ARTIFACT_STATE, ArtifactState, Player } from "src/game-state/types/game";
import { GameForLogic } from "src/game-state/types/game-for-logic";

@Injectable()
export class ArtifactStateService {
    constructor(

    ) {}

    applyState(player: Player, artifactGameId: string, state: ArtifactState) {
        player.artifacts[artifactGameId].state = state;
    }

    updateStateNewRound(gameState: GameForLogic) {
        for (const [key, artifact] of Object.entries(gameState.player.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.BREAKEN) {
                continue;
            }
            this.applyState(gameState.player, artifact.id, ARTIFACT_STATE.READY_TO_USE);
        }

        for (const [key, artifact] of Object.entries(gameState.enemy.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.BREAKEN) {
                continue;
            }
            this.applyState(gameState.enemy, artifact.id, ARTIFACT_STATE.READY_TO_USE);
        }
    }
}