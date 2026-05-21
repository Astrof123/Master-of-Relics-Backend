
import { Test, TestingModule } from '@nestjs/testing';
import { CombatService } from '../../game-mechanics/combat.service';
import { ArtifactStateService } from '../../game-mechanics/artifact-state.service';
import { Player, ARTIFACT_STATE, LINE, ArtifactState } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { ColdTouchStrategy } from '../strategies/cold-touch.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

jest.mock('crypto', () => ({
  randomInt: jest.fn(() => 0),
}));

describe('ColdTouchStrategy', () => {
  let strategy: ColdTouchStrategy;
  let combatService: jest.Mocked<CombatService>;
  let artifactStateService: jest.Mocked<ArtifactStateService>;

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
      'artifact-2': createMockArtifact('artifact-2', ARTIFACT_STATE.COOLDOWN),
      'artifact-3': createMockArtifact('artifact-3', ARTIFACT_STATE.BREAKEN),
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

  const mockArtifactStateService = {
    applyState: jest.fn(),
    clearDestroyedArtifacts: jest.fn(),
    updateStateNewRound: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColdTouchStrategy,
        {
          provide: CombatService,
          useValue: mockCombatService,
        },
        {
          provide: ArtifactStateService,
          useValue: mockArtifactStateService,
        },
      ],
    }).compile();

    strategy = module.get<ColdTouchStrategy>(ColdTouchStrategy);
    combatService = module.get(CombatService);
    artifactStateService = module.get(ArtifactStateService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSpellType', () => {
    it('should return COLD_TOUCH', () => {
      expect(strategy.getSpellType()).toBe(SPELL.COLD_TOUCH);
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
        spellId: SPELL.COLD_TOUCH as any,
        gameId: 'game-123',
        targets: [[], []],
      };
      animations = [];
      logParts = [];
    });

    it('should apply ROOTED state to up to 2 eligible enemy artifacts', () => {
      strategy.execute(gameState, player, data, animations, logParts);

      expect(artifactStateService.applyState).toHaveBeenCalledTimes(2);
      expect(artifactStateService.applyState).toHaveBeenCalledWith(
        expect.objectContaining({ state: ARTIFACT_STATE.READY_TO_USE }),
        ARTIFACT_STATE.ROOTED,
        logParts
      );
    });
  });
});