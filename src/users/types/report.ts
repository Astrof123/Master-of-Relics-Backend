export const REPORT_TYPE  = {
    OFFENSIVE_NICKNAME: 'offensive_nickname',
    OBSTRUCTION_OF_PLAY: "obstruction_of_play",
    UNACCEPTABLE_AVATAR: "unacceptable_avatar"
};

export type ReportType  = typeof REPORT_TYPE [keyof typeof REPORT_TYPE];