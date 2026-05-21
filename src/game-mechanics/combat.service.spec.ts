import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { CombatService } from './combat.service';
import { ArtifactStateService } from './artifact-state.service';
import { SkillsStrategyFactory } from '../artifact/skills.factory';
import { GameEffectsService } from './game-effects.service';
import { ArtifactService } from '../artifact/artifact.service';
import { ARTIFACT_STATE, ArtifactGameState, LINE, Player } from '../game-state/types/game';
import { GameForLogic } from '../game-state/types/game-for-logic';
import { DAMAGE, DamageType } from './types/combat';
import { EFFECT } from './types/effect';
import { FACES } from './constants/faces';
import { ARTIFACTS } from '../artifact/constants/artifacts';

jest.mock('../artifact/constants/artifacts', () => ({
  ARTIFACTS: {
    'arcane_shield': { id: 'arcane_shield', name: 'Arcane Shield', skills: [] },
    'moon_staff': { id: 'moon_staff', name: 'Moon Staff', skills: [] },
    'axe_of_the_berserker': { id: 'axe_of_the_berserker', name: 'Axe of the Berserker', skills: [] },
  },
}));


jest.mock('./constants/faces', () => ({
  FACES: {
    'sword': { sword: 10, target: 0, heal: 0 },
    'target': { sword: 0, target: 10, heal: 0 },
    'heal': { sword: 0, target: 0, heal: 10 },
    'three_sword': { sword: 30, target: 0, heal: 0 },
    'two_target': { sword: 0, target: 20, heal: 0 },
  },
}));


jest.mock('./constants/effects', () => ({
  EFFECTS: {
    'one_attack_shield': { id: 'one_attack_shield', name: 'One Attack Shield' },
    'vampirism': { id: 'vampirism', name: 'Vampirism' },
  },
}));

