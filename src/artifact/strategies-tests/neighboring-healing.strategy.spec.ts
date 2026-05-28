import { Test, TestingModule } from '@nestjs/testing';
import { NeighboringHealingStrategy } from '../strategies/neighboring-healing.strategy';
import { CombatService } from '../../game-mechanics/combat.service';
import { ArtifactService } from '../artifact.service';
import {
    ArtifactGameState,
    Player,
    ARTIFACT_STATE,
    LINE,
} from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';

describe('NeighboringHealingStrategy', () => {
    let strategy: NeighboringHealingStrategy;
    let combatService: jest.Mocked<CombatService>;
    let artifactService: jest.Mocked<ArtifactService>;

    const createMockArtifact = (
        id: string,
        currentHp: number = 20,
        maxHp: number = 30,
    ): ArtifactGameState => ({
        id,
        artifactId: 'test_artifact',
        face: 'sword',
        state: ARTIFACT_STATE.READY_TO_USE,
        currentHp,
        maxHp,
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
            'artifact-1': createMockArtifact('artifact-1', 20, 30),
            'left-neighbor': createMockArtifact('left-neighbor', 15, 30),
            'right-neighbor': createMockArtifact('right-neighbor', 10, 30),
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
        calculateHeal: jest.fn(),
        applyHealing: jest.fn(),
        calculateDamage: jest.fn(),
        applyDamage: jest.fn(),
        calculateFaceDamage: jest.fn(),
    };

    const mockArtifactService = {
        getNeighbors: jest.fn(),
        moveArtifact: jest.fn(),
        createArtifactState: jest.fn(),
        spawnArtifact: jest.fn(),
        destroyArtifact: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NeighboringHealingStrategy,
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

        strategy = module.get<NeighboringHealingStrategy>(
            NeighboringHealingStrategy,
        );
        combatService = module.get(CombatService);
        artifactService = module.get(ArtifactService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return NEIGHBORING_HEALING', () => {
            expect(strategy.getSkillType()).toBe(SKILL.NEIGHBORING_HEALING);
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
            artifact = player.artifacts['artifact-1'];
            data = {
                skillId: SKILL.NEIGHBORING_HEALING,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
            logParts = [];

            mockArtifactService.getNeighbors.mockReturnValue({
                left: player.artifacts['left-neighbor'],
                right: player.artifacts['right-neighbor'],
            });
            mockCombatService.calculateHeal.mockReturnValue(15);
            mockCombatService.applyHealing.mockReturnValue(undefined);
        });

        it('should heal left neighbor', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(combatService.calculateHeal).toHaveBeenCalledWith(
                player.artifacts['left-neighbor'],
                15,
            );
            expect(combatService.applyHealing).toHaveBeenCalledWith(
                player.artifacts['left-neighbor'],
                15,
                logParts,
            );
        });

        it('should heal right neighbor', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(combatService.calculateHeal).toHaveBeenCalledWith(
                player.artifacts['right-neighbor'],
                15,
            );
            expect(combatService.applyHealing).toHaveBeenCalledWith(
                player.artifacts['right-neighbor'],
                15,
                logParts,
            );
        });

        it('should add heal animations for both neighbors', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(animations).toHaveLength(2);
            expect(animations[0]).toEqual({
                playerId: player.id,
                artifactGameId: 'left-neighbor',
                animation: ANIMATION.HEAL,
                value: 15,
            });
            expect(animations[1]).toEqual({
                playerId: player.id,
                artifactGameId: 'right-neighbor',
                animation: ANIMATION.HEAL,
                value: 15,
            });
        });
    });
});
