// Which art the URL asks for. Pure, so it can be unit tested without Phaser.

export type ArtMode = "placeholder" | "ninja";

/**
 * Sprite art ("ninja") is the default. `?art=placeholder` opts back into the
 * original generated art (debugging, comparison). The game also falls back to
 * placeholder art on its own if any sprite sheet fails to load.
 */
export function requestedArtMode(search: string): ArtMode {
  return new URLSearchParams(search).get("art") === "placeholder" ? "placeholder" : "ninja";
}
