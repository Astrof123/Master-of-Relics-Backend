
import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { RustStrategy } from '../strategies/rust.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';


jest.mock('../../game-mechanics/constants/effects', () => ({
  EFFECTS: {
    'rust': { id: 'rust', name: 'Rust' },
  },
}));

describe('RustStrategy', () => {
  let strategy: RustStrategy;
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
        RustStrategy,
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

    strategy = module.get<RustStrategy>(RustStrategy);
    combatService = module.get(CombatService);
    gameEffectsService = module.get(GameEffectsService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSpellType', () => {
    it('should return RUST', () => {
      expect(strategy.getSpellType()).toBe(SPELL.RUST);
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
        spellId: SPELL.RUST as any,
        gameId: 'game-123',
        targets: [[], ['enemy-artifact']],
      };
      animations = [];
      logParts = [];
    });

    it('should apply rust effect to enemy artifact', () => {
      const { EFFECTS } = require('../../game-mechanics/constants/effects');
      
      strategy.execute(gameState, player, data, animations, logParts);

      expect(gameEffectsService.applyEffect).toHaveBeenCalledWith(
        gameState.enemy.artifacts['enemy-artifact'],
        EFFECTS['rust'],
        logParts
      );
    });
  });
});