// strategies-tests/dream.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactStateService } from '../../game-mechanics/artifact-state.service';
import { CombatService } from '../../game-mechanics/combat.service';
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
import { DreamStrategy } from '../strategies/dream.strategy';

describe('DreamStrategy', () => {
    let strategy: DreamStrategy;
    let artifactStateService: jest.Mocked<ArtifactStateService>;
    let combatService: jest.Mocked<CombatService>;

    const createMockArtifact = (
        id: string = 'enemy-artifact',
    ): ArtifactGameState => ({
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

    const mockArtifactStateService = {
        applyState: jest.fn(),
        clearDestroyedArtifacts: jest.fn(),
        updateStateNewRound: jest.fn(),
    };

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
                DreamStrategy,
                {
                    provide: ArtifactStateService,
                    useValue: mockArtifactStateService,
                },
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
            ],
        }).compile();

        strategy = module.get<DreamStrategy>(DreamStrategy);
        artifactStateService = module.get(ArtifactStateService);
        combatService = module.get(CombatService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return DREAM', () => {
            expect(strategy.getSkillType()).toBe(SKILL.DREAM);
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
            artifact = gameState.player.artifacts['enemy-artifact'];
            data = {
                skillId: SKILL.DREAM,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], ['enemy-artifact']],
            };
            animations = [];
            logParts = [];
        });

        it('should apply DREAM state to enemy artifact', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(artifactStateService.applyState).toHaveBeenCalledWith(
                gameState.enemy.artifacts['enemy-artifact'],
                ARTIFACT_STATE.DREAM,
                logParts,
            );
        });
    });
});
