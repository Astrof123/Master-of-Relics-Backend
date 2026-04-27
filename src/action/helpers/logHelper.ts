import { DAMAGE, DamageType } from "src/game-mechanics/types/combat";
import { LOG_TYPE, LogType } from "../types/log";
import { ARTIFACT_STATE, ArtifactState, LINE, Line } from "src/game-state/types/game";
import { Effect, EffectType } from "src/game-mechanics/types/effect";
import { EFFECTS } from "src/game-mechanics/constants/effects";

export class LogHelper {
    public static getHitLog(damage: number, damageType: DamageType, attackedArtifactName: string) {
        let damageTypeName = "";
        
        if (damageType === DAMAGE.MAGIC) {
            damageTypeName = "магического"
        }
        else if (damageType === DAMAGE.MELEE) {
            damageTypeName = "ближнего"
        }
        else if (damageType === DAMAGE.RANGED) {
            damageTypeName = "дальнего"
        }

        return `Нанес ${damage} ${damageTypeName} урона по "${attackedArtifactName}"`
    }

    public static getHealLog(heal: number, healedArtifactName: string) {
        return `Восстановил ${heal} прочности артефакту "${healedArtifactName}"`
    }

    public static getHealAllLog(heal: number) {
        return `Восстановил ${heal} всем своим артефактам"`
    }

    public static getRestoreAgilityLog(agility: number) {
        return `${agility} ловкости`
    }

    public static getRestoreRageLog(rage: number) {
        return `${rage} ярости`
    }

    public static getRestoreLightManaLog(mana: number) {
        return `${mana} маны света`
    }

    public static getRestoreDarkManaLog(mana: number) {
        return `${mana} маны тьмы`
    }

    public static getRestoreDestructionManaLog(mana: number) {
        return `${mana} маны разрушения`
    }


    public static getRestoreAgilityFullLog(agility: number) {
        return `Восстановил ${agility} ловкости`
    }

    public static getRestoreRageFullLog(rage: number) {
        return `Восстановил ${rage} ярости`
    }

    public static getRestoreLightManaFullLog(mana: number) {
        return `Восстановил ${mana} маны света`
    }

    public static getRestoreDarkManaFullLog(mana: number) {
        return `Восстановил ${mana} маны тьмы`
    }

    public static getRestoreDestructionManaFullLog(mana: number) {
        return `Восстановил ${mana} маны разрушения`
    }


    public static getSpentAgilityFullLog(agility: number) {
        return `Потратил ${agility} ловкости`
    }

    public static getSpentRageFullLog(rage: number) {
        return `Потратил ${rage} ярости`
    }

    public static getSpentLightManaFullLog(mana: number) {
        return `Потратил ${mana} маны света`
    }

    public static getSpentDarkManaFullLog(mana: number) {
        return `Потратил ${mana} маны тьмы`
    }

    public static getSpentDestructionManaFullLog(mana: number) {
        return `Потратил ${mana} маны разрушения`
    }

    public static getMoveArtifactLog(artifactName: string, position: number, line: Line) {
        let lineName = "";

        if (line === LINE.FRONT) {
            lineName = "передовой"
        }
        else if (line === LINE.BACK) {
            lineName = "тыловой"
        }

        return `Переместил ${artifactName} на позицию ${position + 1} ${lineName} линии`
    }

    public static getAppliedStateLog(artifactName: string, state: ArtifactState) {
        let stateName = "";

        if (state === ARTIFACT_STATE.BREAKEN) {
            stateName = "Сломан";
        }
        else if (state === ARTIFACT_STATE.COOLDOWN) {
            stateName = "Перезарядка";
        }
        else if (state === ARTIFACT_STATE.READY_TO_USE) {
            stateName = "Готов к бою";
        }
        else if (state === ARTIFACT_STATE.ROOTED) {
            stateName = "Оцепенение";
        }
        else if (state === ARTIFACT_STATE.STUNNED) {
            stateName = "Оглушен";
        }

        return `Перевел ${artifactName} в состояние "${stateName}"`
    }

    public static getThrowDiceLog(faceNumber: number) {
        return `Кинул кубик и выпала грань под номером ${faceNumber + 1}`
    }

    public static getAppliedEffectLog(effect: EffectType, artifactName: string) {
        return `Применил эффект ${effect.name} на артефакт "${artifactName}"`
    }
}