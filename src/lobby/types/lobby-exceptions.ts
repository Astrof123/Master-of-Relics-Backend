import { CustomException } from "src/common/custom.exception";

export enum LOBBY_ERROR_CODE {    
    // Ошибки лобби (1000-1999)
    LOBBY_NOT_FOUND = 1000,
    LOBBY_ALREADY_EXISTS = 1001,
    LOBBY_FULL = 1002,
    LOBBY_ALREADY_STARTED = 1003,
    LOBBY_DELETED = 1004,
    LOBBY_INCORRECT_NAME = 1005,
    LOBBY_NOT_FULL = 1006,
    LOBBY_NOT_ALL_READY = 1007,
    LOBBY_IS_PRIVATE = 1008,
    INVITATION_NOT_FOUND = 1009,
    INVITATION_EXPIRED = 1010,
    
    // Ошибки игроков (2000-2999)
    PLAYER_NOT_FOUND = 2000,
    PLAYER_ALREADY_IN_LOBBY = 2001,
    PLAYER_NOT_IN_LOBBY = 2002,
    PLAYER_IS_HOST = 2003,
    PLAYER_NOT_HOST = 2004,
    PLAYER_ALREADY_READY = 2005,
}

export const LOBBY_ERROR_MESSAGE: Record<LOBBY_ERROR_CODE, string> = {    
    [LOBBY_ERROR_CODE.LOBBY_NOT_FOUND]: "Лобби не найдено",
    [LOBBY_ERROR_CODE.LOBBY_ALREADY_EXISTS]: "Лобби с таким ID уже существует",
    [LOBBY_ERROR_CODE.LOBBY_FULL]: "Лобби заполнено",
    [LOBBY_ERROR_CODE.LOBBY_ALREADY_STARTED]: "Игра уже началась",
    [LOBBY_ERROR_CODE.LOBBY_DELETED]: "Лобби было удалено",
    [LOBBY_ERROR_CODE.LOBBY_INCORRECT_NAME]: "Название лобби должно быть от 3 до 20 символов",
    [LOBBY_ERROR_CODE.LOBBY_NOT_FULL]: "В лобби недостаточно игроков",
    [LOBBY_ERROR_CODE.LOBBY_NOT_ALL_READY]: "Не все игроки готовы к игре",
    [LOBBY_ERROR_CODE.LOBBY_IS_PRIVATE]: "Лобби закрыто",
    [LOBBY_ERROR_CODE.INVITATION_NOT_FOUND]: "Приглашение не найдено",
    [LOBBY_ERROR_CODE.INVITATION_EXPIRED]: "Приглашение уже не актуально",
    
    [LOBBY_ERROR_CODE.PLAYER_NOT_FOUND]: "Игрок не найден",
    [LOBBY_ERROR_CODE.PLAYER_ALREADY_IN_LOBBY]: "Вы уже находитесь в лобби",
    [LOBBY_ERROR_CODE.PLAYER_NOT_IN_LOBBY]: "Вас нет в этом лобби",
    [LOBBY_ERROR_CODE.PLAYER_IS_HOST]: "Вы являетесь хостом лобби",
    [LOBBY_ERROR_CODE.PLAYER_NOT_HOST]: "Вы не являетесь хостом лобби",
    [LOBBY_ERROR_CODE.PLAYER_ALREADY_READY]: "Вы уже готовы",
};

export class LobbyException extends CustomException {
    constructor(
        public code: LOBBY_ERROR_CODE,
        public details?: any
    ) {
        super(LOBBY_ERROR_MESSAGE[code], code);
        this.name = 'LobbyError';
    }
}