describe('CombatService', () => {
  let service: CombatService;
  let artifactStateService: jest.Mocked<ArtifactStateService>;
  let skillsFactory: jest.Mocked<SkillsStrategyFactory>;
  let gameEffectsService: jest.Mocked<GameEffectsService>;
  let artifactService: jest.Mocked<ArtifactService>;

  const mockArtifactStateService = {
    applyState: jest.fn(),
  };

  const mockSkillsFactory = {
    getStrategy: jest.fn(),
  };

  const mockGameEffectsService = {
    countEffect: jest.fn().mockReturnValue(0),
    removeEffect: jest.fn(),
  };

  const mockArtifactService = {
    destroyArtifact: jest.fn(),
  };

  const createMockArtifact = (id: string = 'artifact-1', artifactId: string = 'arcane_shield', state: string = ARTIFACT_STATE.READY_TO_USE): ArtifactGameState => ({
    id,
    artifactId,
    face: 'sword',
    state: state as any,
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CombatService,
        {
          provide: ArtifactStateService,
          useValue: mockArtifactStateService,
        },
        {
          provide: SkillsStrategyFactory,
          useValue: mockSkillsFactory,
        },
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
        {
          provide: ArtifactService,
          useValue: mockArtifactService,
        },
      ],
    }).compile();

    service = module.get<CombatService>(CombatService);
    artifactStateService = module.get(ArtifactStateService);
    skillsFactory = module.get(SkillsStrategyFactory);
    gameEffectsService = module.get(GameEffectsService);
    artifactService = module.get(ArtifactService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyDamage', () => {
    let gameState: GameForLogic;
    let enemy: Player;
    let attackedArtifact: ArtifactGameState;
    const logParts: string[] = [];

    beforeEach(() => {
      gameState = createMockGameState();
      enemy = gameState.enemy;
      attackedArtifact = createMockArtifact();
      logParts.length = 0;
      gameEffectsService.countEffect.mockReturnValue(0);
    });

    it('should reduce artifact HP', () => {
      service.applyDamage(gameState, enemy, null, attackedArtifact, 10, DAMAGE.MELEE, logParts);

      expect(attackedArtifact.currentHp).toBe(20);
    });

    it('should not reduce HP below 0', () => {
      service.applyDamage(gameState, enemy, null, attackedArtifact, 100, DAMAGE.MELEE, logParts);

      expect(attackedArtifact.currentHp).toBe(0);
    });

    it('should apply BREAKEN state when HP reaches 0', () => {
      service.applyDamage(gameState, enemy, null, attackedArtifact, 30, DAMAGE.MELEE, logParts);

      expect(artifactStateService.applyState).toHaveBeenCalledWith(attackedArtifact, ARTIFACT_STATE.BREAKEN, logParts);
    });

    it('should destroy artifact if it has COPY effect', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.COPY) return 1;
        return 0;
      });

      service.applyDamage(gameState, enemy, null, attackedArtifact, 30, DAMAGE.MELEE, logParts);

      expect(artifactService.destroyArtifact).toHaveBeenCalledWith(gameState.enemy, attackedArtifact, logParts);
      expect(artifactStateService.applyState).not.toHaveBeenCalled();
    });

    it('should destroy artifact if it has LIVE_FOR_ROUND effect', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.LIVE_FOR_ROUND) return 1;
        return 0;
      });

      service.applyDamage(gameState, enemy, null, attackedArtifact, 30, DAMAGE.MELEE, logParts);

      expect(artifactService.destroyArtifact).toHaveBeenCalled();
    });

    it('should remove ONE_ATTACK_SHIELD effect after damage', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.ONE_ATTACK_SHIELD) return 1;
        return 0;
      });

      service.applyDamage(gameState, enemy, null, attackedArtifact, 10, DAMAGE.MELEE, logParts);

      expect(gameEffectsService.removeEffect).toHaveBeenCalled();
    });

    it('should wake artifact from DREAM state', () => {
      const dreamArtifact = createMockArtifact('artifact-1', 'arcane_shield', ARTIFACT_STATE.DREAM);
      dreamArtifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.READY_TO_USE;

      service.applyDamage(gameState, enemy, null, dreamArtifact, 10, DAMAGE.MELEE, logParts);

      expect(artifactStateService.applyState).toHaveBeenCalledWith(dreamArtifact, ARTIFACT_STATE.READY_TO_USE, []);
    });

    it('should apply vampirism healing to attacker', () => {
        const attackerArtifact = createMockArtifact();
        attackerArtifact.currentHp = 20;
        attackerArtifact.maxHp = 30;
        
        gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
            if (effect === EFFECT.VAMPIRISM && artifact === attackerArtifact) return 1;
            return 0;
        });

        const initialHp = attackerArtifact.currentHp;
        service.applyDamage(gameState, enemy, attackerArtifact, attackedArtifact, 10, DAMAGE.MELEE, logParts);

        expect(attackerArtifact.currentHp).toBeGreaterThan(initialHp);
        expect(gameEffectsService.removeEffect).toHaveBeenCalled();
    });

    it('should add hit log', () => {
      service.applyDamage(gameState, enemy, null, attackedArtifact, 10, DAMAGE.MELEE, logParts);

      expect(logParts.length).toBeGreaterThan(0);
      expect(logParts[logParts.length - 1]).toContain('Нанес');
    });
  });

  describe('applyHealing', () => {
    let healedArtifact: ArtifactGameState;
    const logParts: string[] = [];

    beforeEach(() => {
      healedArtifact = createMockArtifact();
      healedArtifact.currentHp = 10;
      logParts.length = 0;
    });

    it('should increase artifact HP', () => {
      service.applyHealing(healedArtifact, 15, logParts);

      expect(healedArtifact.currentHp).toBe(25);
    });

    it('should not exceed max HP', () => {
      service.applyHealing(healedArtifact, 50, logParts);

      expect(healedArtifact.currentHp).toBe(30);
    });

    it('should not heal broken artifacts', () => {
      healedArtifact.state = ARTIFACT_STATE.BREAKEN;
      const initialHp = healedArtifact.currentHp;

      service.applyHealing(healedArtifact, 15, logParts);

      expect(healedArtifact.currentHp).toBe(initialHp);
    });

    it('should wake artifact from DREAM state', () => {
      healedArtifact.state = ARTIFACT_STATE.DREAM;
      healedArtifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.READY_TO_USE;

      service.applyHealing(healedArtifact, 15, logParts);

      expect(artifactStateService.applyState).toHaveBeenCalledWith(healedArtifact, ARTIFACT_STATE.READY_TO_USE, []);
    });

    it('should add heal log', () => {
      service.applyHealing(healedArtifact, 15, logParts);

      expect(logParts[0]).toContain('Восстановил');
    });
  });

  describe('calculateFaceHeal', () => {
    let healedArtifact: ArtifactGameState;
    let healerArtifact: ArtifactGameState;

    beforeEach(() => {
      healedArtifact = createMockArtifact();
      healedArtifact.currentHp = 10;
      healedArtifact.maxHp = 30;
      healerArtifact = createMockArtifact();
      healerArtifact.face = 'heal';
    });

    it('should calculate heal amount from face', () => {
      const result = service.calculateFaceHeal(healedArtifact, healerArtifact);

      expect(result).toBe(10);
    });

    it('should cap heal at max HP', () => {
      healedArtifact.currentHp = 28;
      const result = service.calculateFaceHeal(healedArtifact, healerArtifact);

      expect(result).toBe(2);
    });
  });

  describe('calculateFaceDamage', () => {
    let player: Player;
    let enemy: Player;
    let attackerArtifact: ArtifactGameState;
    let attackedArtifact: ArtifactGameState;

    beforeEach(() => {
      player = createMockPlayer();
      enemy = createMockPlayer();
      attackerArtifact = createMockArtifact();
      attackedArtifact = createMockArtifact();
      gameEffectsService.countEffect.mockReturnValue(0);
    });

    it('should calculate melee damage correctly', () => {
      attackerArtifact.face = 'sword';
      attackerArtifact.line = LINE.FRONT;

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.MELEE);

      expect(result).toBe(10 + 10);
    });

    it('should calculate melee damage without front bonus', () => {
      attackerArtifact.face = 'sword';
      attackerArtifact.line = LINE.BACK;

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.MELEE);

      expect(result).toBe(10);
    });

    it('should calculate ranged damage correctly', () => {
      attackerArtifact.face = 'target';

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.RANGED);

      expect(result).toBe(10);
    });

    it('should add upgrade bonus damage', () => {
      attackerArtifact.face = 'sword';
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.UPGRADE) return 2;
        return 0;
      });

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.MELEE);

      expect(result).toBe(10 + 10 + 10);
    });

    it('should add berserk bonus damage', () => {
      attackerArtifact.face = 'sword';
      attackerArtifact.maxHp = 50;
      attackerArtifact.currentHp = 20;
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.BERSERK) return 1;
        return 0;
      });

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.MELEE);

      expect(result).toBe(10 + 10 + 30);
    });

    it('should add sharp bonus damage', () => {
      attackerArtifact.face = 'sword';
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.SHARP) return 2;
        return 0;
      });

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.MELEE);

      expect(result).toBe(10 + 10 + 16);
    });

    it('should add hunt bonus damage', () => {
      attackerArtifact.face = 'target';
      attackerArtifact.artifactId = 'arcane_shield';
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.HUNT) return 1;
        return 0;
      });

      player.artifacts = {
        'p1': { maxHp: 30, currentHp: 20 } as ArtifactGameState,
        'p2': { maxHp: 30, currentHp: 30 } as ArtifactGameState,
      };
      enemy.artifacts = {
        'e1': { maxHp: 30, currentHp: 15 } as ArtifactGameState,
        'e2': { maxHp: 30, currentHp: 30 } as ArtifactGameState,
      };

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.RANGED);

      expect(result).toBe(18);
    });

    it('should apply general damage reduction', () => {
      attackerArtifact.face = 'sword';
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.DIVINE_GUARD && artifact === attackedArtifact) return 2;
        return 0;
      });

      const result = service.calculateFaceDamage(player, enemy, attackerArtifact, attackedArtifact, DAMAGE.MELEE);

      expect(result).toBe(0);
    });
  });

  describe('calculateGeneralDamage', () => {
    let attackedArtifact: ArtifactGameState;

    beforeEach(() => {
      attackedArtifact = createMockArtifact();
      gameEffectsService.countEffect.mockReturnValue(0);
    });

    it('should return 0 if ONE_ATTACK_SHIELD is active', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.ONE_ATTACK_SHIELD) return 1;
        return 0;
      });

      const result = service.calculateGeneralDamage(attackedArtifact, 50);

      expect(result).toBe(0);
    });

    it('should increase damage if RUST effect is active', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.RUST) return 1;
        return 0;
      });

      const result = service.calculateGeneralDamage(attackedArtifact, 20);

      expect(result).toBe(30);
    });

    it('should reduce damage if DIVINE_GUARD effect is active', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.DIVINE_GUARD) return 2;
        return 0;
      });

      const result = service.calculateGeneralDamage(attackedArtifact, 50);

      expect(result).toBe(20); 
    });

    it('should not go below 0', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.DIVINE_GUARD) return 5;
        return 0;
      });

      const result = service.calculateGeneralDamage(attackedArtifact, 50);

      expect(result).toBe(0);
    });
  });

  describe('calculateDamage', () => {
    let attackedArtifact: ArtifactGameState;

    beforeEach(() => {
      attackedArtifact = createMockArtifact();
      gameEffectsService.countEffect.mockReturnValue(0);
    });

    it('should return calculated damage', () => {
      const result = service.calculateDamage(attackedArtifact, 25, DAMAGE.MELEE);

      expect(result).toBe(25);
    });

    it('should apply general damage reduction', () => {
      gameEffectsService.countEffect.mockImplementation((artifact, effect) => {
        if (effect === EFFECT.DIVINE_GUARD) return 1;
        return 0;
      });

      const result = service.calculateDamage(attackedArtifact, 25, DAMAGE.MELEE);

      expect(result).toBe(10);
    });
  });

  describe('calculateHeal', () => {
    let healedArtifact: ArtifactGameState;

    beforeEach(() => {
      healedArtifact = createMockArtifact();
      healedArtifact.currentHp = 10;
      healedArtifact.maxHp = 30;
    });

    it('should return full heal amount if within limits', () => {
      const result = service.calculateHeal(healedArtifact, 15);

      expect(result).toBe(15);
    });

    it('should cap heal at max HP', () => {
      const result = service.calculateHeal(healedArtifact, 25);

      expect(result).toBe(20);
    });

    it('should return 0 for broken artifacts', () => {
      healedArtifact.state = ARTIFACT_STATE.BREAKEN;

      const result = service.calculateHeal(healedArtifact, 15);

      expect(result).toBe(0);
    });
  });
});