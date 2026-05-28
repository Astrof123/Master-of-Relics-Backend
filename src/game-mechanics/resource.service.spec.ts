import { Test, TestingModule } from '@nestjs/testing';
import { ResourceService } from './resource.service';
import { RESOURCE } from './types/resource';
import { Player } from '../game-state/types/game';
import { GameForLogic } from '../game-state/types/game-for-logic';
import { EFFECT } from './types/effect';
import { MAX_AMOUNT_RESOURCES } from './constants/settings';

describe('ResourceService', () => {
    let service: ResourceService;

    const createMockPlayer = (): Player => ({
        id: 'player-1',
        name: 'TestPlayer',
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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ResourceService],
        }).compile();

        service = module.get<ResourceService>(ResourceService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('addResource', () => {
        let player: Player;
        const logParts: string[] = [];

        beforeEach(() => {
            player = createMockPlayer();
            logParts.length = 0;
        });

        it('should add agility resource correctly', () => {
            service.addResource(player, RESOURCE.AGILITY, 10, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(60);
            expect(logParts[0]).toContain('Восстановил');
            expect(logParts[0]).toContain('ловкости');
        });

        it('should add rage resource correctly', () => {
            service.addResource(player, RESOURCE.RAGE, 20, logParts);

            expect(player.resources[RESOURCE.RAGE]).toBe(50);
            expect(logParts[0]).toContain('Восстановил');
            expect(logParts[0]).toContain('ярости');
        });

        it('should add light mana resource correctly', () => {
            service.addResource(player, RESOURCE.LIGHT_MANA, 15, logParts);

            expect(player.resources[RESOURCE.LIGHT_MANA]).toBe(35);
            expect(logParts[0]).toContain('Восстановил');
            expect(logParts[0]).toContain('маны света');
        });

        it('should add dark mana resource correctly', () => {
            service.addResource(player, RESOURCE.DARK_MANA, 25, logParts);

            expect(player.resources[RESOURCE.DARK_MANA]).toBe(35);
            expect(logParts[0]).toContain('Восстановил');
            expect(logParts[0]).toContain('маны тьмы');
        });

        it('should add destruction mana resource correctly', () => {
            service.addResource(
                player,
                RESOURCE.DESTRUCTION_MANA,
                30,
                logParts,
            );

            expect(player.resources[RESOURCE.DESTRUCTION_MANA]).toBe(35);
            expect(logParts[0]).toContain('Восстановил');
            expect(logParts[0]).toContain('маны разрушения');
        });

        it('should not exceed MAX_AMOUNT_RESOURCES', () => {
            service.addResource(player, RESOURCE.AGILITY, 100, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(
                MAX_AMOUNT_RESOURCES,
            );
        });

        it('should cap at MAX_AMOUNT_RESOURCES when adding over the limit', () => {
            player.resources[RESOURCE.AGILITY] = 95;
            service.addResource(player, RESOURCE.AGILITY, 10, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(
                MAX_AMOUNT_RESOURCES,
            );
        });
    });

    describe('decreaseResource', () => {
        let player: Player;
        const logParts: string[] = [];

        beforeEach(() => {
            player = createMockPlayer();
            logParts.length = 0;
        });

        it('should decrease agility resource correctly', () => {
            service.decreaseResource(player, RESOURCE.AGILITY, 10, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(40);
            expect(logParts[0]).toContain('Потратил');
            expect(logParts[0]).toContain('ловкости');
        });

        it('should decrease rage resource correctly', () => {
            service.decreaseResource(player, RESOURCE.RAGE, 15, logParts);

            expect(player.resources[RESOURCE.RAGE]).toBe(15);
            expect(logParts[0]).toContain('Потратил');
            expect(logParts[0]).toContain('ярости');
        });

        it('should decrease light mana resource correctly', () => {
            service.decreaseResource(player, RESOURCE.LIGHT_MANA, 10, logParts);

            expect(player.resources[RESOURCE.LIGHT_MANA]).toBe(10);
            expect(logParts[0]).toContain('Потратил');
            expect(logParts[0]).toContain('маны света');
        });

        it('should decrease dark mana resource correctly', () => {
            service.decreaseResource(player, RESOURCE.DARK_MANA, 5, logParts);

            expect(player.resources[RESOURCE.DARK_MANA]).toBe(5);
            expect(logParts[0]).toContain('Потратил');
            expect(logParts[0]).toContain('маны тьмы');
        });

        it('should decrease destruction mana resource correctly', () => {
            service.decreaseResource(
                player,
                RESOURCE.DESTRUCTION_MANA,
                3,
                logParts,
            );

            expect(player.resources[RESOURCE.DESTRUCTION_MANA]).toBe(2);
            expect(logParts[0]).toContain('Потратил');
            expect(logParts[0]).toContain('маны разрушения');
        });

        it('should not go below 0', () => {
            service.decreaseResource(player, RESOURCE.AGILITY, 100, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(0);
        });
    });

    describe('addResourceNewRound', () => {
        it('should add 15 agility and 15 rage to both players', () => {
            const gameState = createMockGameState();
            const initialPlayerAgility =
                gameState.player.resources[RESOURCE.AGILITY];
            const initialPlayerRage = gameState.player.resources[RESOURCE.RAGE];
            const initialEnemyAgility =
                gameState.enemy.resources[RESOURCE.AGILITY];
            const initialEnemyRage = gameState.enemy.resources[RESOURCE.RAGE];

            service.addResourceNewRound(gameState);

            expect(gameState.player.resources[RESOURCE.AGILITY]).toBe(
                initialPlayerAgility + 15,
            );
            expect(gameState.player.resources[RESOURCE.RAGE]).toBe(
                initialPlayerRage + 15,
            );
            expect(gameState.enemy.resources[RESOURCE.AGILITY]).toBe(
                initialEnemyAgility + 15,
            );
            expect(gameState.enemy.resources[RESOURCE.RAGE]).toBe(
                initialEnemyRage + 15,
            );
        });

        it('should respect MAX_AMOUNT_RESOURCES when adding resources', () => {
            const gameState = createMockGameState();
            gameState.player.resources[RESOURCE.AGILITY] = 95;
            gameState.player.resources[RESOURCE.RAGE] = 95;
            gameState.enemy.resources[RESOURCE.AGILITY] = 90;
            gameState.enemy.resources[RESOURCE.RAGE] = 90;

            service.addResourceNewRound(gameState);

            expect(gameState.player.resources[RESOURCE.AGILITY]).toBe(
                MAX_AMOUNT_RESOURCES,
            );
            expect(gameState.player.resources[RESOURCE.RAGE]).toBe(
                MAX_AMOUNT_RESOURCES,
            );
            expect(gameState.enemy.resources[RESOURCE.AGILITY]).toBe(
                MAX_AMOUNT_RESOURCES,
            );
            expect(gameState.enemy.resources[RESOURCE.RAGE]).toBe(
                MAX_AMOUNT_RESOURCES,
            );
        });
    });

    describe('calculateNewTurnMovePoints', () => {
        let player: Player;

        beforeEach(() => {
            player = createMockPlayer();
            player.effects = [];
        });

        it('should return 1 when no extra move effects', () => {
            const result = service.calculateNewTurnMovePoints(player);

            expect(result).toBe(1);
        });

        it('should return 2 when player has one EXTRA_MOVE effect', () => {
            player.effects = [
                {
                    id: EFFECT.EXTRA_MOVE,
                    name: 'Extra Move',
                    duration: 'current_round',
                    type: 'positive',
                    number: null,
                    dispellType: 'normal',
                },
            ];

            const result = service.calculateNewTurnMovePoints(player);

            expect(result).toBe(2);
        });

        it('should return 3 when player has two EXTRA_MOVE effects', () => {
            player.effects = [
                {
                    id: EFFECT.EXTRA_MOVE,
                    name: 'Extra Move',
                    duration: 'current_round',
                    type: 'positive',
                    number: null,
                    dispellType: 'normal',
                },
                {
                    id: EFFECT.EXTRA_MOVE,
                    name: 'Extra Move',
                    duration: 'current_round',
                    type: 'positive',
                    number: null,
                    dispellType: 'normal',
                },
            ];

            const result = service.calculateNewTurnMovePoints(player);

            expect(result).toBe(3);
        });

        it('should ignore other effects', () => {
            player.effects = [
                {
                    id: EFFECT.EXTRA_MOVE,
                    name: 'Extra Move',
                    duration: 'current_round',
                    type: 'positive',
                    number: null,
                    dispellType: 'normal',
                },
                {
                    id: EFFECT.BERSERK,
                    name: 'Berserk',
                    duration: 'always',
                    type: 'positive',
                    number: null,
                    dispellType: 'passive',
                },
                {
                    id: EFFECT.HUNT,
                    name: 'Hunt',
                    duration: 'always',
                    type: 'positive',
                    number: null,
                    dispellType: 'passive',
                },
            ];

            const result = service.calculateNewTurnMovePoints(player);

            expect(result).toBe(2);
        });
    });

    describe('extraMove', () => {
        let player: Player;
        const logParts: string[] = [];

        beforeEach(() => {
            player = createMockPlayer();
            player.movePoints = 1;
            logParts.length = 0;
        });

        it('should increase move points by 1', () => {
            service.extraMove(player, logParts);

            expect(player.movePoints).toBe(2);
        });

        it('should add log message about extra action', () => {
            service.extraMove(player, logParts);

            expect(logParts[0]).toBe('Получил дополнительное действие');
        });

        it('should work when move points is 0', () => {
            player.movePoints = 0;
            service.extraMove(player, logParts);

            expect(player.movePoints).toBe(1);
        });

        it('should work when move points is high', () => {
            player.movePoints = 5;
            service.extraMove(player, logParts);

            expect(player.movePoints).toBe(6);
        });
    });

    describe('Resource edge cases', () => {
        let player: Player;
        const logParts: string[] = [];

        beforeEach(() => {
            player = createMockPlayer();
            logParts.length = 0;
        });

        it('should handle adding zero amount', () => {
            service.addResource(player, RESOURCE.AGILITY, 0, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(50);
            expect(logParts[0]).toBeDefined();
        });

        it('should handle decreasing zero amount', () => {
            service.decreaseResource(player, RESOURCE.AGILITY, 0, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(50);
            expect(logParts[0]).toBeDefined();
        });

        it('should handle adding negative amount (should decrease)', () => {
            service.addResource(player, RESOURCE.AGILITY, -10, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(40);
        });

        it('should handle decreasing negative amount (should increase)', () => {
            service.decreaseResource(player, RESOURCE.AGILITY, -10, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(60);
        });

        it('should handle resources at maximum value', () => {
            player.resources[RESOURCE.AGILITY] = MAX_AMOUNT_RESOURCES;
            service.addResource(player, RESOURCE.AGILITY, 10, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(
                MAX_AMOUNT_RESOURCES,
            );
        });

        it('should handle resources at minimum value (0)', () => {
            player.resources[RESOURCE.AGILITY] = 0;
            service.decreaseResource(player, RESOURCE.AGILITY, 10, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(0);
        });
    });

    describe('Multiple operations', () => {
        let player: Player;
        const logParts: string[] = [];

        beforeEach(() => {
            player = createMockPlayer();
            logParts.length = 0;
        });

        it('should handle sequential add operations', () => {
            service.addResource(player, RESOURCE.AGILITY, 10, logParts);
            service.addResource(player, RESOURCE.AGILITY, 20, logParts);
            service.addResource(player, RESOURCE.AGILITY, 30, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(100);
        });

        it('should handle sequential decrease operations', () => {
            service.decreaseResource(player, RESOURCE.AGILITY, 10, logParts);
            service.decreaseResource(player, RESOURCE.AGILITY, 20, logParts);
            service.decreaseResource(player, RESOURCE.AGILITY, 5, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(50 - 10 - 20 - 5);
        });

        it('should handle mixed add and decrease operations', () => {
            service.addResource(player, RESOURCE.AGILITY, 30, logParts);
            service.decreaseResource(player, RESOURCE.AGILITY, 20, logParts);
            service.addResource(player, RESOURCE.AGILITY, 10, logParts);
            service.decreaseResource(player, RESOURCE.AGILITY, 5, logParts);

            expect(player.resources[RESOURCE.AGILITY]).toBe(
                50 + 30 - 20 + 10 - 5,
            );
        });
    });
});
