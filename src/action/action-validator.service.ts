import { Injectable } from '@nestjs/common';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { ARTIFACT_STATE, ArtifactGameState, LINE, Player } from 'src/game-state/types/game';
import { ExtraActionData, ToggleReadyMovementData, UseFaceData, UseSkillData, UseSpellData } from './types/action-evens-data';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { MINIPHASE, PHASE } from 'src/game-state/types/phase';
import { EXTRA_ACTION } from './types/action';
import { EXTRA_ACTIONS } from './constants/extra-actions';
import { ExtraActionService } from './extra-action.service';
import { SKILLS } from 'src/artifact/constants/skills';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { RESTRICTION, Restriction } from './types/restriction';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { RestrictionService } from './restriction.service';
import { SPELLS } from 'src/spell/constants/spells';
import { SPELLTYPE } from 'src/spell/types/spell';
import { SpellHelper } from 'src/spell/spell.helper';

@Injectable()
export class ActionValidatorService {
    constructor(
        private readonly restrictionService: RestrictionService
    ) {}

    private generalValidator(gameState: GameForLogic) {
        if (gameState.end !== null) {
            throw new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        }

        if (gameState.phase !== PHASE.BATTLE) {
            throw new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        }

        if (gameState.miniPhase !== MINIPHASE.BATTLE) {
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

        const any = SKILLS[data.skillId].countAnyTarget;
        const allies = SKILLS[data.skillId].countTargetAllies;
        const enemies = SKILLS[data.skillId].countTargetEnemy;
        if (any > 0) {
            if (allies > data.targets[0].length || data.targets[0].length > any + allies) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
            }
            let remainder = (any + allies) - data.targets[0].length;

            if (enemies > data.targets[1].length || data.targets[1].length > remainder + enemies) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
            }
        }

        if (SKILLS[data.skillId].cost > gameState.player.resources[RESOURCE.RAGE]) {
            throw new ActionException(ACTION_ERROR_CODE.NOT_ENOUGH_RESOURCES);
        }
    
