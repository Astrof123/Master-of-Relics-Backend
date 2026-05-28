import { Test, TestingModule } from '@nestjs/testing';
import { StealDestructionManaStrategy } from '../strategies/steal-destruction-mana.strategy';
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
import { RESOURCE } from '../../game-mechanics/types/resource';

describe('StealDestructionManaStrategy', () => {
    let strategy: StealDestructionManaStrategy;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let resourceService: jest.Mocked<ResourceService>;

    const createMockArtifact = (): ArtifactGameState => ({
        id: 'artifact-1',
        artifactId: 'plunder',
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

    const createMockPlayer = (id: string): Player => ({
        id,
        name: `Player${id}`,
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
        player: createMockPlayer('player-1'),
        enemy: createMockPlayer('player-2'),
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
        applyEffect: jest.fn(),
        removeEffect: jest.fn(),
        countEffect: jest.fn(),
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
                StealDestructionManaStrategy,
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

        strategy = module.get<StealDestructionManaStrategy>(
            StealDestructionManaStrategy,
        );
        gameEffectsService = module.get(GameEffectsService);
        resourceService = module.get(ResourceService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return STEAL_DESTRUCTION_MANA', () => {
            expect(strategy.getSkillType()).toBe(SKILL.STEAL_DESTRUCTION_MANA);
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
                skillId: SKILL.STEAL_DESTRUCTION_MANA,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
            logParts = [];
        });

        it('should decrease enemy destruction mana by 10', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(resourceService.decreaseResource).toHaveBeenCalledWith(
                gameState.enemy,
                RESOURCE.DESTRUCTION_MANA,
                10,
                logParts,
            );
        });

        it('should add 10 destruction mana to player', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(resourceService.addResource).toHaveBeenCalledWith(
                player,
                RESOURCE.DESTRUCTION_MANA,
                10,
                logParts,
            );
        });
    });
});
