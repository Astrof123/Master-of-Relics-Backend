import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    Player,
} from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { CombatService } from 'src/game-mechanics/combat.service';

@Injectable()
export class WeakStrategy implements SkillStrategy {
    constructor(
        private readonly artifactStateService: ArtifactStateService,
        private readonly combatService: CombatService,
    ) {}

    getSkillType(): Skill {
        return SKILL.WEAK;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        data: UseSkillData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        const enemy =
            gameState.enemy.id === player.id
                ? gameState.player
                : gameState.enemy;
        const enemyArtifact = enemy.artifacts[data.targets[1][0]];
        this.artifactStateService.applyState(
            enemyArtifact,
            ARTIFACT_STATE.COOLDOWN,
            logParts,
        );
    }

    death(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {}
}
