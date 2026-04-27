import { Injectable } from '@nestjs/common';
import { GameForClient } from 'src/game-state/types/game-for-client';
import { RedisService } from 'src/redis/redis.service';
import { RESOURCE, ResourceType } from './types/resource';
import { ArtifactGameState, Player } from 'src/game-state/types/game';
import { GameStateService } from 'src/game-state/game-state.service';
import { GAME_MECHANICS_PATH } from './constants/game-mechanics-redis-paths';
import { MAX_AMOUNT_RESOURCES } from './constants/settings';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { EFFECT } from './types/effect';
import { EXTRA_ACTION } from 'src/action/types/action';
import { EXTRA_ACTIONS } from 'src/action/constants/extra-actions';
import { LogHelper } from 'src/action/helpers/logHelper';

@Injectable()
export class ResourceService {
    constructor (
    ) {}

    addResource(player: Player, resource: ResourceType, amount: number, logParts: string[]) {
        const newAmount = player.resources[resource] + amount;
        player.resources[resource] = newAmount > MAX_AMOUNT_RESOURCES ? MAX_AMOUNT_RESOURCES : newAmount;

        if (resource === RESOURCE.AGILITY) {
            logParts.push(LogHelper.getRestoreAgilityFullLog(amount))
        }
        else if (resource === RESOURCE.RAGE) {
            logParts.push(LogHelper.getRestoreRageFullLog(amount))
        }
        else if (resource === RESOURCE.LIGHT_MANA) {
            logParts.push(LogHelper.getRestoreLightManaFullLog(amount))
        }
        else if (resource === RESOURCE.DARK_MANA) {
            logParts.push(LogHelper.getRestoreDarkManaFullLog(amount))
        }
        else if (resource === RESOURCE.DESTRUCTION_MANA) {
            logParts.push(LogHelper.getRestoreDestructionManaFullLog(amount))
        }
    }

    decreaseResource(player: Player, resource: ResourceType, amount: number, logParts: string[]) {
        const newAmount = player.resources[resource] - amount;
        player.resources[resource] = newAmount < 0 ? 0 : newAmount;

        if (resource === RESOURCE.AGILITY) {
            logParts.push(LogHelper.getSpentAgilityFullLog(amount))
        }
        else if (resource === RESOURCE.RAGE) {
            logParts.push(LogHelper.getSpentRageFullLog(amount))
        }
        else if (resource === RESOURCE.LIGHT_MANA) {
            logParts.push(LogHelper.getSpentLightManaFullLog(amount))
        }
        else if (resource === RESOURCE.DARK_MANA) {
            logParts.push(LogHelper.getSpentDarkManaFullLog(amount))
        }
        else if (resource === RESOURCE.DESTRUCTION_MANA) {
            logParts.push(LogHelper.getSpentDestructionManaFullLog(amount))
        }
    }

    addResourceNewRound(gameState: GameForLogic) {
        this.addResource(gameState.player, RESOURCE.AGILITY, 15, []);
        this.addResource(gameState.player, RESOURCE.RAGE, 15, []);

        this.addResource(gameState.enemy, RESOURCE.AGILITY, 15, []);
        this.addResource(gameState.enemy, RESOURCE.RAGE, 15, []);
    }

    calculateNewTurnMovePoints(player: Player): number {
        let countMoves = 1;

        for (const effect of player.effects) {
            if (effect.id === EFFECT.EXTRA_MOVE) {
                countMoves += 1;
            }
        }

        return countMoves;
    }

    extraMove(player: Player, logParts: string[]) {
        player.movePoints += 1;
        logParts.push("Получил дополнительное действие")
    }
}
