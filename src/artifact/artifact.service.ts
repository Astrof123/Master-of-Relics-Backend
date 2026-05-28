import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { EXTRA_ACTIONS } from 'src/action/constants/extra-actions';
import { ExtraActionService } from 'src/action/extra-action.service';
import { ExtraActionDataType, ExtraActionState } from 'src/action/types/action';
import {
    RESTRICTION,
    TARGET_RESTRICTION,
    TargetRestriction,
} from 'src/action/types/restriction';
import { FACES } from 'src/game-mechanics/constants/faces';
import {
    ARTIFACT_STATE,
    ArtifactAvailableActions,
    ArtifactGameState,
    Line,
    LINE,
    Player,
    SkillStateType,
} from 'src/game-state/types/game';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ARTIFACTS } from './constants/artifacts';
import { SKILLS } from './constants/skills';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { ActionValidatorService } from 'src/action/action-validator.service';
import { RestrictionService } from 'src/action/restriction.service';
import { LogHelper } from 'src/action/helpers/logHelper';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { EFFECT, EffectType } from 'src/game-mechanics/types/effect';
import {
    ARTIFACT,
    Artifact,
    ArtifactNeighbors,
    SPAWN_POSITION,
    SpawnPosition,
} from './types/artifact';
import { v4 as uuidv4 } from 'uuid';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { randomInt } from 'crypto';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';

@Injectable()
export class ArtifactService {
    constructor(
        @Inject(forwardRef(() => ExtraActionService))
        private readonly extraActionService: ExtraActionService,
        @Inject(forwardRef(() => RestrictionService))
        private readonly restrictionService: RestrictionService,
        @Inject(forwardRef(() => GameEffectsService))
        private readonly gameEffectsService: GameEffectsService,
        @Inject(forwardRef(() => ArtifactStateService))
        private readonly artifactStateService: ArtifactStateService,
    ) {}

    calculateAvailableActions(
        gameState: GameForLogic,
        player: Player,
        enemy: Player,
    ) {
        for (const [key, artifact] of Object.entries(player.artifacts)) {
            const face = this.getFaceAction(artifact, player, enemy);
            const extraActions = this.extraActionService.getExtraActions(
                player,
                enemy,
                artifact,
            );
            const skills = this.getSkills(player, enemy, artifact);

            const availableActions: ArtifactAvailableActions = {
                face: face,
                skills: skills,
                extraActions: extraActions,
            };

            artifact.availableActions = availableActions;
            let artifactSkillCost: number | null = null;
            if (
                ARTIFACTS[artifact.artifactId].skills &&
                ARTIFACTS[artifact.artifactId].skills!.length > 0
            ) {
                const skill = ARTIFACTS[artifact.artifactId].skills![0];
                artifactSkillCost = SKILLS[skill].cost;
            }

            if (artifact.skillCost !== null && artifactSkillCost !== null) {
                let cost = artifactSkillCost;
                const countDiscount = this.gameEffectsService.countHeroEffect(
                    player,
                    EFFECT.RAGE_DISCOUNT,
                );
                cost -= countDiscount >= 1 ? 5 : 0;
                cost = cost > 0 ? cost : 0;
                artifact.skillCost = cost;
            }
        }
    }

    getFaceAction(artifact: ArtifactGameState, player: Player, enemy: Player) {
        const targetRestrictions: TargetRestriction[] = [];

        let isAttack = false;
        let isHeal = false;
        if (FACES[artifact.face].sword !== 0) {
            targetRestrictions.push(TARGET_RESTRICTION.ALIVE);
            targetRestrictions.push(TARGET_RESTRICTION.MELEE_ENEMY);
            isAttack = true;
        } else if (FACES[artifact.face].target !== 0) {
            targetRestrictions.push(TARGET_RESTRICTION.ALIVE);
            targetRestrictions.push(TARGET_RESTRICTION.ANY_ENEMY);
            isAttack = true;
        }

        if (FACES[artifact.face].heal !== 0) {
            targetRestrictions.push(TARGET_RESTRICTION.ALIVE);
            targetRestrictions.push(
                TARGET_RESTRICTION.ANY_ALLY,
                TARGET_RESTRICTION.NEED_HEAL_ALLY,
            );
            isHeal = true;
        }

        const possibleTargets =
            this.restrictionService.getTargetsByRestrictions(
                player,
                enemy,
                targetRestrictions,
            );

        if (
            this.gameEffectsService.countEffect(artifact, EFFECT.BLINDLESS) > 0
        ) {
            possibleTargets[1] = [];
        }

        const face = {
            id: artifact.face,
            description: FACES[artifact.face].description,
            attackTargets: isAttack ? possibleTargets[1] : null,
            healTargets: isHeal ? possibleTargets[0] : null,
        };

        return face;
    }

