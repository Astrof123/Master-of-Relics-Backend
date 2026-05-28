
import { Test, TestingModule } from '@nestjs/testing';
import { EatLightManaStrategy } from '../strategies/eat-light-mana.strategy';
import { CombatService } from '../../game-mechanics/combat.service';
import { ResourceService } from '../../game-mechanics/resource.service';
import {
    ArtifactGameState,
    Player,
    ARTIFACT_STATE,
    LINE,
} from '../../game-state/types/game';
import { GameForLogic } from '../../game-state/types/game-for-logic';
import { UseSkillData } from '../../action/types/action-evens-data';
import { ANIMATION, AnimationData } from '../../action/types/animation';
import { SKILL } from '../types/skill';
import { RESOURCE } from '../../game-mechanics/types/resource';

describe('EatLightManaStrategy', () => {
    let strategy: EatLightManaStrategy;
    let combatService: jest.Mocked<CombatService>;
    let resourceService: jest.Mocked<ResourceService>;

    const createMockArtifact = (
        id: string = 'artifact-1',
    ): ArtifactGameState => ({
        id,
        artifactId: 'arcane_shield',
        face: 'sword',
        state: ARTIFACT_STATE.READY_TO_USE,
        currentHp: 20,
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
            agility: 50,
            rage: 30,
            light_mana: 20,
            dark_mana: 10,
            destruction_mana: 5,
        },
        artifacts: {},
        spells: {} as any,
        effects: [],
        isReady: false,
        movePoints: 1,
        draft: { pickedArtifact: null, deck: [] },
        temporaryArtifacts: {},
        offerDraw: false,
        extraData: { skippedMoves: 0, countActionsSinceStartTurn: 0 },
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

    const mockCombatService = {
        calculateHeal: jest.fn(),
        applyHealing: jest.fn(),
        calculateDamage: jest.fn(),
        applyDamage: jest.fn(),
        calculateFaceDamage: jest.fn(),
    };

    const mockResourceService = {
        decreaseResource: jest.fn(),
        addResource: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EatLightManaStrategy,
                {
                    provide: CombatService,
                    useValue: mockCombatService,
                },
                {
                    provide: ResourceService,
                    useValue: mockResourceService,
                },
            ],
        }).compile();

        strategy = module.get<EatLightManaStrategy>(EatLightManaStrategy);
        combatService = module.get(CombatService);
        resourceService = module.get(ResourceService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('getSkillType', () => {
        it('should return EAT_LIGHT_MANA', () => {
            expect(strategy.getSkillType()).toBe(SKILL.EAT_LIGHT_MANA);
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
                skillId: SKILL.EAT_LIGHT_MANA,
                gameId: 'game-123',
                artifactGameId: 'artifact-1',
                targets: [[], []],
            };
            animations = [];
            logParts = [];

            mockCombatService.calculateHeal.mockReturnValue(15);
            mockCombatService.applyHealing.mockReturnValue(undefined);
            mockResourceService.decreaseResource.mockReturnValue(undefined);
        });

        it('should decrease light mana and heal artifact', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(resourceService.decreaseResource).toHaveBeenCalledWith(
                player,
                RESOURCE.LIGHT_MANA,
                10,
                logParts,
            );
            expect(combatService.calculateHeal).toHaveBeenCalledWith(
                artifact,
                15,
            );
            expect(combatService.applyHealing).toHaveBeenCalledWith(
                artifact,
                15,
                logParts,
            );
        });

        it('should add heal animation', () => {
            strategy.execute(
                gameState,
                player,
                artifact,
                data,
                animations,
                logParts,
            );

            expect(animations[0]).toEqual({
                playerId: player.id,
                artifactGameId: artifact.id,
                animation: ANIMATION.HEAL,
                value: 15,
            });
        });
    });
});
