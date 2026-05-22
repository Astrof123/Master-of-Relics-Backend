import { Test, TestingModule } from '@nestjs/testing';
import { HardeningStrategy } from '../strategies/hardening.strategy';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';

describe('HardeningStrategy', () => {
  let strategy: HardeningStrategy;

  const createMockArtifact = (id: string, currentHp: number = 30, maxHp: number = 30): ArtifactGameState => ({
    id,
    artifactId: 'test_artifact',
    face: 'sword',
    state: ARTIFACT_STATE.READY_TO_USE,
    currentHp,
    maxHp,
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
      'ally-artifact': createMockArtifact('ally-artifact', 25, 30),
      'enemy-artifact': createMockArtifact('enemy-artifact', 20, 30),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HardeningStrategy],
    }).compile();

    strategy = module.get<HardeningStrategy>(HardeningStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return HARDENING', () => {
      expect(strategy.getSkillType()).toBe(SKILL.HARDENING);
    });
  });

  describe('execute', () => {
    let gameState: GameForLogic;
    let player: Player;
    let artifact: ArtifactGameState;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      player = gameState.player;
      artifact = createMockArtifact('artifact-1');
      animations = [];
      logParts = [];
    });

    it('should increase ally artifact max HP and adjust current HP', () => {
      const data: UseSkillData = {
        skillId: SKILL.HARDENING,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [['ally-artifact'], []],
      };

      const allyArtifact = player.artifacts['ally-artifact'];
      const oldMaxHp = allyArtifact.maxHp;
      const oldCurrentHp = allyArtifact.currentHp;

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(allyArtifact.maxHp).toBe(oldMaxHp + 10);
      expect(allyArtifact.currentHp).toBe(oldCurrentHp);
    });

    it('should increase enemy artifact max HP and adjust current HP', () => {
      const data: UseSkillData = {
        skillId: SKILL.HARDENING,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [[], ['enemy-artifact']],
      };

      const enemyArtifact = gameState.enemy.artifacts['enemy-artifact'];
      const oldMaxHp = enemyArtifact.maxHp;
      const oldCurrentHp = enemyArtifact.currentHp;

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(enemyArtifact.maxHp).toBe(oldMaxHp + 10);
      expect(enemyArtifact.currentHp).toBe(oldCurrentHp);
    });

    it('should cap current HP at new max HP when increasing', () => {
      const data: UseSkillData = {
        skillId: SKILL.HARDENING,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [['ally-artifact'], []],
      };

      const allyArtifact = player.artifacts['ally-artifact'];
      allyArtifact.currentHp = 35;
      allyArtifact.maxHp = 30;

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(allyArtifact.maxHp).toBe(40);
      expect(allyArtifact.currentHp).toBe(35);
    });
  });
});