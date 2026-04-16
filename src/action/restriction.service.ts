import { Injectable } from '@nestjs/common';
import { ARTIFACT_STATE, ArtifactGameState, LINE, Player } from 'src/game-state/types/game';
import { RESTRICTION, Restriction, TARGET_RESTRICTION, TargetRestriction } from './types/restriction';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { EFFECT } from 'src/game-mechanics/types/effect';

@Injectable()
export class RestrictionService {
    constructor(
    ) {}

    checkArtifactRestrictions(restrictions: Restriction[], artifact: ArtifactGameState): boolean {
        if (restrictions.includes(RESTRICTION.ONLY_READY)) {
            if (artifact.state !== ARTIFACT_STATE.READY_TO_USE) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ONLY_COOLDOWN)) {
            if (artifact.state !== ARTIFACT_STATE.COOLDOWN) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ZERO_USED_SKILL_CHARGES)) {
            const effect = artifact.effects.find((effect) => effect.id === EFFECT.USED_SKILL_CHARGES);

            if (effect && effect.number && effect.number > 0) {
                return false;
            }
        }

        return true;
    }

    checkSpellRestrictions(restrictions: Restriction[]): boolean {
        return true;
    }

    checkGeneralRestrictions(player: Player, enemy: Player, restrictions: Restriction[]): boolean {
        if (restrictions.includes(RESTRICTION.BACK_LINE_IS_FREE)) {
            if (Object.values(enemy.artifacts).filter((art) => art.line === LINE.BACK).length >= MAX_COUNT_ARTIFACTS_ON_LINE) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.HAVE_ENEMY_FOR_SKILLS)) {
            if (!Object.values(enemy.artifacts).find((art) => art.currentHp > 0)) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.HAVE_TEN_LIGHT_MANA)) {
            if (player.resources[RESOURCE.LIGHT_MANA] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.HAVE_TEN_DARK_MANA)) {
            if (player.resources[RESOURCE.DARK_MANA] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.HAVE_TEN_DESTRUCTION_MANA)) {
            if (player.resources[RESOURCE.DESTRUCTION_MANA] < 10) {
                return false;
            }
        }

        return true;
    }

    getTargetsByRestrictions(player: Player, enemy: Player, restrictions: TargetRestriction[]): string[][] {
        let allies: string[] = [];
        let enemies: string[] = [];
        
        if (restrictions.includes(TARGET_RESTRICTION.ANY_ENEMY)) {
            Object.values(enemy.artifacts).forEach((artifact) => {
                enemies.push(artifact.id);
            })
        }
        if (restrictions.includes(TARGET_RESTRICTION.ANY_ALLY)) {
            Object.values(player.artifacts).forEach((artifact) => {
                allies.push(artifact.id);
            })
        }
        if (restrictions.includes(TARGET_RESTRICTION.ONLY_FRONT_LINE_ENEMY)) {
            Object.values(enemy.artifacts).forEach((artifact) => {
                if (artifact.line === LINE.FRONT) {
                    enemies.push(artifact.id);
                }
            })
        }

        if (restrictions.includes(TARGET_RESTRICTION.ALIVE)) {
            enemies = enemies.filter(e => enemy.artifacts[e].state !== ARTIFACT_STATE.BREAKEN);
            allies = allies.filter(e => player.artifacts[e].state !== ARTIFACT_STATE.BREAKEN);
        }

        return [allies, enemies];
    }
}
