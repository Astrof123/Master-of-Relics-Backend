import { Injectable } from '@nestjs/common';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ARTIFACT_STATE, ArtifactGameState, LogState } from 'src/game-state/types/game';
import { ExtraActionData, ToggleReadyMovementData, UseFaceData, UseSkillData, UseSpellData } from './types/action-evens-data';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { MINIPHASE } from 'src/game-state/types/phase';
import { ResourceService } from 'src/game-mechanics/resource.service';
import { FACES } from 'src/game-mechanics/constants/faces';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { CombatService } from 'src/game-mechanics/combat.service';
import { DAMAGE } from 'src/game-mechanics/types/combat';
import { ArtifactStateService } from 'src/game-mechanics/artifact-state.service';
import { ANIMATION, AnimationData } from './types/animation';
import { EXTRA_ACTIONS } from './constants/extra-actions';
import { PhaseService } from 'src/phase/phase.service';
import { SkillsStrategyFactory } from 'src/artifact/skills.factory';
import { ExtraActionService } from './extra-action.service';
import { SKILLS } from 'src/artifact/constants/skills';
import { SpellStrategyFactory } from 'src/spell/spell.factory';
import { SpellHelper } from 'src/spell/spell.helper';
import { SPELLS } from 'src/spell/constants/spells';
import { GameStateService } from 'src/game-state/game-state.service';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { LogHelper } from './helpers/logHelper';
import { LOG_TYPE } from './types/log';
import { GameTimerService } from 'src/game-state/game-timer.service';
import { TIMER_TYPE } from 'src/game-state/types/timer';

@Injectable()
export class ActionResolverService {
    constructor(
        private readonly resourceService: ResourceService,
        private readonly combatService: CombatService,
        private readonly artifactStateService: ArtifactStateService,
        private readonly phaseService: PhaseService,
        private readonly skillsFactory: SkillsStrategyFactory,
        private readonly spellsFactory: SpellStrategyFactory,
        private readonly extraActionService: ExtraActionService,
        private readonly gameTimerService: GameTimerService
    ) {}