    getSkills(
        player: Player,
        enemy: Player,
        artifact: ArtifactGameState,
    ): SkillStateType[] {
        const skills: SkillStateType[] = [];

        if (
            ARTIFACTS[artifact.artifactId].skills === null ||
            ARTIFACTS[artifact.artifactId].skills?.length === 0
        ) {
            return [];
        }

        if (
            this.gameEffectsService.countEffect(
                artifact,
                EFFECT.ARTIFACT_SILENCE,
            ) > 0
        ) {
            return [];
        }

        ARTIFACTS[artifact.artifactId].skills?.forEach((skill) => {
            const skillData = SKILLS[skill];

            if (skillData.type === 'passive') {
                return;
            }

            let cost = skillData.cost!;
            const countDiscount = this.gameEffectsService.countHeroEffect(
                player,
                EFFECT.RAGE_DISCOUNT,
            );
            cost -= countDiscount >= 1 ? 5 : 0;

            if (player.resources[RESOURCE.RAGE] >= cost) {
                if (
                    this.restrictionService.checkGeneralRestrictions(
                        player,
                        enemy,
                        skillData.restrictions,
                    )
                ) {
                    if (
                        this.restrictionService.checkArtifactRestrictions(
                            skillData.restrictions,
                            player,
                            artifact,
                        )
                    ) {
                        const targetRestrictions = skillData.targetRestrictions;
                        const possibleTargets =
                            this.restrictionService.getTargetsByRestrictions(
                                player,
                                enemy,
                                targetRestrictions,
                            );

                        skills.push({
                            id: skillData.id,
                            description: skillData.description,
                            countAnyTarget: skillData.countAnyTarget,
                            countTargetEnemy: skillData.countTargetEnemy,
                            countTargetAllies: skillData.countTargetAllies,
                            possibleTargets: possibleTargets,
                        });
                    }
                }
            }
        });

        return skills;
    }

    moveArtifact(
        positionInsert: number,
        artifactInsert: ArtifactGameState,
        newLine: Line,
        artifacts: Record<string, ArtifactGameState>,
        logParts: string[],
    ) {
        for (const [key, artifact] of Object.entries(artifacts)) {
            if (
                artifact.position > artifactInsert.position &&
                artifact.line === artifactInsert.line
            ) {
                artifact.position -= 1;
            }
        }

        for (const [key, artifact] of Object.entries(artifacts)) {
            if (
                artifact.position >= positionInsert &&
                artifact.line === newLine
            ) {
                artifact.position += 1;
            }
        }

        artifactInsert.position = positionInsert;
        artifactInsert.line = newLine;

        logParts.push(
            LogHelper.getMoveArtifactLog(
                ARTIFACTS[artifactInsert.artifactId].name,
                positionInsert,
                newLine,
            ),
        );
    }

    getNeighbors(player: Player, artifactState: ArtifactGameState) {
        const neighbors: ArtifactNeighbors = {
            left: null,
            right: null,
        };

        for (const artifact of Object.values(player.artifacts)) {
            if (artifact.line === artifactState.line) {
                if (artifact.position - artifactState.position === 1) {
                    neighbors.right = artifact;
                } else if (artifact.position - artifactState.position === -1) {
                    neighbors.left = artifact;
                }
            }
        }

        return neighbors;
    }

