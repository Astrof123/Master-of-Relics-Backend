import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    Player,
} from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { ANIMATION, AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { CombatService } from 'src/game-mechanics/combat.service';

@Injectable()
export class RepairStrategy implements SkillStrategy {
    constructor(
        private readonly artifactStateService: ArtifactStateService,
        private readonly combatService: CombatService,
    ) {}

    getSkillType(): Skill {
        return SKILL.REPAIR;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        data: UseSkillData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        const allyArtifact = player.artifacts[data.targets[0][0]];
        this.artifactStateService.applyState(
            allyArtifact,
            ARTIFACT_STATE.COOLDOWN,
            logParts,
        );
        allyArtifact.currentHp = 1;

        animations.push({
            playerId: player.id,
            artifactGameId: allyArtifact.id,
            animation: ANIMATION.HEAL,
            value: 1,
        });
    }

    death(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {}
}
