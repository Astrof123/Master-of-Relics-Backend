import { ConstantsGameState, EndState, LogState, Player } from './game';
import { MiniPhase, Phase } from './phase';

export interface GameForLogic {
    id: string;
    phase: Phase;
    name: string;
    currentTurn: string;
    logs: LogState[];
    player: Player;
    enemy: Player;
    end: EndState | null;
    miniPhase: MiniPhase;
    constants: ConstantsGameState;
}
