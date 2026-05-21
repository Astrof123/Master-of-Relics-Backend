
import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactStateService } from '../../game-mechanics/artifact-state.service';
import { Player, ARTIFACT_STATE, LINE, ArtifactState } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { InspirationStrategy } from '../strategies/inspiration.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

describe('InspirationStrategy', () => {
  let strategy: InspirationStrategy;
  let artifactStateService: jest.Mocked<ArtifactStateService>;

  const createMockArtifact = (id: string, state: ArtifactState = ARTIFACT_STATE.COOLDOWN) => ({
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

  const createMockPlayer = (): Player => ({
    id: 'player-1',
    name: 'Player1',
    connection: 'online',
    isBot: false,
    hero: 'Empty',
    resources: { agility: 50, rage: 30, light_mana: 20, dark_mana: 10, destruction_mana: 5 },
    artifacts: {
      'artifact-1': createMockArtifact('artifact-1', ARTIFACT_STATE.COOLDOWN),
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

  const mockArtifactStateService = {
    applyState: jest.fn(),
    clearDestroyedArtifacts: jest.fn(),
    updateStateNewRound: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspirationStrategy,
        {
          provide: ArtifactStateService,
          useValue: mockArtifactStateService,
        },
      ],
    }).compile();

    strategy = module.get<InspirationStrategy>(InspirationStrategy);
    artifactStateService = module.get(ArtifactStateService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSpellType', () => {
    it('should return INSPIRATION', () => {
      expect(strategy.getSpellType()).toBe(SPELL.INSPIRATION);
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
        spellId: SPELL.INSPIRATION as any,
        gameId: 'game-123',
        targets: [['artifact-1'], []],
      };
      animations = [];
      logParts = [];
    });

    it('should set ally artifact state to READY_TO_USE', () => {
      strategy.execute(gameState, player, data, animations, logParts);

      expect(artifactStateService.applyState).toHaveBeenCalledWith(
        player.artifacts['artifact-1'],
        ARTIFACT_STATE.READY_TO_USE,
        logParts
      );
    });
  });
});