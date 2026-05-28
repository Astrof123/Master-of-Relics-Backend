import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import { ArtifactGameState, Player } from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { DISPELL_TYPE, EFFECT } from 'src/game-mechanics/types/effect';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { ResourceService } from 'src/game-mechanics/resource.service';

@Injectable()
export class DarkBlightStrategy implements SkillStrategy {
    constructor(private readonly gameEffectsService: GameEffectsService) {}

    getSkillType(): Skill {
        return SKILL.DARK_BLIGHT;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        data: UseSkillData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        const enemy =
            gameState.enemy.id === player.id
                ? gameState.player
                : gameState.enemy;

        this.gameEffectsService.applyHeroEffect(
            enemy,
            EFFECTS[EFFECT.DARK_BLIGHT],
            logParts,
        );
    }

    death(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {}
}
