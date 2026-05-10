import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { UseSpellData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { CombatService } from "src/game-mechanics/combat.service";
import { SPELL, Spell } from "../types/spell";
import { ArtifactGameState, Player } from "src/game-state/types/game";
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { EFFECT } from "src/game-mechanics/types/effect";
import { ArtifactService } from "src/artifact/artifact.service";
import { ARTIFACT, SPAWN_POSITION } from "src/artifact/types/artifact";

@Injectable()
export class VolcanoStrategy implements SpellStrategy {
    constructor(
        private readonly artifactService: ArtifactService
    ) {}

    getSpellType(): Spell {
        return SPELL.VOLCANO;
    }

    execute(gameState: GameForLogic, player: Player, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const destructionShard: ArtifactGameState = this.artifactService.createArtifactState(
            player.artifacts,
            ARTIFACT.DESTRUCTION_SHARD
        );

        this.artifactService.spawnArtifact(
            destructionShard,
            SPAWN_POSITION.FRONT_LINE,
            null,
            null,
            player.artifacts,
            logParts
        );
    }
}