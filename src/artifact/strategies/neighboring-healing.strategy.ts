import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    LINE,
    Player,
} from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { ANIMATION, AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { CombatService } from 'src/game-mechanics/combat.service';
import { DAMAGE } from 'src/game-mechanics/types/combat';
import { LogHelper } from 'src/action/helpers/logHelper';
import { ArtifactService } from '../artifact.service';

@Injectable()
export class NeighboringHealingStrategy implements SkillStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly artifactService: ArtifactService,
    ) {}

    getSkillType(): Skill {
        return SKILL.NEIGHBORING_HEALING;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        data: UseSkillData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        const neighbors = this.artifactService.getNeighbors(player, artifact);

        if (neighbors.left !== null) {
            const heal = this.combatService.calculateHeal(neighbors.left, 15);

            this.combatService.applyHealing(neighbors.left, heal, logParts);
            animations.push({
                playerId: player.id,
                artifactGameId: neighbors.left.id,
                animation: ANIMATION.HEAL,
                value: heal,
            });
        }
        if (neighbors.right !== null) {
            const heal = this.combatService.calculateHeal(neighbors.right, 15);
            this.combatService.applyHealing(neighbors.right, heal, logParts);
            animations.push({
                playerId: player.id,
                artifactGameId: neighbors.right.id,
                animation: ANIMATION.HEAL,
                value: heal,
            });
        }
    }

    death(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {}
}
