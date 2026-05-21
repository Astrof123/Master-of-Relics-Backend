// strategies-tests/dispersal-enemy.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { DISPELL_TYPE } from '../../game-mechanics/types/effect';
import { DispersalEnemyStrategy } from '../strategies/dispersal-enemy.strategy';

describe('DispersalEnemyStrategy', () => {
  let strategy: DispersalEnemyStrategy;
  let gameEffectsService: jest.Mocked<GameEffectsService>;
  let resourceService: jest.Mocked<ResourceService>;

  const createMockEffect = (id: string, type: 'positive' | 'negative', dispellType: string) => ({
    id,
    name: 'Test Effect',
    duration: 'current_round',
    type,
    number: null,
    dispellType,
  });

  const createMockArtifact = (id: string = 'enemy-artifact', effects: any[] = []): ArtifactGameState => ({
    id,
    artifactId: 'test_artifact',
    face: 'sword',
    state: ARTIFACT_STATE.READY_TO_USE,
    currentHp: 30,
    maxHp: 30,
    position: 1,
    line: LINE.FRONT,
    skillCost: 2,
    effects,
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
      'enemy-artifact': createMockArtifact('enemy-artifact'),
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
    player: createMockPlayer('player-1'),
    enemy: createMockPlayer('player-2'),
    end: null,
    miniPhase: 'movement',
    constants: { maxCountArtifactsOnLine: 6, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false },
  });

  const mockGameEffectsService = {
    removeEffect: jest.fn(),
    applyEffect: jest.fn(),
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
        DispersalEnemyStrategy,
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

    strategy = module.get<DispersalEnemyStrategy>(DispersalEnemyStrategy);
    gameEffectsService = module.get(GameEffectsService);
    resourceService = module.get(ResourceService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return DISPERSAL_ENEMY', () => {
      expect(strategy.getSkillType()).toBe(SKILL.DISPERSAL_ENEMY);
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
        skillId: SKILL.DISPERSAL_ENEMY,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [[], ['enemy-artifact']],
      };
      animations = [];
      logParts = [];
    });

    it('should remove normal positive effects from enemy artifact', () => {
      const positiveEffect = createMockEffect('positive1', 'positive', DISPELL_TYPE.NORMAL);
      gameState.enemy.artifacts['enemy-artifact'].effects = [positiveEffect];

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.removeEffect).toHaveBeenCalledWith(
        gameState.enemy.artifacts['enemy-artifact'],
        positiveEffect,
        logParts
      );
    });

    it('should not remove negative effects', () => {
      const negativeEffect = createMockEffect('negative1', 'negative', DISPELL_TYPE.NORMAL);
      gameState.enemy.artifacts['enemy-artifact'].effects = [negativeEffect];

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.removeEffect).not.toHaveBeenCalled();
    });

    it('should not remove effects with dispellType not NORMAL', () => {
      const undispellableEffect = createMockEffect('undispellable1', 'positive', DISPELL_TYPE.NEVER);
      gameState.enemy.artifacts['enemy-artifact'].effects = [undispellableEffect];

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.removeEffect).not.toHaveBeenCalled();
    });
  });
});