    useFaceResolve(gameState: GameForLogic, artifact: ArtifactGameState, data: UseFaceData, animations: AnimationData[]) {
        const faceData = FACES[artifact.face];
        const artifactName = ARTIFACTS[artifact.artifactId].name;
        const logParts: string[] = [`${gameState.player.name} использовал грань артефакта "${artifactName}"`];
        
        const restoredResources: string[] = [];
        if (faceData.agility !== 0) {
            this.resourceService.addResource(gameState.player, RESOURCE.AGILITY, faceData.agility, []);
            restoredResources.push(LogHelper.getRestoreAgilityLog(faceData.agility));
        }
        if (faceData.rage !== 0) {
            this.resourceService.addResource(gameState.player, RESOURCE.RAGE, faceData.rage, []);
            restoredResources.push(LogHelper.getRestoreRageLog(faceData.rage));
        }
        if (faceData.light_mana !== 0) {
            this.resourceService.addResource(gameState.player, RESOURCE.LIGHT_MANA, faceData.light_mana, []);
            restoredResources.push(LogHelper.getRestoreLightManaLog(faceData.light_mana));
        }
        if (faceData.dark_mana !== 0) {
            this.resourceService.addResource(gameState.player, RESOURCE.DARK_MANA, faceData.dark_mana, []);
            restoredResources.push(LogHelper.getRestoreDarkManaLog(faceData.dark_mana));
        }
        if (faceData.destruction_mana !== 0) {
            this.resourceService.addResource(gameState.player, RESOURCE.DESTRUCTION_MANA, faceData.destruction_mana, []);
            restoredResources.push(LogHelper.getRestoreDestructionManaLog(faceData.destruction_mana));
        }
        
        if (restoredResources.length > 0) {
            logParts.push(`Восстановил: ${restoredResources.join(', ')}`);
        }
        
        if (artifact.availableActions === null || artifact.availableActions.face === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
        
        const face = artifact.availableActions.face;
        
        if (face.attackTargets !== null && face.attackTargets.length > 0 && data.attackTarget !== undefined) {
            const damageType = faceData.sword > 0 ? DAMAGE.MELEE : DAMAGE.RANGED;
            const attackedArtifact = gameState.enemy.artifacts[data.attackTarget!];
            const attackedArtifactName = ARTIFACTS[attackedArtifact.artifactId].name;
            const damage = this.combatService.calculateFaceDamage(gameState.player, data.artifactGameId, damageType);
            
            this.combatService.applyDamage(gameState.enemy, data.attackTarget!, damage, damageType, logParts);
            
            animations.push({
                playerId: gameState.enemy.id,
                artifactGameId: data.attackTarget!,
                animation: ANIMATION.HIT,
                value: damage
            });
        }

        if (face.healTargets !== null && face.healTargets.length > 0 && data.healTarget !== undefined) {
            const heal = this.combatService.calculateFaceHeal(gameState.player, data.healTarget!, data.artifactGameId);
            const healedArtifact = gameState.player.artifacts[data.healTarget!];
            const healedArtifactName = ARTIFACTS[healedArtifact.artifactId].name;
            
            this.combatService.applyHealing(gameState.player, data.healTarget!, heal, logParts);            
            animations.push({
                playerId: gameState.player.id,
                artifactGameId: data.healTarget!,
                animation: ANIMATION.HEAL,
                value: heal
            });
        }
        
        const logItem: LogState = {
            text: logParts.join('. ') + '.',
            type: LOG_TYPE.FACE
        }

        gameState.logs.push(logItem);
        gameState.player.movePoints -= 1;
        this.artifactStateService.applyState(gameState.player, data.artifactGameId, ARTIFACT_STATE.COOLDOWN, []);
    }

    async endTurnResolve(gameState: GameForLogic) {
        const logItem: LogState = {
            text: `${gameState.player.name} закончил ход.`,
            type: LOG_TYPE.SYSTEM
        }

        gameState.logs.push(logItem);

        if (gameState.enemy.isReady) {
            gameState.currentTurn = gameState.player.id;
            gameState.player.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.enemy);
            await this.phaseService.calculateNewState(gameState, false);
        }
        else {
            gameState.currentTurn = gameState.enemy.id;
            gameState.enemy.movePoints = this.resourceService.calculateNewTurnMovePoints(gameState.enemy);
            await this.phaseService.calculateNewState(gameState, true);
        }
    }

