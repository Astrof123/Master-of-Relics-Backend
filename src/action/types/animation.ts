export const ANIMATION = {
    HIT: "hit",
    HEAL: "heal"
}

export type AnimationType = typeof ANIMATION[keyof typeof ANIMATION];


export interface AnimationData {
    playerId: number;
    artifactGameId: string;
    animation: AnimationType;
    value: number;
}