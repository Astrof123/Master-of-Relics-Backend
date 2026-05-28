import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    LINE,
    Player,
} from 'src/game-state/types/game';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { FACES } from './constants/faces';
import { DAMAGE, Damages, DamageType } from './types/combat';
import { ArtifactStateService } from './artifact-state.service';
import { LogHelper } from 'src/action/helpers/logHelper';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { SkillsStrategyFactory } from 'src/artifact/skills.factory';
import { GameEffectsService } from './game-effects.service';
import { EFFECT } from './types/effect';
import { ArtifactService } from 'src/artifact/artifact.service';

@Injectable()
export class CombatService {
    constructor(
        private readonly artifactStateService: ArtifactStateService,
        @Inject(forwardRef(() => SkillsStrategyFactory))
        private readonly skillsFactory: SkillsStrategyFactory,
        private readonly gameEffectsService: GameEffectsService,
        private readonly artifactService: ArtifactService,
    ) {}

    applyDamage(
        gameState: GameForLogic,
        enemy: Player,
        attackerArtifact: ArtifactGameState | null,
        attackedArtifact: ArtifactGameState,
        amount: number,
        damageType: DamageType,
        logParts: string[],
    ) {
        const newHp = attackedArtifact.currentHp - amount;

        attackedArtifact.currentHp = newHp > 0 ? newHp : 0;

        if (newHp <= 0) {
            if (
                this.gameEffectsService.countEffect(
                    attackedArtifact,
                    EFFECT.COPY,
                ) > 0 ||
                this.gameEffectsService.countEffect(
                    attackedArtifact,
                    EFFECT.LIVE_FOR_ROUND,
                ) > 0
            ) {
                this.artifactService.destroyArtifact(
                    gameState.enemy,
                    attackedArtifact,
                    logParts,
                );
            } else {
                this.artifactStateService.applyState(
                    attackedArtifact,
                    ARTIFACT_STATE.BREAKEN,
                    logParts,
                );
            }
            const artifactId = attackedArtifact.artifactId;

            ARTIFACTS[artifactId].skills?.forEach((skill) => {
                const strategy = this.skillsFactory.getStrategy(skill);
                strategy.death(
                    gameState,
                    gameState.enemy,
                    enemy.artifacts[attackedArtifact.id],
                    [],
                );
            });
        }

        if (
            this.gameEffectsService.countEffect(
                attackedArtifact,
                EFFECT.ONE_ATTACK_SHIELD,
            ) > 0
        ) {
            this.gameEffectsService.removeEffect(
                attackedArtifact,
                EFFECTS[EFFECT.ONE_ATTACK_SHIELD],
                [],
            );
        }

        if (attackedArtifact.state === ARTIFACT_STATE.DREAM) {
            const state = attackedArtifact.extraData.lastStateBeforeRoot;
            this.artifactStateService.applyState(attackedArtifact, state, []);
        }

        if (
            attackerArtifact &&
            this.gameEffectsService.countEffect(
                attackerArtifact,
                EFFECT.VAMPIRISM,
            ) > 0
        ) {
            this.gameEffectsService.removeEffect(
                attackerArtifact,
                EFFECTS[EFFECT.VAMPIRISM],
                [],
            );
            const heal = this.calculateHeal(attackerArtifact, amount);
            this.applyHealing(attackerArtifact, heal, logParts);
        }

        logParts.push(
            LogHelper.getHitLog(
                amount,
                damageType,
                ARTIFACTS[attackedArtifact.artifactId].name,
            ),
        );
    }

    applyHealing(
        healedArtifact: ArtifactGameState,
        amount: number,
        logParts: string[],
    ) {
        if (healedArtifact.state === ARTIFACT_STATE.BREAKEN) {
            return;
        }

        const currentHp = healedArtifact.currentHp + amount;
        const maxHp = healedArtifact.maxHp;

        healedArtifact.currentHp = currentHp > maxHp ? maxHp : currentHp;

        if (healedArtifact.state === ARTIFACT_STATE.DREAM) {
            const state = healedArtifact.extraData.lastStateBeforeRoot;
            this.artifactStateService.applyState(healedArtifact, state, []);
        }

        logParts.push(
            LogHelper.getHealLog(
                amount,
                ARTIFACTS[healedArtifact.artifactId].name,
            ),
        );
    }

