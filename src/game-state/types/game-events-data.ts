export interface GameNotificationData {
    receiverId: number;
    text: string;
    level: NotificationLevel
}

export const NOTIFICATION_LEVEL  = {
    WARNING: "warning",
    INFO: "info"
};

export type NotificationLevel  = typeof NOTIFICATION_LEVEL [keyof typeof NOTIFICATION_LEVEL];