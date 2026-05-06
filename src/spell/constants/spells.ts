import { RESTRICTION, TARGET_RESTRICTION } from "src/action/types/restriction";
import { SPELL, Spell, SpellDataType, SPELLTYPE } from "../types/spell";


export const SPELLS: Record<Spell, SpellDataType> = {
    [SPELL.TOUCH_OF_LIGHT]: {
        id: SPELL.TOUCH_OF_LIGHT,
        name: "Touch Of Light",
        type: SPELLTYPE.LIGHT,
        cost: 20,
        description: "Применить способность",
        countAnyTarget: 1,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ANY_ALLY, TARGET_RESTRICTION.ALIVE, TARGET_RESTRICTION.NO_AVATAR]
    },
    [SPELL.PIERCING_BOLT]: {
        id: SPELL.PIERCING_BOLT,
        name: "Piercing Bolt",
        type: SPELLTYPE.DESTRUCTION,
        cost: 15,
        description: "Нанести 15 урона вражескому артефакту",
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ALIVE, TARGET_RESTRICTION.NO_AVATAR]
    },
    [SPELL.METEOR_SHOWER]: {
        id: SPELL.METEOR_SHOWER,
        name: "Meteor Shower",
        type: SPELLTYPE.DESTRUCTION,
        cost: 30,
        description: "Нанести 20 магического урона соседям вражеского артефакта",
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ALIVE, TARGET_RESTRICTION.NO_AVATAR]
    },
    [SPELL.VOLCANO]: {
        id: SPELL.VOLCANO,
        name: "Volcano",
        type: SPELLTYPE.DESTRUCTION,
        cost: 35,
        description: "Призвать на передовую линию Destruction Shard",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.FRONT_LINE_HAVE_ONE_FREE_SPOT],
        targetRestrictions: []
    },
    [SPELL.FURY]: {
        id: SPELL.FURY,
        name: "Fury",
        type: SPELLTYPE.DESTRUCTION,
        cost: 25,
        description: "Заставить союзный артефакт атаковать случайную доступную цель",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 1,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ALLY, TARGET_RESTRICTION.ALIVE, TARGET_RESTRICTION.CAN_ATTACK]
    },
    [SPELL.THUNDER_STORM]: {
        id: SPELL.THUNDER_STORM,
        name: "Thunder Storm",
        type: SPELLTYPE.DESTRUCTION,
        cost: 35,
        description: "Нанести четырем случайным вражеским артефактам 10 магического урона",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: []
    },
}

