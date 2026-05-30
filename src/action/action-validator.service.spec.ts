
import { Test, TestingModule } from '@nestjs/testing';
import { ActionValidatorService } from './action-validator.service';
import { RestrictionService } from './restriction.service';
import { GameEffectsService } from '../game-mechanics/game-effects.service';
import {
    Player,
    ArtifactGameState,
    ARTIFACT_STATE,
    LINE,
    ArtifactAvailableActions,
    SpellGameState,
} from '../game-state/types/game';
import {
    UseFaceData,
    UseSkillData,
    UseSpellData,
    ExtraActionData,
    ToggleReadyMovementData,
} from './types/action-evens-data';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { MINIPHASE, PHASE } from '../game-state/types/phase';
import { RESOURCE } from '../game-mechanics/types/resource';
import { SKILL } from '../artifact/types/skill';
import { SPELL } from '../spell/types/spell';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from '../game-mechanics/constants/settings';
import { RESTRICTION } from './types/restriction';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { CommonException } from 'src/common/utils/error-handler';
import { EXTRA_ACTION } from './types/action';


jest.mock('./constants/extra-actions', () => ({
    EXTRA_ACTIONS: {
        throw_dice: {
            cost: 5,
            resourceType: 'agility',
            restrictions: ['only_ready'],
            getDescription: jest.fn(),
        },
        move: {
            cost: 15,
            resourceType: 'agility',
            restrictions: ['only_ready'],
            getDescription: jest.fn(),
        },
        return_to_battle: {
            cost: 30,
            resourceType: 'agility',
            restrictions: ['only_cooldown'],
            getDescription: jest.fn(),
        },
    },
}));


jest.mock('../artifact/constants/skills', () => ({
    SKILLS: {
        fear: {
            countAnyTarget: 0,
            countTargetAllies: 0,
            countTargetEnemy: 1,
            cost: 15,
            restrictions: [],
        },
    },
}));


jest.mock('../spell/constants/spells', () => ({
    SPELLS: {
        piercing_bolt: {
            name: 'Piercing Bolt',
            type: 'destruction',
            cost: 15,
            countAnyTarget: 0,
            countTargetAllies: 0,
            countTargetEnemy: 1,
            restrictions: [],
        },
    },
}));

jest.mock('../spell/spell.helper', () => ({
    SpellHelper: {
        getResource: jest.fn(() => 'destruction_mana'),
    },
}));

