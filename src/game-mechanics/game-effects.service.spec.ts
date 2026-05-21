
import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { GameEffectsService } from './game-effects.service';
import { SkillsStrategyFactory } from '../artifact/skills.factory';
import { ArtifactService } from '../artifact/artifact.service';
import { ARTIFACT_STATE, ArtifactGameState, Player } from '../game-state/types/game';
import { EFFECT, EFFECT_DURATION, EffectType } from './types/effect';
import { GameForLogic } from '../game-state/types/game-for-logic';

jest.mock('../artifact/constants/artifacts', () => ({
  ARTIFACTS: {
    'arcane_shield': { id: 'arcane_shield', name: 'Arcane Shield', skills: ['eat_dark_mana'] },
    'moon_staff': { id: 'moon_staff', name: 'Moon Staff', skills: null },
    'axe_of_the_berserker': { id: 'axe_of_the_berserker', name: 'Axe of the Berserker', skills: ['berserk'] },
  },
}));


jest.mock('../artifact/constants/skills', () => ({
  SKILLS: {
    'eat_dark_mana': { restrictions: ['process_only_in_new_state'] },
    'berserk': { restrictions: [] },
  },
}));


jest.mock('./constants/effects', () => ({
  EFFECTS: {
    'live_for_round': { id: 'live_for_round', name: 'Live For Round', duration: 'always', type: 'negative', number: null, dispellType: 'never' },
    'copy': { id: 'copy', name: 'Copy', duration: 'always', type: 'negative', number: null, dispellType: 'never' },
    'extra_move': { id: 'extra_move', name: 'Extra Move', duration: 'current_round', type: 'positive', number: null, dispellType: 'normal' },
    'berserk': { id: 'berserk', name: 'Berserk', duration: 'always', type: 'positive', number: null, dispellType: 'passive' },
  },
}));

