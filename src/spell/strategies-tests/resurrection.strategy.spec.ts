import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { ArtifactStateService } from '../../game-mechanics/artifact-state.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { ResurrectionStrategy } from '../strategies/resurrection.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

describe('ResurrectionStrategy', () => {
    let strategy: ResurrectionStrategy;
    let combatService: jest.Mocked<CombatService>;
    let artifactStateService: jest.Mocked<ArtifactStateService>;

    const createMockArtifact = (id: string, currentHp: number = 0) => ({
        id,
        artifactId: 'test_artifact',
        face: 'sword',
        state: ARTIFACT_STATE.BREAKEN,
        currentHp,
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
        artifacts: {
            'artifact-1': createMockArtifact('artifact-1', 0),
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

    const mockCombatService = {
        calculateDamage: jest.fn(),
        applyDamage: jest.fn(),
        calculateFaceDamage: jest.fn(),
        calculateHeal: jest.fn(),
        applyHealing: jest.fn(),
    };

    const mockArtifactStateService = {
        applyState: jest.fn(),
        clearDestroyedArtifacts: jest.fn(),
        updateStateNewRound: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResurrectionStrategy,
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
                {
                    provide: ArtifactStateService,
                    useValue: mockArtifactStateService,
                },
            ],
        }).compile();

        strategy = module.get<ResurrectionStrategy>(ResurrectionStrategy);
        combatService = module.get(CombatService);
        artifactStateService = module.get(ArtifactStateService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSpellType', () => {
        it('should return RESURRECTION', () => {
            expect(strategy.getSpellType()).toBe(SPELL.RESURRECTION);
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
                spellId: SPELL.RESURRECTION as any,
                gameId: 'game-123',
                targets: [['artifact-1'], []],
            };
            animations = [];
            logParts = [];
        });

        it('should resurrect artifact and set HP to 15', () => {
            const artifact = player.artifacts['artifact-1'];

            strategy.execute(gameState, player, data, animations, logParts);

            expect(artifactStateService.applyState).toHaveBeenCalledWith(
                artifact,
                ARTIFACT_STATE.COOLDOWN,
                logParts,
            );
            expect(artifact.currentHp).toBe(15);
            expect(animations[0]).toEqual({
                playerId: player.id,
                artifactGameId: artifact.id,
                animation: ANIMATION.HEAL,
                value: 15,
            });
        });
    });
});
