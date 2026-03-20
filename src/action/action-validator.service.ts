import { Injectable } from '@nestjs/common';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { ARTIFACT_STATE, ArtifactGameState, Player } from 'src/game-state/types/game';
import { ExtraActionData, UseFaceData, UseSkillData } from './types/action-evens-data';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { PHASE } from 'src/game-state/types/phase';
import { EXTRA_ACTION } from './types/action';
import { EXTRA_ACTIONS } from './constants/extra-actions';
import { ExtraActionService } from './extra-action.service';
import { SKILLS } from 'src/artifact/constants/skills';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { RESTRICTION, Restriction } from './types/restriction';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { RestrictionService } from './restriction.service';

@Injectable()
export class ActionValidatorService {
    constructor(
        private readonly restrictionService: RestrictionService
    ) {}

    private generalValidator(gameState: GameForLogic) {
        if (gameState.phase !== PHASE.BATTLE) {
            throw new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        }

        if (gameState.currentTurn !== gameState.player.id) {
            throw new ActionException(ACTION_ERROR_CODE.NOT_YOUR_TURN);
        }
    }

    private movePointsValidator(gameState: GameForLogic) {
        if (gameState.player.movePoints <= 0) {
            throw new ActionException(ACTION_ERROR_CODE.NO_MOVE_POINTS);
        }
    }

    private artifactStateValidator(artifact: ArtifactGameState) {
        if (artifact.state !== ARTIFACT_STATE.READY_TO_USE) {
            throw new ActionException(ACTION_ERROR_CODE.ARTIFACT_NOT_READY);
        }
    }

    useFaceValidator(gameState: GameForLogic, artifact: ArtifactGameState, data: UseFaceData) {
        this.generalValidator(gameState);
        this.movePointsValidator(gameState);
        this.artifactStateValidator(artifact);
        
        if (artifact.availableActions === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
        
        if (artifact.availableActions.face === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        const face = artifact.availableActions.face;
        
        if (face.attackTargets !== null && face.attackTargets.length > 0) {
            if (data.attackTarget === null) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_ATTACK_TARGET);
            }

            if (!face.attackTargets.includes(data.attackTarget)) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_ATTACK_TARGET);
            }
        }

        if (face.healTargets !== null && face.healTargets.length > 0) {
            if (data.healTarget === null) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_ATTACK_TARGET);
            }

            if (!face.healTargets.includes(data.healTarget)) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_HEAL_TARGET);
            }
        }
    }

    useSkillValidator(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData) {
        this.generalValidator(gameState);
        this.movePointsValidator(gameState);
        this.artifactStateValidator(artifact);
        
        if (artifact.availableActions === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
        
        if (artifact.availableActions.skills === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        const skills = artifact.availableActions.skills;
        
        if (!Object.keys(SKILLS).includes(data.skillId)) {
            throw new ActionException(ACTION_ERROR_CODE.UNKNOWN_SKILL);
        }

        if (!skills.find((skill => skill.id === data.skillId))) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }

        if (data.targets.length !== 2) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        if (SKILLS[data.skillId].countTargetAllies !== data.targets[0].length) {
            throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
        }

        if (SKILLS[data.skillId].countTargetEnemy !== data.targets[1].length) {
            throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
        }

        if (SKILLS[data.skillId].cost > gameState.player.resources[RESOURCE.RAGE]) {
            throw new ActionException(ACTION_ERROR_CODE.NOT_ENOUGH_RESOURCES);
        }
    
        if (!this.restrictionService.checkRestrictions(gameState.player, gameState.enemy, artifact, SKILLS[data.skillId].restrictions)) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }

        data.targets[0].forEach(artifactGameId => {
            if (!Object.keys(gameState.player.artifacts).includes(artifactGameId)) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
            }
        });

        data.targets[1].forEach(artifactGameId => {
            if (!Object.keys(gameState.enemy.artifacts).includes(artifactGameId)) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
            }
        });
    }

    endTurnValidator(gameState: GameForLogic) {
        this.generalValidator(gameState);
    }

    endRoundValidator(gameState: GameForLogic) {
        this.generalValidator(gameState);
    }

    extraActionValidator(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData) {
        this.generalValidator(gameState);
        
        if (artifact.availableActions === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        if (artifact.availableActions.extraActions.length === 0) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }

        if (!Object.values(EXTRA_ACTION).includes(data.type)) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }

        if (!this.restrictionService.checkRestrictions(gameState.player, gameState.enemy, artifact, EXTRA_ACTIONS[data.type].restrictions)) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }

        const cost = EXTRA_ACTIONS[data.type].cost;
        const resourceType = EXTRA_ACTIONS[data.type].resourceType;

        if (gameState.player.resources[resourceType] - cost < 0) {
            throw new ActionException(ACTION_ERROR_CODE.NOT_ENOUGH_RESOURCES);
        }
    }
}