describe('ActionValidatorService', () => {
    let service: ActionValidatorService;
    let restrictionService: jest.Mocked<RestrictionService>;
    let gameEffectsService: jest.Mocked<GameEffectsService>;

    const createMockFace = (): {
        id: string;
        description: string;
        attackTargets: string[] | null;
        healTargets: string[] | null;
    } => ({
        id: 'sword',
        description: 'Melee attack',
        attackTargets: ['enemy-artifact'],
        healTargets: null,
    });

    const createMockAvailableActions = (): ArtifactAvailableActions => ({
        face: createMockFace(),
        skills: [
            {
                id: SKILL.FEAR,
                description: 'Fear',
                possibleTargets: [[], []],
                countAnyTarget: 0,
                countTargetEnemy: 1,
                countTargetAllies: 0,
            },
        ],
        extraActions: [{ id: 'throw_dice' as any, description: 'Throw dice' }],
    });

    const createMockArtifact = (
        id: string = 'artifact-1',
        state: string = ARTIFACT_STATE.READY_TO_USE,
    ): ArtifactGameState => ({
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
        availableActions: createMockAvailableActions(),
        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
    });

    const createMockSpellState = (): SpellGameState => ({
        id: SPELL.PIERCING_BOLT,
        description: 'Piercing Bolt',
        cost: 15,
        cooldown: false,
        canUse: true,
        possibleTargets: [[], []],
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
    });

    const createMockPlayer = (id: string = 'player-1'): Player => ({
        id,
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
        artifacts: {
            'artifact-1': createMockArtifact('artifact-1'),
        },
        spells: {
            light: {},
            dark: {},
            destruction: {
                [SPELL.PIERCING_BOLT]: createMockSpellState(),
            },
        },
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
    phase: PHASE.BATTLE,
    name: 'Test Game',
    currentTurn: 'player-1',
    logs: [],
    player: {
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
        [RESOURCE.DESTRUCTION_MANA]: 15,
        },
        artifacts: {
        'artifact-1': createMockArtifact('artifact-1'),
        },
        spells: {
        light: {},
        dark: {},
        destruction: {
            [SPELL.PIERCING_BOLT]: {
            id: SPELL.PIERCING_BOLT,
            description: 'Piercing Bolt',
            cost: 15,
            cooldown: false,
            canUse: true,
            possibleTargets: [[], []],
            countAnyTarget: 0,
            countTargetEnemy: 1,
            countTargetAllies: 0,
            },
        },
        },
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 1 },
    },
    enemy: {
        id: 'player-2',
        name: 'Player2',
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
        artifacts: {
        'enemy-artifact': createMockArtifact('enemy-artifact'),
        },
        spells: {
        light: {},
        dark: {},
        destruction: {},
        },
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
    },
    end: null,
    miniPhase: MINIPHASE.BATTLE,
    constants: {
        maxCountArtifactsOnLine: 6,
        timerDraft: null,
        timerMovement: null,
        timerTurn: null,
        isNewRound: false,
        countActionsFromStartGame: 0,
    },
    });

    const mockRestrictionService = {
        checkGeneralRestrictions: jest.fn().mockReturnValue(true),
        checkArtifactRestrictions: jest.fn().mockReturnValue(true),
        checkSpellRestrictions: jest.fn().mockReturnValue(true),
    };

    const mockGameEffectsService = {
        countEffect: jest.fn().mockReturnValue(0),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionValidatorService,
                {
                    provide: RestrictionService,
                    useValue: mockRestrictionService,
                },
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
            ],
        }).compile();

        service = module.get<ActionValidatorService>(ActionValidatorService);
        restrictionService = module.get(RestrictionService);
        gameEffectsService = module.get(GameEffectsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('useFaceValidator', () => {
        let gameState: GameForLogic;
        let artifact: ArtifactGameState;
        let data: UseFaceData;

        beforeEach(() => {
            gameState = createMockGameState();
            artifact = gameState.player.artifacts['artifact-1'];
            data = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                attackTarget: 'enemy-artifact',
                healTarget: null,
            };
        });

        it('should validate successfully', () => {
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).not.toThrow();
        });

        it('should throw if game ended', () => {
            gameState.end = {
                winner: 'player-1',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if phase is not battle', () => {
            gameState.phase = PHASE.DRAFT;
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if miniPhase is not battle', () => {
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if not player turn', () => {
            gameState.currentTurn = 'player-2';
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if no move points', () => {
            gameState.player.movePoints = 0;
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if artifact not ready', () => {
            artifact.state = ARTIFACT_STATE.COOLDOWN;
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if attack target is invalid', () => {
            data.attackTarget = 'invalid-target';
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if heal target is invalid', () => {
            artifact.availableActions!.face = {
                id: 'heal',
                description: 'Heal',
                attackTargets: null,
                healTargets: ['valid-target'],
            };
            data.attackTarget = null;
            data.healTarget = 'invalid-target';
            expect(() =>
                service.useFaceValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });
    });

    describe('useSkillValidator', () => {
        let gameState: GameForLogic;
        let artifact: ArtifactGameState;
        let data: UseSkillData;

        beforeEach(() => {
            gameState = createMockGameState();
            artifact = gameState.player.artifacts['artifact-1'];
            gameState.enemy.artifacts = {
                'enemy-artifact': createMockArtifact('enemy-artifact'),
            };
            data = {
                skillId: SKILL.FEAR,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], ['enemy-artifact']],
            };
        });

        it('should validate successfully', () => {
            expect(() =>
                service.useSkillValidator(gameState, artifact, data),
            ).not.toThrow();
        });

        it('should throw if skill not found', () => {
            data.skillId = 'unknown_skill' as any;
            expect(() =>
                service.useSkillValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if skill not available for artifact', () => {
            artifact.availableActions!.skills = [];
            expect(() =>
                service.useSkillValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if targets length is invalid', () => {
            data.targets = [[]];
            expect(() =>
                service.useSkillValidator(gameState, artifact, data),
            ).toThrow();
        });

        it('should throw if general restrictions fail', () => {
            restrictionService.checkGeneralRestrictions.mockReturnValue(false);
            expect(() =>
                service.useSkillValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });
    });

    describe('useSpellValidator', () => {
        let gameState: GameForLogic;
        let data: UseSpellData;

        beforeEach(() => {
            gameState = createMockGameState();
            gameState.player.spells = {
                light: {},
                dark: {},
                destruction: {
                    [SPELL.PIERCING_BOLT]: {
                        id: SPELL.PIERCING_BOLT,
                        description: 'Piercing Bolt',
                        cost: 15,
                        cooldown: false,
                        canUse: true,
                        possibleTargets: [[], []],
                        countAnyTarget: 0,
                        countTargetEnemy: 1,
                        countTargetAllies: 0,
                    },
                },
            };
            data = {
                spellId: SPELL.PIERCING_BOLT,
                gameId: 'game-123',
                targets: [[], []],
            };
        });

        it('should throw if spell not found', () => {
            data.spellId = 'unknown_spell' as any;
            expect(() => service.useSpellValidator(gameState, data)).toThrow(
                ActionException,
            );
        });
    });

    describe('endTurnValidator', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
        });

        it('should validate successfully', () => {
            expect(() => service.endTurnValidator(gameState)).not.toThrow();
        });

        it('should throw if game ended', () => {
            gameState.end = {
                winner: 'player-1',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            expect(() => service.endTurnValidator(gameState)).toThrow(
                ActionException,
            );
        });
    });

    describe('giveUpValidator', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
        });

        it('should validate successfully', () => {
            expect(() => service.giveUpValidator(gameState)).not.toThrow();
        });

        it('should throw if game ended', () => {
            gameState.end = {
                winner: 'player-1',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            expect(() => service.giveUpValidator(gameState)).toThrow(
                ActionException,
            );
        });
    });

    describe('drawValidator', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
        });

        it('should validate successfully', () => {
            expect(() => service.drawValidator(gameState)).not.toThrow();
        });

        it('should throw if game ended', () => {
            gameState.end = {
                winner: 'player-1',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            expect(() => service.drawValidator(gameState)).toThrow(
                ActionException,
            );
        });

        it('should throw if miniPhase is not battle', () => {
            gameState.phase = PHASE.DRAFT;
            expect(() => service.drawValidator(gameState)).toThrow(
                ActionException,
            );
        });
    });

    describe('endRoundValidator', () => {
        let gameState: GameForLogic;

        beforeEach(() => {
            gameState = createMockGameState();
        });

        it('should validate successfully', () => {
            expect(() => service.endRoundValidator(gameState)).not.toThrow();
        });
    });

    describe('extraActionValidator', () => {
        let gameState: GameForLogic;
        let artifact: ArtifactGameState;
        let data: ExtraActionData;

        beforeEach(() => {
            gameState = createMockGameState();
            artifact = gameState.player.artifacts['artifact-1'];
            data = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                type: 'throw_dice' as any,
                details: null,
            };
            restrictionService.checkGeneralRestrictions.mockReturnValue(true);
            restrictionService.checkArtifactRestrictions.mockReturnValue(true);
        });

        it('should validate successfully', () => {
            expect(() =>
                service.extraActionValidator(gameState, artifact, data),
            ).not.toThrow();
        });

        it('should throw if no extra actions available', () => {
            artifact.availableActions!.extraActions = [];
            expect(() =>
                service.extraActionValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if action type is invalid', () => {
            data.type = 'invalid_action' as any;
            expect(() =>
                service.extraActionValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if not enough resources', () => {
            gameState.player.resources[RESOURCE.AGILITY] = 2;
            expect(() =>
                service.extraActionValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });

        it('should throw if MOVE action without details', () => {
            data.type = 'move' as any;
            data.details = null;
            expect(() =>
                service.extraActionValidator(gameState, artifact, data),
            ).toThrow(ActionException);
        });
    });

    describe('toggleReadyMovementValidator', () => {
        let gameState: GameForLogic;
        let data: ToggleReadyMovementData;

        beforeEach(() => {
            gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            data = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: 0,
                    },
                },
            };
        });

        it('should validate successfully', () => {
            expect(() =>
                service.toggleReadyMovementValidator(gameState, data),
            ).not.toThrow();
        });

        it('should throw if game ended', () => {
            gameState.end = {
                winner: 'player-1',
                winner_prize: 100,
                loser_prize: 50,
                draw_prize: 75,
            };
            expect(() =>
                service.toggleReadyMovementValidator(gameState, data),
            ).toThrow(ActionException);
        });

        it('should throw if phase is not battle', () => {
            gameState.phase = PHASE.DRAFT;
            expect(() =>
                service.toggleReadyMovementValidator(gameState, data),
            ).toThrow(ActionException);
        });

        it('should throw if miniPhase is not MOVEMENT', () => {
            gameState.miniPhase = MINIPHASE.BATTLE;
            expect(() =>
                service.toggleReadyMovementValidator(gameState, data),
            ).toThrow(ActionException);
        });

        it('should throw if artifacts count mismatch', () => {
            data.artifactsWithNewPosition = {};
            expect(() =>
                service.toggleReadyMovementValidator(gameState, data),
            ).toThrow(ActionException);
        });
    });
