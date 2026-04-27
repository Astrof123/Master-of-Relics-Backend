export const LOBBY_EVENT_NAME  = {
    JOIN_HALL: 'join-hall',
    CREATE_LOBBY: 'create-lobby',
    GET_LOBBY_LIST: 'get-lobby-list',
    JOIN_LOBBY: 'join-lobby',
    JOIN_LOBBY_BY_CODE: 'join-lobby-by-code',
    JOIN_LOBBY_BY_INVITATION: 'join-lobby-by-invitation',
    DELETE_LOBBY: 'delete-lobby',
    LEAVE_LOBBY: 'leave-lobby',
    TOGGLE_READY_LOBBY: "toggle-ready-lobby",
    LOBBY_UPDATE: 'lobby-update',
    GAME_STARTED: 'game-started',
    LOBBY_LIST_UPDATED: 'lobby-list-updated',
    COUNT_ONLINE_PLAYERS_UPDATED: "count-online-players-updated",
    INVITE_FRIEND: "invite-friend",
    YOU_INVITED: "you-invited",
    DECLINE_INVITATION: "decline-invitation",
    GET_FRIENDS_FOR_INVITE: 'get-friends-for-invite',
    UPDATE_OPTIONS: "update-options"
};

export type LobbyEventName  = typeof LOBBY_EVENT_NAME [keyof typeof LOBBY_EVENT_NAME];