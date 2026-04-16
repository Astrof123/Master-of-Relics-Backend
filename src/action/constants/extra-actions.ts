import { RESOURCE } from "src/game-mechanics/types/resource";
import { EXTRA_ACTION, ExtraAction, ExtraActionDataType } from "../types/action";
import { RESTRICTION } from "../types/restriction";

export const EXTRA_ACTIONS: Record<ExtraAction, ExtraActionDataType> = {
    [EXTRA_ACTION.THROW_DICE]: {
        id: EXTRA_ACTION.THROW_DICE,
        cost: 8,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Перекинуть кубик за ${cost} ловкости`,
        restrictions: [RESTRICTION.ONLY_READY]
    },
    [EXTRA_ACTION.EXTRA_MOVE]: {
        id: EXTRA_ACTION.EXTRA_MOVE,
        cost: 15,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Получить дополнительный ход за ${cost} ловкости`,
        restrictions: []
    },
    [EXTRA_ACTION.RETURN_TO_BATTLE]: {
        id: EXTRA_ACTION.RETURN_TO_BATTLE,
        cost: 30,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Убрать перезарядку за ${cost} ловкости`,
        restrictions: [RESTRICTION.ONLY_COOLDOWN]
    },
    [EXTRA_ACTION.MOVE]: {
        id: EXTRA_ACTION.MOVE,
        cost: 15,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Переместить за ${cost} ловкости`,
        restrictions: [RESTRICTION.ONLY_READY]
    }
}