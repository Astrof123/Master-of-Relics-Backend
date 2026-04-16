import { COMMON_ERROR_CODE, CommonException } from "src/common/utils/error-handler";
import { Inject, Injectable } from "@nestjs/common";
import { SpellStrategy } from "./types/strategy";
import { Spell } from "./types/spell";
import { SPELL_TYPE_KEY } from "./constants/settings";

@Injectable()
export class SpellStrategyFactory {
    private strategies = new Map<Spell, SpellStrategy>();

    constructor(
        @Inject(SPELL_TYPE_KEY)
        private handlers: SpellStrategy[]
    ) {
        this.buildHandlersMap();
    }

    private buildHandlersMap(): void {
        this.strategies = new Map(
            this.handlers.map(handler => [handler.getSpellType(), handler])
        );
    }

    getStrategy(type: Spell): SpellStrategy {
        const strategy = this.strategies.get(type);
        if (!strategy) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
        return strategy;
    }
}