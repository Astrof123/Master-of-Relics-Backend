export const TIMER_TYPE  = {
    DRAFT: 'draft',
    MOVEMENT: 'movement',
    TURN: 'turn'
};

export type TimerType  = typeof TIMER_TYPE [keyof typeof TIMER_TYPE];

export const DEFAULT_TIMER_DURATIONS = {
    [TIMER_TYPE.DRAFT]: 60,
    [TIMER_TYPE.MOVEMENT]: 60,
    [TIMER_TYPE.TURN]: 30
};

export interface TimerSyncData {
    timerType: TimerType;
    active: boolean;
    remaining: number;
    duration: number | null;
    startedAt: number | null;
    timeOnServer: number;
}