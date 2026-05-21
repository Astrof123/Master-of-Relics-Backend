
import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactService } from '../../artifact/artifact.service';
import { Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { UseSpellData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { VolcanoStrategy } from '../strategies/volcano.strategy';
import { SPELL } from '../types/spell';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ARTIFACT, SPAWN_POSITION } from '../../artifact/types/artifact';

describe('VolcanoStrategy', () => {
  let strategy: VolcanoStrategy;
  let artifactService: jest.Mocked<ArtifactService>;

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

  const mockArtifactService = {
    createArtifactState: jest.fn(),
    spawnArtifact: jest.fn(),
    getNeighbors: jest.fn(),
    getFaceAction: jest.fn(),
    destroyArtifact: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolcanoStrategy,
        {
          provide: ArtifactService,
          useValue: mockArtifactService,
        },
      ],
    }).compile();

    strategy = module.get<VolcanoStrategy>(VolcanoStrategy);
    artifactService = module.get(ArtifactService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSpellType', () => {
    it('should return VOLCANO', () => {
      expect(strategy.getSpellType()).toBe(SPELL.VOLCANO);
    });
  });

  describe('execute', () => {
    let gameState: GameForLogic;
    let player: Player;
    let data: UseSpellData;
    let animations: AnimationData[];
    let logParts: string[];
    let mockDestructionShard: any;

    beforeEach(() => {
      gameState = createMockGameState();
      player = gameState.player;
      data = {
        spellId: SPELL.VOLCANO as any,
        gameId: 'game-123',
        targets: [[], []],
      };
      animations = [];
      logParts = [];

      mockDestructionShard = {
        id: 'destruction-shard',
        artifactId: ARTIFACT.DESTRUCTION_SHARD,
        state: ARTIFACT_STATE.READY_TO_USE,
      };
      mockArtifactService.createArtifactState.mockReturnValue(mockDestructionShard);
      mockArtifactService.spawnArtifact.mockReturnValue(undefined);
    });

    it('should create and spawn Destruction Shard on front line', () => {
      strategy.execute(gameState, player, data, animations, logParts);

      expect(artifactService.createArtifactState).toHaveBeenCalledWith(
        player.artifacts,
        ARTIFACT.DESTRUCTION_SHARD
      );
      expect(artifactService.spawnArtifact).toHaveBeenCalledWith(
        mockDestructionShard,
        SPAWN_POSITION.FRONT_LINE,
        null,
        null,
        player.artifacts,
        logParts
      );
    });
  });
});