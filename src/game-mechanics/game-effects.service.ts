import { Injectable } from "@nestjs/common";
import { Player } from "src/game-state/types/game";
import { EffectType } from "./types/effect";

Injectable()
export class GameEffectsService {
    constructor() {}

    applyEffect(player: Player, artifactGameId: string, effect: EffectType) {
        player.artifacts[artifactGameId].effects.push(effect);
    }

    
}