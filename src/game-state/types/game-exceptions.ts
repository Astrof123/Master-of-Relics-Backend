import { CustomException } from "src/common/custom.exception";

export enum GAME_ERROR_CODE {    
    // Ошибки игры (3000-3999)
    GAME_NOT_FOUND = 3000,
    PLAYER_NOT_IN_GAME = 3001,
    ENEMY_NOT_FOUND = 3002
}

export const GAME_ERROR_MESSAGE: Record<GAME_ERROR_CODE, string> = {    
    [GAME_ERROR_CODE.GAME_NOT_FOUND]: "Игра не найдена",
    [GAME_ERROR_CODE.PLAYER_NOT_IN_GAME]: "Вы не участник игры",
    [GAME_ERROR_CODE.ENEMY_NOT_FOUND]: "Противник не найден",
};

export class GameException extends CustomException {
    constructor(
        public code: GAME_ERROR_CODE,
        public details?: any
    ) {
        super(GAME_ERROR_MESSAGE[code], code);
        this.name = 'GameError';
    }
}