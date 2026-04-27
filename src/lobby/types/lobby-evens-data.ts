export interface CreateLobbyData {
    name: string;
    isPrivate: boolean;
    withTimers: boolean;
    timerTurn: number;
    timerMovement: number;
    timerDraft: number;
}

export interface UpdateOptionsLobbyData {
    lobbyId: string;
    withTimers: boolean;
    timerTurn: number;
    timerMovement: number;
    timerDraft: number;
}

export interface InviteFriendData {
    lobbyId: string;
    friendId: number;
}