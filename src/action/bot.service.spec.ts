
import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { ActionResolverService } from './action-resolver.service';
import { PhaseService } from '../phase/phase.service';
import { Player, ArtifactGameState, ARTIFACT_STATE, LINE } from '../game-state/types/game';
import { UseFaceData, UseSkillData } from './types/action-evens-data';
import { AnimationData } from './types/animation';
import { SKILL } from '../artifact/types/skill';
import { RESOURCE } from '../game-mechanics/types/resource';
import { GameForLogic } from 'src/game-state/types/game-for-logic';

jest.mock('crypto', () => ({
  randomInt: jest.fn(() => 0),
}));

describe('BotService', () => {
  let service: BotService;
  let actionResolverService: jest.Mocked<ActionResolverService>;
  let phaseService: jest.Mocked<PhaseService>;

  const createMockFace = (): { id: string; description: string; attackTargets: string[] | null; healTargets: string[] | null } => ({
    id: 'sword',
    description: 'Melee attack',
    attackTargets: ['enemy-artifact'],
    healTargets: null,
  });

  const createFreshGameState = () => {
    const artifact1 = {
      id: 'artifact-1',
      artifactId: 'arcane_shield',
      state: ARTIFACT_STATE.COOLDOWN,
      skillCost: 2,
      availableActions: {
        face: {
          attackTargets: ['enemy-artifact'],
          healTargets: null,
        },
        skills: [{
          id: SKILL.FEAR,
          possibleTargets: [['ally1'], ['enemy1']],
          countTargetEnemy: 1,
          countTargetAllies: 0,
        }],
      },
    };

    const artifact2 = {
      id: 'artifact-2',
      artifactId: 'arcane_shield',
      state: ARTIFACT_STATE.COOLDOWN,
      skillCost: 2,
      availableActions: {
        face: null,
        skills: [],
      },
    };

    return {
      id: 'game-123',
      player: { id: 'player-1' },
      enemy: {
        id: 'bot-1',
        name: 'Bot',
        isBot: true,
        resources: { [RESOURCE.RAGE]: 30 },
        artifacts: {
          'artifact-1': artifact1,
          'artifact-2': artifact2,
        },
      },
    };
  };

  const createMockAvailableActions = (hasSkills: boolean = true, hasFace: boolean = true): any => ({
    face: hasFace ? createMockFace() : null,
    skills: hasSkills ? [{ id: SKILL.FEAR, description: 'Fear', possibleTargets: [['ally1'], ['enemy1']], countAnyTarget: 0, countTargetEnemy: 1, countTargetAllies: 0 }] : [],
    extraActions: [],
  });

  const createMockArtifact = (id: string = 'artifact-1', state: string = ARTIFACT_STATE.READY_TO_USE, skillCost: number | null = 2, hasSkills: boolean = true, hasFace: boolean = true): ArtifactGameState => ({
    id,
    artifactId: 'arcane_shield',
    face: 'sword' as any,
    state: state as any,
    currentHp: 30,
    maxHp: 30,
    position: 1,
    line: LINE.FRONT,
    skillCost,
    effects: [],
    availableActions: createMockAvailableActions(hasSkills, hasFace),
    extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
  });

  const createMockBotState = (rage: number = 30): Player => ({
    id: 'bot-1',
    name: 'Bot',
    connection: 'online',
    isBot: true,
    hero: 'Empty',
    resources: {
      [RESOURCE.AGILITY]: 50,
      [RESOURCE.RAGE]: rage,
      [RESOURCE.LIGHT_MANA]: 20,
      [RESOURCE.DARK_MANA]: 10,
      [RESOURCE.DESTRUCTION_MANA]: 5,
    },
    artifacts: {
      'artifact-1': createMockArtifact('artifact-1', ARTIFACT_STATE.READY_TO_USE, 2, true, true),
      'artifact-2': createMockArtifact('artifact-2', ARTIFACT_STATE.COOLDOWN, 2, false, false),
    },
    spells: { light: {}, dark: {}, destruction: {} },
    effects: [],
    isReady: false,
    movePoints: 1,
    draft: { pickedArtifact: null, deck: [] },
    temporaryArtifacts: {},
    offerDraw: false,
    extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
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
    extraData: { skippedMoves: 0, countActionsSinceStartTurn: 1 },
  });

  const createMockGameState = (): GameForLogic => ({
    id: 'game-123',
    phase: 'battle',
    name: 'Test Game',
    currentTurn: 'player-1',
    logs: [],
    player: createMockPlayer(),
    enemy: createMockBotState(),
    end: null,
    miniPhase: 'movement',
    constants: { maxCountArtifactsOnLine: 6, timerDraft: null, timerMovement: null, timerTurn: null, isNewRound: false, countActionsFromStartGame: 1 },
  });

  const mockActionResolverService = {
    useSkillResolve: jest.fn(),
    useFaceResolve: jest.fn(),
    endRoundResolve: jest.fn(),
    endTurnResolve: jest.fn(),
  };

  const mockPhaseService = {
    newRound: jest.fn(),
    setEndGame: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        {
          provide: ActionResolverService,
          useValue: mockActionResolverService,
        },
        {
          provide: PhaseService,
          useValue: mockPhaseService,
        },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    actionResolverService = module.get(ActionResolverService);
    phaseService = module.get(PhaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('doRandomAction', () => {
    let gameState: GameForLogic;
    let animations: AnimationData[];

    beforeEach(() => {
      gameState = createMockGameState();
      animations = [];
    });

    it('should perform skill action if possible', async () => {
      await service.doRandomAction(gameState, animations);

      expect(actionResolverService.useSkillResolve).toHaveBeenCalled();
      expect(actionResolverService.endTurnResolve).toHaveBeenCalled();
      expect(actionResolverService.endRoundResolve).not.toHaveBeenCalled();
    });

    it('should perform face action if skill not possible', async () => {
      const botState: Player = gameState.enemy;
      const artifact = Object.values(botState.artifacts)[0];
      artifact.skillCost = 100;
      artifact.availableActions!.skills = [];

      await service.doRandomAction(gameState, animations);

      expect(actionResolverService.useFaceResolve).toHaveBeenCalled();
      expect(actionResolverService.endTurnResolve).toHaveBeenCalled();
    });

    it('should not use skill if not enough rage', async () => {
      const botState = gameState.enemy;
      botState.resources[RESOURCE.RAGE] = 1;

      await service.doRandomAction(gameState, animations);

      expect(actionResolverService.useSkillResolve).not.toHaveBeenCalled();
      expect(actionResolverService.useFaceResolve).toHaveBeenCalled();
    });
  });

  describe('doSkillAction', () => {
    let gameState: GameForLogic;
    let botState: Player;
    let randomArtifact: ArtifactGameState;
    let animations: AnimationData[];

    beforeEach(() => {
      gameState = createMockGameState();
      botState = gameState.enemy;
      randomArtifact = Object.values(botState.artifacts)[0];
      animations = [];
    });

    it('should return false if skillCost is null', () => {
      randomArtifact.skillCost = null;
      const result = service.doSkillAction(gameState, botState, randomArtifact, animations);

      expect(result).toBe(false);
      expect(actionResolverService.useSkillResolve).not.toHaveBeenCalled();
    });

    it('should return false if availableActions is null', () => {
      randomArtifact.availableActions = null;
      const result = service.doSkillAction(gameState, botState, randomArtifact, animations);

      expect(result).toBe(false);
      expect(actionResolverService.useSkillResolve).not.toHaveBeenCalled();
    });

    it('should return false if not enough rage', () => {
      botState.resources[RESOURCE.RAGE] = 1;
      const result = service.doSkillAction(gameState, botState, randomArtifact, animations);

      expect(result).toBe(false);
      expect(actionResolverService.useSkillResolve).not.toHaveBeenCalled();
    });

    it('should return false if no skills available', () => {
      randomArtifact.availableActions!.skills = [];
      const result = service.doSkillAction(gameState, botState, randomArtifact, animations);

      expect(result).toBe(false);
      expect(actionResolverService.useSkillResolve).not.toHaveBeenCalled();
    });

    it('should execute skill and return true', () => {
      const result = service.doSkillAction(gameState, botState, randomArtifact, animations);

      expect(result).toBe(true);
      expect(actionResolverService.useSkillResolve).toHaveBeenCalledWith(
        gameState,
        botState,
        randomArtifact,
        expect.objectContaining({
          skillId: SKILL.FEAR,
          artifactGameId: randomArtifact.id,
          gameId: gameState.id,
        }),
        animations
      );
    });

  it('should return false when skillCost is null and availableActions is null', () => {
    const gameState = createMockGameState();
    const botState = gameState.enemy;
    const artifact = Object.values(botState.artifacts)[0];
    artifact.skillCost = null;
    artifact.availableActions = null;
    const animations: any[] = [];

    const result = service.doSkillAction(gameState, botState, artifact, animations);

    expect(result).toBe(false);
    expect(actionResolverService.useSkillResolve).not.toHaveBeenCalled();
  });

  it('should return false when skills array is empty', () => {
    const gameState = createMockGameState();
    const botState = gameState.enemy;
    const artifact = Object.values(botState.artifacts)[0];
    artifact.availableActions!.skills = [];
    const animations: any[] = [];

    const result = service.doSkillAction(gameState, botState, artifact, animations);

    expect(result).toBe(false);
    expect(actionResolverService.useSkillResolve).not.toHaveBeenCalled();
  });

  it('should execute skill and return true (covering line 104)', () => {
    const gameState = createMockGameState();
    const botState = gameState.enemy;
    const artifact = Object.values(botState.artifacts)[0];
    const animations: any[] = [];

    artifact.skillCost = 2;
    artifact.availableActions!.skills = [{
      id: SKILL.FEAR,
      possibleTargets: [['ally1'], ['enemy1']],
      countTargetEnemy: 1,
      countTargetAllies: 0,
      countAnyTarget: 0,
      description: ""
    }];
    botState.resources[RESOURCE.RAGE] = 10;

    const result = service.doSkillAction(gameState, botState, artifact, animations);

    expect(result).toBe(true);
    expect(actionResolverService.useSkillResolve).toHaveBeenCalled();
  });
  });

    describe('doFaceAction', () => {
        let gameState: GameForLogic;
        let botState: Player;
        let randomArtifact: ArtifactGameState;
        let animations: AnimationData[];

        beforeEach(() => {
        gameState = createMockGameState();
        botState = gameState.enemy;
        randomArtifact = Object.values(botState.artifacts)[0];
        animations = [];
        });

        it('should return false if availableActions is null', () => {
        randomArtifact.availableActions = null;
        const result = service.doFaceAction(gameState, botState, randomArtifact, animations);

        expect(result).toBe(false);
        expect(actionResolverService.useFaceResolve).not.toHaveBeenCalled();
        });

        it('should return false if face is null', () => {
        randomArtifact.availableActions!.face = null;
        const result = service.doFaceAction(gameState, botState, randomArtifact, animations);

        expect(result).toBe(false);
        expect(actionResolverService.useFaceResolve).not.toHaveBeenCalled();
        });

        it('should execute face action and return true', () => {
        const result = service.doFaceAction(gameState, botState, randomArtifact, animations);

        expect(result).toBe(true);
        expect(actionResolverService.useFaceResolve).toHaveBeenCalledWith(
            gameState,
            botState,
            randomArtifact,
            expect.objectContaining({
            artifactGameId: randomArtifact.id,
            gameId: gameState.id,
            }),
            animations
        );
        });

        it('should handle heal targets correctly', () => {
        randomArtifact.availableActions!.face = {
            id: 'heal',
            description: 'Heal',
            attackTargets: null,
            healTargets: ['ally1', 'ally2'],
        };

        const result = service.doFaceAction(gameState, botState, randomArtifact, animations);

        expect(result).toBe(true);
        expect(actionResolverService.useFaceResolve).toHaveBeenCalledWith(
            gameState,
            botState,
            randomArtifact,
            expect.objectContaining({
            healTarget: 'ally1',
            attackTarget: undefined,
            }),
            animations
        );
        });
        it('should handle face action with no heal or attack targets', () => {
            const gameState = createMockGameState();
            const botState = gameState.enemy;
            const artifact = Object.values(botState.artifacts)[0];
            artifact.availableActions!.face = {
            id: 'empty',
            description: 'Empty',
            attackTargets: null,
            healTargets: null,
            };
            const animations: any[] = [];

            const result = service.doFaceAction(gameState, botState, artifact, animations);

            expect(result).toBe(true);
            expect(actionResolverService.useFaceResolve).toHaveBeenCalledWith(
            gameState,
            botState,
            artifact,
            expect.objectContaining({
                artifactGameId: artifact.id,
                gameId: gameState.id,
                attackTarget: undefined,
                healTarget: undefined,
            }),
            animations
            );
    });

    it('should handle face action with only heal targets', () => {
        const gameState = createMockGameState();
        const botState = gameState.enemy;
        const artifact = Object.values(botState.artifacts)[0];
        artifact.availableActions!.face = {
        id: 'heal',
        description: 'Heal',
        attackTargets: null,
        healTargets: ['ally1', 'ally2'],
        };
        const animations: any[] = [];

        const result = service.doFaceAction(gameState, botState, artifact, animations);

        expect(result).toBe(true);
        expect(actionResolverService.useFaceResolve).toHaveBeenCalledWith(
        gameState,
        botState,
        artifact,
        expect.objectContaining({
            healTarget: 'ally1',
        }),
        animations
        );
    });

    it('should handle face action with only attack targets', () => {
        const gameState = createMockGameState();
        const botState = gameState.enemy;
        const artifact = Object.values(botState.artifacts)[0];
        artifact.availableActions!.face = {
        id: 'sword',
        description: 'Sword',
        attackTargets: ['enemy1', 'enemy2'],
        healTargets: null,
        };
        const animations: any[] = [];

        const result = service.doFaceAction(gameState, botState, artifact, animations);

        expect(result).toBe(true);
        expect(actionResolverService.useFaceResolve).toHaveBeenCalledWith(
        gameState,
        botState,
        artifact,
        expect.objectContaining({
            attackTarget: 'enemy1',
        }),
        animations
        );
    });
    
  });
});