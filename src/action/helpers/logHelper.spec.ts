import { DAMAGE } from 'src/game-mechanics/types/combat';
import { LogHelper } from './logHelper';
import { ARTIFACT_STATE, LINE } from 'src/game-state/types/game';


describe('LogHelper', () => {
  describe('getHitLog', () => {
    it('should return hit log for MAGIC damage type', () => {
      const result = LogHelper.getHitLog(25, DAMAGE.MAGIC, 'Arcane Shield');
      expect(result).toBe('Нанес 25 магического урона по "Arcane Shield"');
    });

    it('should return hit log for MELEE damage type', () => {
      const result = LogHelper.getHitLog(15, DAMAGE.MELEE, 'Sword');
      expect(result).toBe('Нанес 15 ближнего урона по "Sword"');
    });

    it('should return hit log for RANGED damage type', () => {
      const result = LogHelper.getHitLog(30, DAMAGE.RANGED, 'Bow');
      expect(result).toBe('Нанес 30 дальнего урона по "Bow"');
    });
  });

  describe('getHealLog', () => {
    it('should return heal log', () => {
      const result = LogHelper.getHealLog(20, 'Moon Staff');
      expect(result).toBe('Восстановил 20 прочности артефакту "Moon Staff"');
    });
  });

  describe('getHealAllLog', () => {
    it('should return heal all log', () => {
      const result = LogHelper.getHealAllLog(15);
      expect(result).toBe('Восстановил 15 всем своим артефактам"');
    });
  });

  describe('getRestoreAgilityLog', () => {
    it('should return agility restore log', () => {
      const result = LogHelper.getRestoreAgilityLog(10);
      expect(result).toBe('10 ловкости');
    });
  });

  describe('getRestoreRageLog', () => {
    it('should return rage restore log', () => {
      const result = LogHelper.getRestoreRageLog(15);
      expect(result).toBe('15 ярости');
    });
  });

  describe('getRestoreLightManaLog', () => {
    it('should return light mana restore log', () => {
      const result = LogHelper.getRestoreLightManaLog(20);
      expect(result).toBe('20 маны света');
    });
  });

  describe('getRestoreDarkManaLog', () => {
    it('should return dark mana restore log', () => {
      const result = LogHelper.getRestoreDarkManaLog(25);
      expect(result).toBe('25 маны тьмы');
    });
  });

  describe('getRestoreDestructionManaLog', () => {
    it('should return destruction mana restore log', () => {
      const result = LogHelper.getRestoreDestructionManaLog(30);
      expect(result).toBe('30 маны разрушения');
    });
  });

  describe('getRestoreAgilityFullLog', () => {
    it('should return full agility restore log', () => {
      const result = LogHelper.getRestoreAgilityFullLog(10);
      expect(result).toBe('Восстановил 10 ловкости');
    });
  });

  describe('getRestoreRageFullLog', () => {
    it('should return full rage restore log', () => {
      const result = LogHelper.getRestoreRageFullLog(15);
      expect(result).toBe('Восстановил 15 ярости');
    });
  });

  describe('getRestoreLightManaFullLog', () => {
    it('should return full light mana restore log', () => {
      const result = LogHelper.getRestoreLightManaFullLog(20);
      expect(result).toBe('Восстановил 20 маны света');
    });
  });

  describe('getRestoreDarkManaFullLog', () => {
    it('should return full dark mana restore log', () => {
      const result = LogHelper.getRestoreDarkManaFullLog(25);
      expect(result).toBe('Восстановил 25 маны тьмы');
    });
  });

  describe('getRestoreDestructionManaFullLog', () => {
    it('should return full destruction mana restore log', () => {
      const result = LogHelper.getRestoreDestructionManaFullLog(30);
      expect(result).toBe('Восстановил 30 маны разрушения');
    });
  });

  describe('getSpentAgilityFullLog', () => {
    it('should return agility spent log', () => {
      const result = LogHelper.getSpentAgilityFullLog(10);
      expect(result).toBe('Потратил 10 ловкости');
    });
  });

  describe('getSpentRageFullLog', () => {
    it('should return rage spent log', () => {
      const result = LogHelper.getSpentRageFullLog(15);
      expect(result).toBe('Потратил 15 ярости');
    });
  });

  describe('getSpentLightManaFullLog', () => {
    it('should return light mana spent log', () => {
      const result = LogHelper.getSpentLightManaFullLog(20);
      expect(result).toBe('Потратил 20 маны света');
    });
  });

  describe('getSpentDarkManaFullLog', () => {
    it('should return dark mana spent log', () => {
      const result = LogHelper.getSpentDarkManaFullLog(25);
      expect(result).toBe('Потратил 25 маны тьмы');
    });
  });

  describe('getSpentDestructionManaFullLog', () => {
    it('should return destruction mana spent log', () => {
      const result = LogHelper.getSpentDestructionManaFullLog(30);
      expect(result).toBe('Потратил 30 маны разрушения');
    });
  });

  describe('getMoveArtifactLog', () => {
    it('should return move artifact log for FRONT line', () => {
      const result = LogHelper.getMoveArtifactLog('Arcane Shield', 2, LINE.FRONT);
      expect(result).toBe('Переместил Arcane Shield на позицию 3 передовой линии');
    });

    it('should return move artifact log for BACK line', () => {
      const result = LogHelper.getMoveArtifactLog('Moon Staff', 0, LINE.BACK);
      expect(result).toBe('Переместил Moon Staff на позицию 1 тыловой линии');
    });

    it('should handle position 0 correctly', () => {
      const result = LogHelper.getMoveArtifactLog('Sword', 0, LINE.FRONT);
      expect(result).toBe('Переместил Sword на позицию 1 передовой линии');
    });
  });

  describe('getSpawnArtifactLog', () => {
    it('should return spawn artifact log for FRONT line', () => {
      const result = LogHelper.getSpawnArtifactLog('Bone Knife', 1, LINE.FRONT);
      expect(result).toBe('Создал Bone Knife на позиции 2 передовой линии');
    });

    it('should return spawn artifact log for BACK line', () => {
      const result = LogHelper.getSpawnArtifactLog('Destruction Shard', 0, LINE.BACK);
      expect(result).toBe('Создал Destruction Shard на позиции 1 тыловой линии');
    });
  });

  describe('getDestroyArtifactLog', () => {
    it('should return destroy artifact log', () => {
      const result = LogHelper.getDestroyArtifactLog('Arcane Shield');
      expect(result).toBe('Уничтожен Arcane Shield');
    });
  });

  describe('getAppliedStateLog', () => {
    it('should return log for BREAKEN state', () => {
      const result = LogHelper.getAppliedStateLog('Arcane Shield', ARTIFACT_STATE.BREAKEN);
      expect(result).toBe('Перевел Arcane Shield в состояние "Сломан"');
    });

    it('should return log for COOLDOWN state', () => {
      const result = LogHelper.getAppliedStateLog('Moon Staff', ARTIFACT_STATE.COOLDOWN);
      expect(result).toBe('Перевел Moon Staff в состояние "Перезарядка"');
    });

    it('should return log for READY_TO_USE state', () => {
      const result = LogHelper.getAppliedStateLog('Sword', ARTIFACT_STATE.READY_TO_USE);
      expect(result).toBe('Перевел Sword в состояние "Готов к бою"');
    });

    it('should return log for ROOTED state', () => {
      const result = LogHelper.getAppliedStateLog('Tree', ARTIFACT_STATE.ROOTED);
      expect(result).toBe('Перевел Tree в состояние "Оцепенение"');
    });

    it('should return log for STUNNED state', () => {
      const result = LogHelper.getAppliedStateLog('Hammer', ARTIFACT_STATE.STUNNED);
      expect(result).toBe('Перевел Hammer в состояние "Оглушен"');
    });

    it('should return log for DREAM state', () => {
      const result = LogHelper.getAppliedStateLog('Dreamcatcher', ARTIFACT_STATE.DREAM);
      expect(result).toBe('Перевел Dreamcatcher в состояние "Сон"');
    });
  });

  describe('getThrowDiceLog', () => {
    it('should return throw dice log with face number 0', () => {
      const result = LogHelper.getThrowDiceLog(0);
      expect(result).toBe('Кинул кубик и выпала грань под номером 1');
    });

    it('should return throw dice log with face number 5', () => {
      const result = LogHelper.getThrowDiceLog(5);
      expect(result).toBe('Кинул кубик и выпала грань под номером 6');
    });

    it('should return throw dice log with face number 2', () => {
      const result = LogHelper.getThrowDiceLog(2);
      expect(result).toBe('Кинул кубик и выпала грань под номером 3');
    });
  });

  describe('getAppliedEffectLog', () => {
    it('should return applied effect log', () => {
      const mockEffect: any = { name: 'Poison' };
      const result = LogHelper.getAppliedEffectLog(mockEffect, 'Arcane Shield');
      expect(result).toBe('Применил эффект Poison на артефакт "Arcane Shield"');
    });
  });

  describe('getRemoveEffectLog', () => {
    it('should return remove effect log', () => {
      const mockEffect: any = { name: 'Burn' };
      const result = LogHelper.getRemoveEffectLog(mockEffect, 'Moon Staff');
      expect(result).toBe('Убран эффект Burn с артефакта "Moon Staff"');
    });
  });

  describe('getRemoveHeroEffectLog', () => {
    it('should return remove hero effect log', () => {
      const mockEffect: any = { name: 'Blessing' };
      const result = LogHelper.getRemoveHeroEffectLog(mockEffect, 'Player1');
      expect(result).toBe('Убран эффект Blessing с игрока "Player1"');
    });
  });

  describe('getAppliedHeroEffectLog', () => {
    it('should return applied hero effect log', () => {
      const mockEffect: any = { name: 'Curse' };
      const result = LogHelper.getAppliedHeroEffectLog(mockEffect, 'Player2');
      expect(result).toBe('Применил эффект Curse на игрока "Player2"');
    });
  });
describe('LogHelper - additional branch coverage', () => {
  describe('getHitLog - line 24 (damageType switch)', () => {
    it('should handle unknown damage type with empty string', () => {
      const result = LogHelper.getHitLog(10, 'unknown' as any, 'Test');
      expect(result).toBe('Нанес 10  урона по "Test"');
    });
  });

  describe('getMoveArtifactLog - line 108 (line switch)', () => {
    it('should handle unknown line type', () => {
      const result = LogHelper.getMoveArtifactLog('Test Artifact', 0, 'unknown' as any);
      expect(result).toBe('Переместил Test Artifact на позицию 1  линии');
    });

    it('should handle LINE.FRONT correctly (already covered)', () => {
      const result = LogHelper.getMoveArtifactLog('Artifact', 2, LINE.FRONT);
      expect(result).toBe('Переместил Artifact на позицию 3 передовой линии');
    });

    it('should handle LINE.BACK correctly (already covered)', () => {
      const result = LogHelper.getMoveArtifactLog('Artifact', 0, LINE.BACK);
      expect(result).toBe('Переместил Artifact на позицию 1 тыловой линии');
    });
  });

  describe('getSpawnArtifactLog - line 124 (line switch)', () => {
    it('should handle unknown line type', () => {
      const result = LogHelper.getSpawnArtifactLog('Test Artifact', 1, 'unknown' as any);
      expect(result).toBe('Создал Test Artifact на позиции 2  линии');
    });

    it('should handle LINE.FRONT correctly (already covered)', () => {
      const result = LogHelper.getSpawnArtifactLog('Artifact', 0, LINE.FRONT);
      expect(result).toBe('Создал Artifact на позиции 1 передовой линии');
    });

    it('should handle LINE.BACK correctly (already covered)', () => {
      const result = LogHelper.getSpawnArtifactLog('Artifact', 2, LINE.BACK);
      expect(result).toBe('Создал Artifact на позиции 3 тыловой линии');
    });
  });

  describe('getAppliedStateLog - line 151 (state switch)', () => {
    it('should handle unknown state', () => {
      const result = LogHelper.getAppliedStateLog('Test Artifact', 'unknown' as any);
      expect(result).toBe('Перевел Test Artifact в состояние ""');
    });

    it('should handle BREAKEN state (already covered)', () => {
      const result = LogHelper.getAppliedStateLog('Artifact', ARTIFACT_STATE.BREAKEN);
      expect(result).toBe('Перевел Artifact в состояние "Сломан"');
    });

    it('should handle COOLDOWN state (already covered)', () => {
      const result = LogHelper.getAppliedStateLog('Artifact', ARTIFACT_STATE.COOLDOWN);
      expect(result).toBe('Перевел Artifact в состояние "Перезарядка"');
    });

    it('should handle READY_TO_USE state (already covered)', () => {
      const result = LogHelper.getAppliedStateLog('Artifact', ARTIFACT_STATE.READY_TO_USE);
      expect(result).toBe('Перевел Artifact в состояние "Готов к бою"');
    });

    it('should handle ROOTED state (already covered)', () => {
      const result = LogHelper.getAppliedStateLog('Artifact', ARTIFACT_STATE.ROOTED);
      expect(result).toBe('Перевел Artifact в состояние "Оцепенение"');
    });

    it('should handle STUNNED state (already covered)', () => {
      const result = LogHelper.getAppliedStateLog('Artifact', ARTIFACT_STATE.STUNNED);
      expect(result).toBe('Перевел Artifact в состояние "Оглушен"');
    });

    it('should handle DREAM state (already covered)', () => {
      const result = LogHelper.getAppliedStateLog('Artifact', ARTIFACT_STATE.DREAM);
      expect(result).toBe('Перевел Artifact в состояние "Сон"');
    });
  });
});

describe('LogHelper - complete coverage', () => {
  describe('getRestore*Log methods', () => {
    it('should handle zero values', () => {
      expect(LogHelper.getRestoreAgilityLog(0)).toBe('0 ловкости');
      expect(LogHelper.getRestoreRageLog(0)).toBe('0 ярости');
      expect(LogHelper.getRestoreLightManaLog(0)).toBe('0 маны света');
      expect(LogHelper.getRestoreDarkManaLog(0)).toBe('0 маны тьмы');
      expect(LogHelper.getRestoreDestructionManaLog(0)).toBe('0 маны разрушения');
    });

    it('should handle large values', () => {
      expect(LogHelper.getRestoreAgilityLog(999)).toBe('999 ловкости');
      expect(LogHelper.getRestoreRageLog(999)).toBe('999 ярости');
    });
  });

  describe('getRestore*FullLog methods', () => {
    it('should handle zero values', () => {
      expect(LogHelper.getRestoreAgilityFullLog(0)).toBe('Восстановил 0 ловкости');
      expect(LogHelper.getRestoreRageFullLog(0)).toBe('Восстановил 0 ярости');
      expect(LogHelper.getRestoreLightManaFullLog(0)).toBe('Восстановил 0 маны света');
      expect(LogHelper.getRestoreDarkManaFullLog(0)).toBe('Восстановил 0 маны тьмы');
      expect(LogHelper.getRestoreDestructionManaFullLog(0)).toBe('Восстановил 0 маны разрушения');
    });
  });

  describe('getSpent*FullLog methods', () => {
    it('should handle zero values', () => {
      expect(LogHelper.getSpentAgilityFullLog(0)).toBe('Потратил 0 ловкости');
      expect(LogHelper.getSpentRageFullLog(0)).toBe('Потратил 0 ярости');
      expect(LogHelper.getSpentLightManaFullLog(0)).toBe('Потратил 0 маны света');
      expect(LogHelper.getSpentDarkManaFullLog(0)).toBe('Потратил 0 маны тьмы');
      expect(LogHelper.getSpentDestructionManaFullLog(0)).toBe('Потратил 0 маны разрушения');
    });
  });

  describe('getMoveArtifactLog - position edge cases', () => {
    it('should handle negative position (should not happen but test for safety)', () => {
      const result = LogHelper.getMoveArtifactLog('Artifact', -1, LINE.FRONT);
      expect(result).toBe('Переместил Artifact на позицию 0 передовой линии');
    });

    it('should handle large position values', () => {
      const result = LogHelper.getMoveArtifactLog('Artifact', 100, LINE.BACK);
      expect(result).toBe('Переместил Artifact на позицию 101 тыловой линии');
    });
  });

  describe('getSpawnArtifactLog - position edge cases', () => {
    it('should handle negative position', () => {
      const result = LogHelper.getSpawnArtifactLog('Artifact', -1, LINE.FRONT);
      expect(result).toBe('Создал Artifact на позиции 0 передовой линии');
    });

    it('should handle large position values', () => {
      const result = LogHelper.getSpawnArtifactLog('Artifact', 100, LINE.BACK);
      expect(result).toBe('Создал Artifact на позиции 101 тыловой линии');
    });
  });

  describe('getThrowDiceLog - edge cases', () => {
    it('should handle face number 0', () => {
      expect(LogHelper.getThrowDiceLog(0)).toBe('Кинул кубик и выпала грань под номером 1');
    });

    it('should handle face number 5', () => {
      expect(LogHelper.getThrowDiceLog(5)).toBe('Кинул кубик и выпала грань под номером 6');
    });

    it('should handle negative face number (should not happen)', () => {
      const result = LogHelper.getThrowDiceLog(-1);
      expect(result).toBe('Кинул кубик и выпала грань под номером 0');
    });
  });

  describe('getAppliedEffectLog and getRemoveEffectLog', () => {
    it('should handle effect with empty name', () => {
      const mockEffect: any = { name: '' };
      expect(LogHelper.getAppliedEffectLog(mockEffect, 'Artifact')).toBe('Применил эффект  на артефакт "Artifact"');
      expect(LogHelper.getRemoveEffectLog(mockEffect, 'Artifact')).toBe('Убран эффект  с артефакта "Artifact"');
    });

    it('should handle effect with null name', () => {
      const mockEffect: any = { name: null };
      expect(LogHelper.getAppliedEffectLog(mockEffect, 'Artifact')).toBe('Применил эффект null на артефакт "Artifact"');
    });
  });

  describe('getRemoveHeroEffectLog and getAppliedHeroEffectLog', () => {
    it('should handle effect with empty name', () => {
      const mockEffect: any = { name: '' };
      expect(LogHelper.getRemoveHeroEffectLog(mockEffect, 'Player')).toBe('Убран эффект  с игрока "Player"');
      expect(LogHelper.getAppliedHeroEffectLog(mockEffect, 'Player')).toBe('Применил эффект  на игрока "Player"');
    });

    it('should handle empty player name', () => {
      const mockEffect: any = { name: 'Test' };
      expect(LogHelper.getRemoveHeroEffectLog(mockEffect, '')).toBe('Убран эффект Test с игрока ""');
      expect(LogHelper.getAppliedHeroEffectLog(mockEffect, '')).toBe('Применил эффект Test на игрока ""');
    });
  });

  describe('getHealLog - edge cases', () => {
    it('should handle zero heal', () => {
      expect(LogHelper.getHealLog(0, 'Artifact')).toBe('Восстановил 0 прочности артефакту "Artifact"');
    });

    it('should handle negative heal', () => {
      expect(LogHelper.getHealLog(-10, 'Artifact')).toBe('Восстановил -10 прочности артефакту "Artifact"');
    });

    it('should handle empty artifact name', () => {
      expect(LogHelper.getHealLog(10, '')).toBe('Восстановил 10 прочности артефакту ""');
    });
  });

  describe('getHealAllLog - edge cases', () => {
    it('should handle zero heal', () => {
      expect(LogHelper.getHealAllLog(0)).toBe('Восстановил 0 всем своим артефактам"');
    });
  });

  describe('getDestroyArtifactLog - edge cases', () => {
    it('should handle empty artifact name', () => {
      expect(LogHelper.getDestroyArtifactLog('')).toBe('Уничтожен ');
    });
  });
});
});