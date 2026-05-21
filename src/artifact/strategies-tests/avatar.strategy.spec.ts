// strategies-tests/avatar.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { AvatarStrategy } from '../strategies/avatar.strategy';

// Mock EFFECTS
jest.mock('../../game-mechanics/constants/effects', () => ({
  EFFECTS: {
    'avatar': { id: 'avatar', name: 'Avatar' },
  },
}));

describe('AvatarStrategy', () => {
  let strategy: AvatarStrategy;
  let gameEffectsService: jest.Mocked<GameEffectsService>;

  const createMockArtifact = (id: string = 'ally-artifact'): ArtifactGameState => ({
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

  const createMockPlayer = (): Player => ({
    id: 'player-1',
    name: 'Player1',
    connection: 'online',
    isBot: false,
    hero: 'Empty',
    resources: { agility: 50, rage: 30, light_mana: 20, dark_mana: 10, destruction_mana: 5 },
    artifacts: {
      'ally-artifact': createMockArtifact('ally-artifact'),
    },
    spells: {} as any,
    effects: [],
    isReady: false,
    movePoints: 1,
    draft: { pickedArtifact: null, deck: [] },
    temporaryArtifacts: {},
    offerDraw: false,
    extraData: { skippedMoves: 0 },
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
    constants: { maxCountArtifactsOnLine: 6, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false },
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
        AvatarStrategy,
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
      ],
    }).compile();

    strategy = module.get<AvatarStrategy>(AvatarStrategy);
    gameEffectsService = module.get(GameEffectsService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return AVATAR', () => {
      expect(strategy.getSkillType()).toBe(SKILL.AVATAR);
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
      artifact = player.artifacts['ally-artifact'];
      data = {
        skillId: SKILL.AVATAR,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [['ally-artifact'], []],
      };
      animations = [];
      logParts = [];
    });

    it('should apply avatar effect to ally artifact', () => {
      const { EFFECTS } = require('../../game-mechanics/constants/effects');
      
      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.applyEffect).toHaveBeenCalledWith(
        player.artifacts['ally-artifact'],
        EFFECTS['avatar'],
        logParts
      );
    });
  });
});