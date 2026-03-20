import { COMMON_ERROR_CODE, CommonException } from "src/common/utils/error-handler";
import { Skill, SKILL_TYPE_KEY } from "./types/skill";
import { SkillStrategy } from "./types/strategy";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class SkillsStrategyFactory {
    private strategies = new Map<Skill, SkillStrategy>();

    constructor(
        @Inject(SKILL_TYPE_KEY)
        private handlers: SkillStrategy[]
    ) {
        this.buildHandlersMap();
    }

    private buildHandlersMap(): void {
        this.strategies = new Map(
            this.handlers.map(handler => [handler.getActionType(), handler])
        );
    }

    getStrategy(type: Skill): SkillStrategy {
        const strategy = this.strategies.get(type);
        if (!strategy) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
        return strategy;
    }
}