import { Test, TestingModule } from '@nestjs/testing';
import { RestrictionService } from './restriction.service';
import { GameEffectsService } from '../game-mechanics/game-effects.service';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    LINE,
    Player,
} from '../game-state/types/game';
import { RESTRICTION, TARGET_RESTRICTION } from './types/restriction';
import { RESOURCE } from '../game-mechanics/types/resource';
import { EFFECT } from '../game-mechanics/types/effect';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from '../game-mechanics/constants/settings';
import { FACES } from '../game-mechanics/constants/faces';


jest.mock('../game-mechanics/constants/faces', () => ({
    FACES: {
        sword: { sword: 10, target: 0 },
        target: { sword: 0, target: 10 },
        heal: { sword: 0, target: 0 },
    },
}));

describe('RestrictionService', () => {
    let service: RestrictionService;
    let gameEffectsService: jest.Mocked<GameEffectsService>;

    const createMockArtifact = (
        id: string,
        state: string = ARTIFACT_STATE.READY_TO_USE,
        line: string = LINE.FRONT,
        currentHp: number = 30,
        maxHp: number = 30,
        face: string = 'sword',
    ): ArtifactGameState => ({
        id,
        artifactId: 'test_artifact',
        face: face as any,
        state: state as any,
        currentHp,
        maxHp,
        position: 1,
        line: line as any,
        skillCost: 2,
        effects: [],
        availableActions: null,
        extraData: { lastStateBeforeRoot: ARTIFACT_STATE.READY_TO_USE },
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
            'artifact-1': createMockArtifact(
                'artifact-1',
                ARTIFACT_STATE.READY_TO_USE,
                LINE.FRONT,
            ),
            'artifact-2': createMockArtifact(
                'artifact-2',
                ARTIFACT_STATE.BREAKEN,
                LINE.BACK,
                0,
                30,
            ),
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

    const mockGameEffectsService = {
        countEffect: jest.fn().mockReturnValue(0),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RestrictionService,
                {
                    provide: GameEffectsService,
                    useValue: mockGameEffectsService,
                },
            ],
        }).compile();

        service = module.get<RestrictionService>(RestrictionService);
        gameEffectsService = module.get(GameEffectsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('checkArtifactRestrictions', () => {
        let player: Player;
        let artifact: ArtifactGameState;

        beforeEach(() => {
            player = createMockPlayer();
            artifact = player.artifacts['artifact-1'];
        });

        it('should return true when no restrictions', () => {
            const result = service.checkArtifactRestrictions(
                [],
                player,
                artifact,
            );
            expect(result).toBe(true);
        });

        it('should check ONLY_READY restriction', () => {
            artifact.state = ARTIFACT_STATE.READY_TO_USE;
            let result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_READY],
                player,
                artifact,
            );
            expect(result).toBe(true);

            artifact.state = ARTIFACT_STATE.COOLDOWN;
            result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_READY],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });

        it('should check NO_INVISIBLE restriction', () => {
            mockGameEffectsService.countEffect.mockReturnValue(0);
            let result = service.checkArtifactRestrictions(
                [RESTRICTION.NO_INVISIBLE],
                player,
                artifact,
            );
            expect(result).toBe(true);

            mockGameEffectsService.countEffect.mockReturnValue(1);
            result = service.checkArtifactRestrictions(
                [RESTRICTION.NO_INVISIBLE],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });

        it('should check ONLY_ROOTED restriction', () => {
            artifact.state = ARTIFACT_STATE.ROOTED;
            let result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_ROOTED],
                player,
                artifact,
            );
            expect(result).toBe(true);

            artifact.state = ARTIFACT_STATE.READY_TO_USE;
            result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_ROOTED],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });

        it('should check ONLY_COOLDOWN restriction', () => {
            artifact.state = ARTIFACT_STATE.COOLDOWN;
            let result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_COOLDOWN],
                player,
                artifact,
            );
            expect(result).toBe(true);

            artifact.state = ARTIFACT_STATE.READY_TO_USE;
            result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_COOLDOWN],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });

        it('should check ONLY_BREAKEN restriction', () => {
            artifact.state = ARTIFACT_STATE.BREAKEN;
            let result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_BREAKEN],
                player,
                artifact,
            );
            expect(result).toBe(true);

            artifact.state = ARTIFACT_STATE.READY_TO_USE;
            result = service.checkArtifactRestrictions(
                [RESTRICTION.ONLY_BREAKEN],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });

        it('should check SAME_LINE_HAVE_ONE_FREE_SPOT restriction', () => {
            const artifactsOnSameLine = Object.values(player.artifacts).filter(
                (a) => a.line === artifact.line,
            ).length;
            const freeSpots = MAX_COUNT_ARTIFACTS_ON_LINE - artifactsOnSameLine;

            const result = service.checkArtifactRestrictions(
                [RESTRICTION.SAME_LINE_HAVE_ONE_FREE_SPOT],
                player,
                artifact,
            );
            expect(result).toBe(freeSpots >= 1);
        });

        it('should check ZERO_USED_SKILL_CHARGES restriction', () => {
            artifact.effects = [];
            let result = service.checkArtifactRestrictions(
                [RESTRICTION.ZERO_USED_SKILL_CHARGES],
                player,
                artifact,
            );
            expect(result).toBe(true);

            artifact.effects = [
                { id: EFFECT.USED_SKILL_CHARGES, number: 1 } as any,
            ];
            result = service.checkArtifactRestrictions(
                [RESTRICTION.ZERO_USED_SKILL_CHARGES],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });
    });

    describe('checkSpellRestrictions', () => {
        let enemy: Player;

        beforeEach(() => {
            enemy = createMockPlayer('enemy-1');
        });

        it('should return true when enemy has alive artifacts', () => {
            const result = service.checkSpellRestrictions(enemy, []);
            expect(result).toBe(true);
        });

        it('should return false when no alive artifacts and no artifact without avatar', () => {
            for (const art of Object.values(enemy.artifacts)) {
                art.currentHp = 0;
            }
            mockGameEffectsService.countEffect.mockReturnValue(1);
            const result = service.checkSpellRestrictions(enemy, []);
            expect(result).toBe(false);
        });
    });

    describe('checkGeneralRestrictions', () => {
        let player: Player;
        let enemy: Player;

        beforeEach(() => {
            player = createMockPlayer();
            enemy = createMockPlayer('enemy-1');
        });

        it('should return true when no restrictions', () => {
            const result = service.checkGeneralRestrictions(player, enemy, []);
            expect(result).toBe(true);
        });

        it('should check ENEMY_BACK_LINE_IS_FREE restriction', () => {
            const backLineCount = Object.values(enemy.artifacts).filter(
                (a) => a.line === LINE.BACK,
            ).length;
            const result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_BACK_LINE_IS_FREE,
            ]);
            expect(result).toBe(backLineCount < MAX_COUNT_ARTIFACTS_ON_LINE);
        });

        it('should check ENEMY_FRONT_LINE_IS_FREE restriction', () => {
            const frontLineCount = Object.values(enemy.artifacts).filter(
                (a) => a.line === LINE.FRONT,
            ).length;
            const result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_FRONT_LINE_IS_FREE,
            ]);
            expect(result).toBe(frontLineCount < MAX_COUNT_ARTIFACTS_ON_LINE);
        });

        it('should check FRONT_LINE_HAVE_TWO_FREE_SPOT restriction', () => {
            const frontLineCount = Object.values(player.artifacts).filter(
                (a) => a.line === LINE.FRONT,
            ).length;
            const freeSpots = MAX_COUNT_ARTIFACTS_ON_LINE - frontLineCount;
            const result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.FRONT_LINE_HAVE_TWO_FREE_SPOT,
            ]);
            expect(result).toBe(freeSpots >= 2);
        });

        it('should check FRONT_LINE_HAVE_ONE_FREE_SPOT restriction', () => {
            const frontLineCount = Object.values(player.artifacts).filter(
                (a) => a.line === LINE.FRONT,
            ).length;
            const freeSpots = MAX_COUNT_ARTIFACTS_ON_LINE - frontLineCount;
            const result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.FRONT_LINE_HAVE_ONE_FREE_SPOT,
            ]);
            expect(result).toBe(freeSpots >= 1);
        });

        it('should check HAVE_ENEMY_FOR_SKILLS restriction', () => {
            const result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_ENEMY_FOR_SKILLS,
            ]);
            expect(result).toBe(true);
        });

        it('should check HAVE_TEN_LIGHT_MANA restriction', () => {
            player.resources[RESOURCE.LIGHT_MANA] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_LIGHT_MANA,
            ]);
            expect(result).toBe(true);

            player.resources[RESOURCE.LIGHT_MANA] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_LIGHT_MANA,
            ]);
            expect(result).toBe(false);
        });

        it('should check HAVE_TEN_AGILITY restriction', () => {
            player.resources[RESOURCE.AGILITY] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_AGILITY,
            ]);
            expect(result).toBe(true);

            player.resources[RESOURCE.AGILITY] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_AGILITY,
            ]);
            expect(result).toBe(false);
        });

        it('should check HAVE_TEN_RAGE restriction', () => {
            player.resources[RESOURCE.RAGE] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_RAGE,
            ]);
            expect(result).toBe(true);

            player.resources[RESOURCE.RAGE] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_RAGE,
            ]);
            expect(result).toBe(false);
        });

        it('should check ENEMY_HAVE_TEN_LIGHT_MANA restriction', () => {
            enemy.resources[RESOURCE.LIGHT_MANA] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_LIGHT_MANA,
            ]);
            expect(result).toBe(true);

            enemy.resources[RESOURCE.LIGHT_MANA] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_LIGHT_MANA,
            ]);
            expect(result).toBe(false);
        });
    });

    describe('getTargetsByRestrictions', () => {
        let player: Player;
        let enemy: Player;

        beforeEach(() => {
            player = createMockPlayer();
            enemy = createMockPlayer('enemy-1');
            mockGameEffectsService.countEffect.mockReset();
            mockGameEffectsService.countEffect.mockReturnValue(0);
        });

        it('should return empty arrays when no restrictions', () => {
            const result = service.getTargetsByRestrictions(player, enemy, []);
            expect(result).toEqual([[], []]);
        });

        it('should handle ANY_ENEMY restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ENEMY,
            ]);
            expect(result[1].length).toBe(
                Object.values(enemy.artifacts).length,
            );
        });

        it('should handle ANY_ALLY restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ALLY,
            ]);
            expect(result[0].length).toBe(
                Object.values(player.artifacts).length,
            );
        });

        it('should handle ONLY_FRONT_LINE_ENEMY restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ONLY_FRONT_LINE_ENEMY,
            ]);
            const frontLineEnemies = Object.values(enemy.artifacts).filter(
                (a) => a.line === LINE.FRONT,
            );
            expect(result[1].length).toBe(frontLineEnemies.length);
        });

        it('should handle ONLY_BACK_LINE_ENEMY restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ONLY_BACK_LINE_ENEMY,
            ]);
            const backLineEnemies = Object.values(enemy.artifacts).filter(
                (a) => a.line === LINE.BACK,
            );
            expect(result[1].length).toBe(backLineEnemies.length);
        });

        it('should handle MELEE_ENEMY restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.MELEE_ENEMY,
            ]);
            expect(result[1]).toBeDefined();
        });

        it('should handle ALIVE restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ALIVE,
                TARGET_RESTRICTION.ANY_ENEMY,
                TARGET_RESTRICTION.ANY_ALLY,
            ]);
            const aliveEnemies = Object.values(enemy.artifacts).filter(
                (a) => a.state !== ARTIFACT_STATE.BREAKEN,
            );
            const aliveAllies = Object.values(player.artifacts).filter(
                (a) => a.state !== ARTIFACT_STATE.BREAKEN,
            );
            expect(result[1].length).toBe(aliveEnemies.length);
            expect(result[0].length).toBe(aliveAllies.length);
        });

        it('should handle BREAKEN restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.BREAKEN,
                TARGET_RESTRICTION.ANY_ENEMY,
                TARGET_RESTRICTION.ANY_ALLY,
            ]);
            const brokenEnemies = Object.values(enemy.artifacts).filter(
                (a) => a.state === ARTIFACT_STATE.BREAKEN,
            );
            const brokenAllies = Object.values(player.artifacts).filter(
                (a) => a.state === ARTIFACT_STATE.BREAKEN,
            );
            expect(result[1].length).toBe(brokenEnemies.length);
            expect(result[0].length).toBe(brokenAllies.length);
        });

        it('should handle NEED_HEAL_ALLY restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.NEED_HEAL_ALLY,
                TARGET_RESTRICTION.ANY_ALLY,
            ]);
            const needHealAllies = Object.values(player.artifacts).filter(
                (a) => a.currentHp < a.maxHp,
            );
            expect(result[0].length).toBe(needHealAllies.length);
        });

        it('should handle NO_AVATAR restriction', () => {
            mockGameEffectsService.countEffect.mockReturnValue(0);
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.NO_AVATAR,
            ]);
            expect(result[1]).toBeDefined();
        });

        it('should handle NORMAL_STATE restriction', () => {
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.NORMAL_STATE,
                TARGET_RESTRICTION.ANY_ENEMY,
            ]);
            const normalEnemies = Object.values(enemy.artifacts).filter(
                (a) =>
                    a.state === ARTIFACT_STATE.READY_TO_USE ||
                    a.state === ARTIFACT_STATE.COOLDOWN,
            );
            expect(result[1].length).toBe(normalEnemies.length);
        });

        it('should filter out invisible enemies', () => {
            mockGameEffectsService.countEffect.mockReturnValue(1);
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ENEMY,
            ]);
            expect(result[1].length).toBe(0);
        });
    });
});
