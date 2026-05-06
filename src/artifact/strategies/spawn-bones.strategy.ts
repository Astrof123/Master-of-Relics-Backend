import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SkillStrategy } from "../types/strategy";
import { ARTIFACT_STATE, ArtifactGameState, Player } from "src/game-state/types/game";
import { UseSkillData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { Skill, SKILL } from "../types/skill";;
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { ArtifactService } from "../artifact.service";
import { ARTIFACT, SPAWN_POSITION } from "../types/artifact";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { EFFECT } from "src/game-mechanics/types/effect";


@Injectable()
export class SpawnBonesStrategy implements SkillStrategy {
    constructor(
        private readonly artifactStateService: ArtifactStateService,
        private readonly artifactService: ArtifactService,
        private readonly gameEffectsService: GameEffectsService
    ) {}

    getSkillType(): Skill {
        return SKILL.SPAWN_BONES;
    }

    execute(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        const firstBone: ArtifactGameState = this.artifactService.createArtifactState(
            player.artifacts,
            ARTIFACT.BONE_KNIFE
        );
        
        this.artifactService.spawnArtifact(
            firstBone,
            SPAWN_POSITION.FRONT_LINE,
            artifact.position,
            artifact.line,
            player.artifacts,
            logParts
        );

        // this.gameEffectsService.applyEffect(
        //     firstBone,
        //     EFFECTS[EFFECT.LIVE_FOR_ROUND], 
        //     []
        // )

        const secondBone: ArtifactGameState = this.artifactService.createArtifactState(
            player.artifacts,
            ARTIFACT.BONE_KNIFE
        );

        this.artifactStateService.applyState(secondBone, ARTIFACT_STATE.COOLDOWN, []);
        
        this.artifactService.spawnArtifact(
            secondBone,
            SPAWN_POSITION.FRONT_LINE,
            artifact.position,
            artifact.line,
            player.artifacts,
            logParts
        );

        // this.gameEffectsService.applyEffect(
        //     secondBone,
        //     EFFECTS[EFFECT.LIVE_FOR_ROUND], 
        //     []
        // )
    }

    death(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, logParts: string[]) {

    }
}