import { Injectable } from '@nestjs/common';
import { EXTRA_ACTIONS } from 'src/action/constants/extra-actions';
import { ExtraActionService } from 'src/action/extra-action.service';
import { ExtraActionDataType, ExtraActionState } from 'src/action/types/action';
import { RESTRICTION } from 'src/action/types/restriction';
import { FACES } from 'src/game-mechanics/constants/faces';
import { ARTIFACT_STATE, ArtifactAvailableActions, ArtifactGameState, Line, LINE, Player, SkillStateType } from 'src/game-state/types/game';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ARTIFACTS } from './constants/artifacts';
import { SKILLS } from './constants/skills';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { ActionValidatorService } from 'src/action/action-validator.service';
import { RestrictionService } from 'src/action/restriction.service';

@Injectable()
export class ArtifactService {
    constructor(
        private readonly extraActionService: ExtraActionService,
        private readonly restrictionService: RestrictionService,
    ) {}

    calculateAvailableActions(gameState: GameForLogic, player: Player, enemy: Player) {
        for (const [key, artifact] of Object.entries(player.artifacts)) {
            const face = this.getFaceAction(artifact, player, enemy);
            if (artifact.state === ARTIFACT_STATE.BREAKEN) {
                artifact.availableActions = {
                    face: face,
                    skills: [],
                    extraActions: []
                };
                continue;
            }

            const extraActions = this.extraActionService.getExtraActions(player, enemy, artifact);
            const skills = this.getSkills(player, enemy, artifact)

            let availableActions: ArtifactAvailableActions = {
                face: face,
                skills: skills,
                extraActions: extraActions
            };

            artifact.availableActions = availableActions;
        }

        player.temporaryArtifacts = player.artifacts;
    }

    getFaceAction(artifact: ArtifactGameState, player: Player, enemy: Player) {
        let attackTargets: string[] | null = null; 
        let healTargets: string[] | null = null;

        if (FACES[artifact.face].sword !== 0) {
            attackTargets = this.getSwordAttackTargets(enemy.artifacts);
        }
        else if (FACES[artifact.face].target !== 0) {
            attackTargets = this.getBowAttackTargets(enemy.artifacts);
        }

        if (FACES[artifact.face].heal !== 0) {
            healTargets = this.getHealTargets(player.artifacts);
        }

        const face = {
            id: artifact.face,
            description: FACES[artifact.face].description,
            attackTargets: attackTargets,
            healTargets: healTargets
        }

        return face;
    }

    getSwordAttackTargets(artifacts: Record<string, ArtifactGameState>): string[] {
        const attackTarget: string[] = []; 
        let haveFrontArtifact = Object.values(artifacts).find(art => art.line === LINE.FRONT && art.state !== ARTIFACT_STATE.BREAKEN);

        for (const [key, enemyArtifact] of Object.entries(artifacts)) {
            if (enemyArtifact.state === ARTIFACT_STATE.BREAKEN) {
                continue;
            }

            if (!haveFrontArtifact) {
                attackTarget.push(enemyArtifact.id);
                continue;
            }

            if (enemyArtifact.line === LINE.FRONT) {
                attackTarget.push(enemyArtifact.id);
            }
        }

        return attackTarget;
    }

    getBowAttackTargets(artifacts: Record<string, ArtifactGameState>): string[] {
        const attackTarget: string[] = [];

        for (const [key, enemyArtifact] of Object.entries(artifacts)) {
            if (enemyArtifact.state === ARTIFACT_STATE.BREAKEN) {
                continue;
            }

            attackTarget.push(enemyArtifact.id);
        }

        return attackTarget;
    }

    getHealTargets(artifacts: Record<string, ArtifactGameState>): string[] {
        const healTargets: string[] = [];

        for (const [key, artifact] of Object.entries(artifacts)) {
            if (artifact.currentHp < artifact.maxHp) {
                if (artifact.state === ARTIFACT_STATE.BREAKEN) {
                    continue;
                }

                healTargets.push(artifact.id);
            }
        }

        return healTargets;
    }

    getSkills(player: Player, enemy: Player, artifact: ArtifactGameState): SkillStateType[] {
        const skills: SkillStateType[] = [];

        if (ARTIFACTS[artifact.artifactId].skills === null || ARTIFACTS[artifact.artifactId].skills?.length === 0) {
            return [];
        }

        ARTIFACTS[artifact.artifactId].skills?.forEach((skill) => {
            const skillData = SKILLS[skill];

            if (player.resources[RESOURCE.RAGE] >= skillData.cost) {
                if (this.restrictionService.checkGeneralRestrictions(player, enemy, skillData.restrictions)) {
                    if (this.restrictionService.checkArtifactRestrictions(skillData.restrictions, artifact)) {
                        const possibleTargets = this.restrictionService.getTargetsByRestrictions(player, enemy, skillData.targetRestrictions);

                        skills.push({
                            id: skillData.id,
                            description: skillData.description,
                            countAnyTarget: skillData.countAnyTarget,
                            countTargetEnemy: skillData.countTargetEnemy,
                            countTargetAllies: skillData.countTargetAllies,
                            possibleTargets: possibleTargets
                        })
                    }     
                }
            }
        })

        return skills;
    }

    moveArtifact(positionInsert: number, artifactInsert: ArtifactGameState, newLine: Line, artifacts: Record<string, ArtifactGameState>) {
        for (const [key, artifact] of Object.entries(artifacts)) {
            if (artifact.position > artifactInsert.position && artifact.line === artifactInsert.line) {
                artifact.position -= 1;
            }
        }

        for (const [key, artifact] of Object.entries(artifacts)) {
            if (artifact.position >= positionInsert && artifact.line === newLine) {
                artifact.position += 1;
            }
        }

        artifactInsert.position = positionInsert;
        artifactInsert.line = newLine;
    }
}
