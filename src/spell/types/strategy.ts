import { UseSpellData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { ArtifactGameState } from "src/game-state/types/game";
import { GameForLogic } from "src/game-state/types/game-for-logic";
import { Spell } from "./spell";

export interface SpellStrategy {
    getSpellType(): Spell;
    execute(gameState: GameForLogic, data: UseSpellData, animations: AnimationData[], logParts: string[]): void;
}