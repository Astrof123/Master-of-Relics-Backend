
import { Test, TestingModule } from '@nestjs/testing';
import { SpellService } from './spell.service';
import { RestrictionService } from '../action/restriction.service';
import { GameEffectsService } from '../game-mechanics/game-effects.service';
import { Player, SpellGameState } from '../game-state/types/game';
import { GameForLogic } from '../game-state/types/game-for-logic';
import { SPELLTYPE } from './types/spell';
import { EFFECT } from '../game-mechanics/types/effect';
import { RESOURCE } from '../game-mechanics/types/resource';
import { SpellHelper } from './spell.helper';


jest.mock('./spell.helper', () => ({
  SpellHelper: {
    getResource: jest.fn(),
  },
}));


jest.mock('./constants/spells', () => ({
  SPELLS: {
    'piercing_bolt': {
      id: 'piercing_bolt',
      name: 'Piercing Bolt',
      type: "destruction",
      cost: 15,
      description: 'Нанести 15 урона',
      countAnyTarget: 0,
      countTargetEnemy: 1,
      countTargetAllies: 0,
      restrictions: [],
      targetRestrictions: [],
    },
    'touch_of_light': {
      id: 'touch_of_light',
      name: 'Touch Of Light',
      type: "light",
      cost: 25,
      description: 'Применить заклинание',
      countAnyTarget: 1,
      countTargetEnemy: 0,
      countTargetAllies: 0,
      restrictions: [],
      targetRestrictions: [],
    },
    'betrayal': {
      id: 'betrayal',
      name: 'Betrayal',
      type: "dark",
      cost: 30,
      description: 'Предательство',
      countAnyTarget: 0,
      countTargetEnemy: 1,
      countTargetAllies: 0,
      restrictions: [],
      targetRestrictions: [],
    },
  },
}));

