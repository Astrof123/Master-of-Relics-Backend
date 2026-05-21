
import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { VampirismStrategy } from '../strategies/vampirism.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

jest.mock('../../game-mechanics/constants/effects', () => ({
  EFFECTS: {
    'vampirism': { id: 'vampirism', name: 'Vampirism' },
  },
}));

describe('VampirismStrategy', () => {
  let strategy: VampirismStrategy;
  let combatService: jest.Mocked<CombatService>;
  let gameEffectsService: jest.Mocked<GameEffectsService>;

  const createMockArtifact = (id: string) => ({
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
      'artifact-1': createMockArtifact('artifact-1'),
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

  const mockCombatService = {
    calculateDamage: jest.fn(),
    applyDamage: jest.fn(),
    calculateFaceDamage: jest.fn(),
    calculateHeal: jest.fn(),
    applyHealing: jest.fn(),
  };

  const mockGameEffectsService = {
    applyEffect: jest.fn(),
    removeEffect: jest.fn(),
    countEffect: jest.fn(),
    getEffect: jest.fn(),
    applyHeroEffect: jest.fn(),
    removeHeroEffect: jest.fn(),
    getHeroEffects: jest.fn(),
    countHeroEffect: jest.fn(),
    increaseEffect: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VampirismStrategy,
        {
          provide: CombatService,
          useValue: mockCombatService,
        },
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
      ],
    }).compile();

    strategy = module.get<VampirismStrategy>(VampirismStrategy);
    combatService = module.get(CombatService);
    gameEffectsService = module.get(GameEffectsService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSpellType', () => {
    it('should return VAMPIRISM', () => {
      expect(strategy.getSpellType()).toBe(SPELL.VAMPIRISM);
    });
  });

  describe('execute', () => {
    let gameState: GameForLogic;
    let player: Player;
    let data: UseSpellData;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      player = gameState.player;
      data = {
        spellId: SPELL.VAMPIRISM as any,
        gameId: 'game-123',
        targets: [['artifact-1'], []],
      };
      animations = [];
      logParts = [];
    });

    it('should apply vampirism effect to ally artifact', () => {
      const { EFFECTS } = require('../../game-mechanics/constants/effects');
      
      strategy.execute(gameState, player, data, animations, logParts);

      expect(gameEffectsService.applyEffect).toHaveBeenCalledWith(
        player.artifacts['artifact-1'],
        EFFECTS['vampirism'],
        logParts
      );
    });
  });
});