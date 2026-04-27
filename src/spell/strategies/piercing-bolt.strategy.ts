import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { ARTIFACT_STATE, ArtifactGameState, LINE } from "src/game-state/types/game";
import { UseSkillData, UseSpellData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";
import { SPELL, Spell } from "../types/spell";

@Injectable()
export class PiercingBoltStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService
    ) {}

    getSpellType(): Spell {
        return SPELL.PIERCING_BOLT;
    }

    execute(gameState: GameForLogic, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const enemyArtifact = gameState.enemy.artifacts[data.targets[1][0]];
        const damage = this.combatService.calculateDamage(gameState.player, 15, DAMAGE.MAGIC);
        this.combatService.applyDamage(gameState.enemy, enemyArtifact.id, damage, DAMAGE.MAGIC, logParts);

        animations.push({
            playerId: gameState.enemy.id,
            artifactGameId: enemyArtifact.id!,
            animation: ANIMATION.HIT,
            value: damage
        })
    }
}