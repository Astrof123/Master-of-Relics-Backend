export const LOBBY_EVENT_NAME  = {
    JOIN_HALL: 'join-hall',
    CREATE_LOBBY: 'create-lobby',
    GET_LOBBY_LIST: 'get-lobby-list',
    JOIN_LOBBY: 'join-lobby',
    JOIN_LOBBY_BY_CODE: 'join-lobby-by-code',
    DELETE_LOBBY: 'delete-lobby',
    LEAVE_LOBBY: 'leave-lobby',
    TOGGLE_READY_LOBBY: "toggle-ready-lobby",
    LOBBY_UPDATE: 'lobby-update',
    GAME_STARTED: 'game-started',
    LOBBY_LIST_UPDATED: 'lobby-list-updated',
};

export type LobbyEventName  = typeof LOBBY_EVENT_NAME [keyof typeof LOBBY_EVENT_NAME];