describe('endTurnValidator - additional coverage', () => {
  let gameState: GameForLogic;

  beforeEach(() => {
    gameState = createMockGameState();
  });

  it('should throw NO_ACTIONS_TAKEN if countActionsSinceStartTurn < 1', () => {
    gameState.player.extraData.countActionsSinceStartTurn = 0;
    
    expect(() => service.endTurnValidator(gameState)).toThrow(ActionException);
  });

  it('should validate successfully when actions were taken', () => {
    gameState.player.extraData.countActionsSinceStartTurn = 2;
    
    expect(() => service.endTurnValidator(gameState)).not.toThrow();
  });
});

describe('useSkillValidator - additional coverage for cost check', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseSkillData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    gameState.enemy.artifacts = {
      'enemy-artifact': createMockArtifact('enemy-artifact'),
    };
    data = {
      skillId: SKILL.FEAR,
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      targets: [[], ['enemy-artifact']],
    };
    artifact.skillCost = 15;
    gameState.player.resources[RESOURCE.RAGE] = 10;
  });

  it('should not throw when skillCost is null', () => {
    artifact.skillCost = null;
    
    expect(() => service.useSkillValidator(gameState, artifact, data)).not.toThrow();
  });
});

describe('drawValidator - additional coverage', () => {
  let gameState: GameForLogic;

  beforeEach(() => {
    gameState = createMockGameState();
  });

  it('should throw if phase is not battle', () => {
    gameState.phase = PHASE.DRAFT;
    
    expect(() => service.drawValidator(gameState)).toThrow(ActionException);
  });
});

describe('useFaceValidator - additional coverage for null cases', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseFaceData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    data = {
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      attackTarget: null,
      healTarget: null,
    };
  });

  it('should throw if availableActions is null', () => {
    artifact.availableActions = null;
    
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow();
  });

  it('should throw if face is null', () => {
    artifact.availableActions!.face = null;
    
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow();
  });

  it('should throw if attack target is null but attackTargets exist', () => {
    artifact.availableActions!.face = {
      id: 'sword',
      description: 'Melee attack',
      attackTargets: ['enemy1', 'enemy2'],
      healTargets: null,
    };
    data.attackTarget = null;
    
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw if heal target is null but healTargets exist', () => {
    artifact.availableActions!.face = {
      id: 'heal',
      description: 'Heal',
      attackTargets: null,
      healTargets: ['ally1', 'ally2'],
    };
    data.healTarget = null;
    
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow(ActionException);
  });
});



describe('extraActionValidator - additional coverage', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: ExtraActionData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    data = {
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      type: 'throw_dice' as any,
      details: null,
    };
    restrictionService.checkGeneralRestrictions.mockReturnValue(true);
    restrictionService.checkArtifactRestrictions.mockReturnValue(true);
  });

  it('should throw IMPOSSIBLE_ACTION if general restrictions fail', () => {
    restrictionService.checkGeneralRestrictions.mockReturnValue(false);
    
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw IMPOSSIBLE_ACTION if artifact restrictions fail', () => {
    restrictionService.checkArtifactRestrictions.mockReturnValue(false);
    
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should handle GLIMPSE effect for MOVE action', () => {
    gameEffectsService.countEffect.mockReturnValue(1);
    data.type = 'move' as any;
    data.details = { newPosition: 1, newLine: LINE.FRONT };
    
    expect(() => service.extraActionValidator(gameState, artifact, data)).not.toThrow();
  });
});

describe('toggleReadyMovementValidator - additional coverage', () => {
  let gameState: GameForLogic;
  let data: ToggleReadyMovementData;

  beforeEach(() => {
    gameState = createMockGameState();
    gameState.miniPhase = MINIPHASE.MOVEMENT;
    const mockArtifact = { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 };
    data = {
      gameId: 'game-123',
      artifactsWithNewPosition: {
        'artifact-1': mockArtifact,
      },
    };
  });

  it('should throw INVALID_DATA if artifact does not exist', () => {
    data.artifactsWithNewPosition = {
      'non-existent': { ...data.artifactsWithNewPosition['artifact-1'] },
    };
    
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA if front line position out of bounds', () => {
    const invalidArtifact = { ...data.artifactsWithNewPosition['artifact-1'], position: 10, line: LINE.FRONT };
    data.artifactsWithNewPosition = {
      'artifact-1': invalidArtifact,
    };
    
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA if position already taken on front line', () => {
    const artifact1 = { ...data.artifactsWithNewPosition['artifact-1'], position: 0, line: LINE.FRONT };
    const artifact2 = { ...data.artifactsWithNewPosition['artifact-1'], id: 'artifact-2', position: 0, line: LINE.FRONT };
    data.artifactsWithNewPosition = {
      'artifact-1': artifact1,
      'artifact-2': artifact2,
    };
    
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });
});

describe('useSkillValidator - additional coverage for targets validation', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseSkillData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    gameState.enemy.artifacts = {
      'enemy-artifact': createMockArtifact('enemy-artifact'),
    };
    gameState.player.artifacts = {
      'artifact-1': artifact,
    };
    data = {
      skillId: SKILL.FEAR,
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      targets: [[], ['enemy-artifact']],
    };
    artifact.skillCost = 2;
    gameState.player.resources[RESOURCE.RAGE] = 30;
  });

  it('should throw INVALID_TARGETS if ally target does not exist', () => {
    data.targets = [['non-existent-ally'], []];
    
    expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw INVALID_TARGETS if enemy target does not exist', () => {
    data.targets = [[], ['non-existent-enemy']];
    
    expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw NOT_ENOUGH_RESOURCES when skillCost exceeds rage', () => {
    artifact.skillCost = 50;
    gameState.player.resources[RESOURCE.RAGE] = 30;
    
    expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw IMPOSSIBLE_ACTION when artifact restrictions fail', () => {
    restrictionService.checkArtifactRestrictions.mockReturnValue(false);
    
    expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
  });
});


describe('endTurnValidator - additional coverage for NO_ACTIONS_TAKEN', () => {
  let gameState: GameForLogic;

  beforeEach(() => {
    gameState = createMockGameState();
    gameState.player.extraData.countActionsSinceStartTurn = 0;
  });

  it('should throw NO_ACTIONS_TAKEN when no actions taken', () => {
    expect(() => service.endTurnValidator(gameState)).toThrow(ActionException);
  });
});

