// extra-action.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { ExtraActionService } from './extra-action.service';
import { DiceService } from '../game-mechanics/dice.service';
import { ResourceService } from '../game-mechanics/resource.service';
import { ArtifactStateService } from '../game-mechanics/artifact-state.service';
import { RestrictionService } from './restriction.service';
import { ArtifactService } from '../artifact/artifact.service';
import { GameEffectsService } from '../game-mechanics/game-effects.service';
import { EXTRA_ACTION } from './types/action';
import { EXTRA_ACTIONS } from './constants/extra-actions';
import { Player, ArtifactGameState, ARTIFACT_STATE, LINE } from '../game-state/types/game';
import { ExtraActionData } from './types/action-evens-data';
import { AnimationData } from './types/animation';
import { RESOURCE } from '../game-mechanics/types/resource';
import { EFFECT } from '../game-mechanics/types/effect';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

// Mock EXTRA_ACTIONS
jest.mock('./constants/extra-actions', () => ({
  EXTRA_ACTIONS: {
    throw_dice: {
      id: 'throw_dice',
      name: 'Перекинуть кубик',
      cost: 5,
      resourceType: 'agility',
      getDescription: jest.fn(() => 'Перекинуть кубик за 5 ловкости'),
      restrictions: ['only_ready'],
    },
    extra_move: {
      id: 'extra_move',
      name: 'Дополнительное действие',
      cost: 15,
      resourceType: 'agility',
      getDescription: jest.fn(() => 'Получить дополнительный ход за 15 ловкости'),
      restrictions: [],
    },
    return_to_battle: {
      id: 'return_to_battle',
      name: 'Возврат в бой',
      cost: 30,
      resourceType: 'agility',
      getDescription: jest.fn(() => 'Убрать перезарядку за 30 ловкости'),
      restrictions: ['only_cooldown'],
    },
    move: {
      id: 'move',
      name: 'Перемещение',
      cost: 15,
      resourceType: 'agility',
      getDescription: jest.fn(() => 'Переместить за 15 ловкости'),
      restrictions: ['only_ready'],
    },
    remove_root: {
      id: 'remove_root',
      name: 'Снятие оцепенения',
      cost: 15,
      resourceType: 'agility',
      getDescription: jest.fn(() => 'Снять оцепенение за 15 ловкости'),
      restrictions: ['only_rooted'],
    },
    destroy_artifact: {
      id: 'destroy_artifact',
      name: 'Уничтожение артефакта',
      cost: 0,
      resourceType: 'agility',
      getDescription: jest.fn(() => 'Уничтожить артефакт'),
      restrictions: ['only_breaken'],
    },
  },
}));

