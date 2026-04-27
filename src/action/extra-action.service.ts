import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { ARTIFACT_STATE, ArtifactGameState, Player } from "src/game-state/types/game";
import { EXTRA_ACTION, ExtraAction, ExtraActionDataType, ExtraActionState } from "./types/action";
import { EXTRA_ACTIONS } from "./constants/extra-actions";
import { RESTRICTION } from "./types/restriction";
import { GameForLogic } from "src/game-state/types/game-for-logic";
import { ExtraActionData } from "./types/action-evens-data";
import { AnimationData } from "./types/animation";
import { DiceService } from "src/game-mechanics/dice.service";
import { ResourceService } from "src/game-mechanics/resource.service";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { ActionValidatorService } from "./action-validator.service";
import { RestrictionService } from "./restriction.service";
import { ArtifactService } from 'src/artifact/artifact.service';
import { RESOURCE } from "src/game-mechanics/types/resource";

type ExtraActionHandler = (
    gameState: GameForLogic,
    artifact: ArtifactGameState,
    data: ExtraActionData,
    animations: AnimationData[],
    logParts: string[]
) => void;

@Injectable()
export class ExtraActionService {
    private handlers: Record<ExtraAction, ExtraActionHandler>;
    
    constructor(
        private readonly diceService: DiceService,
        private readonly resourceService: ResourceService,
        private readonly artifactStateService: ArtifactStateService,
        private readonly restrictionService: RestrictionService,
        @Inject(forwardRef(() => ArtifactService))
        private readonly artifactService: ArtifactService,
    ) {
        this.handlers = {
            [EXTRA_ACTION.THROW_DICE]: this.handleThrowDice.bind(this),
            [EXTRA_ACTION.EXTRA_MOVE]: this.handleExtraMove.bind(this),
            [EXTRA_ACTION.RETURN_TO_BATTLE]: this.handleReturnToBattle.bind(this),
            [EXTRA_ACTION.MOVE]: this.handleMove.bind(this),
            [EXTRA_ACTION.REMOVE_ROOT]: this.handleRemoveRoot.bind(this),
            [EXTRA_ACTION.DESTROY_ARTIFACT]: this.handleDestroyArtifact.bind(this)
        };
    }

    getHandler(extraAction: ExtraAction) {
        return this.handlers[extraAction];
    }

    getExtraActions(player: Player, enemy: Player, artifact: ArtifactGameState): ExtraActionState[] {
        const extraActions: ExtraActionState[] = [];

        for (const [key, action] of Object.entries(EXTRA_ACTIONS)) {
            if (player.resources[action.resourceType] >= action.cost 
                && this.restrictionService.checkGeneralRestrictions(player, enemy, action.restrictions)
                && this.restrictionService.checkArtifactRestrictions(action.restrictions, artifact)) {

                extraActions.push({
                    id: action.id,
                    description: action.getDescription(action.cost)
                })
            }
        }

        return extraActions;
    }

    handleThrowDice(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData, animations: AnimationData[], logParts: string[]) {
        this.diceService.throwDice(gameState.player, artifact.id, artifact.artifactId, logParts);
    }

    handleExtraMove(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData, animations: AnimationData[], logParts: string[]) {
        this.resourceService.extraMove(gameState.player, logParts);
    }

    handleReturnToBattle(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData, animations: AnimationData[], logParts: string[]) {
        this.diceService.throwDice(gameState.player, artifact.id, artifact.artifactId, logParts);
        this.artifactStateService.applyState(gameState.player, artifact.id, ARTIFACT_STATE.READY_TO_USE, logParts);
    }

    handleMove(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData, animations: AnimationData[], logParts: string[]) {
        this.artifactService.moveArtifact(data.details!.newPosition, artifact, data.details!.newLine, gameState.player.artifacts, logParts);
    }

    handleRemoveRoot(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData, animations: AnimationData[], logParts: string[]) {
        const state = artifact.extraData.lastStateBeforeRoot;
        this.artifactStateService.applyState(gameState.player, artifact.id, state, logParts);
    }

    handleDestroyArtifact(gameState: GameForLogic, artifact: ArtifactGameState, data: ExtraActionData, animations: AnimationData[], logParts: string[]) {
        const countArtifactOnSameLine = Object.values(gameState.player.artifacts).filter(a => a.line === artifact.line).length;
        this.artifactService.moveArtifact(countArtifactOnSameLine - 1, artifact, artifact.line, gameState.player.artifacts, logParts);
        delete gameState.player.artifacts[artifact.id];
        this.resourceService.addResource(gameState.player, RESOURCE.AGILITY, 30, logParts);
        this.resourceService.addResource(gameState.player, RESOURCE.RAGE, 30, logParts);
    }
}