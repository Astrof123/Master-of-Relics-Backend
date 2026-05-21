// strategies-tests/dispersal-ally.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { DISPELL_TYPE } from '../../game-mechanics/types/effect';
import { DispersalAllyStrategy } from '../strategies/dispersal-ally.strategy';

describe('DispersalAllyStrategy', () => {
  let strategy: DispersalAllyStrategy;
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

  const createMockArtifact = (id: string = 'ally-artifact', effects: any[] = []): ArtifactGameState => ({
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
        DispersalAllyStrategy,
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

    strategy = module.get<DispersalAllyStrategy>(DispersalAllyStrategy);
    gameEffectsService = module.get(GameEffectsService);
    resourceService = module.get(ResourceService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return DISPERSAL_ALLY', () => {
      expect(strategy.getSkillType()).toBe(SKILL.DISPERSAL_ALLY);
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
        skillId: SKILL.DISPERSAL_ALLY,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [['ally-artifact'], []],
      };
      animations = [];
      logParts = [];
    });

    it('should remove normal negative effects from ally artifact', () => {
      const negativeEffect = createMockEffect('negative1', 'negative', DISPELL_TYPE.NORMAL);
      player.artifacts['ally-artifact'].effects = [negativeEffect];

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.removeEffect).toHaveBeenCalledWith(
        player.artifacts['ally-artifact'],
        negativeEffect,
        logParts
      );
    });

    it('should not remove positive effects', () => {
      const positiveEffect = createMockEffect('positive1', 'positive', DISPELL_TYPE.NORMAL);
      player.artifacts['ally-artifact'].effects = [positiveEffect];

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.removeEffect).not.toHaveBeenCalled();
    });

    it('should not remove effects with dispellType not NORMAL', () => {
      const undispellableEffect = createMockEffect('undispellable1', 'negative', DISPELL_TYPE.NEVER);
      player.artifacts['ally-artifact'].effects = [undispellableEffect];

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(gameEffectsService.removeEffect).not.toHaveBeenCalled();
    });
  });
});