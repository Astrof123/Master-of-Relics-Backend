import { Test, TestingModule } from '@nestjs/testing';
import { RustingStrategy } from '../strategies/rusting.strategy';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
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

describe('RustingStrategy', () => {
    let strategy: RustingStrategy;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let combatService: jest.Mocked<CombatService>;

    const createMockArtifact = (
        id: string,
        maxHp: number = 30,
        currentHp: number = 30,
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
            'ally-artifact': createMockArtifact('ally-artifact', 30, 25),
            'enemy-artifact': createMockArtifact('enemy-artifact', 30, 20),
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

    const mockGameEffectsService = {
        applyEffect: jest.fn(),
        removeEffect: jest.fn(),
        countEffect: jest.fn(),
        getEffect: jest.fn(),
        getHeroEffects: jest.fn(),
        applyHeroEffect: jest.fn(),
        removeHeroEffect: jest.fn(),
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
                RustingStrategy,
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
            ],
        }).compile();

        strategy = module.get<RustingStrategy>(RustingStrategy);
        gameEffectsService = module.get(GameEffectsService);
        combatService = module.get(CombatService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return RUSTING', () => {
            expect(strategy.getSkillType()).toBe(SKILL.RUSTING);
        });
    });

    describe('execute', () => {
        let gameState: GameForLogic;
        let player: Player;
        let artifact: ArtifactGameState;
        let animations: AnimationData[];
        let logParts: string[];

        beforeEach(() => {
            gameState = createMockGameState();
            player = gameState.player;
            artifact = createMockArtifact('artifact-1');
            animations = [];
            logParts = [];
        });

        it('should decrease ally artifact max HP', () => {
            const data: UseSkillData = {
                skillId: SKILL.RUSTING,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [['ally-artifact'], []],
            };

            const allyArtifact = player.artifacts['ally-artifact'];
            const oldMaxHp = allyArtifact.maxHp;

            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(allyArtifact.maxHp).toBe(oldMaxHp - 10);
        });

        it('should decrease enemy artifact max HP', () => {
            const data: UseSkillData = {
                skillId: SKILL.RUSTING,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], ['enemy-artifact']],
            };

            const enemyArtifact = gameState.enemy.artifacts['enemy-artifact'];
            const oldMaxHp = enemyArtifact.maxHp;

            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(enemyArtifact.maxHp).toBe(oldMaxHp - 10);
        });

        it('should adjust current HP if exceeds new max HP', () => {
            const data: UseSkillData = {
                skillId: SKILL.RUSTING,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [['ally-artifact'], []],
            };

            const allyArtifact = player.artifacts['ally-artifact'];
            allyArtifact.maxHp = 25;
            allyArtifact.currentHp = 30;

            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(allyArtifact.maxHp).toBe(15);
            expect(allyArtifact.currentHp).toBe(15);
        });
    });
});
