import { GameException } from "src/game-state/types/game-exceptions";
import { LobbyException } from "src/lobby/types/lobby-exceptions";
import { CustomException } from "../custom.exception";

export enum COMMON_ERROR_CODE {
    // Общие ошибки (1000-1999)
    INTERNAL_SERVER_ERROR = 1000,
    USER_NOT_FOUND = 1001,
    UNAUTHORIZED = 1002,
}

export const COMMON_ERROR_MESSAGE: Record<COMMON_ERROR_CODE, string> = {
    [COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR]: "Внутренняя ошибка сервера",
    [COMMON_ERROR_CODE.USER_NOT_FOUND]: "Пользователь не найден",
    [COMMON_ERROR_CODE.UNAUTHORIZED]: "Необходима авторизация"
};


export class CommonException extends CustomException {
    constructor(
        public code: COMMON_ERROR_CODE,
        public details?: any
    ) {
        super(COMMON_ERROR_MESSAGE[code], code);
        this.name = 'CommonError';
    }
}


export interface ErrorResponse {
    success: false;
    data: null;
    message: string;
    error: {
        code: number;
        details?: any;
    };
}

export function handleError(error: unknown, callback?: Function): void {
    let errorResponse: ErrorResponse;
    
    if (error instanceof CustomException) {
        errorResponse = {
            success: false,
            data: null,
            message: error.message,
            error: {
                code: error.code
            }
        };
    } else if (error instanceof Error) {
        errorResponse = {
            success: false,
            data: null,
            message: COMMON_ERROR_MESSAGE[COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR],
            error: {
                code: COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        };
        
        console.error('Unhandled error:', error);
    } else {
        errorResponse = {
            success: false,
            data: null,
            message: COMMON_ERROR_MESSAGE[COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR],
            error: {
                code: COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR
            }
        };
    }
    
    if (callback && typeof callback === 'function') {
        callback(errorResponse);
    }
}