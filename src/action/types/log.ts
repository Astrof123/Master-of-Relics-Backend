export const LOG_TYPE = {
    SPELL: "spell",
    FACE: "face",
    SKILL: "skill",
    EXTRA_ACTION: "extra_action",
    SYSTEM: "system"
}

export type LogType = typeof LOG_TYPE[keyof typeof LOG_TYPE];