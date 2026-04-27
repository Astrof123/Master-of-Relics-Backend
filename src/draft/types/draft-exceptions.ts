import { CustomException } from "src/common/custom.exception";

export enum DRAFT_ERROR_CODE {    
    // Ошибки драфта (4000-4999)
    ARTIFACT_NOT_FOUND = 4000,
    NOT_PICKED_ARTIFACT = 4001,
    PHASE_NOT_DRAFT = 4002,
    GAME_OVER = 4003
}

export const DRAFT_ERROR_MESSAGE: Record<DRAFT_ERROR_CODE, string> = {    
    [DRAFT_ERROR_CODE.ARTIFACT_NOT_FOUND]: "Этот артефакт не найден в вашей колоде",
    [DRAFT_ERROR_CODE.NOT_PICKED_ARTIFACT]: "Вы не выбрали артефакт",
    [DRAFT_ERROR_CODE.PHASE_NOT_DRAFT]: "Сейчас не фаза драфта",
    [DRAFT_ERROR_CODE.GAME_OVER]: "Игра окончена",
};

export class DraftException extends CustomException {
    constructor(
        public code: DRAFT_ERROR_CODE,
        public details?: any
    ) {
        super(DRAFT_ERROR_MESSAGE[code], code);
        this.name = 'DraftError';
    }
}