import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { ArtifactService } from '../../artifact/artifact.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { MeteorShowerStrategy } from '../strategies/meteor-shower.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { DAMAGE } from '../../game-mechanics/types/combat';

describe('MeteorShowerStrategy', () => {
    let strategy: MeteorShowerStrategy;
    let combatService: jest.Mocked<CombatService>;
    let artifactService: jest.Mocked<ArtifactService>;

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
                MeteorShowerStrategy,
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

        strategy = module.get<MeteorShowerStrategy>(MeteorShowerStrategy);
        combatService = module.get(CombatService);
        artifactService = module.get(ArtifactService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSpellType', () => {
        it('should return METEOR_SHOWER', () => {
            expect(strategy.getSpellType()).toBe(SPELL.METEOR_SHOWER);
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
                spellId: SPELL.METEOR_SHOWER as any,
                gameId: 'game-123',
                targets: [[], ['enemy-artifact']],
            };
            animations = [];
            logParts = [];

            mockArtifactService.getNeighbors.mockReturnValue({
                left: gameState.enemy.artifacts['left-neighbor'],
                right: gameState.enemy.artifacts['right-neighbor'],
            });
            mockCombatService.calculateDamage.mockReturnValue(20);
            mockCombatService.applyDamage.mockReturnValue(undefined);
        });

        it('should damage left and right neighbors of target enemy artifact', () => {
            strategy.execute(gameState, player, data, animations, logParts);

            expect(mockArtifactService.getNeighbors).toHaveBeenCalledWith(
                gameState.enemy,
                gameState.enemy.artifacts['enemy-artifact'],
            );
            expect(mockCombatService.calculateDamage).toHaveBeenCalledTimes(2);
            expect(mockCombatService.applyDamage).toHaveBeenCalledTimes(2);
            expect(animations).toHaveLength(2);
        });
    });
});