    calculateFaceHeal(
        healedArtifact: ArtifactGameState,
        healerArtifact: ArtifactGameState,
    ): number {
        const face = healerArtifact.face;
        const healAmount = FACES[face].heal;
        const remainder =
            healedArtifact.maxHp - (healAmount + healedArtifact.currentHp);

        if (
            healedArtifact.state === ARTIFACT_STATE.BREAKEN ||
            this.gameEffectsService.countEffect(healedArtifact, EFFECT.SHIV) > 0
        ) {
            return 0;
        }

        if (remainder < 0) {
            return healAmount + remainder;
        }

        return healAmount;
    }

    calculateFaceDamage(
        player: Player,
        enemy: Player,
        attackerArtifact: ArtifactGameState,
        attackedArtifact: ArtifactGameState,
        damageType: DamageType,
    ): number {
        const face = attackerArtifact.face;

        let damage = 0;

        if (damageType === DAMAGE.MELEE) {
            damage += FACES[face].sword;

            if (attackerArtifact.line === LINE.FRONT) {
                damage += 10;
            }
        }

        if (damageType === DAMAGE.RANGED) {
            damage += FACES[face].target;
        }

        const damages: Damages = {
            [DAMAGE.MAGIC]: 0,
            [DAMAGE.MELEE]: 0,
            [DAMAGE.RANGED]: 0,
        };

        damages[damageType] = damage;
        damages[DAMAGE.MAGIC]! +=
            5 *
            this.gameEffectsService.countEffect(
                attackerArtifact,
                EFFECT.UPGRADE,
            );

        if (
            this.gameEffectsService.countEffect(
                attackerArtifact,
                EFFECT.BERSERK,
            ) > 0
        ) {
            const extraDamage =
                attackerArtifact.maxHp - attackerArtifact.currentHp;
            damages[DAMAGE.MELEE]! += extraDamage > 0 ? extraDamage : 0;
        }

        if (
            this.gameEffectsService.countEffect(
                attackerArtifact,
                EFFECT.PIERCE,
            ) > 0 &&
            attackerArtifact.line === LINE.FRONT
        ) {
            damages[DAMAGE.RANGED]! += 15;
        }

        const countSharp = this.gameEffectsService.countEffect(
            attackerArtifact,
            EFFECT.SHARP,
        );
        damages[damageType] += 8 * countSharp;

        if (
            this.gameEffectsService.countEffect(attackerArtifact, EFFECT.HUNT) >
            0
        ) {
            let extraDamage = 0;
            for (const artifact of Object.values(player.artifacts)) {
                extraDamage += artifact.maxHp - artifact.currentHp > 0 ? 4 : 0;
            }
            for (const artifact of Object.values(enemy.artifacts)) {
                extraDamage += artifact.maxHp - artifact.currentHp > 0 ? 4 : 0;
            }
            damages[DAMAGE.RANGED]! += extraDamage;
        }

        let fullDamage =
            damages[DAMAGE.MAGIC]! +
            damages[DAMAGE.MELEE]! +
            damages[DAMAGE.RANGED]!;

        fullDamage = this.calculateGeneralDamage(attackedArtifact, fullDamage);

        return fullDamage;
    }

    calculateGeneralDamage(
        attackedArtifact: ArtifactGameState,
        damage: number,
    ) {
        if (
            this.gameEffectsService.countEffect(
                attackedArtifact,
                EFFECT.ONE_ATTACK_SHIELD,
            ) > 0
        ) {
            return 0;
        }

        if (
            this.gameEffectsService.countEffect(attackedArtifact, EFFECT.RUST) >
            0
        ) {
            damage *= 1.5;
            damage = damage | 0;
        }

        const countDivineGuard = this.gameEffectsService.countEffect(
            attackedArtifact,
            EFFECT.DIVINE_GUARD,
        );
        damage -= 15 * countDivineGuard;

        return damage < 0 ? 0 : damage;
    }

    calculateDamage(
        attackedArtifact: ArtifactGameState,
        amount: number,
        damageType: DamageType,
    ): number {
        let damage = amount;

        damage = this.calculateGeneralDamage(attackedArtifact, damage);

        return damage;
    }

    calculateHeal(healedArtifact: ArtifactGameState, amount: number): number {
        const remainder =
            healedArtifact.maxHp - (amount + healedArtifact.currentHp);

        if (
            healedArtifact.state === ARTIFACT_STATE.BREAKEN ||
            this.gameEffectsService.countEffect(healedArtifact, EFFECT.SHIV) > 0
        ) {
            return 0;
        }

        if (remainder < 0) {
            return amount + remainder;
        }

        return amount;
    }
}
