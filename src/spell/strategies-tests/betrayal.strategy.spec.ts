import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { ArtifactService } from '../../artifact/artifact.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { BetrayalStrategy } from '../strategies/betrayal.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { DAMAGE } from '../../game-mechanics/types/combat';

jest.mock('crypto', () => ({
    randomInt: jest.fn(() => 0),
}));

describe('BetrayalStrategy', () => {
    let strategy: BetrayalStrategy;
    let combatService: jest.Mocked<CombatService>;
    let artifactService: jest.Mocked<ArtifactService>;

    const createMockArtifact = (id: string, isBroken: boolean = false) => ({
        id,
        artifactId: 'test_artifact',
        face: 'sword',
        state: isBroken ? ARTIFACT_STATE.BREAKEN : ARTIFACT_STATE.READY_TO_USE,
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
            'enemy-artifact': createMockArtifact('enemy-artifact'),
            'left-neighbor': createMockArtifact('left-neighbor'),
            'right-neighbor': createMockArtifact('right-neighbor'),
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

    const mockArtifactService = {
        getNeighbors: jest.fn(),
        getFaceAction: jest.fn(),
        createArtifactState: jest.fn(),
        spawnArtifact: jest.fn(),
        destroyArtifact: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BetrayalStrategy,
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
                {
                    provide: ArtifactService,
                    useValue: mockArtifactService,
                },
            ],
        }).compile();

        strategy = module.get<BetrayalStrategy>(BetrayalStrategy);
        combatService = module.get(CombatService);
        artifactService = module.get(ArtifactService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSpellType', () => {
        it('should return BETRAYAL', () => {
            expect(strategy.getSpellType()).toBe(SPELL.BETRAYAL);
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
                spellId: SPELL.BETRAYAL as any,
                gameId: 'game-123',
                targets: [[], ['enemy-artifact']],
            };
            animations = [];
            logParts = [];

            mockArtifactService.getNeighbors.mockReturnValue({
                left: gameState.enemy.artifacts['left-neighbor'],
                right: gameState.enemy.artifacts['right-neighbor'],
            });
            mockCombatService.calculateFaceDamage.mockReturnValue(25);
            mockCombatService.applyDamage.mockReturnValue(undefined);
        });

        it('should make enemy artifact attack its neighbor', () => {
            strategy.execute(gameState, player, data, animations, logParts);

            expect(mockArtifactService.getNeighbors).toHaveBeenCalledWith(
                gameState.enemy,
                gameState.enemy.artifacts['enemy-artifact'],
            );
            expect(mockCombatService.calculateFaceDamage).toHaveBeenCalled();
            expect(mockCombatService.applyDamage).toHaveBeenCalled();
            expect(animations[0]).toEqual({
                playerId: gameState.enemy.id,
                artifactGameId: 'left-neighbor',
                animation: ANIMATION.HIT,
                value: 25,
            });
        });
    });
});
