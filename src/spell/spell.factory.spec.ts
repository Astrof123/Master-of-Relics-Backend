import { Test, TestingModule } from '@nestjs/testing';
import { SpellStrategyFactory } from './spell.factory';
import { SpellStrategy } from './types/strategy';
import { Spell, SPELL } from './types/spell';
import { SPELL_TYPE_KEY } from './constants/settings';

class MockPiercingBoltStrategy implements SpellStrategy {
    getSpellType(): Spell {
        return SPELL.PIERCING_BOLT;
    }
    execute = jest.fn();
}

class MockTouchOfLightStrategy implements SpellStrategy {
    getSpellType(): Spell {
        return SPELL.TOUCH_OF_LIGHT;
    }
    execute = jest.fn();
}

class MockBetrayalStrategy implements SpellStrategy {
    getSpellType(): Spell {
        return SPELL.BETRAYAL;
    }
    execute = jest.fn();
}

describe('SpellStrategyFactory', () => {
    let factory: SpellStrategyFactory;
    const mockStrategies = [
        new MockPiercingBoltStrategy(),
        new MockTouchOfLightStrategy(),
        new MockBetrayalStrategy(),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SpellStrategyFactory,
                {
                    provide: SPELL_TYPE_KEY,
                    useValue: mockStrategies,
                },
            ],
        }).compile();

        factory = module.get<SpellStrategyFactory>(SpellStrategyFactory);
    });

    it('should be defined', () => {
        expect(factory).toBeDefined();
    });

    describe('getStrategy', () => {
        it('should return strategy for PIERCING_BOLT', () => {
            const strategy = factory.getStrategy(SPELL.PIERCING_BOLT);
            expect(strategy).toBe(mockStrategies[0]);
        });

        it('should return strategy for TOUCH_OF_LIGHT', () => {
            const strategy = factory.getStrategy(SPELL.TOUCH_OF_LIGHT);
            expect(strategy).toBe(mockStrategies[1]);
        });

        it('should return strategy for BETRAYAL', () => {
            const strategy = factory.getStrategy(SPELL.BETRAYAL);
            expect(strategy).toBe(mockStrategies[2]);
        });

        it('should throw error for unknown spell type', () => {
            expect(() =>
                factory.getStrategy('unknown_spell' as Spell),
            ).toThrow();
        });
    });
});
