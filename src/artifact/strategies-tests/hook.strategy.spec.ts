import { Test, TestingModule } from '@nestjs/testing';
import { HookStrategy } from '../strategies/hook.strategy';
import { ArtifactService } from '../artifact.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE, Line } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';

jest.mock('crypto', () => ({
  randomInt: jest.fn(() => 0),
}));

describe('HookStrategy', () => {
  let strategy: HookStrategy;
  let artifactService: jest.Mocked<ArtifactService>;

  const createMockArtifact = (id: string = 'enemy-artifact', line: Line = LINE.BACK): ArtifactGameState => ({
    id,
    artifactId: 'test_artifact',
    face: 'sword',
    state: ARTIFACT_STATE.READY_TO_USE,
    currentHp: 30,
    maxHp: 30,
    position: 1,
    line,
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
      'enemy-artifact': createMockArtifact('enemy-artifact', LINE.BACK),
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

  const mockArtifactService = {
    moveArtifact: jest.fn(),
    getNeighbors: jest.fn(),
    createArtifactState: jest.fn(),
    spawnArtifact: jest.fn(),
    destroyArtifact: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HookStrategy,
        {
          provide: ArtifactService,
          useValue: mockArtifactService,
        },
      ],
    }).compile();

    strategy = module.get<HookStrategy>(HookStrategy);
    artifactService = module.get(ArtifactService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return HOOK', () => {
      expect(strategy.getSkillType()).toBe(SKILL.HOOK);
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
      artifact = gameState.player.artifacts['enemy-artifact'];
      data = {
        skillId: SKILL.HOOK,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [[], ['enemy-artifact']],
      };
      animations = [];
      logParts = [];
    });

    it('should move enemy artifact to front line', () => {
      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(artifactService.moveArtifact).toHaveBeenCalledWith(
        0,
        gameState.enemy.artifacts['enemy-artifact'],
        LINE.FRONT,
        gameState.enemy.artifacts,
        logParts
      );
    });
  });
});