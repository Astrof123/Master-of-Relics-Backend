export const INVITE_CODE_STATUS  = {
    USED: 'used',
    BOOKED: "booked",
    FREE: "free"
};

export type InviteCodeStatus  = typeof INVITE_CODE_STATUS [keyof typeof INVITE_CODE_STATUS];