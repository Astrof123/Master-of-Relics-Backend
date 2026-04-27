import { EffectType } from "src/game-mechanics/types/effect";
import { ArtifactState, ConnectionGame, ConstantsGameState, DeckArtifact, EndState, Line, LogState, Player } from "./game";
import { MiniPhase, Phase } from "./phase";
import { Face } from "src/game-mechanics/types/face";

export interface EnemyArtifact {
    id: string;
    artifactId: string;
    face: Face;
    state: ArtifactState;
    skillCost: number | null;
    currentHp: number;
    maxHp: number;
    position: number;
    line: Line;
    effects: EffectType[];
}

export interface EnemyForClient {
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
    artifacts: Record<string, EnemyArtifact>;
    effects: EffectType[];
    isReady: boolean;
    movePoints: number;
    draft: {
        deck: DeckArtifact[];
    }
    offerDraw: boolean;
}


export interface GameForClient {
    id: string;
    phase: Phase;
    name: string;
    currentTurn: number;
    logs: LogState[];
    player: Player;
    enemy: EnemyForClient;
    end: EndState | null;
    miniPhase: MiniPhase;
    constants: ConstantsGameState;
}