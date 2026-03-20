import { Player } from "./game";
import { Phase } from "./phase";

export interface GameForLogic {
    id: string;
    phase: Phase;
    name: string;
    currentTurn: number;
    logs: string[];
    player: Player;
    enemy: Player;
}