describe('GameEffectsService', () => {
  let service: GameEffectsService;
  let skillsStrategyFactory: jest.Mocked<SkillsStrategyFactory>;
  let artifactService: jest.Mocked<ArtifactService>;

  const mockSkillsStrategyFactory = {
    getStrategy: jest.fn(),
  };

  const mockArtifactService = {
    destroyArtifact: jest.fn(),
  };

  const createMockArtifactState = (artifactId: string = 'arcane_shield', effects: EffectType[] = []): ArtifactGameState => ({
    id: 'artifact-1',
    artifactId,
    face: 'sword',
    state: ARTIFACT_STATE.READY_TO_USE,
    currentHp: 30,
    maxHp: 30,
    position: 1,
    line: 'front',
    skillCost: 2,
    effects,
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

  const mockStrategy = {
    execute: jest.fn(),
  };


  const getMockEffect = (effectId: string): EffectType => {
    const { EFFECTS } = require('./constants/effects');
    return EFFECTS[effectId];
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSkillsStrategyFactory.getStrategy.mockReturnValue(mockStrategy);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEffectsService,
        {
          provide: SkillsStrategyFactory,
          useValue: mockSkillsStrategyFactory,
        },
        {
          provide: ArtifactService,
          useValue: mockArtifactService,
        },
      ],
    }).compile();

    service = module.get<GameEffectsService>(GameEffectsService);
    skillsStrategyFactory = module.get(SkillsStrategyFactory);
    artifactService = module.get(ArtifactService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('removeEffect', () => {
    let artifact: ArtifactGameState;
    const logParts: string[] = [];

    beforeEach(() => {
      artifact = createMockArtifactState();
      logParts.length = 0;
    });

    it('should remove existing effect from artifact', () => {
      const effect = getMockEffect('extra_move');
      artifact.effects = [effect];

      service.removeEffect(artifact, effect, logParts);

      expect(artifact.effects).toHaveLength(0);
      expect(logParts[0]).toContain('Убран эффект');
    });

    it('should not remove effect that does not exist', () => {
      const effect = getMockEffect('extra_move');
      artifact.effects = [];

      service.removeEffect(artifact, effect, logParts);

      expect(artifact.effects).toHaveLength(0);
      expect(logParts).toHaveLength(0);
    });
  });

  describe('removeHeroEffect', () => {
    let player: Player;
    const logParts: string[] = [];

    beforeEach(() => {
      player = createMockPlayer();
      logParts.length = 0;
    });

    it('should remove existing effect from player', () => {
      const effect = getMockEffect('extra_move');
      player.effects = [effect];

      service.removeHeroEffect(player, effect, logParts);

      expect(player.effects).toHaveLength(0);
      expect(logParts[0]).toContain('Убран эффект');
    });

    it('should not remove effect that does not exist', () => {
      const effect = getMockEffect('extra_move');
      player.effects = [];

      service.removeHeroEffect(player, effect, logParts);

      expect(player.effects).toHaveLength(0);
      expect(logParts).toHaveLength(0);
    });
  });

  describe('applyEffect', () => {
    let artifact: ArtifactGameState;
    const logParts: string[] = [];

    beforeEach(() => {
      artifact = createMockArtifactState();
      logParts.length = 0;
    });

    it('should apply effect to artifact', () => {
      const effect = getMockEffect('extra_move');

      service.applyEffect(artifact, effect, logParts);

      expect(artifact.effects).toHaveLength(1);
      expect(artifact.effects[0]).toEqual(effect);
      expect(logParts[0]).toContain('Применил эффект');
    });
  });

  describe('applyHeroEffect', () => {
    let player: Player;
    const logParts: string[] = [];

    beforeEach(() => {
      player = createMockPlayer();
      logParts.length = 0;
    });

    it('should apply effect to player', () => {
      const effect = getMockEffect('extra_move');

      service.applyHeroEffect(player, effect, logParts);

      expect(player.effects).toHaveLength(1);
      expect(player.effects[0]).toEqual(effect);
      expect(logParts[0]).toContain('Применил эффект');
    });
  });

  describe('getEffect', () => {
    let artifact: ArtifactGameState;

    beforeEach(() => {
      artifact = createMockArtifactState();
    });

    it('should return effect if exists', () => {
      const effect = getMockEffect('extra_move');
      artifact.effects = [effect];

      const result = service.getEffect(artifact, 'extra_move' as any);

      expect(result).toEqual(effect);
    });

    it('should return undefined if effect does not exist', () => {
      const result = service.getEffect(artifact, 'extra_move' as any);

      expect(result).toBeUndefined();
    });
  });

  describe('getHeroEffects', () => {
    let player: Player;

    beforeEach(() => {
      player = createMockPlayer();
    });

    it('should return all effects of given type', () => {
      const effect1 = getMockEffect('extra_move');
      const effect2 = getMockEffect('extra_move');
      player.effects = [effect1, effect2];

      const result = service.getHeroEffects(player, 'extra_move' as any);

      expect(result).toHaveLength(2);
    });

    it('should return empty array if no effects of given type', () => {
      const result = service.getHeroEffects(player, 'extra_move' as any);

      expect(result).toHaveLength(0);
    });
  });

  describe('increaseEffect', () => {
    let artifact: ArtifactGameState;
    const logParts: string[] = [];

    beforeEach(() => {
      artifact = createMockArtifactState();
      logParts.length = 0;
    });

    it('should increase number of existing effect', () => {
      const effect = { ...getMockEffect('extra_move'), number: 1 };
      artifact.effects = [effect];

      service.increaseEffect(artifact, 'extra_move' as any, logParts);

      expect(artifact.effects[0].number).toBe(2);
    });

    it('should apply new effect if not exists', () => {
      service.increaseEffect(artifact, 'extra_move' as any, logParts);

      expect(artifact.effects).toHaveLength(1);
    });
  });

  describe('countHeroEffect', () => {
    let player: Player;

    beforeEach(() => {
      player = createMockPlayer();
    });

    it('should count number of effects of given type', () => {
      const effect1 = getMockEffect('extra_move');
      const effect2 = getMockEffect('extra_move');
      player.effects = [effect1, effect2];

      const result = service.countHeroEffect(player, 'extra_move' as any);

      expect(result).toBe(2);
    });

    it('should return 0 if no effects of given type', () => {
      const result = service.countHeroEffect(player, 'extra_move' as any);

      expect(result).toBe(0);
    });
  });

  describe('countEffect', () => {
    let artifact: ArtifactGameState;

    beforeEach(() => {
      artifact = createMockArtifactState();
    });

    it('should count number of effects of given type on artifact', () => {
      const effect1 = getMockEffect('extra_move');
      const effect2 = getMockEffect('extra_move');
      artifact.effects = [effect1, effect2];

      const result = service.countEffect(artifact, 'extra_move' as any);

      expect(result).toBe(2);
    });

    it('should return 0 if no effects of given type', () => {
      const result = service.countEffect(artifact, 'extra_move' as any);

      expect(result).toBe(0);
    });
  });

  describe('calculateNewStateEffects', () => {
    let gameState: GameForLogic;
    let player: Player;
    let enemy: Player;

    beforeEach(() => {
      gameState = createMockGameState();
      player = gameState.player;
      enemy = gameState.enemy;
    });

    it('should execute skills with PROCESS_ONLY_IN_NEW_STATE restriction', () => {
      const artifact = createMockArtifactState('arcane_shield');
      player.artifacts = { 'artifact-1': artifact };

      service.calculateNewStateEffects(gameState, player, enemy);

      expect(skillsStrategyFactory.getStrategy).toHaveBeenCalledWith('eat_dark_mana');
      expect(mockStrategy.execute).toHaveBeenCalled();
    });

    it('should skip broken artifacts', () => {
      const artifact = createMockArtifactState('arcane_shield');
      artifact.state = ARTIFACT_STATE.BREAKEN;
      player.artifacts = { 'artifact-1': artifact };

      service.calculateNewStateEffects(gameState, player, enemy);

      expect(skillsStrategyFactory.getStrategy).not.toHaveBeenCalled();
    });

    it('should skip artifacts with no skills', () => {
      const artifact = createMockArtifactState('moon_staff');
      player.artifacts = { 'artifact-1': artifact };

      service.calculateNewStateEffects(gameState, player, enemy);

      expect(skillsStrategyFactory.getStrategy).not.toHaveBeenCalled();
    });

    it('should process enemy artifacts as well', () => {
      const artifact = createMockArtifactState('arcane_shield');
      enemy.artifacts = { 'artifact-1': artifact };

      service.calculateNewStateEffects(gameState, player, enemy);

      expect(skillsStrategyFactory.getStrategy).toHaveBeenCalled();
    });
  });

  describe('checkNewRoundEffects', () => {
    let gameState: GameForLogic;

    beforeEach(() => {
      gameState = createMockGameState();
    });

    it('should destroy artifacts with LIVE_FOR_ROUND effect', async () => {
      const artifact = createMockArtifactState('arcane_shield');
      const liveForRoundEffect = getMockEffect('live_for_round');
      artifact.effects = [liveForRoundEffect];
      gameState.player.artifacts = { 'artifact-1': artifact };

      await service.checkNewRoundEffects(gameState);

      expect(artifactService.destroyArtifact).toHaveBeenCalledWith(gameState.player, artifact, []);
    });

    it('should destroy artifacts with COPY effect', async () => {
      const artifact = createMockArtifactState('arcane_shield');
      const copyEffect = getMockEffect('copy');
      artifact.effects = [copyEffect];
      gameState.player.artifacts = { 'artifact-1': artifact };

      await service.checkNewRoundEffects(gameState);

      expect(artifactService.destroyArtifact).toHaveBeenCalledWith(gameState.player, artifact, []);
    });

    it('should remove CURRENT_ROUND duration effects from artifacts', async () => {
      const artifact = createMockArtifactState('arcane_shield');
      const extraMoveEffect = getMockEffect('extra_move');
      artifact.effects = [extraMoveEffect];
      gameState.player.artifacts = { 'artifact-1': artifact };

      await service.checkNewRoundEffects(gameState);

      expect(artifact.effects).toHaveLength(0);
    });

    it('should remove CURRENT_ROUND duration effects from player', async () => {
      const extraMoveEffect = getMockEffect('extra_move');
      gameState.player.effects = [extraMoveEffect];

      await service.checkNewRoundEffects(gameState);

      expect(gameState.player.effects).toHaveLength(0);
    });

    it('should process enemy artifacts as well', async () => {
      const artifact = createMockArtifactState('arcane_shield');
      const liveForRoundEffect = getMockEffect('live_for_round');
      artifact.effects = [liveForRoundEffect];
      gameState.enemy.artifacts = { 'artifact-1': artifact };

      await service.checkNewRoundEffects(gameState);

      expect(artifactService.destroyArtifact).toHaveBeenCalledWith(gameState.enemy, artifact, []);
    });

    it('should process enemy player effects', async () => {
      const extraMoveEffect = getMockEffect('extra_move');
      gameState.enemy.effects = [extraMoveEffect];

      await service.checkNewRoundEffects(gameState);

      expect(gameState.enemy.effects).toHaveLength(0);
    });
  });
});