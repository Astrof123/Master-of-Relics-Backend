import { Injectable } from "@nestjs/common";
import { GameStateService } from "src/game-state/game-state.service";
import { GameForClient } from "src/game-state/types/game-for-client";
import { RedisService } from "src/redis/redis.service";
import { GAME_MECHANICS_PATH } from "./constants/game-mechanics-redis-paths";
import { ARTIFACT_STATE, ArtifactGameState, ArtifactState, Player } from "src/game-state/types/game";
import { GameForLogic } from "src/game-state/types/game-for-logic";
import { LogHelper } from "src/action/helpers/logHelper";
import { ARTIFACTS } from "src/artifact/constants/artifacts";

@Injectable()
export class ArtifactStateService {
    constructor(

    ) {}

    applyState(artifactState: ArtifactGameState, state: ArtifactState, logParts: string[]) {
        let currentState = artifactState.state;
        if ((state === ARTIFACT_STATE.ROOTED || state === ARTIFACT_STATE.DREAM) && (currentState === ARTIFACT_STATE.READY_TO_USE || currentState === ARTIFACT_STATE.COOLDOWN)) {
            artifactState.extraData.lastStateBeforeRoot = currentState;
        }
        artifactState.state = state;

        logParts.push(LogHelper.getAppliedStateLog(ARTIFACTS[artifactState.artifactId].name, state));
    }

    clearDestroyedArtifacts(gameState: GameForLogic) {
        for (const artifact of Object.values(gameState.player.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.DESTROYED) {
                delete gameState.player.artifacts[artifact.id];
            }
        }

        for (const artifact of Object.values(gameState.enemy.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.DESTROYED) {
                delete gameState.enemy.artifacts[artifact.id];
            }
        }
    }

    updateStateNewRound(gameState: GameForLogic) {
        for (const [key, artifact] of Object.entries(gameState.player.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.BREAKEN || artifact.state === ARTIFACT_STATE.DESTROYED) {
                continue;
            }
            this.applyState(artifact, ARTIFACT_STATE.READY_TO_USE, []);
        }

        for (const [key, artifact] of Object.entries(gameState.enemy.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.BREAKEN || artifact.state === ARTIFACT_STATE.DESTROYED) {
                continue;
            }
            this.applyState(artifact, ARTIFACT_STATE.READY_TO_USE, []);
        }
    }
}