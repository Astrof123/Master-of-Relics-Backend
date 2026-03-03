import { EffectDuration, EffectType } from "src/effects/types/effect";
import { Phase } from "./phase";

export const CONNECTIONGAME  = {
    ONLINE: 'online',
    LEAVED: 'leaved',
    OFFLINE: "offline"
} as const;

export type ConnectionGame  = typeof CONNECTIONGAME [keyof typeof CONNECTIONGAME];


export const LINE  = {
    FRONT: 'front',
    BACK: 'back'
} as const;

export type Line  = typeof LINE [keyof typeof LINE];


export const ARTIFACT_STATE  = {
    READY_TO_USE: 'ready_to_use',
    COOLDOWN: 'cooldown',
    STUNNED: 'stunned',
    ROOTED: 'rooted'
} as const;

export type ArtifactState  = typeof ARTIFACT_STATE [keyof typeof ARTIFACT_STATE];


export interface ArtifactAvailableActions {
    face: {
        description: string;
        attackTarget: string[],
        healTarget: string[]
    },
    agilityActions: {
        reroll: true,
        return_to_battle: false,
        change_line: true
    },
    skill: [
        {
            id: number,
            description: string,
            countTarget: number,
            possibleTargets: string[][],
            targetsType: TargetsType
        }
    ] 
}


export interface ArtifactGameState {
    id: string;
    artifactId: number;
    face: Face;
    state: ArtifactState;
    currentHp: number;
    maxHp: number;
    position: number;
    line: Line;
    effects: EffectType[];
    availableActions: ArtifactAvailableActions | null
}

export const FACE  = {
    AGILITY: 'agility',
    LIGHT_MANA: 'light_mana',
    RAGE: 'rage',
    DARK_MANA: 'dark_mana',
    DESTRUCTION_MANA: 'destruction_mana',
    SWORD: 'sword',
    TARGET: 'target',
    HEAL: "heal",
    THREE_SWORD: "three_sword",
    TWO_SWORD: "two_sword",
    THREE_DARK_MANA: "three_dark_mana",
    THREE_LIGHT_MANA: "three_light_mana",
    THREE_DESTRUCTION_MANA: "three_destruction_mana",
    ONE_EVERY_MANA: "one_every_mana",
    ONE_RAGE_TWO_TARGET: "one_rage_two_target",
    TWO_RAGE_ONE_TARGET: "two_rage_one_target",
    THREE_HEART: "three_heart",
    ONE_RAGE_TWO_HEART: "one_rage_two_heart",
    THREE_AGILITY: "three_agility",
    THREE_RAGE: "three_rage"
};

export type Face  = typeof FACE [keyof typeof FACE];


export interface Player {
    id: number;
    name: string;
    connection: ConnectionGame;
    hero: string;
    resources: {
        agility: number;
        rage: number;
        light_mana: number;
        dark_mana: number;
        destruction_mana: number;
    },
    artifacts: Record<string, ArtifactGameState>;
    spells: {
        light: SpellGameState[],
        dark: SpellGameState[],
        destruction: SpellGameState[]
    };
    effects: EffectType[];
    isReady: boolean;
    movePoints: number;
    draft: {
        pickedArtifact: number|null;
        deck: number[];
    },
    availableActions: {}
}


export interface Game {
    id: string;
    phase: Phase;
    name: string;
    currentTurn: number;
    logs: string[];
    players: Record<number, Player>;
}


export const TARGETS_TYPE  = {
    ENEMY: 'enemy',
    ALLIED: 'allied',
    ONE_ENEMY_ONE_ALLIED: 'one_enemy_one_allied',
};

export type TargetsType  = typeof TARGETS_TYPE [keyof typeof TARGETS_TYPE];


export interface SpellGameState {
    id: string;
    cooldown: boolean;
    canUse: boolean;
    countTarget: number;
    possibleTargets: string[][];
    targetsType: TargetsType;
}