import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import { ArtifactGameState, Player } from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { ArtifactService } from '../artifact.service';
import { ARTIFACT, SPAWN_POSITION } from '../types/artifact';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { EFFECT } from 'src/game-mechanics/types/effect';

@Injectable()
export class SpawnSelfCopyStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService,
        private readonly artifactService: ArtifactService,
    ) {}

    getSkillType(): Skill {
        return SKILL.SPAWN_SELF_COPY;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        data: UseSkillData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        const selfCopy: ArtifactGameState =
            this.artifactService.createArtifactState(
                player.artifacts,
                ARTIFACT.ILLUSION_BLADE,
            );

        selfCopy.currentHp = 1;

        this.artifactService.spawnArtifact(
            selfCopy,
            SPAWN_POSITION.NEAR,
            artifact.position,
            artifact.line,
            player.artifacts,
            logParts,
        );

        this.gameEffectsService.applyEffect(selfCopy, EFFECTS[EFFECT.COPY], []);
    }

    death(
        gameState: GameForLogic,
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {}
}