describe('toggleReadyMovementValidator - additional coverage for back line', () => {
  let gameState: GameForLogic;
  let data: ToggleReadyMovementData;

  beforeEach(() => {
    gameState = createMockGameState();
    gameState.miniPhase = MINIPHASE.MOVEMENT;
    const mockArtifact = { ...gameState.player.artifacts['artifact-1'], line: LINE.BACK, position: 0 };
    data = {
      gameId: 'game-123',
      artifactsWithNewPosition: {
        'artifact-1': mockArtifact,
      },
    };
  });

  it('should throw INVALID_DATA if back line position out of bounds', () => {
    const invalidArtifact = { ...data.artifactsWithNewPosition['artifact-1'], position: 10, line: LINE.BACK };
    data.artifactsWithNewPosition = {
      'artifact-1': invalidArtifact,
    };
    
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA if position already taken on back line', () => {
    const artifact1 = { ...data.artifactsWithNewPosition['artifact-1'], position: 0, line: LINE.BACK };
    const artifact2 = { ...data.artifactsWithNewPosition['artifact-1'], id: 'artifact-2', position: 0, line: LINE.BACK };
    data.artifactsWithNewPosition = {
      'artifact-1': artifact1,
      'artifact-2': artifact2,
    };
    
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });
});

describe('toggleReadyMovementValidator - additional coverage for count mismatch', () => {
  let gameState: GameForLogic;
  let data: ToggleReadyMovementData;

  beforeEach(() => {
    gameState = createMockGameState();
    gameState.miniPhase = MINIPHASE.MOVEMENT;
    gameState.player.artifacts = {
      'artifact-1': createMockArtifact('artifact-1'),
      'artifact-2': createMockArtifact('artifact-2'),
    };
    data = {
      gameId: 'game-123',
      artifactsWithNewPosition: {
        'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 },
      },
    };
  });

  it('should throw INVALID_DATA when artifact count mismatch', () => {
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });
});

describe('useFaceValidator - additional coverage for missing targets', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseFaceData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    data = {
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      attackTarget: null,
      healTarget: null,
    };
  });

  it('should not throw if attackTargets exist but attackTarget is undefined', () => {
    artifact.availableActions!.face = {
      id: 'sword',
      description: 'Melee attack',
      attackTargets: ['enemy1', 'enemy2'],
      healTargets: null,
    };
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow(ActionException);
  });
});

describe('extraActionValidator - additional coverage for GLIMPSE effect', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: ExtraActionData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    data = {
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      type: 'return_to_battle' as any,
      details: null,
    };
    restrictionService.checkGeneralRestrictions.mockReturnValue(true);
    restrictionService.checkArtifactRestrictions.mockReturnValue(true);
  });

  it('should handle GLIMPSE effect for RETURN_TO_BATTLE action', () => {
    gameEffectsService.countEffect.mockReturnValue(1);
    
    expect(() => service.extraActionValidator(gameState, artifact, data)).not.toThrow();
  });
});

describe('useSkillValidator - additional coverage for any target logic', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseSkillData;

  beforeEach(() => {
    const mockSkills = require('../artifact/constants/skills');
    mockSkills.SKILLS.fear.countAnyTarget = 2;
    mockSkills.SKILLS.fear.countTargetAllies = 1;
    mockSkills.SKILLS.fear.countTargetEnemy = 1;

    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    gameState.player.artifacts = {
      'artifact-1': artifact,
      'ally1': createMockArtifact('ally1'),
    };
    gameState.enemy.artifacts = {
      'enemy1': createMockArtifact('enemy1'),
    };
    data = {
      skillId: SKILL.FEAR,
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      targets: [['ally1'], ['enemy1']],
    };
  });

  it('should validate successfully with any targets', () => {
    expect(() => service.useSkillValidator(gameState, artifact, data)).not.toThrow();
  });
});

describe('useFaceValidator - additional coverage for edge cases', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseFaceData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    data = {
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      attackTarget: 'enemy-artifact',
      healTarget: null,
    };
  });

  it('should throw INTERNAL_SERVER_ERROR if availableActions is null', () => {
    artifact.availableActions = null;
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow(CommonException);
  });

  it('should throw INTERNAL_SERVER_ERROR if face is null', () => {
    artifact.availableActions!.face = null;
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow(CommonException);
  });

  it('should throw INVALID_ATTACK_TARGET if attackTarget is null but attackTargets exist', () => {
    artifact.availableActions!.face = {
      id: 'sword',
      description: 'Melee attack',
      attackTargets: ['enemy1', 'enemy2'],
      healTargets: null,
    };
    data.attackTarget = null;
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw INVALID_HEAL_TARGET if healTarget is invalid', () => {
    artifact.availableActions!.face = {
      id: 'heal',
      description: 'Heal',
      attackTargets: null,
      healTargets: ['ally1', 'ally2'],
    };
    data.attackTarget = null;
    data.healTarget = 'invalid-ally';
    expect(() => service.useFaceValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should validate when attackTargets is empty array', () => {
    artifact.availableActions!.face = {
      id: 'sword',
      description: 'Melee attack',
      attackTargets: [],
      healTargets: null,
    };
    data.attackTarget = null;
    expect(() => service.useFaceValidator(gameState, artifact, data)).not.toThrow();
  });

  it('should validate when healTargets is empty array', () => {
    artifact.availableActions!.face = {
      id: 'heal',
      description: 'Heal',
      attackTargets: null,
      healTargets: [],
    };
    data.attackTarget = null;
    data.healTarget = null;
    expect(() => service.useFaceValidator(gameState, artifact, data)).not.toThrow();
  });
});

describe('useSkillValidator - additional coverage for edge cases', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseSkillData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    gameState.enemy.artifacts = {
      'enemy-artifact': createMockArtifact('enemy-artifact'),
      'enemy1': createMockArtifact('enemy1'),
    };
    gameState.player.artifacts = {
      'artifact-1': artifact,
      'ally1': createMockArtifact('ally1'),
    };
    data = {
      skillId: SKILL.FEAR,
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      targets: [[], ['enemy-artifact']],
    };
    artifact.skillCost = 2;
    gameState.player.resources[RESOURCE.RAGE] = 30;
    
    restrictionService.checkGeneralRestrictions.mockReturnValue(true);
    restrictionService.checkArtifactRestrictions.mockReturnValue(true);
  });


  describe('with any targets', () => {
    beforeEach(() => {
      const mockSkills = require('../artifact/constants/skills');
      const originalFear = { ...mockSkills.SKILLS.fear };
      mockSkills.SKILLS.fear = {
        ...originalFear,
        countAnyTarget: 2,
        countTargetAllies: 1,
        countTargetEnemy: 1,
        restrictions: [],
      };
      
      data.targets = [['ally1'], ['enemy1']];
    });

    afterEach(() => {
      jest.resetModules();
    });

    it('should throw INVALID_TARGETS when allies count is invalid', () => {
      data.targets = [[], ['enemy1']];
      expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
    });

    it('should throw INVALID_TARGETS when allies count exceeds any + allies', () => {
      data.targets = [['ally1', 'ally2', 'ally3'], ['enemy1']];
      expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
    });

    it('should throw INVALID_TARGETS when enemies count is invalid', () => {
      data.targets = [['ally1'], []];
      expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
    });

    it('should validate with correct any targets distribution', () => {
      data.targets = [['ally1'], ['enemy1']];
      expect(() => service.useSkillValidator(gameState, artifact, data)).not.toThrow();
    });
  });
});