    async giveUpResolve(gameState: GameForLogic) {
        const logItem: LogState = {
            text: `${gameState.player.name} сдался.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

        await this.phaseService.setEndGame(gameState, gameState.enemy.id);
        await this.gameTimerService.stopAllTimers(gameState.id);
    }

    async autoGiveUpResolve(gameState: GameForLogic) {
        const logItem: LogState = {
            text: `${gameState.player.name} проиграл из-за пропуска ходов.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

        await this.phaseService.setEndGame(gameState, gameState.enemy.id);
        await this.gameTimerService.stopAllTimers(gameState.id);
    }

    async cancelDrawResolve(gameState: GameForLogic) {
        const logItem: LogState = {
            text: `${gameState.player.name} отменил ничью.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

        gameState.player.offerDraw = false;
        gameState.enemy.offerDraw = false;
    }

    async offerDrawResolve(gameState: GameForLogic) {
        const logItem: LogState = {
            text: `${gameState.player.name} предложил ничью.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

        gameState.player.offerDraw = true;

        if (gameState.enemy.offerDraw) {
            await this.phaseService.setEndGame(gameState, null);
        }
    }

    useSkillResolve(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[]) {
        const strategy = this.skillsFactory.getStrategy(data.skillId);
        const artifactName = ARTIFACTS[artifact.artifactId].name;
        const logParts: string[] = [`${gameState.player.name} использовал способность артефакта "${artifactName}"`];

        strategy.execute(gameState, artifact, data, animations, logParts);
    
        gameState.player.movePoints -= 1;
        gameState.player.resources[RESOURCE.RAGE] -= SKILLS[data.skillId].cost;

        const logItem: LogState = {
            text: logParts.join('. ') + '.',
            type: LOG_TYPE.SKILL
        }
        gameState.logs.push(logItem);
    }

    useSpellResolve(gameState: GameForLogic, data: UseSpellData, animations: AnimationData[]) {
        const spell = SPELLS[data.spellId];
        const strategy = this.spellsFactory.getStrategy(data.spellId);
        const logParts: string[] = [`${gameState.player.name} использовал заклинание "${spell.name}"`];
        strategy.execute(gameState, data, animations, logParts);

        gameState.player.movePoints -= 1;
        
        let neededResource = SpellHelper.getResource(spell.type);
        this.resourceService.decreaseResource(gameState.player, neededResource, SPELLS[data.spellId].cost, logParts);
        gameState.player.spells[spell.type][spell.id].cooldown = true;

        const logItem: LogState = {
            text: logParts.join('. ') + '.',
            type: LOG_TYPE.SPELL
        }
        gameState.logs.push(logItem);
    }

    async endRoundResolve(gameState: GameForLogic) {
        await this.endTurnResolve(gameState);
        gameState.player.isReady = true;
        const logItem: LogState = {
            text: `${gameState.player.name} закончил раунд.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

        if (gameState.enemy.isReady) {
            await this.phaseService.newRound(gameState);
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

        const logParts: string[] = [`${gameState.player.name} использовал "${EXTRA_ACTIONS[data.type].name}"`];
        handler(gameState, artifact, data, animations, logParts);
        
        const cost = EXTRA_ACTIONS[data.type].cost;
        const resourceType = EXTRA_ACTIONS[data.type].resourceType;
        this.resourceService.decreaseResource(gameState.player, resourceType, cost, logParts);

        const logItem: LogState = {
            text: logParts.join('. ') + '.',
            type: LOG_TYPE.EXTRA_ACTION
        }
        gameState.logs.push(logItem);
    }

    async toggleReadyMovementResolve(
        gameState: GameForLogic, 
        data: ToggleReadyMovementData
    ): Promise<boolean> {
        gameState.player.temporaryArtifacts = data.artifactsWithNewPosition;
        gameState.player.isReady = !gameState.player.isReady;
        const logItem: LogState = {
            text: `${gameState.player.name} ${gameState.player.isReady ? "закончил": "продолжил"} перестановку.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

        const bothReady = gameState.enemy.isReady && gameState.player.isReady;
        
        if (bothReady) {
            gameState.miniPhase = MINIPHASE.BATTLE;
            gameState.player.artifacts = data.artifactsWithNewPosition;
            gameState.enemy.artifacts = gameState.enemy.temporaryArtifacts!;
            gameState.enemy.isReady = false;
            gameState.player.isReady = false;
            if (gameState.currentTurn === gameState.player.id) {
                await this.phaseService.calculateNewState(gameState, false);
            }
            else {
                await this.phaseService.calculateNewState(gameState, true);
            }
            const logItem: LogState = {
                text: "Фаза перестановки окончена.",
                type: LOG_TYPE.SYSTEM
            }
            gameState.logs.push(logItem);

            return true;
        }
        
        return false;
    }

    async autoToggleReadyMovementResolve(
        gameState: GameForLogic,
    ): Promise<boolean> {
        gameState.player.isReady = true;
        const logItem: LogState = {
            text: `${gameState.player.name} ${gameState.player.isReady ? "закончил": "продолжил"} перестановку.`,
            type: LOG_TYPE.SYSTEM
        }
        gameState.logs.push(logItem);

        const bothReady = gameState.enemy.isReady && gameState.player.isReady;
        
        if (bothReady) {
            gameState.miniPhase = MINIPHASE.BATTLE;
            gameState.player.artifacts = gameState.player.temporaryArtifacts;
            gameState.enemy.artifacts = gameState.enemy.temporaryArtifacts!;
            gameState.enemy.isReady = false;
            gameState.player.isReady = false;
            if (gameState.currentTurn === gameState.player.id) {
                await this.phaseService.calculateNewState(gameState, false);
            }
            else {
                await this.phaseService.calculateNewState(gameState, true);
            }
            const logItem: LogState = {
                text: "Фаза перестановки окончена.",
                type: LOG_TYPE.SYSTEM
            }
            gameState.logs.push(logItem);

            return true;
        }
        
        return false;
    }
}
