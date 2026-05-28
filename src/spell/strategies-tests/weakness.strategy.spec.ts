import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { WeaknessStrategy } from '../strategies/weakness.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { RESOURCE } from '../../game-mechanics/types/resource';

describe('WeaknessStrategy', () => {
    let strategy: WeaknessStrategy;
    let combatService: jest.Mocked<CombatService>;
    let resourceService: jest.Mocked<ResourceService>;

    const createMockArtifact = (id: string) => ({
        id,
        artifactId: 'test_artifact',
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
        artifacts: {
            'artifact-1': createMockArtifact('artifact-1'),
        },
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

    const mockCombatService = {
        calculateDamage: jest.fn(),
        applyDamage: jest.fn(),
        calculateFaceDamage: jest.fn(),
        calculateHeal: jest.fn(),
        applyHealing: jest.fn(),
    };

    const mockResourceService = {
        decreaseResource: jest.fn(),
        addResource: jest.fn(),
        addResourceNewRound: jest.fn(),
        calculateNewTurnMovePoints: jest.fn(),
        extraMove: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WeaknessStrategy,
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
                {
                    provide: ResourceService,
                    useValue: mockResourceService,
                },
            ],
        }).compile();

        strategy = module.get<WeaknessStrategy>(WeaknessStrategy);
        combatService = module.get(CombatService);
        resourceService = module.get(ResourceService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSpellType', () => {
        it('should return WEAKNESS', () => {
            expect(strategy.getSpellType()).toBe(SPELL.WEAKNESS);
        });
    });

    describe('execute', () => {
        let gameState: GameForLogic;
        let player: Player;
        let data: UseSpellData;
        let animations: AnimationData[];
        let logParts: string[];

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            data = {
                spellId: SPELL.WEAKNESS as any,
                gameId: 'game-123',
                targets: [[], []],
            };
            animations = [];
            logParts = [];
        });

        it('should decrease enemy rage by 30', () => {
            strategy.execute(gameState, player, data, animations, logParts);

            expect(resourceService.decreaseResource).toHaveBeenCalledWith(
                gameState.enemy,
                RESOURCE.RAGE,
                30,
                logParts,
            );
        });
    });
});