describe('endTurnValidator - additional coverage', () => {
  let gameState: GameForLogic;

  beforeEach(() => {
    gameState = createMockGameState();
  });

  it('should throw NO_ACTIONS_TAKEN when countActionsSinceStartTurn is 0', () => {
    gameState.player.extraData.countActionsSinceStartTurn = 0;
    expect(() => service.endTurnValidator(gameState)).toThrow(ActionException);
  });

  it('should validate when countActionsSinceStartTurn is >= 1', () => {
    gameState.player.extraData.countActionsSinceStartTurn = 1;
    expect(() => service.endTurnValidator(gameState)).not.toThrow();
  });
});

describe('giveUpValidator - additional coverage', () => {
  let gameState: GameForLogic;

  beforeEach(() => {
    gameState = createMockGameState();
  });

  it('should validate when game not ended', () => {
    expect(() => service.giveUpValidator(gameState)).not.toThrow();
  });

  it('should throw PHASE_NOT_BATTLE when game ended', () => {
    gameState.end = {
      winner: 'player-1',
      winner_prize: 100,
      loser_prize: 50,
      draw_prize: 75,
    };
    expect(() => service.giveUpValidator(gameState)).toThrow(ActionException);
  });
});

describe('drawValidator - additional coverage', () => {
  let gameState: GameForLogic;

  beforeEach(() => {
    gameState = createMockGameState();
  });

  it('should validate when conditions are met', () => {
    expect(() => service.drawValidator(gameState)).not.toThrow();
  });

  it('should throw PHASE_NOT_BATTLE when game ended', () => {
    gameState.end = {
      winner: 'player-1',
      winner_prize: 100,
      loser_prize: 50,
      draw_prize: 75,
    };
    expect(() => service.drawValidator(gameState)).toThrow(ActionException);
  });

  it('should throw PHASE_NOT_BATTLE when phase is not battle', () => {
    gameState.phase = PHASE.DRAFT;
    expect(() => service.drawValidator(gameState)).toThrow(ActionException);
  });
});

describe('endRoundValidator - additional coverage', () => {
  let gameState: GameForLogic;

  beforeEach(() => {
    gameState = createMockGameState();
  });

  it('should validate when game is in battle phase', () => {
    expect(() => service.endRoundValidator(gameState)).not.toThrow();
  });

  it('should throw if game ended', () => {
    gameState.end = {
      winner: 'player-1',
      winner_prize: 100,
      loser_prize: 50,
      draw_prize: 75,
    };
    expect(() => service.endRoundValidator(gameState)).toThrow(ActionException);
  });
});

describe('extraActionValidator - additional coverage for all scenarios', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: ExtraActionData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    data = {
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      type: EXTRA_ACTION.THROW_DICE,
      details: null,
    };
    restrictionService.checkGeneralRestrictions.mockReturnValue(true);
    restrictionService.checkArtifactRestrictions.mockReturnValue(true);
  });

  it('should throw INTERNAL_SERVER_ERROR if availableActions is null', () => {
    artifact.availableActions = null;
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(CommonException);
  });

  it('should throw IMPOSSIBLE_ACTION if no extra actions available', () => {
    artifact.availableActions!.extraActions = [];
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw IMPOSSIBLE_ACTION for invalid action type', () => {
    data.type = 'invalid_action' as any;
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw IMPOSSIBLE_ACTION when general restrictions fail', () => {
    restrictionService.checkGeneralRestrictions.mockReturnValue(false);
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw IMPOSSIBLE_ACTION when artifact restrictions fail', () => {
    restrictionService.checkArtifactRestrictions.mockReturnValue(false);
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw NOT_ENOUGH_RESOURCES when insufficient resources', () => {
    gameState.player.resources[RESOURCE.AGILITY] = 2;
    expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should validate when resources are sufficient', () => {
    gameState.player.resources[RESOURCE.AGILITY] = 10;
    expect(() => service.extraActionValidator(gameState, artifact, data)).not.toThrow();
  });

  describe('with GLIMPSE effect', () => {
    beforeEach(() => {
      gameEffectsService.countEffect.mockReturnValue(1);
    });

    it('should set cost to 0 for MOVE action with GLIMPSE', () => {
      data.type = EXTRA_ACTION.MOVE;
      data.details = { newPosition: 1, newLine: LINE.FRONT };
      gameState.player.resources[RESOURCE.AGILITY] = 0;
      expect(() => service.extraActionValidator(gameState, artifact, data)).not.toThrow();
    });

    it('should set cost to 15 for RETURN_TO_BATTLE action with GLIMPSE', () => {
      data.type = EXTRA_ACTION.RETURN_TO_BATTLE;
      gameState.player.resources[RESOURCE.AGILITY] = 10;
      expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
    });
  });

  describe('MOVE action', () => {
    beforeEach(() => {
      data.type = EXTRA_ACTION.MOVE;
      data.details = { newPosition: 1, newLine: LINE.FRONT };
    });

    it('should throw INVALID_DATA if details is null', () => {
      data.details = null;
      expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
    });

    it('should validate when details is provided', () => {
      expect(() => service.extraActionValidator(gameState, artifact, data)).not.toThrow();
    });
  });
});

