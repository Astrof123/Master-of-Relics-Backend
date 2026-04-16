import { ConstantsGameState, EndState, Player } from "./game";
import { MiniPhase, Phase } from "./phase";

export interface GameForLogic {
    id: string;
    phase: Phase;
    name: string;
    currentTurn: number;
    logs: string[];
    player: Player;
    enemy: Player;
    end: EndState | null;
    miniPhase: MiniPhase;
    constants: ConstantsGameState;
}