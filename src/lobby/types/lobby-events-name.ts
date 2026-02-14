export const LOBBY_EVENT_NAME  = {
    JOIN_HALL: 'join-hall',
    CREATE_LOBBY: 'create-lobby',
    LOBBY_LIST_UPDATE: 'lobby-list-update',
    JOIN_LOBBY: 'join-lobby',
    DELETE_LOBBY: 'delete-lobby',
    LEAVE_LOBBY: 'leave-lobby',
    TOGGLE_READY_LOBBY: "toggle-ready-lobby",
    LOBBY_UPDATE: 'lobby-update',
} as const;

export type LobbyEventName  = typeof LOBBY_EVENT_NAME [keyof typeof LOBBY_EVENT_NAME];