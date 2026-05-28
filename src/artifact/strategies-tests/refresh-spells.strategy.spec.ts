import { Test, TestingModule } from '@nestjs/testing';
import { RefreshSpellsStrategy } from '../strategies/refresh-spells.strategy';
import { GameEffectsService } from '../../game-mechanics/game-effects.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import {
    ArtifactGameState,
    Player,
    ARTIFACT_STATE,
    LINE,
} from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { SPELLTYPE } from '../../spell/types/spell';
import { SPELL } from '../../spell/types/spell';

describe('RefreshSpellsStrategy', () => {
    let strategy: RefreshSpellsStrategy;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let resourceService: jest.Mocked<ResourceService>;

    const createMockSpell = (cooldown: boolean = true) => ({
        cooldown,
        id: SPELL.PIERCING_BOLT,
        description: 'Test spell',
        cost: 15,
        canUse: false,
        possibleTargets: [],
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
    });

    const createMockPlayer = (): Player => ({
        id: 'player-1',
        name: 'Player1',
        connection: 'online',
        isBot: false,
        hero: 'Empty',
        resources: {
            agility: 50,
            rage: 30,
            light_mana: 20,
            dark_mana: 10,
            destruction_mana: 5,
        },
        artifacts: {},
        spells: {
            [SPELLTYPE.LIGHT]: {
                touch_of_light: createMockSpell(true),
            },
            [SPELLTYPE.DARK]: {
                betrayal: createMockSpell(true),
            },
            [SPELLTYPE.DESTRUCTION]: {
                piercing_bolt: createMockSpell(true),
            },
        },
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
    });

    const createMockArtifact = (): ArtifactGameState => ({
        id: 'artifact-1',
        artifactId: 'chronos',
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
        constants: {
            maxCountArtifactsOnLine: 6,
            timerDraft: null,
            timerMovement: null,
            timerTurn: null,
            isNewRound: false,
            countActionsFromStartGame: 0,
        },
    });

    const mockGameEffectsService = {
        applyEffect: jest.fn(),
        removeEffect: jest.fn(),
        countEffect: jest.fn(),
        getEffect: jest.fn(),
        getHeroEffects: jest.fn(),
        applyHeroEffect: jest.fn(),
        removeHeroEffect: jest.fn(),
    };

    const mockResourceService = {
        decreaseResource: jest.fn(),
        addResource: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RefreshSpellsStrategy,
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
                {
                    provide: ResourceService,
                    useValue: mockResourceService,
                },
            ],
        }).compile();

        strategy = module.get<RefreshSpellsStrategy>(RefreshSpellsStrategy);
        gameEffectsService = module.get(GameEffectsService);
        resourceService = module.get(ResourceService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return REFRESH_SPELLS', () => {
            expect(strategy.getSkillType()).toBe(SKILL.REFRESH_SPELLS);
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
            artifact = createMockArtifact();
            data = {
                skillId: SKILL.REFRESH_SPELLS,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
            logParts = [];
        });

        it('should reset cooldown for all light spells', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            const lightSpells = Object.values(player.spells[SPELLTYPE.LIGHT]);
            for (const spell of lightSpells) {
                expect(spell.cooldown).toBe(false);
            }
        });

        it('should reset cooldown for all dark spells', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            const darkSpells = Object.values(player.spells[SPELLTYPE.DARK]);
            for (const spell of darkSpells) {
                expect(spell.cooldown).toBe(false);
            }
        });

        it('should reset cooldown for all destruction spells', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            const destructionSpells = Object.values(
                player.spells[SPELLTYPE.DESTRUCTION],
            );
            for (const spell of destructionSpells) {
                expect(spell.cooldown).toBe(false);
            }
        });
    });
});
