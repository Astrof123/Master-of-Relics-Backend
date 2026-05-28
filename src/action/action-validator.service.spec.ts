// action-validator.service.spec.ts - исправленная версия
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

// Mock EXTRA_ACTIONS
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

// Mock SKILLS
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

// Mock SPELLS
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

// Mock SpellHelper
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
        player: createMockPlayer('player-1'),
        enemy: createMockPlayer('player-2'),
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
            // Добавляем вражеский артефакт в gameState.enemy.artifacts
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
            // Создаем заклинание напрямую в объекте spells
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
});
