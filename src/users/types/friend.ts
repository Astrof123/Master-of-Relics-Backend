export interface Friend {
    id: number;
    nickname: string;
    friendId: string;
    isOnline: boolean;
}

export interface OfferFriendship {
    id: number;
    nickname: string;
    requesterId: string;
}

export const RELATIONSHIP = {
    FRIEND: 'friend',
    STRANGER: 'stranger',
    OFFER: 'offer',
};

export type Relationship = (typeof RELATIONSHIP)[keyof typeof RELATIONSHIP];
