import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SkillStrategy } from '../types/strategy';
import { ArtifactGameState, LINE, Player } from 'src/game-state/types/game';
import { UseSkillData } from 'src/action/types/action-evens-data';
import { AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { Skill, SKILL } from '../types/skill';
import { randomInt } from 'crypto';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { ArtifactService } from '../artifact.service';
import { LogHelper } from 'src/action/helpers/logHelper';
import { ARTIFACTS } from '../constants/artifacts';

@Injectable()
export class HookStrategy implements SkillStrategy {
    constructor(private readonly artifactService: ArtifactService) {}

    getSkillType(): Skill {
        return SKILL.HOOK;
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
        const countOnLine = Object.values(enemy.artifacts).filter(
            (art) => art.line === 'back',
        );
        const randomPos = randomInt(0, countOnLine.length + 1);

        this.artifactService.moveArtifact(
            randomPos,
            enemy.artifacts[data.targets[1][0]],
            LINE.FRONT,
            enemy.artifacts,
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
