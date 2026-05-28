import { Test, TestingModule } from '@nestjs/testing';
import { SkillsStrategyFactory } from './skills.factory';
import { SkillStrategy } from './types/strategy';
import { Skill, SKILL } from './types/skill';
import { SKILL_TYPE_KEY } from './constants/settings';
import {
    CommonException,
    COMMON_ERROR_CODE,
} from '../common/utils/error-handler';

// Mock strategies
class MockFearStrategy implements SkillStrategy {
    getSkillType(): Skill {
        return SKILL.FEAR;
    }
    execute = jest.fn();
    death = jest.fn();
}

class MockFrozeStrategy implements SkillStrategy {
    getSkillType(): Skill {
        return SKILL.FROZE;
    }
    execute = jest.fn();
    death = jest.fn();
}

class MockSwiftStrategy implements SkillStrategy {
    getSkillType(): Skill {
        return SKILL.SWIFT;
    }
    execute = jest.fn();
    death = jest.fn();
}

class MockNeighboringHealingStrategy implements SkillStrategy {
    getSkillType(): Skill {
        return SKILL.NEIGHBORING_HEALING;
    }
    execute = jest.fn();
    death = jest.fn();
}

describe('SkillsStrategyFactory', () => {
    let factory: SkillsStrategyFactory;
    const mockStrategies = [
        new MockFearStrategy(),
        new MockFrozeStrategy(),
        new MockSwiftStrategy(),
        new MockNeighboringHealingStrategy(),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SkillsStrategyFactory,
                {
                    provide: SKILL_TYPE_KEY,
                    useValue: mockStrategies,
                },
            ],
        }).compile();

        factory = module.get<SkillsStrategyFactory>(SkillsStrategyFactory);
    });

    it('should be defined', () => {
        expect(factory).toBeDefined();
    });

    describe('getStrategy', () => {
        it('should return strategy for FEAR', () => {
            const strategy = factory.getStrategy(SKILL.FEAR);
            expect(strategy).toBe(mockStrategies[0]);
        });

        it('should return strategy for FROZE', () => {
            const strategy = factory.getStrategy(SKILL.FROZE);
            expect(strategy).toBe(mockStrategies[1]);
        });

        it('should return strategy for SWIFT', () => {
            const strategy = factory.getStrategy(SKILL.SWIFT);
            expect(strategy).toBe(mockStrategies[2]);
        });

        it('should return strategy for NEIGHBORING_HEALING', () => {
            const strategy = factory.getStrategy(SKILL.NEIGHBORING_HEALING);
            expect(strategy).toBe(mockStrategies[3]);
        });

        it('should throw CommonException for unknown skill type', () => {
            expect(() => factory.getStrategy('unknown_skill' as Skill)).toThrow(
                CommonException,
            );
            expect(() => factory.getStrategy('unknown_skill' as Skill)).toThrow(
                expect.objectContaining({
                    code: COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR,
                }),
            );
        });
    });

    describe('factory initialization', () => {
        it('should build handlers map on construction', () => {
            const strategies = (factory as any).strategies;

            expect(strategies.get(SKILL.FEAR)).toBe(mockStrategies[0]);
            expect(strategies.get(SKILL.FROZE)).toBe(mockStrategies[1]);
            expect(strategies.get(SKILL.SWIFT)).toBe(mockStrategies[2]);
            expect(strategies.get(SKILL.NEIGHBORING_HEALING)).toBe(
                mockStrategies[3],
            );
            expect(strategies.size).toBe(mockStrategies.length);
        });
    });

    describe('edge cases', () => {
        it('should handle empty strategies list', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SkillsStrategyFactory,
                    {
                        provide: SKILL_TYPE_KEY,
                        useValue: [],
                    },
                ],
            }).compile();

            const emptyFactory = module.get<SkillsStrategyFactory>(
                SkillsStrategyFactory,
            );

            expect(() => emptyFactory.getStrategy(SKILL.FEAR)).toThrow(
                CommonException,
            );
        });

        it('should handle duplicate strategies (last one wins)', async () => {
            const duplicateStrategies = [
                new MockFearStrategy(),
                new MockFearStrategy(), // Duplicate
            ];

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SkillsStrategyFactory,
                    {
                        provide: SKILL_TYPE_KEY,
                        useValue: duplicateStrategies,
                    },
                ],
            }).compile();

            const duplicateFactory = module.get<SkillsStrategyFactory>(
                SkillsStrategyFactory,
            );
            const strategies = (duplicateFactory as any).strategies;

            // Map will overwrite with the last strategy
            expect(strategies.get(SKILL.FEAR)).toBe(duplicateStrategies[1]);
        });
    });
});
