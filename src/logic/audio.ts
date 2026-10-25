// Pure audio rules: which track plays where, when a busy effect may repeat,
// and the saved mute setting. The player (systems/Audio.ts) does the playing.

import { LEVEL_MUSIC, type MusicId } from "../data/audioManifest.ts";

export type MusicContext =
  | { readonly kind: "menu" }
  | { readonly kind: "village" }
  | { readonly kind: "level"; readonly level: number; readonly boss: "none" | "miniboss" | "boss"; readonly finalLevel: number }
  | { readonly kind: "results"; readonly outcome: "victory" | "defeat" | "quit" };

/** The track for a moment of the game; null keeps silence. */
export function musicFor(ctx: MusicContext): MusicId | null {
  switch (ctx.kind) {
    case "menu":
      return "menu";
    case "village":
      return "village";
    case "results":
      return ctx.outcome === "victory" ? "victory" : "defeat";
    case "level":
      if (ctx.boss === "boss") return ctx.level === ctx.finalLevel ? "finalBoss" : "boss";
      if (ctx.boss === "miniboss") return "miniboss";
      return LEVEL_MUSIC[ctx.level] ?? null;
  }
}

/** A busy effect plays only if its last play was at least `minGapMs` ago. */
export function mayRepeat(lastAt: number | undefined, now: number, minGapMs: number | undefined): boolean {
  return lastAt === undefined || minGapMs === undefined || now - lastAt >= minGapMs;
}

/** Local storage key for the mute setting (a per-browser convenience). */
export const AUDIO_PREF_KEY = "ninja-survivor:audio:v1";

/** The saved mute setting: only an explicit "muted" mutes; anything else (missing, garbage) plays. */
export function parseMuted(raw: string | null | undefined): boolean {
  return raw === "muted";
}

export function serializeMuted(muted: boolean): string {
  return muted ? "muted" : "on";
}

/** A gentle pitch variation (in cents) for repeated effects, from a 0..1 random value. */
export function pitchJitter(random: number, spreadCents = 120): number {
  return Math.round((random - 0.5) * 2 * spreadCents);
}