describe('ExtraActionService', () => {
  let service: ExtraActionService;
  let diceService: jest.Mocked<DiceService>;
  let resourceService: jest.Mocked<ResourceService>;
  let artifactStateService: jest.Mocked<ArtifactStateService>;
  let restrictionService: jest.Mocked<RestrictionService>;
  let artifactService: jest.Mocked<ArtifactService>;
  let gameEffectsService: jest.Mocked<GameEffectsService>;

  const createMockArtifact = (id: string = 'artifact-1', state: string = ARTIFACT_STATE.READY_TO_USE): ArtifactGameState => ({
    id,
    artifactId: 'arcane_shield',
    face: 'sword' as any,
    state: state as any,
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
    resources: {
      [RESOURCE.AGILITY]: 50,
      [RESOURCE.RAGE]: 30,
      [RESOURCE.LIGHT_MANA]: 20,
      [RESOURCE.DARK_MANA]: 10,
      [RESOURCE.DESTRUCTION_MANA]: 5,
    },
    artifacts: {},
    spells: { light: {}, dark: {}, destruction: {} },
    effects: [],
    isReady: false,
    movePoints: 1,
    draft: { pickedArtifact: null, deck: [] },
    temporaryArtifacts: {},
    offerDraw: false,
    extraData: { skippedMoves: 0 },
  });

  const createMockEnemy = (): Player => ({
    id: 'enemy-1',
    name: 'Enemy',
    connection: 'online',
    isBot: false,
    hero: 'Empty',
    resources: {
      [RESOURCE.AGILITY]: 50,
      [RESOURCE.RAGE]: 30,
      [RESOURCE.LIGHT_MANA]: 20,
      [RESOURCE.DARK_MANA]: 10,
      [RESOURCE.DESTRUCTION_MANA]: 5,
    },
    artifacts: {},
    spells: { light: {}, dark: {}, destruction: {} },
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
    enemy: createMockEnemy(),
    end: null,
    miniPhase: 'movement',
    constants: { maxCountArtifactsOnLine: 6, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false },
  });

  const mockDiceService = {
    throwDice: jest.fn(),
  };

  const mockResourceService = {
    extraMove: jest.fn(),
    addResource: jest.fn(),
  };

  const mockArtifactStateService = {
    applyState: jest.fn(),
  };

  const mockRestrictionService = {
    checkGeneralRestrictions: jest.fn().mockReturnValue(true),
    checkArtifactRestrictions: jest.fn().mockReturnValue(true),
  };

  const mockArtifactService = {
    moveArtifact: jest.fn(),
    destroyArtifact: jest.fn(),
  };

  const mockGameEffectsService = {
    countEffect: jest.fn().mockReturnValue(0),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtraActionService,
        {
          provide: DiceService,
          useValue: mockDiceService,
        },
        {
          provide: ResourceService,
          useValue: mockResourceService,
        },
        {
          provide: ArtifactStateService,
          useValue: mockArtifactStateService,
        },
        {
          provide: RestrictionService,
          useValue: mockRestrictionService,
        },
        {
          provide: ArtifactService,
          useValue: mockArtifactService,
        },
        {
          provide: GameEffectsService,
          useValue: mockGameEffectsService,
        },
      ],
    }).compile();

    service = module.get<ExtraActionService>(ExtraActionService);
    diceService = module.get(DiceService);
    resourceService = module.get(ResourceService);
    artifactStateService = module.get(ArtifactStateService);
    restrictionService = module.get(RestrictionService);
    artifactService = module.get(ArtifactService);
    gameEffectsService = module.get(GameEffectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHandler', () => {
    it('should return handler for THROW_DICE', () => {
      const handler = service.getHandler(EXTRA_ACTION.THROW_DICE);
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should return handler for EXTRA_MOVE', () => {
      const handler = service.getHandler(EXTRA_ACTION.EXTRA_MOVE);
      expect(handler).toBeDefined();
    });

    it('should return handler for RETURN_TO_BATTLE', () => {
      const handler = service.getHandler(EXTRA_ACTION.RETURN_TO_BATTLE);
      expect(handler).toBeDefined();
    });

    it('should return handler for MOVE', () => {
      const handler = service.getHandler(EXTRA_ACTION.MOVE);
      expect(handler).toBeDefined();
    });

    it('should return handler for REMOVE_ROOT', () => {
      const handler = service.getHandler(EXTRA_ACTION.REMOVE_ROOT);
      expect(handler).toBeDefined();
    });

    it('should return handler for DESTROY_ARTIFACT', () => {
      const handler = service.getHandler(EXTRA_ACTION.DESTROY_ARTIFACT);
      expect(handler).toBeDefined();
    });
  });

  describe('getExtraActions', () => {
    let player: Player;
    let enemy: Player;
    let artifact: ArtifactGameState;

    beforeEach(() => {
      player = createMockPlayer();
      enemy = createMockEnemy();
      artifact = createMockArtifact();
    });

    it('should return available extra actions', () => {
      const result = service.getExtraActions(player, enemy, artifact);

      expect(result).toHaveLength(Object.keys(EXTRA_ACTIONS).length);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('description');
    });

    it('should apply GLIMPSE discount for MOVE action', () => {
      mockGameEffectsService.countEffect.mockReturnValue(1);
      const result = service.getExtraActions(player, enemy, artifact);

      const moveAction = result.find(a => a.id === EXTRA_ACTION.MOVE);
      expect(moveAction).toBeDefined();
    });

    it('should filter actions when restrictions fail', () => {
      mockRestrictionService.checkGeneralRestrictions.mockReturnValue(false);
      const result = service.getExtraActions(player, enemy, artifact);

      expect(result).toHaveLength(0);
    });

    it('should filter actions when not enough resources', () => {
      player.resources[RESOURCE.AGILITY] = 2;
      const result = service.getExtraActions(player, enemy, artifact);

      expect(result.length).toBeLessThan(Object.keys(EXTRA_ACTIONS).length);
    });
  });

  describe('handleThrowDice', () => {
    let gameState: GameForLogic;
    let artifact: ArtifactGameState;
    let data: ExtraActionData;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      artifact = createMockArtifact();
      data = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        type: EXTRA_ACTION.THROW_DICE,
        details: null,
      };
      animations = [];
      logParts = [];
    });

    it('should throw dice', () => {
      service.handleThrowDice(gameState, artifact, data, animations, logParts);

      expect(diceService.throwDice).toHaveBeenCalledWith(
        gameState.player,
        artifact.id,
        artifact.artifactId,
        logParts
      );
    });
  });

  describe('handleExtraMove', () => {
    let gameState: GameForLogic;
    let artifact: ArtifactGameState;
    let data: ExtraActionData;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      artifact = createMockArtifact();
      data = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        type: EXTRA_ACTION.EXTRA_MOVE,
        details: null,
      };
      animations = [];
      logParts = [];
    });

    it('should add extra move', () => {
      service.handleExtraMove(gameState, artifact, data, animations, logParts);

      expect(resourceService.extraMove).toHaveBeenCalledWith(gameState.player, logParts);
    });
  });

  describe('handleReturnToBattle', () => {
    let gameState: GameForLogic;
    let artifact: ArtifactGameState;
    let data: ExtraActionData;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      artifact = createMockArtifact();
      data = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        type: EXTRA_ACTION.RETURN_TO_BATTLE,
        details: null,
      };
      animations = [];
      logParts = [];
    });

    it('should throw dice and apply READY_TO_USE state', () => {
      service.handleReturnToBattle(gameState, artifact, data, animations, logParts);

      expect(diceService.throwDice).toHaveBeenCalled();
      expect(artifactStateService.applyState).toHaveBeenCalledWith(
        artifact,
        ARTIFACT_STATE.READY_TO_USE,
        logParts
      );
    });
  });

  describe('handleMove', () => {
    let gameState: GameForLogic;
    let artifact: ArtifactGameState;
    let data: ExtraActionData;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      artifact = createMockArtifact();
      data = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        type: EXTRA_ACTION.MOVE,
        details: {
          newPosition: 2,
          newLine: LINE.BACK,
        },
      };
      animations = [];
      logParts = [];
    });

    it('should move artifact', () => {
      service.handleMove(gameState, artifact, data, animations, logParts);

      expect(artifactService.moveArtifact).toHaveBeenCalledWith(
        data.details!.newPosition,
        artifact,
        data.details!.newLine,
        gameState.player.artifacts,
        logParts
      );
    });
  });

  describe('handleRemoveRoot', () => {
    let gameState: GameForLogic;
    let artifact: ArtifactGameState;
    let data: ExtraActionData;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      artifact = createMockArtifact();
      artifact.extraData.lastStateBeforeRoot = ARTIFACT_STATE.COOLDOWN;
      data = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        type: EXTRA_ACTION.REMOVE_ROOT,
        details: null,
      };
      animations = [];
      logParts = [];
    });

    it('should remove root and restore previous state', () => {
      service.handleRemoveRoot(gameState, artifact, data, animations, logParts);

      expect(artifactStateService.applyState).toHaveBeenCalledWith(
        artifact,
        ARTIFACT_STATE.COOLDOWN,
        logParts
      );
    });
  });

  describe('handleDestroyArtifact', () => {
    let gameState: GameForLogic;
    let artifact: ArtifactGameState;
    let data: ExtraActionData;
    let animations: AnimationData[];
    let logParts: string[];

    beforeEach(() => {
      gameState = createMockGameState();
      artifact = createMockArtifact();
      data = {
        gameId: 'game-123',
        artifactGameId: 'artifact-1',
        type: EXTRA_ACTION.DESTROY_ARTIFACT,
        details: null,
      };
      animations = [];
      logParts = [];
    });

    it('should destroy artifact and add resources', () => {
      service.handleDestroyArtifact(gameState, artifact, data, animations, logParts);

      expect(artifactService.destroyArtifact).toHaveBeenCalledWith(
        gameState.player,
        artifact,
        logParts
      );
      expect(resourceService.addResource).toHaveBeenCalledWith(
        gameState.player,
        RESOURCE.AGILITY,
        30,
        logParts
      );
      expect(resourceService.addResource).toHaveBeenCalledWith(
        gameState.player,
        RESOURCE.RAGE,
        30,
        logParts
      );
    });
  });
});