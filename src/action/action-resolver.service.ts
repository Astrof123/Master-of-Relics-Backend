import { Injectable } from '@nestjs/common';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { ARTIFACT_STATE, ArtifactGameState } from 'src/game-state/types/game';
import { ExtraActionData, UseFaceData, UseSkillData } from './types/action-evens-data';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { PHASE } from 'src/game-state/types/phase';
import { ResourceService } from 'src/game-mechanics/resource.service';
import { FACES } from 'src/game-mechanics/constants/faces';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { CombatService } from 'src/game-mechanics/combat.service';
import { DAMAGE } from 'src/game-mechanics/types/combat';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { ANIMATION, AnimationData } from './types/animation';
import { EXTRA_ACTION, ExtraAction } from './types/action';
import { DiceService } from 'src/game-mechanics/dice.service';
import { EXTRA_ACTIONS } from './constants/extra-actions';
import { PhaseService } from 'src/phase/phase.service';
import { ArtifactService } from 'src/artifact/artifact.service';
import { SkillsStrategyFactory } from 'src/artifact/skills.factory';
import { ExtraActionService } from './extra-action.service';
import { SKILLS } from 'src/artifact/constants/skills';





@Injectable()
export class ActionResolverService {
    constructor(
        private readonly resourceService: ResourceService,
        private readonly combatService: CombatService,
        private readonly artifactStateService: ArtifactStateService,
        private readonly diceService: DiceService,
        private readonly phaseService: PhaseService,
        private readonly artifactService: ArtifactService,
        private readonly skillsFactory: SkillsStrategyFactory,
        private readonly extraActionService: ExtraActionService
    ) {}

    useFaceResolve(gameState: GameForLogic, artifact: ArtifactGameState, data: UseFaceData, animations: AnimationData[]) {
        const faceData = FACES[artifact.face];

        this.resourceService.addResource(gameState.player, RESOURCE.AGILITY, faceData.agility);
        this.resourceService.addResource(gameState.player, RESOURCE.RAGE, faceData.rage);
        this.resourceService.addResource(gameState.player, RESOURCE.LIGHT_MANA, faceData.light_mana);
        this.resourceService.addResource(gameState.player, RESOURCE.DARK_MANA, faceData.dark_mana);
        this.resourceService.addResource(gameState.player, RESOURCE.DESTRUCTION_MANA, faceData.destruction_mana);

        if (artifact.availableActions === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        if (artifact.availableActions.face === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        const face = artifact.availableActions.face;

        if (face.attackTargets !== null && face.attackTargets.length > 0) {
            const damageType = faceData.sword > 0 ? DAMAGE.MELEE : DAMAGE.RANGED;

            const damage = this.combatService.calculateFaceDamage(gameState.player, data.artifactGameId, damageType);

            this.combatService.applyDamage(gameState.enemy, data.attackTarget!, damage);
            animations.push({
                playerId: gameState.enemy.id,
                artifactGameId: data.attackTarget!,
                animation: ANIMATION.HIT,
                value: damage
            })
        }

        if (face.healTargets !== null && face.healTargets.length > 0) {
            const heal = this.combatService.calculateFaceHeal(gameState.player, data.healTarget!, data.artifactGameId!);

            this.combatService.applyHealing(gameState.player, data.healTarget!, heal);
            animations.push({
                playerId: gameState.player.id,
                artifactGameId: data.healTarget!,
                animation: ANIMATION.HEAL,
                value: heal
            })
        }

        gameState.player.movePoints -= 1;
        this.artifactStateService.applyState(gameState.player, data.artifactGameId, ARTIFACT_STATE.COOLDOWN);
    }

    endTurnResolve(gameState: GameForLogic) {
        if (gameState.enemy.isReady) {
            gameState.currentTurn = gameState.player.id;
            gameState.player.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.enemy);
            this.artifactService.calculateAvailableActions(gameState, gameState.player, gameState.enemy);
        }
        else {
            gameState.currentTurn = gameState.enemy.id;
            gameState.enemy.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.enemy);
            this.artifactService.calculateAvailableActions(gameState, gameState.enemy, gameState.player);
        }
    }

    useSkillResolve(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[]) {
        const strategy = this.skillsFactory.getStrategy(data.skillId);
        strategy.execute(gameState, artifact, data, animations);
    
        gameState.player.movePoints -= 1;
        gameState.player.resources[RESOURCE.RAGE] -= SKILLS[data.skillId].cost;
    }

    endRoundResolve(gameState: GameForLogic) {
        this.endTurnResolve(gameState);
        gameState.player.isReady = true;

        if (gameState.enemy.isReady) {
            this.phaseService.newRound(gameState);
        }
    }

    extraActionResolve(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData, animations: AnimationData[]) {
        if (artifact.availableActions === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        const handler = this.extraActionService.getHandler(data.type);
        if (!handler) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        handler(gameState, artifact, data, animations);
        
        const cost = EXTRA_ACTIONS[data.type].cost
        const resourceType = EXTRA_ACTIONS[data.type].resourceType
        gameState.player.resources[resourceType] -= cost;
    }


}
