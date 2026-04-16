import { CustomException } from "src/common/custom.exception";

export enum ACTION_ERROR_CODE {    
    // Ошибки действий (4000-4999)
    PHASE_NOT_BATTLE = 4000,
    NOT_YOUR_TURN = 4001,
    NO_MOVE_POINTS = 4002,
    ARTIFACT_NOT_READY = 4003,
    INVALID_ATTACK_TARGET = 4004,
    INVALID_HEAL_TARGET = 4005,
    UNKNOWN_ARTIFACT = 4006,
    IMPOSSIBLE_ACTION = 4007,
    NOT_ENOUGH_RESOURCES = 4008,
    UNKNOWN_SKILL = 4009,
    INVALID_TARGETS = 4010,
    UNKNOWN_SPELL = 4011,
    INVALID_DATA = 4012,
    MINIPHASE_NOT_BATTLE = 4013
}

export const DRAFT_ERROR_MESSAGE: Record<ACTION_ERROR_CODE, string> = {    
    [ACTION_ERROR_CODE.PHASE_NOT_BATTLE]: "Сейчас не фаза боя",
    [ACTION_ERROR_CODE.NOT_YOUR_TURN]: "Сейчас не ваш ход",
    [ACTION_ERROR_CODE.NO_MOVE_POINTS]: "Недостаточно очков действий",
    [ACTION_ERROR_CODE.ARTIFACT_NOT_READY]: "Артефакт не в состоянии готовности",
    [ACTION_ERROR_CODE.INVALID_ATTACK_TARGET]: "Не валидная цель атаки",
    [ACTION_ERROR_CODE.INVALID_HEAL_TARGET]: "Не валидная цель лечения",
    [ACTION_ERROR_CODE.UNKNOWN_ARTIFACT]: "Неизвестный артефакт",
    [ACTION_ERROR_CODE.IMPOSSIBLE_ACTION]: "Невозможное действие",
    [ACTION_ERROR_CODE.NOT_ENOUGH_RESOURCES]: "Недостаточно ресурсов",
    [ACTION_ERROR_CODE.UNKNOWN_SKILL]: "Неизвестная способность",
    [ACTION_ERROR_CODE.INVALID_TARGETS]: "Неправильно заданы цели",
    [ACTION_ERROR_CODE.UNKNOWN_SPELL]: "Неизвестное заклинание",
    [ACTION_ERROR_CODE.INVALID_DATA]: "Не валидные данные",
    [ACTION_ERROR_CODE.MINIPHASE_NOT_BATTLE]: "Сейчас не фаза перестановки",
};

export class ActionException extends CustomException {
    constructor(
        public code: ACTION_ERROR_CODE,
        public details?: any
    ) {
        super(DRAFT_ERROR_MESSAGE[code], code);
        this.name = 'ActionError';
    }
}