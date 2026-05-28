import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { TouchOfLightStrategy } from '../strategies/touch-of-light.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

describe('TouchOfLightStrategy', () => {
    let strategy: TouchOfLightStrategy;
    let combatService: jest.Mocked<CombatService>;

    const createMockArtifact = (id: string, currentHp: number = 30) => ({
        id,
        artifactId: 'test_artifact',
        face: 'sword',
        state: ARTIFACT_STATE.READY_TO_USE,
        currentHp,
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
            'player-artifact': createMockArtifact('player-artifact', 20),
            'enemy-artifact': createMockArtifact('enemy-artifact', 30),
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

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TouchOfLightStrategy,
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
            ],
        }).compile();

        strategy = module.get<TouchOfLightStrategy>(TouchOfLightStrategy);
        combatService = module.get(CombatService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSpellType', () => {
        it('should return TOUCH_OF_LIGHT', () => {
            expect(strategy.getSpellType()).toBe(SPELL.TOUCH_OF_LIGHT);
        });
    });

    describe('execute', () => {
        let gameState: GameForLogic;
        let player: Player;
        let animations: AnimationData[];
        let logParts: string[];

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            animations = [];
            logParts = [];

            mockCombatService.calculateHeal.mockReturnValue(20);
            mockCombatService.calculateDamage.mockReturnValue(10);
        });

        it('should heal ally artifact when targeting ally', () => {
            const data: UseSpellData = {
                spellId: SPELL.TOUCH_OF_LIGHT as any,
                gameId: 'game-123',
                targets: [['player-artifact'], []],
            };

            strategy.execute(gameState, player, data, animations, logParts);

            expect(combatService.calculateHeal).toHaveBeenCalledWith(
                player.artifacts['player-artifact'],
                20,
            );
            expect(combatService.applyHealing).toHaveBeenCalledWith(
                player.artifacts['player-artifact'],
                20,
                logParts,
            );
            expect(animations[0]).toEqual({
                playerId: player.id,
                artifactGameId: 'player-artifact',
                animation: ANIMATION.HEAL,
                value: 20,
            });
        });

        it('should damage enemy artifact when targeting enemy', () => {
            const data: UseSpellData = {
                spellId: SPELL.TOUCH_OF_LIGHT as any,
                gameId: 'game-123',
                targets: [[], ['enemy-artifact']],
            };

            strategy.execute(gameState, player, data, animations, logParts);

            expect(combatService.calculateDamage).toHaveBeenCalledWith(
                gameState.enemy.artifacts['enemy-artifact'],
                10,
                expect.any(String),
            );
            expect(combatService.applyDamage).toHaveBeenCalled();
            expect(animations[0]).toEqual({
                playerId: gameState.enemy.id,
                artifactGameId: 'enemy-artifact',
                animation: ANIMATION.HIT,
                value: 10,
            });
        });
    });
});
