import { RESTRICTION, TARGET_RESTRICTION } from "src/action/types/restriction";
import { SKILL, SkillDataType } from "../types/skill";

export const SKILLS: Record<string, SkillDataType> = {
    [SKILL.FEAR]: {
        id: SKILL.FEAR,
        type: "active",
        cost: 15,
        description: "Заставить вражеский артефакт переместиться на тыловую линию",
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.BACK_LINE_IS_FREE, RESTRICTION.HAVE_ENEMY_FOR_SKILLS, RESTRICTION.ONLY_READY],
        targetRestrictions: [TARGET_RESTRICTION.ONLY_FRONT_LINE_ENEMY, TARGET_RESTRICTION.ALIVE]
    },
    [SKILL.FROZE]: {
        id: SKILL.FROZE,
        type: "active",
        cost: 15,
        description: "Нанести любому вражескому артефакту 5 урона и наложить на него оцепенение.",
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.HAVE_ENEMY_FOR_SKILLS, RESTRICTION.ONLY_READY],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ALIVE]
    },
    [SKILL.UNIVERSAL_HEALING]: {
        id: SKILL.UNIVERSAL_HEALING,
        type: "active",
        cost: 30,
        description: "Каждый союзный артефакт восстановит 15 прочности.",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.ONLY_READY],
        targetRestrictions: []
    },
    [SKILL.EAT_LIGHT_MANA]: {
        id: SKILL.EAT_LIGHT_MANA,
        type: "active",
        cost: 0,
        description: "Потратить 10 маны света, чтобы восстановить этому артефакту 15 прочности.",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.ONLY_READY, RESTRICTION.HAVE_TEN_LIGHT_MANA],
        targetRestrictions: []
    },
    [SKILL.EAT_DARK_MANA]: {
        id: SKILL.EAT_DARK_MANA,
        type: "active",
        cost: 0,
        description: "Потратить 10 маны тьмы, чтобы восстановить этому артефакту 15 прочности.",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.ONLY_READY, RESTRICTION.HAVE_TEN_DARK_MANA],
        targetRestrictions: []
    },
    [SKILL.EAT_DESTRUCTION_MANA]: {
        id: SKILL.EAT_DESTRUCTION_MANA,
        type: "active",
        cost: 0,
        description: "Потратить 10 маны разрушения, чтобы восстановить этому артефакту 15 прочности.",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.ONLY_READY, RESTRICTION.HAVE_TEN_DESTRUCTION_MANA],
        targetRestrictions: []
    },
    [SKILL.SWIFT]: {
        id: SKILL.SWIFT,
        type: "active",
        cost: 30,
        description: "Восстановить 45 ловкости.",
        countAnyTarget: 0,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [RESTRICTION.ONLY_READY, RESTRICTION.ZERO_USED_SKILL_CHARGES],
        targetRestrictions: []
    },
}