// strategies-tests/one-attack-shield.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OneAttackShieldStrategy } from '../strategies/one_attack_shield.strategy';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';

// Mock EFFECTS
jest.mock('../../game-mechanics/constants/effects', () => ({
  EFFECTS: {
    'one_attack_shield': { id: 'one_attack_shield', name: 'One Attack Shield' },
  },
}));

describe('OneAttackShieldStrategy', () => {
  let strategy: OneAttackShieldStrategy;
  let gameEffectsService: jest.Mocked<GameEffectsService>;
  let resourceService: jest.Mocked<ResourceService>;

  const createMockArtifact = (id: string = 'ally-artifact'): ArtifactGameState => ({
    id,
    artifactId: 'averter',
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

  const mockResourceService = {
    decreaseResource: jest.fn(),
    addResource: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OneAttackShieldStrategy,
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

    strategy = module.get<OneAttackShieldStrategy>(OneAttackShieldStrategy);
    gameEffectsService = module.get(GameEffectsService);
    resourceService = module.get(ResourceService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return ONE_ATTACK_SHIELD', () => {
      expect(strategy.getSkillType()).toBe(SKILL.ONE_ATTACK_SHIELD);
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
        skillId: SKILL.ONE_ATTACK_SHIELD,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [['ally-artifact'], []],
      };
      animations = [];
      logParts = [];
    });

    it('should apply one attack shield effect to ally artifact', () => {
      const { EFFECTS } = require('../../game-mechanics/constants/effects');
      
      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.applyEffect).toHaveBeenCalledWith(
        player.artifacts['ally-artifact'],
        EFFECTS['one_attack_shield'],
        logParts
      );
    });
  });
});