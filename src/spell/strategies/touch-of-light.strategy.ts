import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { UseSkillData, UseSpellData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";
import { SPELL, Spell } from "../types/spell";

@Injectable()
export class TouchOfLightStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService
    ) {}

    getSpellType(): Spell {
        return SPELL.TOUCH_OF_LIGHT;
    }

    execute(gameState: GameForLogic, data: UseSpellData, animations: AnimationData[]) {
        
        if (data.targets[0].length > 0) {
            const allyArtifact = gameState.player.artifacts[data.targets[0][0]];
            
            const heal = this.combatService.calculateHeal(gameState.player, allyArtifact.id, 20);
            if (heal !== 0) {
                this.combatService.applyHealing(gameState.player, allyArtifact.id, heal);
                animations.push({
                    playerId: gameState.player.id,
                    artifactGameId: allyArtifact.id,
                    animation: ANIMATION.HEAL,
                    value: heal
                })
            }
        }
        else if (data.targets[1].length > 0) {
            const enemyArtifact = gameState.enemy.artifacts[data.targets[1][0]];
            const damage = this.combatService.calculateDamage(gameState.player, 10, DAMAGE.MAGIC);
            this.combatService.applyDamage(gameState.enemy, enemyArtifact.id, damage);

            animations.push({
                playerId: gameState.enemy.id,
                artifactGameId: enemyArtifact.id!,
                animation: ANIMATION.HIT,
                value: damage
            })
        }
    }
}