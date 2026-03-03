import { FACE } from "src/game-state/types/game";
import { Artifact } from "../types/artifact";
import { EFFECTS } from "src/effects/constants/effects";


export const ARTIFACTS: Record<number, Artifact> = {
    [1]: {
        id: 1,
        name: "Intimidator",
        faces: [
            FACE.THREE_SWORD,
            FACE.THREE_SWORD,
            FACE.THREE_SWORD,
            FACE.TWO_SWORD,
            FACE.TWO_SWORD,
            FACE.TWO_SWORD
        ],
        hp: 105,
        skillCost: 15,
        defaultEffects: []
    },
    [2]: {
        id: 2,
        name: "Arcane Shield",
        faces: [
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_DESTRUCTION_MANA,
            FACE.THREE_DARK_MANA,
            FACE.ONE_EVERY_MANA,
            FACE.ONE_EVERY_MANA,
            FACE.ONE_EVERY_MANA
        ],
        hp: 110,
        skillCost: 0,
        defaultEffects: []
    },
    [3]: {
        id: 3,
        name: "Frost Bow",
        faces: [
            FACE.ONE_RAGE_TWO_TARGET,
            FACE.ONE_RAGE_TWO_TARGET,
            FACE.ONE_RAGE_TWO_TARGET,
            FACE.TWO_RAGE_ONE_TARGET,
            FACE.TWO_RAGE_ONE_TARGET,
            FACE.TWO_RAGE_ONE_TARGET
        ],
        hp: 65,
        skillCost: 15,
        defaultEffects: []
    },
    [4]: {
        id: 4,
        name: "Regeneration Potion",
        faces: [
            FACE.THREE_HEART,
            FACE.THREE_HEART,
            FACE.THREE_HEART,
            FACE.ONE_RAGE_TWO_HEART,
            FACE.ONE_RAGE_TWO_HEART,
            FACE.ONE_RAGE_TWO_HEART
        ],
        hp: 105,
        skillCost: 30,
        defaultEffects: []
    },
    [5]: {
        id: 5,
        name: "Swift Boots",
        faces: [
            FACE.THREE_AGILITY,
            FACE.THREE_AGILITY,
            FACE.THREE_AGILITY,
            FACE.THREE_AGILITY,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE
        ],
        hp: 70,
        skillCost: 30,
        defaultEffects: [EFFECTS[1]]
    }
}