export const GAME_EVENT_NAME = {
    JOIN_GAME: 'join-game',
    CREATE_GAME: 'create-game',
    CREATE_GAME_WITH_BOT: 'create-game-with-bot',
    GAME_STATE_UPDATED: 'game_state_updated',
    GET_GAME_STATE: 'get_game_state',
    PLAYERS_ONLINE_UPDATED: 'players_online_updated',
    TIMER_START: 'timer:start',
    TIMER_SYNC: 'timer:sync',
    TIMER_EXPIRED: 'timer:expired',
    NEW_NOTIFICATION: 'new_notification',
};

export type GameEventName =
    (typeof GAME_EVENT_NAME)[keyof typeof GAME_EVENT_NAME];
