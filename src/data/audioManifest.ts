// Sound effects and music from the Ninja Adventure asset pack (CC0), as
// plain data: which file plays for what, where it came from in the pack, and
// how loud. Effect volumes were balanced from each file's measured loudness
// (RMS), then scaled down for sounds that repeat a lot (throws, coins).
// Tests check this manifest against the files on disk.

import type { WeaponId } from "./weapons.ts";

/** Public URL folder (Vite serves `public/` at the site root). */
export const AUDIO_BASE_PATH = "assets/ninja/audio/";

export interface SoundAsset {
  /** File name inside `public/assets/ninja/audio/`. */
  readonly file: string;
  /** Original path inside the pack's Audio folder. */
  readonly source: string;
  /** 0..1 before the master volume. */
  readonly volume: number;
  /** Repeats closer together than this are skipped (busy effects). */
  readonly minGapMs?: number;
}

export const SFX = {
  throwShuriken: { file: "sfx-throw-shuriken.wav", source: "Sounds/Whoosh & Slash/Whoosh.wav", volume: 0.35, minGapMs: 70 },
  throwKunai: { file: "sfx-throw-kunai.wav", source: "Sounds/Whoosh & Slash/Slash4.wav", volume: 0.3, minGapMs: 70 },
  throwBig: { file: "sfx-throw-big.wav", source: "Sounds/Whoosh & Slash/Whoosh2.wav", volume: 0.45, minGapMs: 70 },
  throwMagic: { file: "sfx-throw-magic.wav", source: "Sounds/Magic & Skill/Magic2.wav", volume: 0.3, minGapMs: 70 },
  enemyShot: { file: "sfx-enemy-shot.wav", source: "Sounds/Elemental/Fireball.wav", volume: 0.3, minGapMs: 90 },
  hit: { file: "sfx-hit.wav", source: "Sounds/Hit & Impact/Hit9.wav", volume: 0.45, minGapMs: 50 },
  enemyDie: { file: "sfx-enemy-die.wav", source: "Sounds/Hit & Impact/Impact.wav", volume: 0.4, minGapMs: 40 },
  hurt: { file: "sfx-hurt.wav", source: "Sounds/Hit & Impact/Impact3.wav", volume: 0.75 },
  dash: { file: "sfx-dash.wav", source: "Sounds/Jump & Bounce/Jump.wav", volume: 0.5 },
  fall: { file: "sfx-fall.wav", source: "Sounds/Jump & Bounce/Bounce3.wav", volume: 0.9 },
  coin: { file: "sfx-coin.wav", source: "Sounds/Bonus/Coin3.wav", volume: 0.55, minGapMs: 40 },
  shatter: { file: "sfx-shatter.wav", source: "Sounds/Hit & Impact/Hit8.wav", volume: 0.65, minGapMs: 40 },
  gate: { file: "sfx-gate.wav", source: "Sounds/Hit & Impact/Impact5.wav", volume: 0.8 },
  areaClear: { file: "sfx-area-clear.wav", source: "Sounds/Bonus/Bonus2.wav", volume: 0.9 },
  alert: { file: "sfx-alert.wav", source: "Sounds/Alert/Alert2.wav", volume: 0.75 },
  bossAppear: { file: "sfx-boss-appear.wav", source: "Sounds/Elemental/Explosion2.wav", volume: 0.5 },
  bossDie: { file: "sfx-boss-die.wav", source: "Sounds/Elemental/Explosion.wav", volume: 0.6 },
  upgrade: { file: "sfx-upgrade.wav", source: "Jingles/LevelUp1.wav", volume: 0.75 },
  accept: { file: "sfx-accept.wav", source: "Sounds/Menu/Accept2.wav", volume: 0.55 },
  move: { file: "sfx-move.wav", source: "Sounds/Menu/Move1.wav", volume: 0.45 },
  cancel: { file: "sfx-cancel.wav", source: "Sounds/Menu/Cancel.wav", volume: 0.6 },
  buy: { file: "sfx-buy.wav", source: "Sounds/Bonus/Gold1.wav", volume: 0.8 },
  heal: { file: "sfx-heal.wav", source: "Sounds/Magic & Skill/Heal2.wav", volume: 0.7 },
  exitOpen: { file: "sfx-exit-open.wav", source: "Sounds/Bonus/PowerUp1.wav", volume: 0.8 },
  pause: { file: "sfx-pause.wav", source: "Sounds/Menu/Menu6.wav", volume: 0.6 },
  talk: { file: "sfx-talk.wav", source: "Sounds/Menu/Menu5.wav", volume: 0.6 },
  victory: { file: "sfx-victory.wav", source: "Jingles/Success4.wav", volume: 0.9 },
  defeat: { file: "sfx-defeat.wav", source: "Jingles/GameOver2.wav", volume: 0.9 },
} as const satisfies Record<string, SoundAsset>;

export type SfxId = keyof typeof SFX;

/** Tracks are streamed one at a time (never preloaded), and loop. */
export const MUSIC = {
  menu: { file: "music-menu.ogg", source: "Musics/1 - Adventure Begin.ogg", volume: 0.45 },
  village: { file: "music-village.ogg", source: "Musics/4 - Village.ogg", volume: 0.45 },
  forest: { file: "music-forest.ogg", source: "Musics/11 - Clearing.ogg", volume: 0.45 },
  river: { file: "music-river.ogg", source: "Musics/18 - Aquatic.ogg", volume: 0.45 },
  snow: { file: "music-snow.ogg", source: "Musics/19 - Ascension.ogg", volume: 0.45 },
  abandoned: { file: "music-abandoned.ogg", source: "Musics/26 - Lost Village.ogg", volume: 0.45 },
  void: { file: "music-void.ogg", source: "Musics/24 - Final Area.ogg", volume: 0.45 },
  miniboss: { file: "music-miniboss.ogg", source: "Musics/28 - Tension.ogg", volume: 0.45 },
  boss: { file: "music-boss.ogg", source: "Musics/17 - Fight.ogg", volume: 0.45 },
  finalBoss: { file: "music-final-boss.ogg", source: "Musics/10 - Dark Castle.ogg", volume: 0.45 },
  victory: { file: "music-victory.ogg", source: "Musics/8 - End Theme.ogg", volume: 0.45 },
  defeat: { file: "music-defeat.ogg", source: "Musics/7 - Sad Theme.ogg", volume: 0.45 },
} as const satisfies Record<string, SoundAsset>;

export type MusicId = keyof typeof MUSIC;

/** Each level's own track (by level number). */
export const LEVEL_MUSIC: Readonly<Record<number, MusicId>> = { 1: "forest", 2: "river", 3: "snow", 4: "abandoned", 5: "void" };

/** The throw sound of each weapon. */
export const THROW_SFX: Readonly<Record<WeaponId, SfxId>> = {
  shuriken: "throwShuriken",
  kunai: "throwKunai",
  bigShuriken: "throwBig",
  magicShuriken: "throwMagic",
};

export const sfxKey = (id: SfxId): string => `sfx-${id}`;
