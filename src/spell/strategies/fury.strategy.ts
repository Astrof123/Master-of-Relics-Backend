import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SpellStrategy } from '../types/strategy';
import { UseSkillData, UseSpellData } from 'src/action/types/action-evens-data';
import { ANIMATION, AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { CombatService } from 'src/game-mechanics/combat.service';
import { DAMAGE } from 'src/game-mechanics/types/combat';
import { SPELL, Spell } from '../types/spell';
import { LogHelper } from 'src/action/helpers/logHelper';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { Player } from 'src/game-state/types/game';
import { FACES } from 'src/game-mechanics/constants/faces';
import {
    TARGET_RESTRICTION,
    TargetRestriction,
} from 'src/action/types/restriction';
import { ArtifactService } from 'src/artifact/artifact.service';
import { randomInt } from 'crypto';

@Injectable()
export class FuryStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly artifactService: ArtifactService,
    ) {}

    getSpellType(): Spell {
        return SPELL.FURY;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        data: UseSpellData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        const enemy =
            gameState.enemy.id === player.id
                ? gameState.player
                : gameState.enemy;
        const allyArtifact = player.artifacts[data.targets[0][0]];
        const faceData = FACES[allyArtifact.face];
        const damageType = faceData.sword > 0 ? DAMAGE.MELEE : DAMAGE.RANGED;
        const faceAction = this.artifactService.getFaceAction(
            allyArtifact,
            player,
            enemy,
        );

        if (faceAction.attackTargets && faceAction.attackTargets.length > 0) {
            const randomEnemy = randomInt(0, faceAction.attackTargets.length);

            const attackedArtifact =
                gameState.enemy.artifacts[
                    faceAction.attackTargets[randomEnemy]
                ];
            const damage = this.combatService.calculateFaceDamage(
                player,
                enemy,
                allyArtifact,
                attackedArtifact,
                damageType,
            );

            this.combatService.applyDamage(
                gameState,
                enemy,
                allyArtifact,
                attackedArtifact,
                damage,
                damageType,
                logParts,
            );

            animations.push({
                playerId: enemy.id,
                artifactGameId: faceAction.attackTargets[randomEnemy],
                animation: ANIMATION.HIT,
                value: damage,
            });
        }
    }
}
