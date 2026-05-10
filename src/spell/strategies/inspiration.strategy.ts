import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { UseSpellData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { SPELL, Spell } from "../types/spell";
import { ARTIFACT_STATE, Player } from "src/game-state/types/game";

@Injectable()
export class InspirationStrategy implements SpellStrategy {
    constructor(
        private readonly artifactStateService: ArtifactStateService
    ) {}

    getSpellType(): Spell {
        return SPELL.INSPIRATION;
    }

    execute(gameState: GameForLogic, player: Player, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const allyArtifact = player.artifacts[data.targets[0][0]];

        this.artifactStateService.applyState(allyArtifact, ARTIFACT_STATE.READY_TO_USE, logParts);
    }
}