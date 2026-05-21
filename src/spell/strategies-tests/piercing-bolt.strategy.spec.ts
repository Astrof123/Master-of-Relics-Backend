
import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { DAMAGE } from '../../game-mechanics/types/combat';
import { PiercingBoltStrategy } from '../strategies/piercing-bolt.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

describe('PiercingBoltStrategy', () => {
  let strategy: PiercingBoltStrategy;
  let combatService: jest.Mocked<CombatService>;

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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PiercingBoltStrategy,
        {
          provide: CombatService,
          useValue: mockCombatService,
        },
      ],
    }).compile();

    strategy = module.get<PiercingBoltStrategy>(PiercingBoltStrategy);
    combatService = module.get(CombatService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSpellType', () => {
    it('should return PIERCING_BOLT', () => {
      expect(strategy.getSpellType()).toBe(SPELL.PIERCING_BOLT);
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
        spellId: SPELL.PIERCING_BOLT as any,
        gameId: 'game-123',
        targets: [[], ['artifact-1']],
      };
      animations = [];
      logParts = [];

      mockCombatService.calculateDamage.mockReturnValue(15);
      mockCombatService.applyDamage.mockReturnValue(undefined);
    });

    it('should calculate damage and apply to enemy artifact', () => {
      strategy.execute(gameState, player, data, animations, logParts);

      expect(combatService.calculateDamage).toHaveBeenCalledWith(
        gameState.enemy.artifacts['artifact-1'],
        15,
        DAMAGE.MAGIC
      );
      expect(combatService.applyDamage).toHaveBeenCalledWith(
        gameState,
        gameState.enemy,
        null,
        gameState.enemy.artifacts['artifact-1'],
        15,
        DAMAGE.MAGIC,
        logParts
      );
    });

    it('should add hit animation', () => {
      strategy.execute(gameState, player, data, animations, logParts);

      expect(animations).toHaveLength(1);
      expect(animations[0]).toEqual({
        playerId: gameState.enemy.id,
        artifactGameId: 'artifact-1',
        animation: ANIMATION.HIT,
        value: 15,
      });
    });
  });
});