import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import { ArtifactGameState, Player } from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { EFFECT, EffectType } from 'src/game-mechanics/types/effect';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { ResourceService } from 'src/game-mechanics/resource.service';

@Injectable()
export class DarkManaDiscountStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService,
        private readonly resourceService: ResourceService,
    ) {}

    getSkillType(): Skill {
        return SKILL.DARK_MANA_DISCOUNT;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        data: UseSkillData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        if (
            this.gameEffectsService.countEffect(artifact, EFFECT.EXHAUSTION) ===
            0
        ) {
            const effectsDarkDiscount = this.gameEffectsService.getHeroEffects(
                player,
                EFFECT.DARK_MANA_DISCOUNT,
            );
            let hasEffectFromThisArtifact = false;

            for (const effect of effectsDarkDiscount) {
                if (effect.effectCasterGameId === artifact.id) {
                    hasEffectFromThisArtifact = true;
                    break;
                }
            }

            if (!hasEffectFromThisArtifact) {
                const effect: EffectType = JSON.parse(
                    JSON.stringify(EFFECTS[EFFECT.DARK_MANA_DISCOUNT]),
                );
                effect.effectCasterGameId = artifact.id;

                this.gameEffectsService.applyHeroEffect(
                    player,
                    effect,
                    logParts,
                );
            }
        }
    }

    death(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {
        const effect = player.effects.find(
            (e) => e.effectCasterGameId === artifact.id,
        );

        if (effect) {
            this.gameEffectsService.removeHeroEffect(player, effect, logParts);
        }
    }
}
