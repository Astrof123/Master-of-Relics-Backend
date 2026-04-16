import { ResourceType } from "src/game-mechanics/types/resource";
import { Restriction } from "./restriction";

export interface ExtraActionState {
    id: ExtraAction;
    description: string;
}

export const EXTRA_ACTION = {
    THROW_DICE: "throw_dice",
    EXTRA_MOVE: "extra_move",
    RETURN_TO_BATTLE: "return_to_battle",
    MOVE: "move"
}

export type ExtraAction = typeof EXTRA_ACTION[keyof typeof EXTRA_ACTION];

export interface ExtraActionDataType {
    id: ExtraAction;
    cost: number;
    resourceType: ResourceType;
    getDescription: (cost: number) => string;
    restrictions: Restriction[]
}

