
import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { Player, ARTIFACT_STATE, LINE, ArtifactState } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { ThunderStormStrategy } from '../strategies/thunder-storm.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { DAMAGE } from '../../game-mechanics/types/combat';

jest.mock('crypto', () => ({
  randomInt: jest.fn(() => 0),
}));

describe('ThunderStormStrategy', () => {
  let strategy: ThunderStormStrategy;
  let combatService: jest.Mocked<CombatService>;

  const createMockArtifact = (id: string, state: ArtifactState = ARTIFACT_STATE.READY_TO_USE) => ({
    id,
    artifactId: 'test_artifact',
    face: 'sword',
    state,
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
      'artifact-1': createMockArtifact('artifact-1', ARTIFACT_STATE.READY_TO_USE),
      'artifact-2': createMockArtifact('artifact-2', ARTIFACT_STATE.READY_TO_USE),
      'artifact-3': createMockArtifact('artifact-3', ARTIFACT_STATE.READY_TO_USE),
      'artifact-4': createMockArtifact('artifact-4', ARTIFACT_STATE.READY_TO_USE),
      'artifact-5': createMockArtifact('artifact-5', ARTIFACT_STATE.BREAKEN),
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
        ThunderStormStrategy,
        {
          provide: CombatService,
          useValue: mockCombatService,
        },
      ],
    }).compile();

    strategy = module.get<ThunderStormStrategy>(ThunderStormStrategy);
    combatService = module.get(CombatService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSpellType', () => {
    it('should return THUNDER_STORM', () => {
      expect(strategy.getSpellType()).toBe(SPELL.THUNDER_STORM);
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
        spellId: SPELL.THUNDER_STORM as any,
        gameId: 'game-123',
        targets: [[], []],
      };
      animations = [];
      logParts = [];

      mockCombatService.calculateDamage.mockReturnValue(10);
      mockCombatService.applyDamage.mockReturnValue(undefined);
    });

    it('should damage up to 4 random enemy artifacts', () => {
      strategy.execute(gameState, player, data, animations, logParts);

      expect(mockCombatService.calculateDamage).toHaveBeenCalled();
      expect(mockCombatService.applyDamage).toHaveBeenCalled();
      expect(animations.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip broken or destroyed artifacts', () => {
      strategy.execute(gameState, player, data, animations, logParts);

      const brokenArtifact = Object.values(gameState.enemy.artifacts).find(
        a => a.state === ARTIFACT_STATE.BREAKEN
      );
      expect(mockCombatService.applyDamage).not.toHaveBeenCalledWith(
        expect.objectContaining({ artifactId: brokenArtifact?.id }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });
});