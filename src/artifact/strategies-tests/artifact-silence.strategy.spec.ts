// strategies-tests/artifact-silence.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
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
import { ArtifactSilenceStrategy } from '../strategies/artifact-silence.strategy';

// Mock EFFECTS
jest.mock('../../game-mechanics/constants/effects', () => ({
    EFFECTS: {
        artifact_silence: { id: 'artifact_silence', name: 'Artifact Silence' },
    },
}));

describe('ArtifactSilenceStrategy', () => {
    let strategy: ArtifactSilenceStrategy;
    let gameEffectsService: jest.Mocked<GameEffectsService>;

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

    const mockGameEffectsService = {
        applyEffect: jest.fn(),
        removeEffect: jest.fn(),
        countEffect: jest.fn(),
        getEffect: jest.fn(),
        getHeroEffects: jest.fn(),
        applyHeroEffect: jest.fn(),
        removeHeroEffect: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ArtifactSilenceStrategy,
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
            ],
        }).compile();

        strategy = module.get<ArtifactSilenceStrategy>(ArtifactSilenceStrategy);
        gameEffectsService = module.get(GameEffectsService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return ARTIFACT_SILENCE', () => {
            expect(strategy.getSkillType()).toBe(SKILL.ARTIFACT_SILENCE);
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
                skillId: SKILL.ARTIFACT_SILENCE,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], ['enemy-artifact']],
            };
            animations = [];
            logParts = [];
        });

        it('should apply artifact silence effect to enemy artifact', () => {
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
                gameState.enemy.artifacts['enemy-artifact'],
                EFFECTS['artifact_silence'],
                logParts,
            );
        });
    });
});
