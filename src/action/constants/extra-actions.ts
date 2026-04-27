import { RESOURCE } from "src/game-mechanics/types/resource";
import { EXTRA_ACTION, ExtraAction, ExtraActionDataType } from "../types/action";
import { RESTRICTION } from "../types/restriction";

export const EXTRA_ACTIONS: Record<ExtraAction, ExtraActionDataType> = {
    [EXTRA_ACTION.THROW_DICE]: {
        id: EXTRA_ACTION.THROW_DICE,
        name: "Перекинуть кубик",
        cost: 8,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Перекинуть кубик за ${cost} ловкости`,
        restrictions: [RESTRICTION.ONLY_READY]
    },
    [EXTRA_ACTION.EXTRA_MOVE]: {
        id: EXTRA_ACTION.EXTRA_MOVE,
        name: "Дополнительное действие",
        cost: 15,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Получить дополнительный ход за ${cost} ловкости`,
        restrictions: []
    },
    [EXTRA_ACTION.RETURN_TO_BATTLE]: {
        id: EXTRA_ACTION.RETURN_TO_BATTLE,
        name: "Возврат в бой",
        cost: 30,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Убрать перезарядку за ${cost} ловкости`,
        restrictions: [RESTRICTION.ONLY_COOLDOWN]
    },
    [EXTRA_ACTION.MOVE]: {
        id: EXTRA_ACTION.MOVE,
        name: "Перемещение",
        cost: 15,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Переместить за ${cost} ловкости`,
        restrictions: []
    },
    [EXTRA_ACTION.REMOVE_ROOT]: {
        id: EXTRA_ACTION.REMOVE_ROOT,
        name: "Снятие оцепенения",
        cost: 15,
        resourceType: RESOURCE.AGILITY,
        getDescription: (cost: number) => `Снять оцепенение за ${cost} ловкости`,
        restrictions: [RESTRICTION.ONLY_ROOTED]
    },
    [EXTRA_ACTION.DESTROY_ARTIFACT]: {
        id: EXTRA_ACTION.DESTROY_ARTIFACT,
        name: "Уничтожение артефакта",
        cost: 0,
        resourceType: RESOURCE.AGILITY,
        getDescription: () => `Уничтожить артефакт, чтобы получить 30 ловкости и ярости`,
        restrictions: [RESTRICTION.ONLY_BREAKEN]
    }
}