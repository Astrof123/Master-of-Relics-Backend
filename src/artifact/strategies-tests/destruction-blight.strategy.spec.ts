import { Test, TestingModule } from '@nestjs/testing';
import { DestructionBlightStrategy } from '../strategies/destruction-blight.strategy';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { EFFECT } from '../../game-mechanics/types/effect';

jest.mock('../../game-mechanics/constants/effects', () => ({
  EFFECTS: {
    'destruction_blight': { id: 'destruction_blight', name: 'Destruction Blight' },
  },
}));

describe('DestructionBlightStrategy', () => {
  let strategy: DestructionBlightStrategy;
  let gameEffectsService: jest.Mocked<GameEffectsService>;

  const createMockArtifact = (id: string = 'artifact-1'): ArtifactGameState => ({
    id,
    artifactId: 'test_artifact',
    face: 'sword' as any,
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
    resources: { agility: 50, rage: 30, light_mana: 20, dark_mana: 10, destruction_mana: 5 },
    artifacts: {
      'artifact-1': createMockArtifact('artifact-1'),
    },
    spells: { light: {}, dark: {}, destruction: {} },
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
    constants: { maxCountArtifactsOnLine: 6, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false, countActionsFromStartGame: 0 },
  });

  const mockGameEffectsService = {
    applyHeroEffect: jest.fn(),
    applyEffect: jest.fn(),
    removeEffect: jest.fn(),
    countEffect: jest.fn(),
    getEffect: jest.fn(),
    getHeroEffects: jest.fn(),
    removeHeroEffect: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DestructionBlightStrategy,
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
      ],
    }).compile();

    strategy = module.get<DestructionBlightStrategy>(DestructionBlightStrategy);
    gameEffectsService = module.get(GameEffectsService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return DESTRUCTION_BLIGHT', () => {
      expect(strategy.getSkillType()).toBe(SKILL.DESTRUCTION_BLIGHT);
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
      artifact = gameState.player.artifacts['artifact-1'];
      data = {
        skillId: SKILL.DESTRUCTION_BLIGHT,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [[], []],
      };
      animations = [];
      logParts = [];
    });

    it('should apply DESTRUCTION_BLIGHT hero effect to enemy', () => {
      const { EFFECTS } = require('../../game-mechanics/constants/effects');
      
      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.applyHeroEffect).toHaveBeenCalledWith(
        gameState.enemy,
        EFFECTS['destruction_blight'],
        logParts
      );
    });
  });
});