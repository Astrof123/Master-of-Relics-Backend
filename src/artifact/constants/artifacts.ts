import { FACE } from "src/game-mechanics/types/face";
import { ARTIFACT, Artifact, ARTIFACT_TYPE, ArtifactDataType } from "../types/artifact";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { SKILL } from "../types/skill";
import { EFFECT } from "src/game-mechanics/types/effect";


export const ARTIFACTS: Record<string, ArtifactDataType> = {
    [ARTIFACT.ARCANE_SHIELD]: {
        id: ARTIFACT.ARCANE_SHIELD,
        name: "Arcane Shield",
        faces: [
            FACE.TWO_DESTRUCTION_MANA,
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_DARK_MANA,
            FACE.ONE_DARK_ONE_DESTRUCTION_MANA,
            FACE.ONE_DARK_ONE_LIGHT_MANA,
            FACE.ONE_DESTRUCTION_ONE_LIGHT_MANA
        ],
        hp: 100,
        skills: [SKILL.EAT_DARK_MANA, SKILL.EAT_DESTRUCTION_MANA, SKILL.EAT_LIGHT_MANA],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.DEFENDER
    },
    [ARTIFACT.ROOT_GRASP]: {
        id: ARTIFACT.ROOT_GRASP,
        name: "Root Grasp",
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
        price: 100,
        type: ARTIFACT_TYPE.SUPPORT
    },
    [ARTIFACT.PALADINS_GLOVE]: {
        id: ARTIFACT.PALADINS_GLOVE,
        name: "Paladin's Glove",
        faces: [
            FACE.TWO_HEART,
            FACE.TWO_HEART,
            FACE.TWO_HEART,
            FACE.TWO_RAGE,
            FACE.TWO_RAGE,
            FACE.TWO_RAGE
        ],
        hp: 105,
        skills: [SKILL.NEIGHBORING_HEALING],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.DEFENDER
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
        price: 100,
        type: ARTIFACT_TYPE.GENERAL
    },
    [ARTIFACT.RING_OF_LIGHT]: {
        id: ARTIFACT.RING_OF_LIGHT,
        name: "Ring Of Light",
        faces: [
            FACE.TWO_HEART,
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_HEART
        ],
        hp: 65,
        skills: [SKILL.LIGHT_MANA_DISCOUNT],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MAGE
    },
    [ARTIFACT.RING_OF_DARK]: {
        id: ARTIFACT.RING_OF_DARK,
        name: "Ring Of Dark",
        faces: [
            FACE.TWO_SWORD,
            FACE.TWO_DARK_MANA,
            FACE.TWO_DARK_MANA,
            FACE.TWO_DARK_MANA,
            FACE.TWO_DARK_MANA,
            FACE.TWO_SWORD
        ],
        hp: 65,
        skills: [SKILL.DARK_MANA_DISCOUNT],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MAGE
    },
    [ARTIFACT.RING_OF_DESTRUCTION]: {
        id: ARTIFACT.RING_OF_DESTRUCTION,
        name: "Ring Of Destruction",
        faces: [
            FACE.TWO_RAGE,
            FACE.TWO_DESTRUCTION_MANA,
            FACE.TWO_DESTRUCTION_MANA,
            FACE.TWO_DESTRUCTION_MANA,
            FACE.TWO_DESTRUCTION_MANA,
            FACE.TWO_RAGE
        ],
        hp: 65,
        skills: [SKILL.DESTRUCTION_MANA_DISCOUNT],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MAGE
    },
    [ARTIFACT.TEMPER_CROWN]: {
        id: ARTIFACT.TEMPER_CROWN,
        name: "Temper Crown",
        faces: [
            FACE.TWO_RAGE,
            FACE.TWO_RAGE,
            FACE.TWO_RAGE,
            FACE.TWO_HEART,
            FACE.TWO_HEART,
            FACE.TWO_HEART
        ],
        hp: 60,
        skills: [SKILL.RAGE_DISCOUNT],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RAGE_MAGE
    },
    [ARTIFACT.CHRONOS]: {
        id: ARTIFACT.CHRONOS,
        name: "Chronos",
        faces: [
            FACE.THREE_DESTRUCTION_MANA,
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_DARK_MANA,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE
        ],
        hp: 70,
        skills: [SKILL.REFRESH_SPELLS],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MAGE
    },
    [ARTIFACT.SPELL_GRACE]: {
        id: ARTIFACT.SPELL_GRACE,
        name: "Spell Grace",
        faces: [
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_HEART,
            FACE.THREE_HEART
        ],
        hp: 75,
        skills: [SKILL.FREE_SPELL],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MAGE
    },
    [ARTIFACT.SPELL_GRACE]: {
        id: ARTIFACT.SPELL_GRACE,
        name: "Spell Grace",
        faces: [
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_HEART,
            FACE.THREE_HEART
        ],
        hp: 75,
        skills: [SKILL.REFRESH_SPELLS],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MAGE
    },
    [ARTIFACT.MOON_STAFF]: {
        id: ARTIFACT.MOON_STAFF,
        name: "Moon Staff",
        faces: [
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_AGILITY,
            FACE.THREE_AGILITY
        ],
        hp: 65,
        skills: [SKILL.MOON_BEAM],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RAGE_MAGE
    },
    [ARTIFACT.VOLT]: {
        id: ARTIFACT.VOLT,
        name: "Volt",
        faces: [
            FACE.ONE_RAGE_ONE_TARGET,
            FACE.ONE_RAGE_ONE_TARGET,
            FACE.ONE_RAGE_ONE_TARGET,
            FACE.ONE_RAGE_ONE_TARGET,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE
        ],
        hp: 65,
        skills: [SKILL.UPGRADE],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RAGE_MAGE
    },
    [ARTIFACT.BONELORD]: {
        id: ARTIFACT.BONELORD,
        name: "Bonelord",
        faces: [
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.TWO_DARK_MANA_ONE_RAGE,
            FACE.TWO_DARK_MANA_ONE_RAGE,
            FACE.TWO_DARK_MANA_ONE_RAGE
        ],
        hp: 70,
        skills: [SKILL.SPAWN_BONES],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RAGE_MAGE
    },
    [ARTIFACT.BONE_KNIFE]: {
        id: ARTIFACT.BONE_KNIFE,
        name: "Bone Knife",
        faces: [
            FACE.TWO_SWORD,
            FACE.TWO_SWORD,
            FACE.TWO_SWORD,
            FACE.TWO_SWORD,
            FACE.TWO_HEART,
            FACE.TWO_HEART
        ],
        hp: 10,
        skills: [],
        defaultEffects: [EFFECT.LIVE_FOR_ROUND],
        isForSale: false,
        price: 0,
        type: ARTIFACT_TYPE.RAGE_MAGE
    },
    [ARTIFACT.AXE_OF_THE_BERSERKER]: {
        id: ARTIFACT.AXE_OF_THE_BERSERKER,
        name: "Axe of the Berserker",
        faces: [
            FACE.ONE_SWORD_ONE_DESTRUCTION_MANA,
            FACE.ONE_SWORD_ONE_DESTRUCTION_MANA,
            FACE.ONE_SWORD_ONE_DESTRUCTION_MANA,
            FACE.ONE_SWORD_ONE_DARK_MANA,
            FACE.ONE_SWORD_ONE_DARK_MANA,
            FACE.ONE_SWORD_ONE_DARK_MANA
        ],
        hp: 60,
        skills: [SKILL.BERSERK],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MELEE_DAMAGE
    },
    [ARTIFACT.ILLUSION_BLADE]: {
        id: ARTIFACT.ILLUSION_BLADE,
        name: "Illusion Blade",
        faces: [
            FACE.ONE_SWORD_ONE_AGILITY,
            FACE.ONE_SWORD_ONE_AGILITY,
            FACE.ONE_SWORD_ONE_AGILITY,
            FACE.ONE_SWORD_ONE_LIGHT_MANA,
            FACE.ONE_SWORD_ONE_LIGHT_MANA,
            FACE.ONE_SWORD_ONE_LIGHT_MANA
        ],
        hp: 85,
        skills: [SKILL.SPAWN_SELF_COPY],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MELEE_DAMAGE
    },
    [ARTIFACT.GLIMPSE]: {
        id: ARTIFACT.GLIMPSE,
        name: "Glimpse",
        faces: [
            FACE.ONE_SWORD_ONE_LIGHT_MANA,
            FACE.ONE_SWORD_ONE_LIGHT_MANA,
            FACE.ONE_SWORD_ONE_LIGHT_MANA,
            FACE.ONE_SWORD_ONE_LIGHT_MANA,
            FACE.TWO_SWORD,
            FACE.TWO_SWORD
        ],
        hp: 75,
        skills: [SKILL.GLIMPSE],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.MELEE_DAMAGE
    },
    [ARTIFACT.HUNTMASTER]: {
        id: ARTIFACT.HUNTMASTER,
        name: "Huntmaster",
        faces: [
            FACE.ONE_TARGET_ONE_DESTRUCTION_MANA,
            FACE.ONE_TARGET_ONE_DESTRUCTION_MANA,
            FACE.ONE_TARGET_ONE_DESTRUCTION_MANA,
            FACE.ONE_TARGET_ONE_AGILITY,
            FACE.ONE_TARGET_ONE_AGILITY,
            FACE.ONE_TARGET_ONE_AGILITY
        ],
        hp: 75,
        skills: [SKILL.HUNT],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RANGE_DAMAGE
    },
    [ARTIFACT.PURIFIER]: {
        id: ARTIFACT.PURIFIER,
        name: "Purifier",
        faces: [
            FACE.TWO_LIGHT_MANA_ONE_TARGET,
            FACE.TWO_LIGHT_MANA_ONE_TARGET,
            FACE.TWO_TARGET_ONE_LIGHT_MANA,
            FACE.TWO_TARGET_ONE_LIGHT_MANA,
            FACE.THREE_TARGET,
            FACE.THREE_LIGHT_MANA
        ],
        hp: 70,
        skills: [SKILL.DISPERSAL_ALLY, SKILL.DISPERSAL_ENEMY],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RANGE_DAMAGE
    },
    [ARTIFACT.VEILSTRIKE]: {
        id: ARTIFACT.VEILSTRIKE,
        name: "Veilstrike",
        faces: [
            FACE.FOUR_TARGET,
            FACE.FOUR_TARGET,
            FACE.THREE_TARGET,
            FACE.THREE_TARGET,
            FACE.TWO_TARGET,
            FACE.TWO_TARGET
        ],
        hp: 55,
        skills: [SKILL.INVISIBLE],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RANGE_DAMAGE
    },
    [ARTIFACT.AVERTER]: {
        id: ARTIFACT.AVERTER,
        name: "Averter",
        faces: [
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_LIGHT_MANA,
            FACE.TWO_AGILITY,
            FACE.TWO_AGILITY,
            FACE.TWO_AGILITY
        ],
        hp: 115,
        skills: [SKILL.ONE_ATTACK_SHIELD],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.DEFENDER
    },
    [ARTIFACT.DREAMSHACKLER]: {
        id: ARTIFACT.DREAMSHACKLER,
        name: "Dreamshackler",
        faces: [
            FACE.TWO_RAGE,
            FACE.TWO_RAGE,
            FACE.TWO_RAGE,
            FACE.TWO_DESTRUCTION_MANA,
            FACE.TWO_DESTRUCTION_MANA,
            FACE.TWO_DESTRUCTION_MANA
        ],
        hp: 110,
        skills: [SKILL.DREAM, SKILL.BLINDLESS],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.DEFENDER
    },
    [ARTIFACT.GRAPPLER]: {
        id: ARTIFACT.GRAPPLER,
        name: "Grappler",
        faces: [
            FACE.TWO_SWORD,
            FACE.TWO_SWORD,
            FACE.THREE_DESTRUCTION_MANA,
            FACE.THREE_DESTRUCTION_MANA,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE
        ],
        hp: 85,
        skills: [SKILL.HOOK],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.SUPPORT
    },
    [ARTIFACT.VOIDER]: {
        id: ARTIFACT.VOIDER,
        name: "Voider",
        faces: [
            FACE.THREE_DARK_MANA,
            FACE.THREE_DARK_MANA,
            FACE.THREE_DARK_MANA,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE
        ],
        hp: 70,
        skills: [SKILL.ARTIFACT_SILENCE, SKILL.EXHAUSTION],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.SUPPORT
    },
    [ARTIFACT.CONCEALER]: {
        id: ARTIFACT.CONCEALER,
        name: "Concealer",
        faces: [
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_LIGHT_MANA,
            FACE.TWO_RAGE_ONE_LIGHT_MANA,
            FACE.TWO_RAGE_ONE_LIGHT_MANA,
            FACE.TWO_RAGE_ONE_LIGHT_MANA
        ],
        hp: 75,
        skills: [SKILL.AVATAR],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.SUPPORT
    },
    [ARTIFACT.PLUNDER]: {
        id: ARTIFACT.PLUNDER,
        name: "Plunder",
        faces: [
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_AGILITY,
            FACE.THREE_AGILITY,
            FACE.THREE_SWORD,
            FACE.THREE_SWORD
        ],
        hp: 70,
        skills: [
            SKILL.STEAL_AGILITY,
            SKILL.STEAL_DARK_MANA,
            SKILL.STEAL_DESTRUCTION_MANA,
            SKILL.STEAL_LIGHT_MANA,
            SKILL.STEAL_RAGE
        ],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.GENERAL
    },
    [ARTIFACT.DIVINE_STAFF]: {
        id: ARTIFACT.DIVINE_STAFF,
        name: "Divine Staff",
        faces: [
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_LIGHT_MANA
        ],
        hp: 75,
        skills: [
            SKILL.REPAIR
        ],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.GENERAL
    },
    [ARTIFACT.REAPER]: {
        id: ARTIFACT.REAPER,
        name: "Reaper",
        faces: [
            FACE.THREE_RAGE,
            FACE.THREE_RAGE,
            FACE.THREE_LIGHT_MANA,
            FACE.THREE_DESTRUCTION_MANA,
            FACE.THREE_SWORD,
            FACE.THREE_SWORD
        ],
        hp: 80,
        skills: [
            SKILL.HARDENING,
            SKILL.RUSTING
        ],
        defaultEffects: [],
        isForSale: true,
        price: 100,
        type: ARTIFACT_TYPE.RAGE_MAGE
    },
    [ARTIFACT.DESTRUCTION_SHARD]: {
        id: ARTIFACT.DESTRUCTION_SHARD,
        name: "Destruction Shard",
        faces: [
            FACE.RAGE,
            FACE.RAGE,
            FACE.RAGE,
            FACE.RAGE,
            FACE.RAGE,
            FACE.RAGE
        ],
        hp: 45,
        skills: [
        ],
        defaultEffects: [EFFECT.LIVE_FOR_ROUND],
        isForSale: false,
        price: 100,
        type: ARTIFACT_TYPE.MAGE
    },
}

export const getCardByInnerId = (innerCardId: string) => 
    Object.values(ARTIFACTS).find(card => card.id === innerCardId);

export const getCardsForSale = () =>
    Object.values(ARTIFACTS).filter(card => card.isForSale);