describe('SpellService', () => {
  let service: SpellService;
  let restrictionService: jest.Mocked<RestrictionService>;
  let gameEffectsService: jest.Mocked<GameEffectsService>;

  const createMockSpell = (spellId: string, cost: number = 15): SpellGameState => ({
    id: spellId,
    description: 'Test spell',
    cost,
    cooldown: false,
    canUse: false,
    possibleTargets: [],
    countAnyTarget: 0,
    countTargetEnemy: 1,
    countTargetAllies: 0,
  });

  const createMockPlayer = (): Player => ({
    id: 'player-1',
    name: 'Player1',
    connection: 'online',
    isBot: false,
    hero: 'Empty',
    resources: {
      [RESOURCE.AGILITY]: 50,
      [RESOURCE.RAGE]: 30,
      [RESOURCE.LIGHT_MANA]: 20,
      [RESOURCE.DARK_MANA]: 10,
      [RESOURCE.DESTRUCTION_MANA]: 5,
    },
    artifacts: {},
    spells: {
      [SPELLTYPE.LIGHT]: {
        'touch_of_light': createMockSpell('touch_of_light', 25),
      },
      [SPELLTYPE.DARK]: {
        'betrayal': createMockSpell('betrayal', 30),
      },
      [SPELLTYPE.DESTRUCTION]: {
        'piercing_bolt': createMockSpell('piercing_bolt', 15),
      },
    },
    effects: [],
    isReady: false,
    movePoints: 1,
    draft: { pickedArtifact: null, deck: [] },
    temporaryArtifacts: {},
    offerDraw: false,
    extraData: { skippedMoves: 0 },
  });

  const createMockEnemy = (): Player => ({
    ...createMockPlayer(),
    id: 'player-2',
    name: 'Player2',
  });

  const createMockGameState = (): GameForLogic => ({
    id: 'game-123',
    phase: 'battle',
    name: 'Test Game',
    currentTurn: 'player-1',
    logs: [],
    player: createMockPlayer(),
    enemy: createMockEnemy(),
    end: null,
    miniPhase: 'movement',
    constants: { maxCountArtifactsOnLine: 6, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false },
  });

  const mockRestrictionService = {
    getTargetsByRestrictions: jest.fn().mockReturnValue([['target1'], ['target2']]),
    checkGeneralRestrictions: jest.fn().mockReturnValue(true),
    checkSpellRestrictions: jest.fn().mockReturnValue(true),
  };

  const mockGameEffectsService = {
    countHeroEffect: jest.fn().mockReturnValue(0),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (SpellHelper.getResource as jest.Mock).mockReturnValue(RESOURCE.DESTRUCTION_MANA);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpellService,
        {
          provide: RestrictionService,
          useValue: mockRestrictionService,
        },
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
      ],
    }).compile();

    service = module.get<SpellService>(SpellService);
    restrictionService = module.get(RestrictionService);
    gameEffectsService = module.get(GameEffectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateSpellActions', () => {
    let gameState: GameForLogic;
    let player: Player;
    let enemy: Player;

    beforeEach(() => {
      gameState = createMockGameState();
      player = gameState.player;
      enemy = gameState.enemy;
    });

    it('should calculate actions for light spells', () => {
      service.calculateSpellActions(gameState, player, enemy);

      const lightSpell = player.spells[SPELLTYPE.LIGHT]['touch_of_light'];
      expect(lightSpell.cost).toBeDefined();
      expect(lightSpell.possibleTargets).toEqual([['target1'], ['target2']]);
    });

    it('should apply light mana discount to light spells', () => {
      gameEffectsService.countHeroEffect.mockImplementation((player, effect) => {
        if (effect === EFFECT.LIGHT_MANA_DISCOUNT) return 2;
        return 0;
      });

      service.calculateSpellActions(gameState, player, enemy);

      const lightSpell = player.spells[SPELLTYPE.LIGHT]['touch_of_light'];
      expect(lightSpell.cost).toBe(25 - 10);
    });

    it('should calculate actions for dark spells', () => {
      service.calculateSpellActions(gameState, player, enemy);

      const darkSpell = player.spells[SPELLTYPE.DARK]['betrayal'];
      expect(darkSpell.cost).toBeDefined();
      expect(darkSpell.possibleTargets).toEqual([['target1'], ['target2']]);
    });

    it('should apply dark mana discount to dark spells', () => {
      gameEffectsService.countHeroEffect.mockImplementation((player, effect) => {
        if (effect === EFFECT.DARK_MANA_DISCOUNT) return 3;
        return 0;
      });

      service.calculateSpellActions(gameState, player, enemy);

      const darkSpell = player.spells[SPELLTYPE.DARK]['betrayal'];
      expect(darkSpell.cost).toBe(30 - 15);
    });

    it('should calculate actions for destruction spells', () => {
      service.calculateSpellActions(gameState, player, enemy);

      const destructionSpell = player.spells[SPELLTYPE.DESTRUCTION]['piercing_bolt'];
      expect(destructionSpell.cost).toBeDefined();
      expect(destructionSpell.possibleTargets).toEqual([['target1'], ['target2']]);
    });

    it('should apply destruction mana discount to destruction spells', () => {
      gameEffectsService.countHeroEffect.mockImplementation((player, effect) => {
        if (effect === EFFECT.DESTRUCTION_MANA_DISCOUNT) return 1;
        return 0;
      });

      service.calculateSpellActions(gameState, player, enemy);

      const destructionSpell = player.spells[SPELLTYPE.DESTRUCTION]['piercing_bolt'];
      expect(destructionSpell.cost).toBe(15 - 5);
    });

    it('should set canUse based on checkCanUse result', () => {
      service.calculateSpellActions(gameState, player, enemy);

      const destructionSpell = player.spells[SPELLTYPE.DESTRUCTION]['piercing_bolt'];
      expect(typeof destructionSpell.canUse).toBe('boolean');
    });
  });

  describe('checkCanUse', () => {
    let player: Player;
    let enemy: Player;
    let spell: SpellGameState;

    beforeEach(() => {
      player = createMockPlayer();
      enemy = createMockEnemy();
      spell = createMockSpell('piercing_bolt', 15);
      
      (SpellHelper.getResource as jest.Mock).mockReturnValue(RESOURCE.DESTRUCTION_MANA);
      player.resources[RESOURCE.DESTRUCTION_MANA] = 20;
    });

    it('should return true if all conditions are met', () => {
      restrictionService.checkGeneralRestrictions.mockReturnValue(true);
      restrictionService.checkSpellRestrictions.mockReturnValue(true);

      const result = service.checkCanUse(player, enemy, spell);

      expect(result).toBe(true);
      expect(SpellHelper.getResource).toHaveBeenCalledWith(SPELLTYPE.DESTRUCTION);
      expect(restrictionService.checkGeneralRestrictions).toHaveBeenCalled();
      expect(restrictionService.checkSpellRestrictions).toHaveBeenCalled();
    });

    it('should return false if not enough resources', () => {
      player.resources[RESOURCE.DESTRUCTION_MANA] = 10;
      spell.cost = 15;

      const result = service.checkCanUse(player, enemy, spell);

      expect(result).toBe(false);
    });

    it('should return false if spell is on cooldown', () => {
      spell.cooldown = true;
      player.resources[RESOURCE.DESTRUCTION_MANA] = 20;

      const result = service.checkCanUse(player, enemy, spell);

      expect(result).toBe(false);
    });

    it('should return false if general restrictions fail', () => {
      restrictionService.checkGeneralRestrictions.mockReturnValue(false);
      player.resources[RESOURCE.DESTRUCTION_MANA] = 20;

      const result = service.checkCanUse(player, enemy, spell);

      expect(result).toBe(false);
    });

    it('should return false if spell restrictions fail', () => {
      restrictionService.checkGeneralRestrictions.mockReturnValue(true);
      restrictionService.checkSpellRestrictions.mockReturnValue(false);
      player.resources[RESOURCE.DESTRUCTION_MANA] = 20;

      const result = service.checkCanUse(player, enemy, spell);

      expect(result).toBe(false);
    });

  });

  describe('Edge cases', () => {
    let gameState: GameForLogic;
    let player: Player;
    let enemy: Player;

    beforeEach(() => {
      gameState = createMockGameState();
      player = gameState.player;
      enemy = gameState.enemy;
    });

    it('should handle spells with zero discount', () => {
      gameEffectsService.countHeroEffect.mockReturnValue(0);

      service.calculateSpellActions(gameState, player, enemy);

      const destructionSpell = player.spells[SPELLTYPE.DESTRUCTION]['piercing_bolt'];
      expect(destructionSpell.cost).toBe(15);
    });

    it('should handle negative cost after discount', () => {
      gameEffectsService.countHeroEffect.mockReturnValue(10);
      player.spells[SPELLTYPE.DESTRUCTION]['piercing_bolt'].cost = 15;

      service.calculateSpellActions(gameState, player, enemy);

      const destructionSpell = player.spells[SPELLTYPE.DESTRUCTION]['piercing_bolt'];
      expect(destructionSpell.cost).toBe(15 - 50);
    });

    it('should handle empty spells array for a type', () => {
      player.spells[SPELLTYPE.LIGHT] = {};

      expect(() => service.calculateSpellActions(gameState, player, enemy)).not.toThrow();
    });

    it('should work when player has no spells', () => {
      player.spells = {
        [SPELLTYPE.LIGHT]: {},
        [SPELLTYPE.DARK]: {},
        [SPELLTYPE.DESTRUCTION]: {},
      };

      expect(() => service.calculateSpellActions(gameState, player, enemy)).not.toThrow();
    });
  });
});