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
import { FACES } from "src/game-mechanics/constants/faces";
import { TARGET_RESTRICTION, TargetRestriction } from "src/action/types/restriction";
import { ArtifactService } from "src/artifact/artifact.service";
import { randomInt } from "crypto";
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { EFFECT } from "src/game-mechanics/types/effect";
import { ResourceService } from "src/game-mechanics/resource.service";
import { RESOURCE } from "src/game-mechanics/types/resource";

@Injectable()
export class WeaknessStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly resourceService: ResourceService
    ) {}

    getSpellType(): Spell {
        return SPELL.WEAKNESS;
    }

    execute(gameState: GameForLogic, player: Player, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? player : gameState.enemy;
        
        this.resourceService.decreaseResource(
            enemy,
            RESOURCE.RAGE,
            30,
            logParts
        )
    }
}