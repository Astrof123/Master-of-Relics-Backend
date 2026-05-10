import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { EFFECT } from 'src/game-mechanics/types/effect';
import { EXTRA_ACTION } from './types/action';

@Injectable()
export class ActionResolverService {
    constructor(
        @Inject(forwardRef(() => ResourceService))
        private readonly resourceService: ResourceService,
        @Inject(forwardRef(() => CombatService))
        private readonly combatService: CombatService,
        @Inject(forwardRef(() => ArtifactStateService))
        private readonly artifactStateService: ArtifactStateService,
        @Inject(forwardRef(() => PhaseService))
        private readonly phaseService: PhaseService,
        @Inject(forwardRef(() => SkillsStrategyFactory))
        private readonly skillsFactory: SkillsStrategyFactory,
        @Inject(forwardRef(() => SpellStrategyFactory))
        private readonly spellsFactory: SpellStrategyFactory,
        private readonly extraActionService: ExtraActionService,
        @Inject(forwardRef(() => GameTimerService))
        private readonly gameTimerService: GameTimerService,
        @Inject(forwardRef(() => GameEffectsService)) 
        private readonly gameEffectsService: GameEffectsService
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
        const usedArtifact = gameState.player.artifacts[data.artifactGameId];
        
        if (face.attackTargets !== null && face.attackTargets.length > 0 && data.attackTarget !== undefined) {
            const damageType = faceData.sword > 0 ? DAMAGE.MELEE : DAMAGE.RANGED;
            
            const attackedArtifact = gameState.enemy.artifacts[data.attackTarget!];
            const damage = this.combatService.calculateFaceDamage(
                gameState.player, 
                gameState.enemy, 
                usedArtifact,
                attackedArtifact!,
                damageType
            );
            
            this.combatService.applyDamage(gameState, gameState.enemy, usedArtifact, attackedArtifact, damage, damageType, logParts);
            
            animations.push({
                playerId: gameState.enemy.id,
                artifactGameId: data.attackTarget!,
                animation: ANIMATION.HIT,
                value: damage
            });
        }

        if (face.healTargets !== null && face.healTargets.length > 0 && data.healTarget !== undefined) {
            const healedArtifact = gameState.player.artifacts[data.healTarget!];
            const heal = this.combatService.calculateFaceHeal(healedArtifact, usedArtifact);
            
            this.combatService.applyHealing(healedArtifact, heal, logParts);            
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
        this.artifactStateService.applyState(usedArtifact, ARTIFACT_STATE.COOLDOWN, []);
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

        strategy.execute(gameState, gameState.player, artifact, data, animations, logParts);
    
        gameState.player.movePoints -= 1;
        this.resourceService.decreaseResource(gameState.player, RESOURCE.RAGE, artifact.skillCost!, logParts);

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
        strategy.execute(gameState, gameState.player, data, animations, logParts);

        gameState.player.movePoints -= 1;
        
        let neededResource = SpellHelper.getResource(spell.type);

        let cost = gameState.player.spells[SPELLS[data.spellId].type][data.spellId].cost;
        if (this.gameEffectsService.countHeroEffect(gameState.player, EFFECT.FREE_SPELL) > 0) {
            cost = 0;
            this.gameEffectsService.removeHeroEffect(
                gameState.player, 
                EFFECTS[EFFECT.FREE_SPELL], 
                logParts
            )
        }

        this.resourceService.decreaseResource(
            gameState.player, 
            neededResource,
            cost,
            logParts
        );

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
        
        let cost = EXTRA_ACTIONS[data.type].cost;
        if (this.gameEffectsService.countEffect(artifact, EFFECT.GLIMPSE) > 0) {
            if (data.type === EXTRA_ACTION.MOVE) {
                cost = 0;
            }
            else if (data.type === EXTRA_ACTION.RETURN_TO_BATTLE) {
                cost = 15;
            }
        }

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
        console.log(bothReady)
        
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
