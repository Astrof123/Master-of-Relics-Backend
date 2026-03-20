export const DAMAGE = {
    MELEE: "melee",
    RANGED: "ranged",
    MAGIC: "magic"
}

export type DamageType = typeof DAMAGE [keyof typeof DAMAGE]