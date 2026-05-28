import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SpellStrategy } from '../types/strategy';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    LINE,
    Player,
} from 'src/game-state/types/game';
import { UseSkillData, UseSpellData } from 'src/action/types/action-evens-data';
import { ANIMATION, AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { CombatService } from 'src/game-mechanics/combat.service';
import { DAMAGE } from 'src/game-mechanics/types/combat';
import { SPELL, Spell } from '../types/spell';

@Injectable()
export class PiercingBoltStrategy implements SpellStrategy {
    constructor(private readonly combatService: CombatService) {}

    getSpellType(): Spell {
        return SPELL.PIERCING_BOLT;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        data: UseSpellData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        const enemy =
            gameState.enemy.id === player.id
                ? gameState.player
                : gameState.enemy;
        const enemyArtifact = enemy.artifacts[data.targets[1][0]];
        const damage = this.combatService.calculateDamage(
            enemyArtifact,
            15,
            DAMAGE.MAGIC,
        );
        this.combatService.applyDamage(
            gameState,
            enemy,
            null,
            enemyArtifact,
            damage,
            DAMAGE.MAGIC,
            logParts,
        );

        animations.push({
            playerId: enemy.id,
            artifactGameId: enemyArtifact.id,
            animation: ANIMATION.HIT,
            value: damage,
        });
    }
}
