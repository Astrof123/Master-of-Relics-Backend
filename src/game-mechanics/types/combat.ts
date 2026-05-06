export const DAMAGE = {
    MELEE: "melee",
    RANGED: "ranged",
    MAGIC: "magic"
}

export type DamageType = typeof DAMAGE [keyof typeof DAMAGE]


export interface Damages {
    [DAMAGE.MAGIC]?: number;
    [DAMAGE.RANGED]?: number;
    [DAMAGE.MELEE]?: number;
}