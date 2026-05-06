import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SkillStrategy } from "../types/strategy";
import { ArtifactGameState, Player } from "src/game-state/types/game";
import { UseSkillData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { Skill, SKILL } from "../types/skill";;
import { RESOURCE } from "src/game-mechanics/types/resource";
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { ResourceService } from "src/game-mechanics/resource.service";

@Injectable()
export class StealRageStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService,
        private readonly resourceService: ResourceService
    ) {}

    getSkillType(): Skill {
        return SKILL.STEAL_RAGE;
    }

    execute(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? player : gameState.enemy;
        this.resourceService.decreaseResource(enemy, RESOURCE.RAGE, 10, logParts);
        this.resourceService.addResource(player, RESOURCE.RAGE, 10, logParts);
    }

    death(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, logParts: string[]) {
        
    }
}