describe('toggleReadyMovementValidator - comprehensive coverage', () => {
  let gameState: GameForLogic;
  let data: ToggleReadyMovementData;

  beforeEach(() => {
    gameState = createMockGameState();
    gameState.miniPhase = MINIPHASE.MOVEMENT;
    gameState.player.artifacts = {
      'artifact-1': createMockArtifact('artifact-1'),
      'artifact-2': createMockArtifact('artifact-2'),
    };
    data = {
      gameId: 'game-123',
      artifactsWithNewPosition: {
        'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 },
        'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.BACK, position: 0 },
      },
    };
  });

  it('should validate successfully', () => {
    expect(() => service.toggleReadyMovementValidator(gameState, data)).not.toThrow();
  });

  it('should throw PHASE_NOT_BATTLE when game ended', () => {
    gameState.end = {
      winner: 'player-1',
      winner_prize: 100,
      loser_prize: 50,
      draw_prize: 75,
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw PHASE_NOT_BATTLE when phase is not battle', () => {
    gameState.phase = PHASE.DRAFT;
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw MINIPHASE_NOT_BATTLE when miniPhase is not MOVEMENT', () => {
    gameState.miniPhase = MINIPHASE.BATTLE;
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when artifacts count mismatch', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when front line exceeds MAX_COUNT', () => {
    const MAX_COUNT = require('../game-mechanics/constants/settings').MAX_COUNT_ARTIFACTS_ON_LINE;
    const manyArtifacts: any = {};
    for (let i = 0; i < MAX_COUNT + 1; i++) {
      manyArtifacts[`artifact-${i}`] = { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: i };
    }
    data.artifactsWithNewPosition = manyArtifacts;
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when back line exceeds MAX_COUNT', () => {
    const MAX_COUNT = require('../game-mechanics/constants/settings').MAX_COUNT_ARTIFACTS_ON_LINE;
    const manyArtifacts: any = {};
    for (let i = 0; i < MAX_COUNT + 1; i++) {
      manyArtifacts[`artifact-${i}`] = { ...gameState.player.artifacts['artifact-1'], line: LINE.BACK, position: i };
    }
    data.artifactsWithNewPosition = manyArtifacts;
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when artifact does not exist', () => {
    data.artifactsWithNewPosition = {
      'non-existent': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.BACK, position: 0 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when artifact properties changed', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0, currentHp: 999 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.BACK, position: 0 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when front line position out of bounds', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 10 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.BACK, position: 0 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when back line position out of bounds', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.BACK, position: 10 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when position already taken on front line', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.FRONT, position: 0 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should throw INVALID_DATA when position already taken on back line', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.BACK, position: 0 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.BACK, position: 0 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
  });

  it('should validate with all artifacts on front line', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.FRONT, position: 0 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.FRONT, position: 1 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).not.toThrow();
  });

  it('should validate with all artifacts on back line', () => {
    data.artifactsWithNewPosition = {
      'artifact-1': { ...gameState.player.artifacts['artifact-1'], line: LINE.BACK, position: 0 },
      'artifact-2': { ...gameState.player.artifacts['artifact-2'], line: LINE.BACK, position: 1 },
    };
    expect(() => service.toggleReadyMovementValidator(gameState, data)).not.toThrow();
  });
});

describe('useSkillValidator - with any targets', () => {
  let gameState: GameForLogic;
  let artifact: ArtifactGameState;
  let data: UseSkillData;

  beforeEach(() => {
    gameState = createMockGameState();
    artifact = gameState.player.artifacts['artifact-1'];
    
    gameState.player.artifacts['ally1'] = createMockArtifact('ally1');
    gameState.enemy.artifacts['enemy1'] = createMockArtifact('enemy1');
    
    const mockSkills = require('../artifact/constants/skills');
    mockSkills.SKILLS.fear = {
      ...mockSkills.SKILLS.fear,
      countAnyTarget: 2,
      countTargetAllies: 1,
      countTargetEnemy: 1,
      restrictions: [],
    };
    
    data = {
      skillId: SKILL.FEAR,
      gameId: 'game-123',
      artifactGameId: 'artifact-1',
      targets: [['ally1'], ['enemy1']],
    };
    
    artifact.skillCost = 2;
    gameState.player.resources[RESOURCE.RAGE] = 30;
    restrictionService.checkGeneralRestrictions.mockReturnValue(true);
    restrictionService.checkArtifactRestrictions.mockReturnValue(true);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should throw INVALID_TARGETS when allies count is invalid', () => {
    data.targets = [[], ['enemy1']];
    expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw INVALID_TARGETS when allies count exceeds any + allies', () => {
    data.targets = [['ally1', 'ally2', 'ally3'], ['enemy1']];
    expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should throw INVALID_TARGETS when enemies count is invalid', () => {
    data.targets = [['ally1'], []];
    expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
  });

  it('should validate with correct any targets distribution', () => {
    data.targets = [['ally1'], ['enemy1']];
    expect(() => service.useSkillValidator(gameState, artifact, data)).not.toThrow();
  });
});
describe('ActionValidatorService - Additional Coverage for Missing Lines', () => {
    let service: ActionValidatorService;
    let restrictionService: jest.Mocked<RestrictionService>;
    let gameEffectsService: jest.Mocked<GameEffectsService>;

    const createMockFace = (): {
        id: string;
        description: string;
        attackTargets: string[] | null;
        healTargets: string[] | null;
    } => ({
        id: 'sword',
        description: 'Melee attack',
        attackTargets: ['enemy-artifact'],
        healTargets: null,
    });

    const createMockAvailableActions = (): ArtifactAvailableActions => ({
        face: createMockFace(),
        skills: [
            {
                id: SKILL.FEAR,
                description: 'Fear',
                possibleTargets: [[], []],
                countAnyTarget: 0,
                countTargetEnemy: 1,
                countTargetAllies: 0,
            },
        ],
        extraActions: [{ id: 'throw_dice' as any, description: 'Throw dice' }],
    });

    const createMockArtifact = (
        id: string = 'artifact-1',
        state: string = ARTIFACT_STATE.READY_TO_USE,
    ): ArtifactGameState => ({
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
        availableActions: createMockAvailableActions(),
        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
    });

    const createMockSpellState = (canUse: boolean = true): SpellGameState => ({
        id: SPELL.PIERCING_BOLT,
        description: 'Piercing Bolt',
        cost: 15,
        cooldown: false,
        canUse: canUse,
        possibleTargets: [[], []],
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
    });

    const createMockPlayer = (id: string = 'player-1'): Player => ({
        id,
        name: 'Player1',
        connection: 'online',
        isBot: false,
        hero: 'Empty',
        resources: {
            [RESOURCE.AGILITY]: 50,
            [RESOURCE.RAGE]: 30,
            [RESOURCE.LIGHT_MANA]: 20,
            [RESOURCE.DARK_MANA]: 10,
            [RESOURCE.DESTRUCTION_MANA]: 15,
        },
        artifacts: {
            'artifact-1': createMockArtifact('artifact-1'),
        },
        spells: {
            light: {},
            dark: {},
            destruction: {
                [SPELL.PIERCING_BOLT]: createMockSpellState(true),
            },
        },
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
        phase: PHASE.BATTLE,
        name: 'Test Game',
        currentTurn: 'player-1',
        logs: [],
        player: createMockPlayer(),
        enemy: {
            id: 'player-2',
            name: 'Player2',
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
            artifacts: {
                'enemy-artifact': createMockArtifact('enemy-artifact'),
            },
            spells: {
                light: {},
                dark: {},
                destruction: {},
            },
            effects: [],
            isReady: false,
            movePoints: 1,
            draft: { pickedArtifact: null, deck: [] },
            temporaryArtifacts: {},
            offerDraw: false,
            extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
        },
        end: null,
        miniPhase: MINIPHASE.BATTLE,
        constants: {
            maxCountArtifactsOnLine: 6,
            timerDraft: null,
            timerMovement: null,
            timerTurn: null,
            isNewRound: false,
            countActionsFromStartGame: 0,
        },
    });

    const mockRestrictionService = {
        checkGeneralRestrictions: jest.fn().mockReturnValue(true),
        checkArtifactRestrictions: jest.fn().mockReturnValue(true),
        checkSpellRestrictions: jest.fn().mockReturnValue(true),
    };

    const mockGameEffectsService = {
        countEffect: jest.fn().mockReturnValue(0),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionValidatorService,
                {
                    provide: RestrictionService,
                    useValue: mockRestrictionService,
                },
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
            ],
        }).compile();

        service = module.get<ActionValidatorService>(ActionValidatorService);
        restrictionService = module.get(RestrictionService);
        gameEffectsService = module.get(GameEffectsService);
    });

    describe('useSkillValidator - skillCost null check (line 292)', () => {

        it('should throw NOT_ENOUGH_RESOURCES when skillCost is not null and resources insufficient', () => {
            const gameState = createMockGameState();
            const artifact = gameState.player.artifacts['artifact-1'];
            artifact.skillCost = 100;
            gameState.player.resources[RESOURCE.RAGE] = 50;
            
            const data: UseSkillData = {
                skillId: SKILL.FEAR,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], ['enemy-artifact']],
            };

            expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(ActionException);
        });
    });

    describe('extraActionValidator - resource validation (line 425)', () => {
        it('should throw NOT_ENOUGH_RESOURCES when resources are insufficient', () => {
            const gameState = createMockGameState();
            const artifact = gameState.player.artifacts['artifact-1'];
            
            const data: ExtraActionData = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                type: 'throw_dice' as any,
                details: null,
            };
            
            gameState.player.resources[RESOURCE.AGILITY] = 2;

            expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
        });

        it('should validate when resources are exactly enough', () => {
            const gameState = createMockGameState();
            const artifact = gameState.player.artifacts['artifact-1'];
            
            const data: ExtraActionData = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                type: 'throw_dice' as any,
                details: null,
            };
            
            gameState.player.resources[RESOURCE.AGILITY] = 5;

            expect(() => service.extraActionValidator(gameState, artifact, data)).not.toThrow();
        });
    });

    describe('toggleReadyMovementValidator - front line validation (lines 487-493)', () => {
        it('should throw INVALID_DATA when front line position exceeds countArtifactsFront - 1', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: 5,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should throw INVALID_DATA when position is negative on front line', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: -1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should throw INVALID_DATA when duplicate positions on front line', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
                'artifact-2': createMockArtifact('artifact-2'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: 0,
                    },
                    'artifact-2': {
                        ...gameState.player.artifacts['artifact-2'],
                        line: LINE.FRONT,
                        position: 0,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should validate when positions are correct on front line', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
                'artifact-2': createMockArtifact('artifact-2'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: 0,
                    },
                    'artifact-2': {
                        ...gameState.player.artifacts['artifact-2'],
                        line: LINE.FRONT,
                        position: 1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).not.toThrow();
        });
    });

    describe('toggleReadyMovementValidator - back line validation (lines 498-503)', () => {
        it('should throw INVALID_DATA when back line position exceeds countArtifactsBack - 1', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.BACK,
                        position: 5,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should throw INVALID_DATA when position is negative on back line', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.BACK,
                        position: -1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should throw INVALID_DATA when duplicate positions on back line', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
                'artifact-2': createMockArtifact('artifact-2'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.BACK,
                        position: 0,
                    },
                    'artifact-2': {
                        ...gameState.player.artifacts['artifact-2'],
                        line: LINE.BACK,
                        position: 0,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should validate when all positions are unique on back line', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
                'artifact-2': createMockArtifact('artifact-2'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.BACK,
                        position: 0,
                    },
                    'artifact-2': {
                        ...gameState.player.artifacts['artifact-2'],
                        line: LINE.BACK,
                        position: 1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).not.toThrow();
        });
    });

    describe('isEqual method coverage', () => {
        it('should handle array comparison with different lengths', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            
            const artifactWithEffects = createMockArtifact('artifact-1');
            artifactWithEffects.effects = [{ id: 'effect1', duration: 1 } as any];
            
            gameState.player.artifacts = {
                'artifact-1': artifactWithEffects,
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...artifactWithEffects,
                        line: LINE.FRONT,
                        position: 0,
                        effects: [{ id: 'effect1', duration: 1 } as any, { id: 'effect2', duration: 2 } as any],
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should handle object comparison with different keys', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            
            const artifactWithExtraData = createMockArtifact('artifact-1');
            artifactWithExtraData.extraData = { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE, extraField: 'value' } as any;
            
            gameState.player.artifacts = {
                'artifact-1': artifactWithExtraData,
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...artifactWithExtraData,
                        line: LINE.FRONT,
                        position: 0,
                        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });


        it('should handle primitive value comparison', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: 0,
                        currentHp: 100,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });
    });

    describe('useSpellValidator - additional coverage for lines 222-229', () => {
        it('should throw error when spell does not exist in player spells', () => {
            const gameState = createMockGameState();
            gameState.player.spells.destruction = {};
            
            const data: UseSpellData = {
                spellId: SPELL.PIERCING_BOLT,
                gameId: 'game-123',
                targets: [[], []],
            };

            expect(() => service.useSpellValidator(gameState, data)).toThrow();
        });
    });
});

