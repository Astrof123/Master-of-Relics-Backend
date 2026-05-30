import { forwardRef, Module } from '@nestjs/common';
import { ArtifactService } from './artifact.service';
import { ActionModule } from 'src/action/action.module';
import { FearStrategy } from './strategies/fear.strategy';
import { SkillsStrategyFactory } from './skills.factory';
import { FrozeStrategy } from './strategies/froze.strategy';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';
import { SwiftStrategy } from './strategies/swift.strategy';
import { NeighboringHealingStrategy } from './strategies/neighboring-healing.strategy';
import { EatDestructionManaStrategy } from './strategies/eat-destruction-mana.strategy';
import { EatDarkManaStrategy } from './strategies/eat-dark-mana.strategy';
import { EatLightManaStrategy } from './strategies/eat-light-mana.strategy';
import { SKILL_TYPE_KEY } from './constants/settings';
import { LightManaDiscountStrategy } from './strategies/light-mana-discount.strategy';
import { RageDiscountStrategy } from './strategies/rage-discount.strategy';
import { DarkManaDiscountStrategy } from './strategies/dark-mana-discount.strategy';
import { DestructionManaDiscountStrategy } from './strategies/destruction-mana-discount.strategy';
import { RefreshSpellsStrategy } from './strategies/refresh-spells.strategy';
import { FreeSpellStrategy } from './strategies/free-spell.strategy';
import { MoonBeamStrategy } from './strategies/moon-beam.strategy';
import { UpgradeStrategy } from './strategies/upgrade.strategy';
import { SpawnBonesStrategy } from './strategies/spawn-bones.strategy';
import { BerserkStrategy } from './strategies/berserk.strategy';
import { SpawnSelfCopyStrategy } from './strategies/spawn-self-copy.strategy';
import { GlimpseStrategy } from './strategies/glimpse.strategy';
import { HuntStrategy } from './strategies/hunt.strategy';
import { DispersalAllyStrategy } from './strategies/dispersal-ally.strategy';
import { DispersalEnemyStrategy } from './strategies/dispersal-enemy.strategy';
import { InvisibleStrategy } from './strategies/invisible.strategy';
import { OneAttackShieldStrategy } from './strategies/one_attack_shield.strategy';
import { DreamStrategy } from './strategies/dream.strategy';
import { BlindlessStrategy } from './strategies/blindless.strategy';
import { HookStrategy } from './strategies/hook.strategy';
import { ExhaustionStrategy } from './strategies/exhaustion.strategy';
import { ArtifactSilenceStrategy } from './strategies/artifact-silence.strategy';
import { AvatarStrategy } from './strategies/avatar.strategy';
import { StealAgilityStrategy } from './strategies/steal-agility.strategy';
import { StealDarkManaStrategy } from './strategies/steal-dark-mana.strategy';
import { StealDestructionManaStrategy } from './strategies/steal-destruction-mana.strategy';
import { StealLightManaStrategy } from './strategies/steal-light-mana.strategy';
import { StealRageStrategy } from './strategies/steal-rage.strategy';
import { RepairStrategy } from './strategies/repair.strategy';
import { HardeningStrategy } from './strategies/hardening.strategy';
import { RustingStrategy } from './strategies/rusting.strategy';
import { ShivStrategy } from './strategies/shiv.strategy';
import { WeakStrategy } from './strategies/weak.strategy';
import { DarkBlightStrategy } from './strategies/dark-blight.strategy';
import { LightBlightStrategy } from './strategies/light-blight.strategy';
import { DestructionBlightStrategy } from './strategies/destruction-blight.strategy';
import { PierceStrategy } from './strategies/pierce.strategy';

const ACTION_HANDLER_PROVIDERS = [
    FearStrategy,
    FrozeStrategy,
    SwiftStrategy,
    NeighboringHealingStrategy,
    EatDestructionManaStrategy,
    EatDarkManaStrategy,
    EatLightManaStrategy,
    LightManaDiscountStrategy,
    RageDiscountStrategy,
    DarkManaDiscountStrategy,
    DestructionManaDiscountStrategy,
    RefreshSpellsStrategy,
    FreeSpellStrategy,
    MoonBeamStrategy,
    UpgradeStrategy,
    SpawnBonesStrategy,
    BerserkStrategy,
    SpawnSelfCopyStrategy,
    GlimpseStrategy,
    HuntStrategy,
    DispersalAllyStrategy,
    DispersalEnemyStrategy,
    InvisibleStrategy,
    OneAttackShieldStrategy,
    DreamStrategy,
    BlindlessStrategy,
    HookStrategy,
    ArtifactSilenceStrategy,
    ExhaustionStrategy,
    AvatarStrategy,
    StealAgilityStrategy,
    StealDarkManaStrategy,
    StealDestructionManaStrategy,
    StealLightManaStrategy,
    StealRageStrategy,
    RepairStrategy,
    HardeningStrategy,
    RustingStrategy,
    ShivStrategy,
    WeakStrategy,
    DarkBlightStrategy,
    LightBlightStrategy,
    DestructionBlightStrategy,
    PierceStrategy,
    // MultishotStrategy
];

@Module({
    providers: [
        ArtifactService,
        ...ACTION_HANDLER_PROVIDERS,
        SkillsStrategyFactory,
        {
            provide: SKILL_TYPE_KEY,
            useFactory: (...handlers) => handlers,
            inject: ACTION_HANDLER_PROVIDERS,
        },
    ],
    exports: [ArtifactService, SkillsStrategyFactory],
    imports: [
        forwardRef(() => ActionModule),
        forwardRef(() => GameMechanicsModule),
    ],
})
export class ArtifactModule {}
