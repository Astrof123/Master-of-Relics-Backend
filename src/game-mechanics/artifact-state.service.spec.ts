import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactStateService } from './artifact-state.service';
import { ARTIFACT_STATE, ArtifactGameState, ArtifactState, Player } from '../game-state/types/game';
import { GameForLogic } from '../game-state/types/game-for-logic';
import { LogHelper } from '../action/helpers/logHelper';


jest.mock('../action/helpers/logHelper', () => ({
  LogHelper: {
    getAppliedStateLog: jest.fn((artifactName, state) => `${artifactName} перешёл в состояние ${state}`),
  },
}));


jest.mock('../artifact/constants/artifacts', () => ({
  ARTIFACTS: {
    'arcane_shield': { id: 'arcane_shield', name: 'Arcane Shield' },
    'moon_staff': { id: 'moon_staff', name: 'Moon Staff' },
    'axe_of_the_berserker': { id: 'axe_of_the_berserker', name: 'Axe of the Berserker' },
  },
}));

describe('ArtifactStateService', () => {
  let service: ArtifactStateService;

  const createMockArtifact = (
    id: string = 'artifact-1',
    artifactId: string = 'arcane_shield',
    state: ArtifactState = ARTIFACT_STATE.READY_TO_USE,
    extraData: any = { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE }
  ): ArtifactGameState => ({
    id,
    artifactId,
    face: 'sword',
    state,
    currentHp: 30,
    maxHp: 30,
    position: 1,
    line: 'front',
    skillCost: 2,
    effects: [],
    availableActions: null,
    extraData,
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
      providers: [ArtifactStateService],
    }).compile();

    service = module.get<ArtifactStateService>(ArtifactStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyState', () => {
    let artifact: ArtifactGameState;
    const logParts: string[] = [];

    beforeEach(() => {
      artifact = createMockArtifact();
      logParts.length = 0;
    });

    it('should apply new state to artifact', () => {
      service.applyState(artifact, ARTIFACT_STATE.COOLDOWN, logParts);

      expect(artifact.state).toBe(ARTIFACT_STATE.COOLDOWN);
    });

    it('should add log about state change', () => {
      service.applyState(artifact, ARTIFACT_STATE.COOLDOWN, logParts);

      expect(logParts).toHaveLength(1);
      expect(logParts[0]).toBe('Arcane Shield перешёл в состояние cooldown');
    });

    it('should save last state before ROOTED when current state is READY_TO_USE', () => {
      artifact.state = ARTIFACT_STATE.READY_TO_USE;
      artifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.READY_TO_USE;

      service.applyState(artifact, ARTIFACT_STATE.ROOTED, logParts);

      expect(artifact.extraData.lastStateBeforeRoot).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should save last state before ROOTED when current state is COOLDOWN', () => {
      artifact.state = ARTIFACT_STATE.COOLDOWN;
      artifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.COOLDOWN;

      service.applyState(artifact, ARTIFACT_STATE.ROOTED, logParts);

      expect(artifact.extraData.lastStateBeforeRoot).toBe(ARTIFACT_STATE.COOLDOWN);
    });

    it('should save last state before DREAM when current state is READY_TO_USE', () => {
      artifact.state = ARTIFACT_STATE.READY_TO_USE;
      artifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.READY_TO_USE;

      service.applyState(artifact, ARTIFACT_STATE.DREAM, logParts);

      expect(artifact.extraData.lastStateBeforeRoot).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should preserve last state when applying non-ROOTED/non-DREAM state', () => {
      artifact.state = ARTIFACT_STATE.READY_TO_USE;
      artifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.READY_TO_USE;

      service.applyState(artifact, ARTIFACT_STATE.BREAKEN, logParts);

      expect(artifact.extraData.lastStateBeforeRoot).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should not overwrite last state if already set', () => {
      artifact.state = ARTIFACT_STATE.READY_TO_USE;
      artifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.COOLDOWN;

      service.applyState(artifact, ARTIFACT_STATE.ROOTED, logParts);

      expect(artifact.extraData.lastStateBeforeRoot).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should work with different artifact types', () => {
      const moonStaffArtifact = createMockArtifact('artifact-2', 'moon_staff', ARTIFACT_STATE.READY_TO_USE);

      service.applyState(moonStaffArtifact, ARTIFACT_STATE.STUNNED, logParts);

      expect(moonStaffArtifact.state).toBe(ARTIFACT_STATE.STUNNED);
    });
  });

  describe('clearDestroyedArtifacts', () => {
    let gameState: GameForLogic;

    beforeEach(() => {
      gameState = createMockGameState();
    });

    it('should remove destroyed artifacts from player', () => {
      const destroyedArtifact = createMockArtifact('destroyed-1', 'arcane_shield', ARTIFACT_STATE.DESTROYED);
      const normalArtifact = createMockArtifact('normal-1', 'moon_staff', ARTIFACT_STATE.READY_TO_USE);
      
      gameState.player.artifacts = {
        'destroyed-1': destroyedArtifact,
        'normal-1': normalArtifact,
      };

      service.clearDestroyedArtifacts(gameState);

      expect(gameState.player.artifacts['destroyed-1']).toBeUndefined();
      expect(gameState.player.artifacts['normal-1']).toBeDefined();
    });

    it('should remove destroyed artifacts from enemy', () => {
      const destroyedArtifact = createMockArtifact('destroyed-1', 'arcane_shield', ARTIFACT_STATE.DESTROYED);
      const normalArtifact = createMockArtifact('normal-1', 'moon_staff', ARTIFACT_STATE.READY_TO_USE);
      
      gameState.enemy.artifacts = {
        'destroyed-1': destroyedArtifact,
        'normal-1': normalArtifact,
      };

      service.clearDestroyedArtifacts(gameState);

      expect(gameState.enemy.artifacts['destroyed-1']).toBeUndefined();
      expect(gameState.enemy.artifacts['normal-1']).toBeDefined();
    });

    it('should handle empty artifacts', () => {
      gameState.player.artifacts = {};
      gameState.enemy.artifacts = {};

      expect(() => service.clearDestroyedArtifacts(gameState)).not.toThrow();
    });
  });

  describe('updateStateNewRound', () => {
    let gameState: GameForLogic;

    beforeEach(() => {
      gameState = createMockGameState();
    });

    it('should set all player artifacts to READY_TO_USE', () => {
      const artifact1 = createMockArtifact('artifact-1', 'arcane_shield', ARTIFACT_STATE.COOLDOWN);
      const artifact2 = createMockArtifact('artifact-2', 'moon_staff', ARTIFACT_STATE.STUNNED);
      
      gameState.player.artifacts = {
        'artifact-1': artifact1,
        'artifact-2': artifact2,
      };
      gameState.enemy.artifacts = {};

      service.updateStateNewRound(gameState);

      expect(artifact1.state).toBe(ARTIFACT_STATE.READY_TO_USE);
      expect(artifact2.state).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should set all enemy artifacts to READY_TO_USE', () => {
      const artifact1 = createMockArtifact('artifact-1', 'arcane_shield', ARTIFACT_STATE.COOLDOWN);
      const artifact2 = createMockArtifact('artifact-2', 'moon_staff', ARTIFACT_STATE.STUNNED);
      
      gameState.player.artifacts = {};
      gameState.enemy.artifacts = {
        'artifact-1': artifact1,
        'artifact-2': artifact2,
      };

      service.updateStateNewRound(gameState);

      expect(artifact1.state).toBe(ARTIFACT_STATE.READY_TO_USE);
      expect(artifact2.state).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should skip BREAKEN artifacts', () => {
      const brokenArtifact = createMockArtifact('broken-1', 'arcane_shield', ARTIFACT_STATE.BREAKEN);
      const normalArtifact = createMockArtifact('normal-1', 'moon_staff', ARTIFACT_STATE.COOLDOWN);
      
      gameState.player.artifacts = {
        'broken-1': brokenArtifact,
        'normal-1': normalArtifact,
      };
      gameState.enemy.artifacts = {};

      service.updateStateNewRound(gameState);

      expect(brokenArtifact.state).toBe(ARTIFACT_STATE.BREAKEN);
      expect(normalArtifact.state).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should skip DESTROYED artifacts', () => {
      const destroyedArtifact = createMockArtifact('destroyed-1', 'arcane_shield', ARTIFACT_STATE.DESTROYED);
      const normalArtifact = createMockArtifact('normal-1', 'moon_staff', ARTIFACT_STATE.COOLDOWN);
      
      gameState.player.artifacts = {
        'destroyed-1': destroyedArtifact,
        'normal-1': normalArtifact,
      };
      gameState.enemy.artifacts = {};

      service.updateStateNewRound(gameState);

      expect(destroyedArtifact.state).toBe(ARTIFACT_STATE.DESTROYED);
      expect(normalArtifact.state).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should handle empty artifacts', () => {
      gameState.player.artifacts = {};
      gameState.enemy.artifacts = {};

      expect(() => service.updateStateNewRound(gameState)).not.toThrow();
    });

    it('should handle both player and enemy artifacts', () => {
      const playerArtifact = createMockArtifact('player-artifact', 'arcane_shield', ARTIFACT_STATE.COOLDOWN);
      const enemyArtifact = createMockArtifact('enemy-artifact', 'moon_staff', ARTIFACT_STATE.STUNNED);
      
      gameState.player.artifacts = {
        'player-artifact': playerArtifact,
      };
      gameState.enemy.artifacts = {
        'enemy-artifact': enemyArtifact,
      };

      service.updateStateNewRound(gameState);

      expect(playerArtifact.state).toBe(ARTIFACT_STATE.READY_TO_USE);
      expect(enemyArtifact.state).toBe(ARTIFACT_STATE.READY_TO_USE);
    });

    it('should preserve artifacts already in READY_TO_USE state', () => {
      const readyArtifact = createMockArtifact('ready-1', 'arcane_shield', ARTIFACT_STATE.READY_TO_USE);
      
      gameState.player.artifacts = {
        'ready-1': readyArtifact,
      };
      gameState.enemy.artifacts = {};

      service.updateStateNewRound(gameState);

      expect(readyArtifact.state).toBe(ARTIFACT_STATE.READY_TO_USE);
    });
  });
});