describe('ActionValidatorService - Final Branch Coverage', () => {
    let service: ActionValidatorService;
    let restrictionService: jest.Mocked<RestrictionService>;
    let gameEffectsService: jest.Mocked<GameEffectsService>;

    const createMockArtifact = (
        id: string = 'artifact-1',
        state: string = ARTIFACT_STATE.READY_TO_USE,
    ): ArtifactGameState => ({
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
        availableActions: {
            face: {
                id: 'sword',
                description: 'Melee attack',
                attackTargets: ['enemy-artifact'],
                healTargets: null,
            },
            skills: [
                {
                    id: SKILL.FEAR,
                    description: 'Fear',
                    possibleTargets: [[], []],
                    countAnyTarget: 0,
                    countTargetEnemy: 1,
                    countTargetAllies: 0,
                },
            ],
            extraActions: [{ id: 'throw_dice' as any, description: 'Throw dice' }],
        },
        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
    });

    const createMockGameState = (): GameForLogic => ({
        id: 'game-123',
        phase: PHASE.BATTLE,
        name: 'Test Game',
        currentTurn: 'player-1',
        logs: [],
        player: {
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
                [RESOURCE.DESTRUCTION_MANA]: 15,
            },
            artifacts: {
                'artifact-1': createMockArtifact('artifact-1'),
                'ally1': createMockArtifact('ally1'),
            },
            spells: {
                light: {},
                dark: {},
                destruction: {
                    [SPELL.PIERCING_BOLT]: {
                        id: SPELL.PIERCING_BOLT,
                        description: 'Piercing Bolt',
                        cost: 15,
                        cooldown: false,
                        canUse: true,
                        possibleTargets: [[], []],
                        countAnyTarget: 2,
                        countTargetEnemy: 1,
                        countTargetAllies: 1,
                    },
                },
            },
            effects: [],
            isReady: false,
            movePoints: 1,
            draft: { pickedArtifact: null, deck: [] },
            temporaryArtifacts: {},
            offerDraw: false,
            extraData: { skippedMoves: 0, countActionsSinceStartTurn: 1 },
        },
        enemy: {
            id: 'player-2',
            name: 'Player2',
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
            artifacts: {
                'enemy-artifact': createMockArtifact('enemy-artifact'),
                'enemy1': createMockArtifact('enemy1'),
            },
            spells: {
                light: {},
                dark: {},
                destruction: {},
            },
            effects: [],
            isReady: false,
            movePoints: 1,
            draft: { pickedArtifact: null, deck: [] },
            temporaryArtifacts: {},
            offerDraw: false,
            extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
        },
        end: null,
        miniPhase: MINIPHASE.BATTLE,
        constants: {
            maxCountArtifactsOnLine: 6,
            timerDraft: null,
            timerMovement: null,
            timerTurn: null,
            isNewRound: false,
            countActionsFromStartGame: 0,
        },
    });

    const mockRestrictionService = {
        checkGeneralRestrictions: jest.fn().mockReturnValue(true),
        checkArtifactRestrictions: jest.fn().mockReturnValue(true),
        checkSpellRestrictions: jest.fn().mockReturnValue(true),
    };

    const mockGameEffectsService = {
        countEffect: jest.fn().mockReturnValue(0),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionValidatorService,
                {
                    provide: RestrictionService,
                    useValue: mockRestrictionService,
                },
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
            ],
        }).compile();

        service = module.get<ActionValidatorService>(ActionValidatorService);
        restrictionService = module.get(RestrictionService);
        gameEffectsService = module.get(GameEffectsService);
    });

    describe('Line 135 - useSkillValidator targets length check', () => {
        it('should throw INTERNAL_SERVER_ERROR when targets length is not 2', () => {
            const gameState = createMockGameState();
            const artifact = gameState.player.artifacts['artifact-1'];
            
            const data: UseSkillData = {
                skillId: SKILL.FEAR,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[]] as any,
            };

            expect(() => service.useSkillValidator(gameState, artifact, data)).toThrow(CommonException);
        });
    });

    describe('Line 222 - useSpellValidator targets length check', () => {
        it('should throw INTERNAL_SERVER_ERROR when targets length is not 2', () => {
            const gameState = createMockGameState();
            
            const data: UseSpellData = {
                spellId: SPELL.PIERCING_BOLT,
                gameId: 'game-123',
                targets: [[]] as any,
            };

            expect(() => service.useSpellValidator(gameState, data)).toThrow(CommonException);
        });
    });

    describe('Line 425 - extraActionValidator general restrictions check', () => {
        it('should throw IMPOSSIBLE_ACTION when checkGeneralRestrictions returns false', () => {
            const gameState = createMockGameState();
            const artifact = gameState.player.artifacts['artifact-1'];
            
            const data: ExtraActionData = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                type: 'throw_dice' as any,
                details: null,
            };
            
            restrictionService.checkGeneralRestrictions.mockReturnValue(false);

            expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(ActionException);
        });
    });

    describe('Lines 489-493 - toggleReadyMovementValidator front line position validation', () => {
        it('should throw INVALID_DATA when front line position is negative', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: -1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should throw INVALID_DATA when front line position exceeds max index', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
                'artifact-2': createMockArtifact('artifact-2'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.FRONT,
                        position: 5,
                    },
                    'artifact-2': {
                        ...gameState.player.artifacts['artifact-2'],
                        line: LINE.FRONT,
                        position: 1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });
    });

    describe('Line 503 - toggleReadyMovementValidator back line position validation', () => {
        it('should throw INVALID_DATA when back line position is negative', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.BACK,
                        position: -1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });

        it('should throw INVALID_DATA when back line position exceeds max index', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            gameState.player.artifacts = {
                'artifact-1': createMockArtifact('artifact-1'),
                'artifact-2': createMockArtifact('artifact-2'),
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...gameState.player.artifacts['artifact-1'],
                        line: LINE.BACK,
                        position: 5,
                    },
                    'artifact-2': {
                        ...gameState.player.artifacts['artifact-2'],
                        line: LINE.BACK,
                        position: 1,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).toThrow(ActionException);
        });
    });

    describe('isEqual method edge cases', () => {
        it('should return true for null === null', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            
            const artifact = createMockArtifact('artifact-1');
            artifact.effects = null as any;
            
            gameState.player.artifacts = {
                'artifact-1': artifact,
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...artifact,
                        line: LINE.FRONT,
                        position: 0,
                        effects: null as any,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).not.toThrow();
        });

        it('should handle array comparison with identical content', () => {
            const gameState = createMockGameState();
            gameState.miniPhase = MINIPHASE.MOVEMENT;
            
            const artifact = createMockArtifact('artifact-1');
            artifact.effects = [{ id: 'effect1' }, { id: 'effect2' }] as any;
            
            gameState.player.artifacts = {
                'artifact-1': artifact,
            };
            
            const data: ToggleReadyMovementData = {
                gameId: 'game-123',
                artifactsWithNewPosition: {
                    'artifact-1': {
                        ...artifact,
                        line: LINE.FRONT,
                        position: 0,
                        effects: [{ id: 'effect1' }, { id: 'effect2' }] as any,
                    },
                },
            };

            expect(() => service.toggleReadyMovementValidator(gameState, data)).not.toThrow();
        });
    });

    describe('extraActionValidator - line 425', () => {
        it('should throw IMPOSSIBLE_ACTION when availableActions is null', () => {
            const gameState = createMockGameState();
            const artifact = gameState.player.artifacts['artifact-1'];
            artifact.availableActions = null;
            
            const data: ExtraActionData = {
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                type: 'throw_dice' as any,
                details: null,
            };

            expect(() => service.extraActionValidator(gameState, artifact, data)).toThrow(CommonException);
        });
    });
});
});
