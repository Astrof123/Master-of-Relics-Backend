import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import { ArtifactGameState, Player } from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { EFFECT } from 'src/game-mechanics/types/effect';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { ResourceService } from 'src/game-mechanics/resource.service';

@Injectable()
export class BerserkStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService,
        private readonly resourceService: ResourceService,
    ) {}

    getSkillType(): Skill {
        return SKILL.BERSERK;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        data: UseSkillData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        if (
            this.gameEffectsService.countEffect(artifact, EFFECT.BERSERK) ===
                0 &&
            this.gameEffectsService.countEffect(artifact, EFFECT.EXHAUSTION) ===
                0
        ) {
            this.gameEffectsService.applyEffect(
                artifact,
                EFFECTS[EFFECT.BERSERK],
                logParts,
            );
        }
    }

    death(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {}
}
