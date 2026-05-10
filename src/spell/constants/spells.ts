import { RESTRICTION, TARGET_RESTRICTION } from "src/action/types/restriction";
import { SPELL, Spell, SpellDataType, SPELLTYPE } from "../types/spell";


export const SPELLS: Record<Spell, SpellDataType> = {
    [SPELL.TOUCH_OF_LIGHT]: {
        id: SPELL.TOUCH_OF_LIGHT,
        name: "Touch Of Light",
        type: SPELLTYPE.LIGHT,
        cost: 25,
        description: "Применить заклинание",
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
    [SPELL.BETRAYAL]: {
        id: SPELL.BETRAYAL,
        name: "Betrayal",
        type: SPELLTYPE.DARK,
        cost: 30,
        description: "Заставить вражеский артефакт атаковать свой случайный соседний артефакт",
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ALIVE, TARGET_RESTRICTION.CAN_ATTACK, TARGET_RESTRICTION.NO_AVATAR]
    },
    [SPELL.VAMPIRISM]: {
        id: SPELL.VAMPIRISM,
        name: "Vampirism",
        type: SPELLTYPE.DARK,
        cost: 30,
        description: "Наложить на союзный артефакт эффект вампиризма на один удар",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 1,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ALLY, TARGET_RESTRICTION.ALIVE, TARGET_RESTRICTION.CAN_ATTACK]
    },
    [SPELL.COLD_TOUCH]: {
        id: SPELL.COLD_TOUCH,
        name: "Cold Touch",
        type: SPELLTYPE.DARK,
        cost: 25,
        description: "Наложить на два случайных вражеских артефакта оцепенение",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: []
    },
    [SPELL.RUST]: {
        id: SPELL.RUST,
        name: "Rust",
        type: SPELLTYPE.DARK,
        cost: 25,
        description: "Применить заклинание",
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ALIVE, TARGET_RESTRICTION.NO_AVATAR]
    },
    [SPELL.WEAKNESS]: {
        id: SPELL.WEAKNESS,
        name: "Weakness",
        type: SPELLTYPE.DARK,
        cost: 25,
        description: "Выжечь сопернику 30 единиц ярости",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: []
    },
    [SPELL.DIVINE_GUARD]: {
        id: SPELL.DIVINE_GUARD,
        name: "Divine Guard",
        type: SPELLTYPE.LIGHT,
        cost: 30,
        description: "Наложить на союзный артефакт защитный эффект",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 1,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ALLY, TARGET_RESTRICTION.ALIVE]
    },
    [SPELL.RESURRECTION]: {
        id: SPELL.RESURRECTION,
        name: "Resurrection",
        type: SPELLTYPE.LIGHT,
        cost: 45,
        description: "Починить союзный артефакт",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 1,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ALLY, TARGET_RESTRICTION.BREAKEN]
    },
    [SPELL.INSPIRATION]: {
        id: SPELL.INSPIRATION,
        name: "Inspiration",
        type: SPELLTYPE.LIGHT,
        cost: 30,
        description: "Перевести союзный артефакт в состояние готовности к бою",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 1,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ALLY, TARGET_RESTRICTION.ALIVE]
    },
    [SPELL.SHARPENING]: {
        id: SPELL.SHARPENING,
        name: "Sharpening",
        type: SPELLTYPE.LIGHT,
        cost: 30,
        description: "Все союзные артефакты получают +8 к урону при атаке",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: []
    },
}

