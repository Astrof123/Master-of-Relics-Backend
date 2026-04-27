import { Injectable } from "@nestjs/common";
import { Player } from "src/game-state/types/game";
import { EffectType } from "./types/effect";
import { LogHelper } from "src/action/helpers/logHelper";
import { ARTIFACTS } from "src/artifact/constants/artifacts";

Injectable()
export class GameEffectsService {
    constructor() {}

    applyEffect(player: Player, artifactGameId: string, effect: EffectType, logParts: string[]) {
        player.artifacts[artifactGameId].effects.push(effect);

        logParts.push(LogHelper.getAppliedEffectLog(effect, ARTIFACTS[player.artifacts[artifactGameId].artifactId].name))
    }
}