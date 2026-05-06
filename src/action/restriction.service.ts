import { Injectable } from '@nestjs/common';
import { ARTIFACT_STATE, ArtifactGameState, LINE, Player } from 'src/game-state/types/game';
import { RESTRICTION, Restriction, TARGET_RESTRICTION, TargetRestriction } from './types/restriction';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { EFFECT } from 'src/game-mechanics/types/effect';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { FACES } from 'src/game-mechanics/constants/faces';

@Injectable()
export class RestrictionService {
    constructor(
        private readonly gameEffectsService: GameEffectsService
    ) {}

    checkArtifactRestrictions(restrictions: Restriction[], player: Player, artifact: ArtifactGameState): boolean {
        if (restrictions.includes(RESTRICTION.ONLY_READY)) {
            if (artifact.state !== ARTIFACT_STATE.READY_TO_USE) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.NO_INVISIBLE)) {
            if (this.gameEffectsService.countEffect(artifact, EFFECT.INVISIBLE) > 0) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ONLY_ROOTED)) {
            if (artifact.state !== ARTIFACT_STATE.ROOTED) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ONLY_COOLDOWN)) {
            if (artifact.state !== ARTIFACT_STATE.COOLDOWN) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ONLY_BREAKEN)) {
            if (artifact.state !== ARTIFACT_STATE.BREAKEN) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.SAME_LINE_HAVE_ONE_FREE_SPOT)) {
            if (MAX_COUNT_ARTIFACTS_ON_LINE - Object.values(player.artifacts).filter((art) => art.line === artifact.line).length < 1) {
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

    checkSpellRestrictions(enemy: Player, restrictions: Restriction[]): boolean {
        const artWithoutAvatar = Object.values(enemy.artifacts).find((art) => 
            this.gameEffectsService.countEffect(art, EFFECT.AVATAR) === 0
        )

        if (!Object.values(enemy.artifacts).find((art) => art.currentHp > 0) && !artWithoutAvatar) {
            return false;
        }

        return true;
    }

    checkGeneralRestrictions(player: Player, enemy: Player, restrictions: Restriction[]): boolean {
        if (restrictions.includes(RESTRICTION.ENEMY_BACK_LINE_IS_FREE)) {
            if (Object.values(enemy.artifacts).filter((art) => art.line === LINE.BACK).length >= MAX_COUNT_ARTIFACTS_ON_LINE) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ENEMY_FRONT_LINE_IS_FREE)) {
            if (Object.values(enemy.artifacts).filter((art) => art.line === LINE.FRONT).length >= MAX_COUNT_ARTIFACTS_ON_LINE) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.FRONT_LINE_HAVE_TWO_FREE_SPOT)) {
            if (MAX_COUNT_ARTIFACTS_ON_LINE - Object.values(player.artifacts).filter((art) => art.line === LINE.FRONT).length < 2) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.FRONT_LINE_HAVE_ONE_FREE_SPOT)) {
            if (MAX_COUNT_ARTIFACTS_ON_LINE - Object.values(player.artifacts).filter((art) => art.line === LINE.FRONT).length < 1) {
                return false;
            }
        }

        if (restrictions.includes(RESTRICTION.HAVE_ENEMY_FOR_SKILLS)) {
            const artWithoutInvisible = Object.values(enemy.artifacts).find((art) => 
                this.gameEffectsService.countEffect(art, EFFECT.INVISIBLE) === 0
            )

            const artWithoutAvatar = Object.values(enemy.artifacts).find((art) => 
                this.gameEffectsService.countEffect(art, EFFECT.AVATAR) === 0
            )

            if (!Object.values(enemy.artifacts).find((art) => art.currentHp > 0) && !artWithoutInvisible && !artWithoutAvatar) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.HAVE_TEN_LIGHT_MANA)) {
            if (player.resources[RESOURCE.LIGHT_MANA] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.HAVE_TEN_AGILITY)) {
            if (player.resources[RESOURCE.AGILITY] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.HAVE_TEN_RAGE)) {
            if (player.resources[RESOURCE.RAGE] < 10) {
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
        if (restrictions.includes(RESTRICTION.ENEMY_HAVE_TEN_LIGHT_MANA)) {
            if (enemy.resources[RESOURCE.LIGHT_MANA] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ENEMY_HAVE_TEN_AGILITY)) {
            if (enemy.resources[RESOURCE.AGILITY] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ENEMY_HAVE_TEN_RAGE)) {
            if (enemy.resources[RESOURCE.RAGE] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ENEMY_HAVE_TEN_DARK_MANA)) {
            if (enemy.resources[RESOURCE.DARK_MANA] < 10) {
                return false;
            }
        }
        if (restrictions.includes(RESTRICTION.ENEMY_HAVE_TEN_DESTRUCTION_MANA)) {
            if (enemy.resources[RESOURCE.DESTRUCTION_MANA] < 10) {
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
        if (restrictions.includes(TARGET_RESTRICTION.ONLY_BACK_LINE_ENEMY)) {
            Object.values(enemy.artifacts).forEach((artifact) => {
                if (artifact.line === LINE.BACK) {
                    enemies.push(artifact.id);
                }
            })
        }
        if (restrictions.includes(TARGET_RESTRICTION.CAN_ATTACK)) {
            enemies = enemies.filter(e => FACES[enemy.artifacts[e].face].sword > 0 || FACES[enemy.artifacts[e].face].target > 0);
            allies = allies.filter(e => FACES[player.artifacts[e].face].sword > 0 || FACES[player.artifacts[e].face].target > 0);
        }
        if (restrictions.includes(TARGET_RESTRICTION.ALIVE)) {
            enemies = enemies.filter(e => enemy.artifacts[e].state !== ARTIFACT_STATE.BREAKEN);
            allies = allies.filter(e => player.artifacts[e].state !== ARTIFACT_STATE.BREAKEN);
        }
        if (restrictions.includes(TARGET_RESTRICTION.BREAKEN)) {
            enemies = enemies.filter(e => enemy.artifacts[e].state === ARTIFACT_STATE.BREAKEN);
            allies = allies.filter(e => player.artifacts[e].state === ARTIFACT_STATE.BREAKEN);
        }
        if (restrictions.includes(TARGET_RESTRICTION.NEED_HEAL_ALLY)) {
            allies = allies.filter(e => player.artifacts[e].currentHp < player.artifacts[e].maxHp);
        }
        if (restrictions.includes(TARGET_RESTRICTION.NO_AVATAR)) {
            enemies = enemies.filter(e => this.gameEffectsService.countEffect(enemy.artifacts[e], EFFECT.AVATAR) === 0);
        }
        if (restrictions.includes(TARGET_RESTRICTION.NORMAL_STATE)) {
            enemies = enemies.filter(
                e => enemy.artifacts[e].state === ARTIFACT_STATE.READY_TO_USE || enemy.artifacts[e].state === ARTIFACT_STATE.COOLDOWN
            );
            allies = allies.filter(
                e => player.artifacts[e].state === ARTIFACT_STATE.READY_TO_USE || player.artifacts[e].state === ARTIFACT_STATE.COOLDOWN
            );
        }

        enemies = enemies.filter(e => this.gameEffectsService.countEffect(enemy.artifacts[e], EFFECT.INVISIBLE) === 0);

        return [allies, enemies];
    }
}
