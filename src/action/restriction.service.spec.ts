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

describe('RestrictionService - additional branch coverage', () => {
    let service: RestrictionService;
    let gameEffectsService: jest.Mocked<GameEffectsService>;
    let player: Player;
    let enemy: Player;
    let artifact: ArtifactGameState;

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
        
        player = createMockPlayer();
        enemy = createMockPlayer('enemy-1');
        artifact = player.artifacts['artifact-1'];
        
        gameEffectsService.countEffect.mockReset();
        gameEffectsService.countEffect.mockReturnValue(0);
    });

    describe('checkGeneralRestrictions - additional branches', () => {
        it('should check HAVE_ONE_MOVE_POINT restriction', () => {
            player.movePoints = 1;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_ONE_MOVE_POINT,
            ]);
            expect(result).toBe(true);

            player.movePoints = 0;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_ONE_MOVE_POINT,
            ]);
            expect(result).toBe(false);
        });

        it('should check HAVE_TEN_DARK_MANA restriction', () => {
            player.resources[RESOURCE.DARK_MANA] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_DARK_MANA,
            ]);
            expect(result).toBe(true);

            player.resources[RESOURCE.DARK_MANA] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_DARK_MANA,
            ]);
            expect(result).toBe(false);
        });

        it('should check HAVE_TEN_DESTRUCTION_MANA restriction', () => {
            player.resources[RESOURCE.DESTRUCTION_MANA] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_DESTRUCTION_MANA,
            ]);
            expect(result).toBe(true);

            player.resources[RESOURCE.DESTRUCTION_MANA] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.HAVE_TEN_DESTRUCTION_MANA,
            ]);
            expect(result).toBe(false);
        });

        it('should check ENEMY_HAVE_TEN_AGILITY restriction', () => {
            enemy.resources[RESOURCE.AGILITY] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_AGILITY,
            ]);
            expect(result).toBe(true);

            enemy.resources[RESOURCE.AGILITY] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_AGILITY,
            ]);
            expect(result).toBe(false);
        });

        it('should check ENEMY_HAVE_TEN_RAGE restriction', () => {
            enemy.resources[RESOURCE.RAGE] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_RAGE,
            ]);
            expect(result).toBe(true);

            enemy.resources[RESOURCE.RAGE] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_RAGE,
            ]);
            expect(result).toBe(false);
        });

        it('should check ENEMY_HAVE_TEN_DARK_MANA restriction', () => {
            enemy.resources[RESOURCE.DARK_MANA] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_DARK_MANA,
            ]);
            expect(result).toBe(true);

            enemy.resources[RESOURCE.DARK_MANA] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_DARK_MANA,
            ]);
            expect(result).toBe(false);
        });

        it('should check ENEMY_HAVE_TEN_DESTRUCTION_MANA restriction', () => {
            enemy.resources[RESOURCE.DESTRUCTION_MANA] = 15;
            let result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_DESTRUCTION_MANA,
            ]);
            expect(result).toBe(true);

            enemy.resources[RESOURCE.DESTRUCTION_MANA] = 5;
            result = service.checkGeneralRestrictions(player, enemy, [
                RESTRICTION.ENEMY_HAVE_TEN_DESTRUCTION_MANA,
            ]);
            expect(result).toBe(false);
        });
    });

    describe('checkSpellRestrictions - additional coverage', () => {
        it('should return true when there are alive artifacts', () => {
            const result = service.checkSpellRestrictions(enemy, []);
            expect(result).toBe(true);
        });

        it('should return true when no alive artifacts but there is artifact without avatar', () => {
            for (const art of Object.values(enemy.artifacts)) {
                art.currentHp = 0;
            }
            gameEffectsService.countEffect.mockReturnValue(0);
            
            const result = service.checkSpellRestrictions(enemy, []);
            expect(result).toBe(true);
        });

        it('should return false when no alive artifacts and no artifact without avatar', () => {
            for (const art of Object.values(enemy.artifacts)) {
                art.currentHp = 0;
            }
            gameEffectsService.countEffect.mockReturnValue(1);
            
            const result = service.checkSpellRestrictions(enemy, []);
            expect(result).toBe(false);
        });
    });

    describe('getTargetsByRestrictions - MELEE_ENEMY', () => {
        it('should handle MELEE_ENEMY with defenders on front line', () => {
            enemy.artifacts = {};
            
            const frontArtifact = createMockArtifact('front-art', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            const backArtifact = createMockArtifact('back-art', ARTIFACT_STATE.READY_TO_USE, LINE.BACK, 30, 30);
            
            enemy.artifacts['front-art'] = frontArtifact;
            enemy.artifacts['back-art'] = backArtifact;
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.MELEE_ENEMY,
            ]);
            
            expect(result[1]).toContain('front-art');
            expect(result[1]).not.toContain('back-art');
        });

        it('should handle MELEE_ENEMY without defenders (all broken or destroyed)', () => {
            enemy.artifacts = {};
            
            const frontArtifact = createMockArtifact('front-art', ARTIFACT_STATE.BREAKEN, LINE.FRONT, 0, 30);
            const backArtifact = createMockArtifact('back-art', ARTIFACT_STATE.READY_TO_USE, LINE.BACK, 30, 30);
            
            enemy.artifacts['front-art'] = frontArtifact;
            enemy.artifacts['back-art'] = backArtifact;
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.MELEE_ENEMY,
            ]);
            
            expect(result[1]).toContain('back-art');
            expect(result[1]).not.toContain('front-art');
        });

        it('should handle MELEE_ENEMY with some broken defenders and some alive', () => {
            enemy.artifacts = {};
            
            const brokenFrontArtifact = createMockArtifact('broken-front', ARTIFACT_STATE.BREAKEN, LINE.FRONT, 0, 30);
            const aliveFrontArtifact = createMockArtifact('alive-front', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            const backArtifact = createMockArtifact('back', ARTIFACT_STATE.READY_TO_USE, LINE.BACK, 30, 30);
            
            enemy.artifacts['broken-front'] = brokenFrontArtifact;
            enemy.artifacts['alive-front'] = aliveFrontArtifact;
            enemy.artifacts['back'] = backArtifact;
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.MELEE_ENEMY,
            ]);
            
            expect(result[1]).toContain('alive-front');
            expect(result[1]).not.toContain('broken-front');
            expect(result[1]).not.toContain('back');
        });
    });

    describe('getTargetsByRestrictions - CAN_ATTACK restriction', () => {
        it('should handle CAN_ATTACK restriction filtering', () => {
            enemy.artifacts = {};
            player.artifacts = {};
            
            const attackArtifact = createMockArtifact('attack-art', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30, 'sword');
            const noAttackArtifact = createMockArtifact('no-attack-art', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30, 'heal');
            
            enemy.artifacts['attack-art'] = attackArtifact;
            enemy.artifacts['no-attack-art'] = noAttackArtifact;
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ENEMY,
                TARGET_RESTRICTION.CAN_ATTACK,
            ]);
            
            expect(result[1]).toContain('attack-art');
            expect(result[1]).not.toContain('no-attack-art');
        });
    });

    describe('getTargetsByRestrictions - NEED_HEAL_ALLY restriction', () => {
        it('should handle NEED_HEAL_ALLY filtering', () => {
            player.artifacts = {};
            
            const fullHpArtifact = createMockArtifact('full-hp', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            const damagedArtifact = createMockArtifact('damaged', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 15, 30);
            
            player.artifacts['full-hp'] = fullHpArtifact;
            player.artifacts['damaged'] = damagedArtifact;
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ALLY,
                TARGET_RESTRICTION.NEED_HEAL_ALLY,
            ]);
            
            expect(result[0]).toContain('damaged');
            expect(result[0]).not.toContain('full-hp');
        });

        it('should handle NEED_HEAL_ALLY with no damaged allies', () => {
            player.artifacts = {};
            
            const fullHpArtifact = createMockArtifact('full-hp', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            player.artifacts['full-hp'] = fullHpArtifact;
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ALLY,
                TARGET_RESTRICTION.NEED_HEAL_ALLY,
            ]);
            
            expect(result[0].length).toBe(0);
        });
    });

    describe('getTargetsByRestrictions - NO_AVATAR restriction', () => {
        it('should handle NO_AVATAR restriction filtering', () => {
            enemy.artifacts = {};
            
            const withAvatar = createMockArtifact('with-avatar', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            const withoutAvatar = createMockArtifact('without-avatar', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            
            enemy.artifacts['with-avatar'] = withAvatar;
            enemy.artifacts['without-avatar'] = withoutAvatar;
            
            gameEffectsService.countEffect.mockImplementation((art, effect) => {
                if (effect === EFFECT.AVATAR && art === withAvatar) {
                    return 1;
                }
                return 0;
            });
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ENEMY,
                TARGET_RESTRICTION.NO_AVATAR,
            ]);
            
            expect(result[1]).toContain('without-avatar');
            expect(result[1]).not.toContain('with-avatar');
        });
    });

    describe('getTargetsByRestrictions - NORMAL_STATE restriction', () => {
        it('should handle NORMAL_STATE restriction filtering', () => {
            enemy.artifacts = {};
            
            const readyArtifact = createMockArtifact('ready', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            const cooldownArtifact = createMockArtifact('cooldown', ARTIFACT_STATE.COOLDOWN, LINE.FRONT, 30, 30);
            const brokenArtifact = createMockArtifact('broken', ARTIFACT_STATE.BREAKEN, LINE.FRONT, 0, 30);
            
            enemy.artifacts['ready'] = readyArtifact;
            enemy.artifacts['cooldown'] = cooldownArtifact;
            enemy.artifacts['broken'] = brokenArtifact;
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ENEMY,
                TARGET_RESTRICTION.NORMAL_STATE,
            ]);
            
            expect(result[1]).toContain('ready');
            expect(result[1]).toContain('cooldown');
            expect(result[1]).not.toContain('broken');
        });
    });

    describe('getTargetsByRestrictions - INVISIBLE filter', () => {
        it('should filter out invisible enemies', () => {
            enemy.artifacts = {};
            
            const visibleArtifact = createMockArtifact('visible', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            const invisibleArtifact = createMockArtifact('invisible', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            
            enemy.artifacts['visible'] = visibleArtifact;
            enemy.artifacts['invisible'] = invisibleArtifact;
            
            gameEffectsService.countEffect.mockImplementation((art, effect) => {
                if (effect === EFFECT.INVISIBLE && art === invisibleArtifact) {
                    return 1;
                }
                return 0;
            });
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ENEMY,
            ]);
            
            expect(result[1]).toContain('visible');
            expect(result[1]).not.toContain('invisible');
        });

        it('should handle empty enemies array after invisible filter', () => {
            enemy.artifacts = {};
            
            const invisibleArtifact = createMockArtifact('invisible', ARTIFACT_STATE.READY_TO_USE, LINE.FRONT, 30, 30);
            enemy.artifacts['invisible'] = invisibleArtifact;
            
            gameEffectsService.countEffect.mockReturnValue(1);
            
            const result = service.getTargetsByRestrictions(player, enemy, [
                TARGET_RESTRICTION.ANY_ENEMY,
            ]);
            
            expect(result[1].length).toBe(0);
        });
    });


    describe('checkArtifactRestrictions - additional coverage', () => {
        it('should return false for ZERO_USED_SKILL_CHARGES when effect exists and number > 0', () => {
            artifact.effects = [
                { id: EFFECT.USED_SKILL_CHARGES, number: 1 } as any,
            ];
            
            const result = service.checkArtifactRestrictions(
                [RESTRICTION.ZERO_USED_SKILL_CHARGES],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });

        it('should return true for ZERO_USED_SKILL_CHARGES when effect exists but number is 0', () => {
            artifact.effects = [
                { id: EFFECT.USED_SKILL_CHARGES, number: 0 } as any,
            ];
            
            const result = service.checkArtifactRestrictions(
                [RESTRICTION.ZERO_USED_SKILL_CHARGES],
                player,
                artifact,
            );
            expect(result).toBe(true);
        });

        it('should return true for ZERO_USED_SKILL_CHARGES when effect does not exist', () => {
            artifact.effects = [];
            
            const result = service.checkArtifactRestrictions(
                [RESTRICTION.ZERO_USED_SKILL_CHARGES],
                player,
                artifact,
            );
            expect(result).toBe(true);
        });

        it('should return false for SAME_LINE_HAVE_ONE_FREE_SPOT when no free spots', () => {
            const line = artifact.line;
            const existingArtifacts = Object.values(player.artifacts).filter(a => a.line === line);
            const spotsToFill = MAX_COUNT_ARTIFACTS_ON_LINE - existingArtifacts.length;
            
            for (let i = 0; i < spotsToFill; i++) {
                const newArtifact = createMockArtifact(`temp-${i}`, ARTIFACT_STATE.READY_TO_USE, line);
                player.artifacts[`temp-${i}`] = newArtifact;
            }
            
            const result = service.checkArtifactRestrictions(
                [RESTRICTION.SAME_LINE_HAVE_ONE_FREE_SPOT],
                player,
                artifact,
            );
            expect(result).toBe(false);
        });
    });
});
});
