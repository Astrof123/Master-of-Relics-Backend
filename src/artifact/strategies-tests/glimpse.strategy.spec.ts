import { Test, TestingModule } from '@nestjs/testing';
import { GlimpseStrategy } from '../strategies/glimpse.strategy';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import {
    ArtifactGameState,
    Player,
    ARTIFACT_STATE,
    LINE,
} from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { EFFECT } from '../../game-mechanics/types/effect';

jest.mock('../../game-mechanics/constants/effects', () => ({
    EFFECTS: {
        glimpse: { id: 'glimpse', name: 'Glimpse' },
    },
}));

describe('GlimpseStrategy', () => {
    let strategy: GlimpseStrategy;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let resourceService: jest.Mocked<ResourceService>;

    const createMockArtifact = (
        id: string = 'artifact-1',
    ): ArtifactGameState => ({
        id,
        artifactId: 'glimpse',
        face: 'sword',
        state: ARTIFACT_STATE.READY_TO_USE,
        currentHp: 30,
        maxHp: 30,
        position: 1,
        line: LINE.FRONT,
        skillCost: 2,
        effects: [],
        availableActions: null,
        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
    });

    const createMockPlayer = (): Player => ({
        id: 'player-1',
        name: 'Player1',
        connection: 'online',
        isBot: false,
        hero: 'Empty',
        resources: {
            agility: 50,
            rage: 30,
            light_mana: 20,
            dark_mana: 10,
            destruction_mana: 5,
        },
        artifacts: {},
        spells: {} as any,
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
    });

    const createMockGameState = (): GameForLogic => ({
        id: 'game-123',
        phase: 'battle',
        name: 'Test Game',
        currentTurn: 'player-1',
        logs: [],
        player: createMockPlayer(),
        enemy: createMockPlayer(),
        end: null,
        miniPhase: 'movement',
        constants: {
            maxCountArtifactsOnLine: 6,
            timerDraft: null,
            timerMovement: null,
            timerTurn: null,
            isNewRound: false,
            countActionsFromStartGame: 0,
        },
    });

    const mockGameEffectsService = {
        countEffect: jest.fn().mockReturnValue(0),
        applyEffect: jest.fn(),
        removeEffect: jest.fn(),
        getEffect: jest.fn(),
        getHeroEffects: jest.fn(),
        applyHeroEffect: jest.fn(),
        removeHeroEffect: jest.fn(),
    };

    const mockResourceService = {
        decreaseResource: jest.fn(),
        addResource: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GlimpseStrategy,
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
                {
                    provide: ResourceService,
                    useValue: mockResourceService,
                },
            ],
        }).compile();

        strategy = module.get<GlimpseStrategy>(GlimpseStrategy);
        gameEffectsService = module.get(GameEffectsService);
        resourceService = module.get(ResourceService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return GLIMPSE', () => {
            expect(strategy.getSkillType()).toBe(SKILL.GLIMPSE);
        });
    });

    describe('execute', () => {
        let gameState: GameForLogic;
        let player: Player;
        let artifact: ArtifactGameState;
        let data: UseSkillData;
        let animations: AnimationData[];
        let logParts: string[];

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            artifact = createMockArtifact();
            data = {
                skillId: SKILL.GLIMPSE,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
            logParts = [];
        });

        it('should apply glimpse effect if not already present and not exhausted', () => {
            const {
                EFFECTS,
            } = require('../../game-mechanics/constants/effects');

            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(gameEffectsService.applyEffect).toHaveBeenCalledWith(
                artifact,
                EFFECTS['glimpse'],
                logParts,
            );
        });

        it('should not apply glimpse effect if already present', () => {
            gameEffectsService.countEffect.mockImplementation(
                (artifact, effect) => {
                    if (effect === EFFECT.GLIMPSE) return 1;
                    return 0;
                },
            );

            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(gameEffectsService.applyEffect).not.toHaveBeenCalled();
        });

        it('should not apply glimpse effect if exhausted', () => {
            gameEffectsService.countEffect.mockImplementation(
                (artifact, effect) => {
                    if (effect === EFFECT.EXHAUSTION) return 1;
                    return 0;
                },
            );

            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(gameEffectsService.applyEffect).not.toHaveBeenCalled();
        });
    });
});
