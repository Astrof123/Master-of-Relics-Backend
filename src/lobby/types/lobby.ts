export interface LobbyPlayer {
    id: number,
    nickname: string,
    isReady: boolean,
    isHost: boolean
}


export interface Lobby {
    id: string,
    name: string,
    players: Record<number, LobbyPlayer>,
    state: LobbyStateType,
    options: {
        mode: GameModeType
    }
}

export const LOBBY_STATE_TYPE  = {
    WAITING: 'waiting',
    PLAYING: 'playing'
} as const;

export type LobbyStateType  = typeof LOBBY_STATE_TYPE [keyof typeof LOBBY_STATE_TYPE];


export const GAMEMODETYPE  = {
    CLASSIC: 'classic',
} as const;

export type GameModeType  = typeof GAMEMODETYPE [keyof typeof GAMEMODETYPE];