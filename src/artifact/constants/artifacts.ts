import { FACE } from "src/game-mechanics/types/face";
import { ARTIFACT, Artifact, ArtifactDataType } from "../types/artifact";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { SKILL } from "../types/skill";
import { EFFECT } from "src/game-mechanics/types/effect";


export const ARTIFACTS: Record<string, ArtifactDataType> = {
    [ARTIFACT.INTIMIDATOR]: {
        id: ARTIFACT.INTIMIDATOR,
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
        skills: [SKILL.FEAR],
        defaultEffects: [],
        isForSale: true,
        price: 100
    },
    [ARTIFACT.ARCANE_SHIELD]: {
        id: ARTIFACT.ARCANE_SHIELD,
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
        skills: [SKILL.EAT_DARK_MANA, SKILL.EAT_DESTRUCTION_MANA, SKILL.EAT_LIGHT_MANA],
        defaultEffects: [],
        isForSale: true,
        price: 100
    },
    [ARTIFACT.FROST_BOW]: {
        id: ARTIFACT.FROST_BOW,
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
        skills: [SKILL.FROZE],
        defaultEffects: [],
        isForSale: true,
        price: 100
    },
    [ARTIFACT.REGENERATION_POTION]: {
        id: ARTIFACT.REGENERATION_POTION,
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
        skills: [SKILL.UNIVERSAL_HEALING],
        defaultEffects: [],
        isForSale: true,
        price: 100
    },
    [ARTIFACT.SWIFT_BOOTS]: {
        id: ARTIFACT.SWIFT_BOOTS,
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
        skills: [SKILL.SWIFT],
        defaultEffects: [EFFECT.SINGLE_CHARGE],
        isForSale: true,
        price: 100
    }
}

export const getCardByInnerId = (innerCardId: string) => 
    Object.values(ARTIFACTS).find(card => card.id === innerCardId);

export const getCardsForSale = () =>
    Object.values(ARTIFACTS).filter(card => card.isForSale);