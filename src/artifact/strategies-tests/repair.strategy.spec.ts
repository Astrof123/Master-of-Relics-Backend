import { Test, TestingModule } from '@nestjs/testing';
import { RepairStrategy } from '../strategies/repair.strategy';
import { ArtifactStateService } from '../../game-mechanics/artifact-state.service';
import { CombatService } from '../../game-mechanics/combat.service';
import { ArtifactGameState, Player, ARTIFACT_STATE, LINE, ArtifactState } from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';

describe('RepairStrategy', () => {
  let strategy: RepairStrategy;
  let artifactStateService: jest.Mocked<ArtifactStateService>;
  let combatService: jest.Mocked<CombatService>;

  const createMockArtifact = (id: string = 'ally-artifact', state: ArtifactState = ARTIFACT_STATE.BREAKEN): ArtifactGameState => ({
    id,
    artifactId: 'test_artifact',
    face: 'sword',
    state,
    currentHp: 0,
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
      'ally-artifact': createMockArtifact('ally-artifact', ARTIFACT_STATE.BREAKEN),
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
        RepairStrategy,
        {
          provide: ArtifactStateService,
          useValue: mockArtifactStateService,
        },
        {
          provide: CombatService,
          useValue: mockCombatService,
        },
      ],
    }).compile();

    strategy = module.get<RepairStrategy>(RepairStrategy);
    artifactStateService = module.get(ArtifactStateService);
    combatService = module.get(CombatService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('getSkillType', () => {
    it('should return REPAIR', () => {
      expect(strategy.getSkillType()).toBe(SKILL.REPAIR);
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
      artifact = player.artifacts['ally-artifact'];
      data = {
        skillId: SKILL.REPAIR,
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        targets: [['ally-artifact'], []],
      };
      animations = [];
      logParts = [];
    });

    it('should apply COOLDOWN state to broken artifact', () => {
      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(artifactStateService.applyState).toHaveBeenCalledWith(
        player.artifacts['ally-artifact'],
        ARTIFACT_STATE.COOLDOWN,
        logParts
      );
    });

    it('should set artifact HP to 1', () => {
      const allyArtifact = player.artifacts['ally-artifact'];
      allyArtifact.currentHp = 0;

      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(allyArtifact.currentHp).toBe(1);
    });

    it('should add heal animation', () => {
      strategy.execute(gameState, player, artifact, data, animations, logParts);

      expect(animations[0]).toEqual({
        playerId: player.id,
        artifactGameId: 'ally-artifact',
        animation: ANIMATION.HEAL,
        value: 1,
      });
    });
  });
});