
import { EffectType } from "src/game-mechanics/types/effect";
import { MiniPhase, Phase } from "./phase";
import { Face } from "src/game-mechanics/types/face";
import { RESOURCE } from "src/game-mechanics/types/resource";
import { ExtraAction, ExtraActionState } from "src/action/types/action";
import { Skill } from "src/artifact/types/skill";
import { Spell, SPELLTYPE } from "src/spell/types/spell";

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
    ROOTED: 'rooted',
    BREAKEN: "breaken"
} as const;

export type ArtifactState  = typeof ARTIFACT_STATE [keyof typeof ARTIFACT_STATE];


export interface SkillStateType {
    id: Skill;
    description: string;
    possibleTargets: string[][];
    countAnyTarget: number;
    countTargetEnemy: number;
    countTargetAllies: number;
}

export interface ArtifactAvailableActions {
    face: {
        id: string;
        description: string;
        attackTargets: string[] | null,
        healTargets: string[] | null,
    } | null,
    skills: SkillStateType[],
    extraActions: ExtraActionState[]
}


export interface ArtifactGameState {
    id: string;
    artifactId: string;
    face: Face;
    state: ArtifactState;
    currentHp: number;
    maxHp: number;
    position: number;
    skillCost: number | null;
    line: Line;
    effects: EffectType[];
    availableActions: ArtifactAvailableActions | null
}

export interface DeckArtifact {
    artifactId: string;
    maxHp: number;
    skillCost: number;
}

export interface Player {
    id: number;
    name: string;
    connection: ConnectionGame;
    hero: string;
    resources: {
        [RESOURCE.AGILITY]: number;
        [RESOURCE.RAGE]: number;
        [RESOURCE.LIGHT_MANA]: number;
        [RESOURCE.DARK_MANA]: number;
        [RESOURCE.DESTRUCTION_MANA]: number;
    },
    artifacts: Record<string, ArtifactGameState>;
    spells: {
        [SPELLTYPE.LIGHT]: Record<Spell, SpellGameState>,
        [SPELLTYPE.DARK]: Record<Spell, SpellGameState>,
        [SPELLTYPE.DESTRUCTION]: Record<Spell, SpellGameState>
    };
    effects: EffectType[];
    isReady: boolean;
    movePoints: number;
    draft: {
        pickedArtifact: string|null;
        deck: DeckArtifact[];
    },
    temporaryArtifacts: Record<string, ArtifactGameState>;
}


export interface Game {
    id: string;
    phase: Phase;
    name: string;
    currentTurn: number;
    logs: string[];
    players: Record<number, Player>;
    end: EndState | null;
    miniPhase: MiniPhase;
    constants: ConstantsGameState;
}

export interface ConstantsGameState {
    maxCountArtifactsOnLine: number;
}


export interface EndState {
    winner: number | null;
    winner_prize: number;
    loser_prize: number;
    draw_prize: number;
}


export interface SpellGameState {
    id: string;
    description: string;
    cost: number;
    cooldown: boolean;
    canUse: boolean;
    possibleTargets: string[][];
    countAnyTarget: number;
    countTargetEnemy: number;
    countTargetAllies: number;
}