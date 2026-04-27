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
    isPrivate: boolean;
    code: string | null;
    options: {
        withTimers: boolean;
        timerTurn: number | null;
        timerDraft: number | null;
        timerMovement: number | null;
        mode: GameModeType
    }
}

export interface LobbyInvitation {
    id: string;
    lobbyId: string,
    addresseeId: number,
    requesterNickname: string;
    requesterId: number;
}

export interface FriendForInvite {
    isOnline: boolean;
    friendNickname: string;
    friendId: number;
    status: InviteStatus;
}

export const INVITE_STATUS  = {
    OFFER: 'offer',
    NO_OFFER: 'no_offer',
} as const;

export type InviteStatus  = typeof INVITE_STATUS [keyof typeof INVITE_STATUS];

export const LOBBY_STATE_TYPE  = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    END: 'end',
} as const;

export type LobbyStateType  = typeof LOBBY_STATE_TYPE [keyof typeof LOBBY_STATE_TYPE];


export const GAMEMODETYPE  = {
    CLASSIC: 'classic',
} as const;

export type GameModeType  = typeof GAMEMODETYPE [keyof typeof GAMEMODETYPE];