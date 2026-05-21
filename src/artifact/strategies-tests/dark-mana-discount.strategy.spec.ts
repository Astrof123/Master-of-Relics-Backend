// strategies-tests/dark-mana-discount.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { EFFECT } from '../../game-mechanics/types/effect';
import { SKILL } from '../types/skill';
import { DarkManaDiscountStrategy } from '../strategies/dark-mana-discount.strategy';

// Mock EFFECTS
jest.mock('../../game-mechanics/constants/effects', () => ({
  EFFECTS: {
    'dark_mana_discount': { id: 'dark_mana_discount', name: 'Dark Mana Discount' },
  },
}));

describe('DarkManaDiscountStrategy', () => {
  let strategy: DarkManaDiscountStrategy;
  let gameEffectsService: jest.Mocked<GameEffectsService>;
  let resourceService: jest.Mocked<ResourceService>;

  const createMockArtifact = (id: string = 'artifact-1'): ArtifactGameState => ({
    id,
    artifactId: 'ring_of_dark',
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
    artifacts: {},
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
    countEffect: jest.fn().mockReturnValue(0),
    applyEffect: jest.fn(),
    removeEffect: jest.fn(),
    getEffect: jest.fn(),
    getHeroEffects: jest.fn().mockReturnValue([]),
    applyHeroEffect: jest.fn(),
    removeHeroEffect: jest.fn(),
  };

  const mockResourceService = {
    decreaseResource: jest.fn(),
    addResource: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DarkManaDiscountStrategy,
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
        {
          provide: ResourceService,
          useValue: mockResourceService,
        },
      ],
    }).compile();

    strategy = module.get<DarkManaDiscountStrategy>(DarkManaDiscountStrategy);
    gameEffectsService = module.get(GameEffectsService);
    resourceService = module.get(ResourceService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return DARK_MANA_DISCOUNT', () => {
      expect(strategy.getSkillType()).toBe(SKILL.DARK_MANA_DISCOUNT);
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
      artifact = createMockArtifact();
      data = {
        skillId: SKILL.DARK_MANA_DISCOUNT,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [[], []],
      };
      animations = [];
      logParts = [];
    });

    it('should apply dark mana discount effect if not exhausted and not already applied', () => {
      const { EFFECTS } = require('../../game-mechanics/constants/effects');
      
      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.applyHeroEffect).toHaveBeenCalled();
    });

    it('should not apply effect if exhausted', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.EXHAUSTION) return 1;
        return 0;
      });

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.applyHeroEffect).not.toHaveBeenCalled();
    });

    it('should not apply duplicate effect from same artifact', () => {
      const existingEffect = { id: EFFECT.DARK_MANA_DISCOUNT, effectCasterGameId: 'artifact-1' };
      mockGameEffectsService.getHeroEffects.mockReturnValue([existingEffect]);

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.applyHeroEffect).not.toHaveBeenCalled();
    });
  });

  describe('death', () => {
    let gameState: GameForLogic;
    let player: Player;
    let artifact: ArtifactGameState;
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      player = gameState.player;
      artifact = createMockArtifact();
      logParts = [];
    });

    it('should remove dark mana discount effect on death', () => {
      const { EFFECTS } = require('../../game-mechanics/constants/effects');
      
      strategy.death(gameState, player, artifact, logParts);

      expect(gameEffectsService.removeHeroEffect).toHaveBeenCalledWith(
        player,
        EFFECTS['dark_mana_discount'],
        logParts
      );
    });
  });
});