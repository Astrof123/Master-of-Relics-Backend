import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { UseSkillData, UseSpellData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";
import { SPELL, Spell } from "../types/spell";
import { LogHelper } from "src/action/helpers/logHelper";
import { ARTIFACTS } from "src/artifact/constants/artifacts";
import { Player } from "src/game-state/types/game";

@Injectable()
export class TouchOfLightStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService
    ) {}

    getSpellType(): Spell {
        return SPELL.TOUCH_OF_LIGHT;
    }

    execute(gameState: GameForLogic, player: Player, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? player : gameState.enemy;
        if (data.targets[0].length > 0) {
            const allyArtifact = player.artifacts[data.targets[0][0]];
            
            const heal = this.combatService.calculateHeal(allyArtifact, 20);
            this.combatService.applyHealing(allyArtifact, heal, logParts);
            animations.push({
                playerId: player.id,
                artifactGameId: allyArtifact.id,
                animation: ANIMATION.HEAL,
                value: heal
            })
        }
        else if (data.targets[1].length > 0) {
            const enemyArtifact = enemy.artifacts[data.targets[1][0]];
            const damage = this.combatService.calculateDamage(enemyArtifact, 10, DAMAGE.MAGIC);
            this.combatService.applyDamage(gameState, enemy, null, enemyArtifact, damage, DAMAGE.MAGIC, logParts);

            animations.push({
                playerId: enemy.id,
                artifactGameId: enemyArtifact.id!,
                animation: ANIMATION.HIT,
                value: damage
            })
        }
    }
}