        if (!this.restrictionService.checkGeneralRestrictions(gameState.player, gameState.enemy, SKILLS[data.skillId].restrictions)) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }
        if (!this.restrictionService.checkArtifactRestrictions(SKILLS[data.skillId].restrictions, artifact)) {
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

    useSpellValidator(gameState: GameForLogic, data: UseSpellData) {
        this.generalValidator(gameState);
        this.movePointsValidator(gameState);
        
        if (data.targets.length !== 2) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        if (!Object.keys(SPELLS).includes(data.spellId)) {
            throw new ActionException(ACTION_ERROR_CODE.UNKNOWN_SPELL);
        }
        
        const spell = SPELLS[data.spellId];
        if (!gameState.player.spells[spell.type][spell.id].canUse) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }

        let neededResource = SpellHelper.getResource(spell.type);
        
        if (spell.cost > gameState.player.resources[RESOURCE[neededResource]]) {
            throw new ActionException(ACTION_ERROR_CODE.NOT_ENOUGH_RESOURCES);
        }

        const any = SPELLS[data.spellId].countAnyTarget;
        const allies = SPELLS[data.spellId].countTargetAllies;
        const enemies = SPELLS[data.spellId].countTargetEnemy;
        if (any > 0) {
            if (allies > data.targets[0].length || data.targets[0].length > any + allies) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
            }
            let remainder = (any + allies) - data.targets[0].length;

            if (enemies > data.targets[1].length || data.targets[1].length > remainder + enemies) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_TARGETS);
            }
        }

        if (!this.restrictionService.checkGeneralRestrictions(gameState.player, gameState.enemy, SPELLS[data.spellId].restrictions)) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }
        if (!this.restrictionService.checkSpellRestrictions(SPELLS[data.spellId].restrictions)) {
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

        if (!this.restrictionService.checkGeneralRestrictions(gameState.player, gameState.enemy, EXTRA_ACTIONS[data.type].restrictions)) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }

        if (!this.restrictionService.checkArtifactRestrictions(EXTRA_ACTIONS[data.type].restrictions, artifact)) {
            throw new ActionException(ACTION_ERROR_CODE.IMPOSSIBLE_ACTION);
        }
        const cost = EXTRA_ACTIONS[data.type].cost;
        const resourceType = EXTRA_ACTIONS[data.type].resourceType;

        if (gameState.player.resources[resourceType] - cost < 0) {
            throw new ActionException(ACTION_ERROR_CODE.NOT_ENOUGH_RESOURCES);
        }

        if (data.type === EXTRA_ACTION.MOVE) {
            if (data.details === null) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
            }
        }
    }

    toggleReadyMovementValidator(gameState: GameForLogic, data: ToggleReadyMovementData) {
        const EXCLUDED_FIELDS: (keyof ArtifactGameState)[] = ['line', 'position'];

        if (gameState.end !== null) {
            throw new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        }

        if (gameState.phase !== PHASE.BATTLE) {
            throw new ActionException(ACTION_ERROR_CODE.PHASE_NOT_BATTLE);
        }

        if (gameState.miniPhase !== MINIPHASE.MOVEMENT) {
            throw new ActionException(ACTION_ERROR_CODE.MINIPHASE_NOT_BATTLE);
        }

        if (Object.values(data.artifactsWithNewPosition).length !== Object.values(gameState.player.artifacts).length) {
            throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
        }
        
        const countArtifactsFront = Object.values(data.artifactsWithNewPosition).filter(a => a.line === LINE.FRONT).length;
        const countArtifactsBack = Object.values(data.artifactsWithNewPosition).filter(a => a.line === LINE.BACK).length;
        
        if (countArtifactsFront > MAX_COUNT_ARTIFACTS_ON_LINE || countArtifactsBack > MAX_COUNT_ARTIFACTS_ON_LINE) {
            throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
        }
        
        const backPositionsIndex: number[] = [];
        const frontPositionsIndex: number[] = [];

        Object.keys(data.artifactsWithNewPosition).forEach(artifactGameId => {
            const realArtifact = gameState.player.artifacts[artifactGameId];
            const newArtifact = data.artifactsWithNewPosition[artifactGameId];

            if (!realArtifact) {
                throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
            }

            const allKeys = Object.keys(realArtifact) as (keyof ArtifactGameState)[];
            
            for (const key of allKeys) {
                if (EXCLUDED_FIELDS.includes(key)) continue;
                
                if (!this.isEqual(realArtifact[key], newArtifact[key])) {
                    throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
                }
            }

            if (newArtifact.line === LINE.FRONT) {
                if (newArtifact.position < 0 || newArtifact.position > countArtifactsFront - 1) {
                    throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
                }

                if (frontPositionsIndex.includes(newArtifact.position)) {
                    throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
                }

                frontPositionsIndex.push(newArtifact.position)
            }
            else if (newArtifact.line === LINE.BACK) {
                if (newArtifact.position < 0 || newArtifact.position > countArtifactsBack - 1) {
                    throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
                }

                if (backPositionsIndex.includes(newArtifact.position)) {
                    throw new ActionException(ACTION_ERROR_CODE.INVALID_DATA);
                }

                backPositionsIndex.push(newArtifact.position)
            } 
        });
    }

    private isEqual(value1: any, value2: any): boolean {
        if (value1 === value2) return true;
        
        if (value1 == null || value2 == null) return value1 === value2;
        
        if (Array.isArray(value1) && Array.isArray(value2)) {
            if (value1.length !== value2.length) return false;
            
            const sorted1 = [...value1].sort();
            const sorted2 = [...value2].sort();
            
            return sorted1.every((item, index) => this.isEqual(item, sorted2[index]));
        }
        
        if (typeof value1 === 'object' && typeof value2 === 'object') {
            const keys1 = Object.keys(value1);
            const keys2 = Object.keys(value2);
            
            if (keys1.length !== keys2.length) return false;
            
            return keys1.every(key => this.isEqual(value1[key], value2[key]));
        }
        
        return false;
    }
}
