export const LOBBY_ROOMS_NAME  = {
    HALL: 'hall'
} as const;

export type LobbyRoomsName  = typeof LOBBY_ROOMS_NAME [keyof typeof LOBBY_ROOMS_NAME];