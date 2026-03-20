import { Injectable } from '@nestjs/common';
import { GameForClient } from 'src/game-state/types/game-for-client';
import { RedisService } from 'src/redis/redis.service';
import { RESOURCE, ResourceType } from './types/resource';
import { ArtifactGameState, LINE, Player } from 'src/game-state/types/game';
import { GameStateService } from 'src/game-state/game-state.service';
import { GAME_MECHANICS_PATH } from './constants/game-mechanics-redis-paths';
import { MAX_AMOUNT_RESOURCES } from './constants/settings';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { FACE, Face } from './types/face';
import { FACES } from './constants/faces';
import { DAMAGE, DamageType } from './types/combat';

@Injectable()
export class CombatService {
    constructor (
    ) {}

    applyDamage(enemy: Player, attackedArtifactGameId: string, amount: number) {
        enemy.artifacts[attackedArtifactGameId].currentHp = enemy.artifacts[attackedArtifactGameId].currentHp - amount;
    }

    applyHealing(player: Player, healedArtifactGameId: string, amount: number) {
        const currentHp = player.artifacts[healedArtifactGameId].currentHp + amount;
        const maxHp = player.artifacts[healedArtifactGameId].maxHp;

        player.artifacts[healedArtifactGameId].currentHp = currentHp > maxHp ? maxHp : currentHp;
    }

    calculateFaceHeal(player: Player, healedArtifactGameId: string, healerArtifactGameId: string): number {
        const face = player.artifacts[healerArtifactGameId].face;
        let healAmount = FACES[face].heal;
        let remainder = player.artifacts[healedArtifactGameId].maxHp - (healAmount + player.artifacts[healedArtifactGameId].currentHp)

        if (remainder < 0) {
            return healAmount + remainder;
        }

        return healAmount;
    }

    calculateFaceDamage(player: Player, attackerArtifactGameId: string, damageType: DamageType): number {
        const face = player.artifacts[attackerArtifactGameId].face;
        let damage = 0;

        if (damageType === DAMAGE.MELEE) {
            damage += FACES[face].sword;

            if (player.artifacts[attackerArtifactGameId].line === LINE.FRONT) {
                damage += 10;
            }
        }

        if (damageType === DAMAGE.RANGED) {
            damage += FACES[face].target;
        }

        return damage;
    }

    calculateDamage(player: Player, amount: number, damageType: DamageType): number {
        let damage = amount;

        return damage;
    }

    calculateHeal(player: Player, healedArtifactGameId: string, amount: number): number {
        let remainder = player.artifacts[healedArtifactGameId].maxHp - (amount + player.artifacts[healedArtifactGameId].currentHp)

        if (remainder < 0) {
            return amount + remainder;
        }

        return amount;
    }
}
