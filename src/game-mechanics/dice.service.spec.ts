import { Test, TestingModule } from '@nestjs/testing';
import { DiceService } from './dice.service';
import { Player } from '../game-state/types/game';
import { GameForLogic } from '../game-state/types/game-for-logic';
import { randomInt } from 'crypto';

jest.mock('crypto', () => ({
  randomInt: jest.fn(),
}));

jest.mock('../action/helpers/logHelper', () => ({
  LogHelper: {
    getThrowDiceLog: jest.fn((num) => `Выпало число ${num + 1}`),
  },
}));

jest.mock('../artifact/constants/artifacts', () => ({
  ARTIFACTS: {
    'arcane_shield': {
      id: 'arcane_shield',
      name: 'Arcane Shield',
      faces: ['sword', 'shield', 'mana', 'rage', 'agility', 'heal'],
    },
    'moon_staff': {
      id: 'moon_staff',
      name: 'Moon Staff',
      faces: ['heal', 'mana', 'sword', 'rage', 'agility', 'shield'],
    },
    'axe_of_the_berserker': {
      id: 'axe_of_the_berserker',
      name: 'Axe of the Berserker',
      faces: ['sword', 'sword', 'rage', 'rage', 'sword', 'rage'],
    },
  },
}));

describe('DiceService', () => {
  let service: DiceService;

  const createMockArtifact = (id: string, artifactId: string, face: string = 'sword'): any => ({
    id,
    artifactId,
    face,
    currentHp: 30,
    maxHp: 30,
    state: 'ready_to_use',
    position: 1,
    line: 'front',
    skillCost: 2,
    effects: [],
  });

  const createMockPlayer = (): Player => ({
    id: 'player-1',
    name: 'Player1',
    connection: 'online',
    isBot: false,
    hero: 'Empty',
    resources: { agility: 50, rage: 30, light_mana: 20, dark_mana: 10, destruction_mana: 5 },
    artifacts: {
      'artifact-1': createMockArtifact('artifact-1', 'arcane_shield'),
      'artifact-2': createMockArtifact('artifact-2', 'moon_staff'),
    },
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DiceService],
    }).compile();

    service = module.get<DiceService>(DiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('throwDice', () => {
    let player: Player;
    const logParts: string[] = [];

    beforeEach(() => {
      player = createMockPlayer();
      logParts.length = 0;
      (randomInt as jest.Mock).mockReturnValue(2);
    });

    it('should throw dice and update artifact face', () => {
      const artifactId = 'arcane_shield';
      const artifactGameId = 'artifact-1';

      const result = service.throwDice(player, artifactGameId, artifactId, logParts);

      expect(randomInt).toHaveBeenCalledWith(0, 6);
      expect(result.artifacts[artifactGameId].face).toBe('mana');
      expect(logParts[0]).toBe('Выпало число 3');
    });

    it('should return the updated player', () => {
      const artifactId = 'arcane_shield';
      const artifactGameId = 'artifact-1';

      const result = service.throwDice(player, artifactGameId, artifactId, logParts);

      expect(result).toBe(player);
    });

    it('should handle different dice results', () => {
      const artifactId = 'arcane_shield';
      const artifactGameId = 'artifact-1';

      for (let i = 0; i < 6; i++) {
        (randomInt as jest.Mock).mockReturnValue(i);
        const newPlayer = createMockPlayer();
        
        service.throwDice(newPlayer, artifactGameId, artifactId, []);
        
        const expectedFace = require('../artifact/constants/artifacts').ARTIFACTS[artifactId].faces[i];
        expect(newPlayer.artifacts[artifactGameId].face).toBe(expectedFace);
      }
    });

    it('should push log message for each throw', () => {
      const artifactId = 'arcane_shield';
      const artifactGameId = 'artifact-1';

      service.throwDice(player, artifactGameId, artifactId, logParts);

      expect(logParts).toHaveLength(1);
      expect(logParts[0]).toBe('Выпало число 3');
    });

    it('should work with different artifact types', () => {
      const testCases = [
        { artifactId: 'arcane_shield', artifactGameId: 'artifact-1' },
        { artifactId: 'moon_staff', artifactGameId: 'artifact-2' },
      ];

      for (const testCase of testCases) {
        (randomInt as jest.Mock).mockReturnValue(0);
        const newPlayer = createMockPlayer();
        
        service.throwDice(newPlayer, testCase.artifactGameId, testCase.artifactId, []);
        
        const expectedFace = require('../artifact/constants/artifacts').ARTIFACTS[testCase.artifactId].faces[0];
        expect(newPlayer.artifacts[testCase.artifactGameId].face).toBe(expectedFace);
      }
    });
  });

  describe('updateDicesNewRound', () => {
    let gameState: GameForLogic;

    beforeEach(() => {
      gameState = createMockGameState();
      (randomInt as jest.Mock).mockReturnValue(3);
    });

    it('should update all player artifacts faces', () => {
      const playerArtifactIds = Object.keys(gameState.player.artifacts);
      
      service.updateDicesNewRound(gameState);

      for (const artifactId of playerArtifactIds) {
        const artifact = gameState.player.artifacts[artifactId];
        expect(artifact.face).toBeDefined();
      }
    });

    it('should update all enemy artifacts faces', () => {
      const enemyArtifactIds = Object.keys(gameState.enemy.artifacts);
      
      service.updateDicesNewRound(gameState);

      for (const artifactId of enemyArtifactIds) {
        const artifact = gameState.enemy.artifacts[artifactId];
        expect(artifact.face).toBeDefined();
      }
    });

    it('should throw dice for each artifact', () => {
      const playerArtifactCount = Object.keys(gameState.player.artifacts).length;
      const enemyArtifactCount = Object.keys(gameState.enemy.artifacts).length;
      const totalArtifacts = playerArtifactCount + enemyArtifactCount;

      service.updateDicesNewRound(gameState);

      expect(randomInt).toHaveBeenCalledTimes(totalArtifacts);
    });

    it('should return the updated game state', () => {
      const result = service.updateDicesNewRound(gameState);

      expect(result).toBe(gameState);
    });

    it('should handle empty artifacts', () => {
      gameState.player.artifacts = {};
      gameState.enemy.artifacts = {};

      const result = service.updateDicesNewRound(gameState);

      expect(randomInt).not.toHaveBeenCalled();
      expect(result).toBe(gameState);
    });

    it('should handle player with no artifacts but enemy has', () => {
      gameState.player.artifacts = {};
      gameState.enemy.artifacts = {
        'enemy-artifact-1': createMockArtifact('enemy-artifact-1', 'axe_of_the_berserker'),
      };

      service.updateDicesNewRound(gameState);

      expect(randomInt).toHaveBeenCalledTimes(1);
    });

    it('should handle enemy with no artifacts but player has', () => {
      gameState.enemy.artifacts = {};

      service.updateDicesNewRound(gameState);

      const playerArtifactCount = Object.keys(gameState.player.artifacts).length;
      expect(randomInt).toHaveBeenCalledTimes(playerArtifactCount);
    });
  });

  describe('Edge cases', () => {
    let player: Player;
    const logParts: string[] = [];

    beforeEach(() => {
      player = createMockPlayer();
      logParts.length = 0;
    });

    it('should handle dice roll of 0', () => {
      (randomInt as jest.Mock).mockReturnValue(0);
      const artifactId = 'arcane_shield';
      const artifactGameId = 'artifact-1';
      const expectedFace = require('../artifact/constants/artifacts').ARTIFACTS[artifactId].faces[0];

      service.throwDice(player, artifactGameId, artifactId, logParts);

      expect(player.artifacts[artifactGameId].face).toBe(expectedFace);
    });

    it('should handle dice roll of 5', () => {
      (randomInt as jest.Mock).mockReturnValue(5);
      const artifactId = 'arcane_shield';
      const artifactGameId = 'artifact-1';
      const expectedFace = require('../artifact/constants/artifacts').ARTIFACTS[artifactId].faces[5];

      service.throwDice(player, artifactGameId, artifactId, logParts);

      expect(player.artifacts[artifactGameId].face).toBe(expectedFace);
    });

    it('should handle multiple dice throws in sequence', () => {
      const artifactId = 'arcane_shield';
      const artifactGameId = 'artifact-1';

      const results = [0, 1, 2, 3, 4, 5];
      for (let i = 0; i < results.length; i++) {
        (randomInt as jest.Mock).mockReturnValue(results[i]);
        const newPlayer = createMockPlayer();
        
        service.throwDice(newPlayer, artifactGameId, artifactId, []);
        
        const expectedFace = require('../artifact/constants/artifacts').ARTIFACTS[artifactId].faces[results[i]];
        expect(newPlayer.artifacts[artifactGameId].face).toBe(expectedFace);
      }
    });
  });

  describe('Integration with game state', () => {
    it('should maintain other artifact properties after dice throw', () => {
      const player = createMockPlayer();
      const artifactGameId = 'artifact-1';
      const originalArtifact = { ...player.artifacts[artifactGameId] };
      (randomInt as jest.Mock).mockReturnValue(2);

      service.throwDice(player, artifactGameId, 'arcane_shield', []);

      expect(player.artifacts[artifactGameId].id).toBe(originalArtifact.id);
      expect(player.artifacts[artifactGameId].artifactId).toBe(originalArtifact.artifactId);
      expect(player.artifacts[artifactGameId].currentHp).toBe(originalArtifact.currentHp);
      expect(player.artifacts[artifactGameId].maxHp).toBe(originalArtifact.maxHp);
      expect(player.artifacts[artifactGameId].state).toBe(originalArtifact.state);
    });

    it('should update all artifacts in new round', () => {
      const gameState = createMockGameState();
      const playerArtifactIds = Object.keys(gameState.player.artifacts);
      const enemyArtifactIds = Object.keys(gameState.enemy.artifacts);
      
      (randomInt as jest.Mock).mockReturnValue(4);

      service.updateDicesNewRound(gameState);

      for (const id of playerArtifactIds) {
        expect(gameState.player.artifacts[id].face).toBeDefined();
      }
      for (const id of enemyArtifactIds) {
        expect(gameState.enemy.artifacts[id].face).toBeDefined();
      }
    });
  });
});