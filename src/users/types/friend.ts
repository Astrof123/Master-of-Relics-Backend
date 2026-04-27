export interface Friend {
    id: number;
    nickname: string;
    friendId: number;
    isOnline: boolean;
}

export interface OfferFriendship {
    id: number;
    nickname: string;
    requesterId: number;
}

export const RELATIONSHIP  = {
    FRIEND: 'friend',
    STRANGER: "stranger",
    OFFER: "offer"
};

export type Relationship  = typeof RELATIONSHIP [keyof typeof RELATIONSHIP];