    spawnArtifact(
        artifactInsert: ArtifactGameState,
        position: SpawnPosition,
        spawnerPosition: number | null,
        spawnerLine: Line | null,
        artifacts: Record<string, ArtifactGameState>,
        logParts: string[],
    ) {
        let positionInsert;
        let line;

        if (position === SPAWN_POSITION.FRONT_LINE) {
            positionInsert = Object.values(artifacts).filter(
                (a) => a.line === LINE.FRONT,
            ).length;
            line = LINE.FRONT;
        } else if (position === SPAWN_POSITION.BACK_LINE) {
            positionInsert = Object.values(artifacts).filter(
                (a) => a.line === LINE.BACK,
            ).length;
            line = LINE.BACK;
        } else if (
            position === SPAWN_POSITION.NEAR &&
            spawnerLine &&
            spawnerPosition !== null
        ) {
            if (spawnerPosition === 0) {
                positionInsert = 1;
            } else if (spawnerPosition === MAX_COUNT_ARTIFACTS_ON_LINE - 1) {
                positionInsert = MAX_COUNT_ARTIFACTS_ON_LINE - 2;
            } else {
                const random = randomInt(0, 2);
                positionInsert =
                    random === 0 ? spawnerPosition : spawnerPosition + 1;
            }

            line = spawnerLine;
        }

        for (const [key, artifact] of Object.entries(artifacts)) {
            if (artifact.position >= positionInsert && artifact.line === line) {
                artifact.position += 1;
            }
        }

        artifactInsert.position = positionInsert;
        artifactInsert.line = line;
        artifacts[artifactInsert.id] = artifactInsert;

        logParts.push(
            LogHelper.getSpawnArtifactLog(
                ARTIFACTS[artifactInsert.artifactId].name,
                positionInsert,
                line,
            ),
        );
    }

    createArtifactState(
        playerArtifacts: Record<string, ArtifactGameState>,
        artifactId: Artifact,
    ) {
        const artifactGameId = uuidv4();
        const artifactEffects: EffectType[] = [];

        ARTIFACTS[artifactId].defaultEffects.forEach((effect) => {
            artifactEffects.push({
                id: effect,
                name: EFFECTS[effect].name,
                duration: EFFECTS[effect].duration,
                type: EFFECTS[effect].type,
                number: EFFECTS[effect].number,
                dispellType: EFFECTS[effect].dispellType,
            });
        });

        let artifactSkillCost: number | null = null;
        if (
            ARTIFACTS[artifactId].skills &&
            ARTIFACTS[artifactId].skills.length > 0
        ) {
            const skill = ARTIFACTS[artifactId].skills[0];
            artifactSkillCost = SKILLS[skill].cost;
        }

        const randomFace = randomInt(0, 5);

        const artifactPlayer: ArtifactGameState = {
            id: artifactGameId,
            artifactId: artifactId,
            face: ARTIFACTS[artifactId].faces[randomFace],
            state: ARTIFACT_STATE.READY_TO_USE,
            skillCost: artifactSkillCost,
            currentHp: ARTIFACTS[artifactId].hp,
            maxHp: ARTIFACTS[artifactId].hp,
            position:
                Object.values(playerArtifacts).length %
                MAX_COUNT_ARTIFACTS_ON_LINE,
            line:
                Object.values(playerArtifacts).length <
                MAX_COUNT_ARTIFACTS_ON_LINE
                    ? LINE.BACK
                    : LINE.FRONT,
            effects: artifactEffects,
            availableActions: null,
            extraData: {
                lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE,
            },
        };

        return artifactPlayer;
    }

    destroyArtifact(
        player: Player,
        artifact: ArtifactGameState,
        logParts: string[],
    ) {
        const countArtifactOnSameLine = Object.values(player.artifacts).filter(
            (a) => a.line === artifact.line,
        ).length;
        this.moveArtifact(
            countArtifactOnSameLine - 1,
            artifact,
            artifact.line,
            player.artifacts,
            [],
        );
        this.artifactStateService.applyState(
            artifact,
            ARTIFACT_STATE.DESTROYED,
            [],
        );
        logParts.push(
            LogHelper.getDestroyArtifactLog(
                ARTIFACTS[artifact.artifactId].name,
            ),
        );
    }

    generateNewTemporaryForBot(enemy: Player) {
        const temporaryArtifacts: Record<string, ArtifactGameState> = {};
        for (const art of Object.values(enemy.artifacts)) {
            const randomLine = randomInt(0, 2);
            const artCopy: ArtifactGameState = JSON.parse(JSON.stringify(art));
            const backArtifactsCount = Object.values(temporaryArtifacts).filter(
                (a) => a.line === LINE.BACK,
            ).length;
            const frontArtifactsCount = Object.values(
                temporaryArtifacts,
            ).filter((a) => a.line === LINE.FRONT).length;

            if (
                randomLine === 0 &&
                backArtifactsCount < MAX_COUNT_ARTIFACTS_ON_LINE
            ) {
                artCopy.line = LINE.BACK;
                artCopy.position = backArtifactsCount;
            } else {
                artCopy.line = LINE.FRONT;
                artCopy.position = frontArtifactsCount;
            }

            temporaryArtifacts[art.id] = artCopy;
        }

        return temporaryArtifacts;
    }
}
