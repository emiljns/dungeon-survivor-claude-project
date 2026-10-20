import * as Phaser from "phaser";
import { newRun } from "../logic/progression.ts";
import { createArtAnims, missingArt, queueArt, requestedArtMode, setArtMode, type ArtMode } from "../rendering/Art.ts";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE, Tuning } from "./config.ts";

/**
 * Loads sprite art when it is requested, then hands over to the menu (or the
 * art test room). If any sheet is missing or broken, the game falls back to
 * the generated placeholder art instead of failing.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    if (requestedArtMode(window.location.search) !== "ninja") return;
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "Loading…", { fontFamily: FONT_FAMILY, fontSize: "12px", color: PALETTE.textDim })
      .setOrigin(0.5);
    queueArt(this);
  }

  create(): void {
    let mode: ArtMode = requestedArtMode(window.location.search);
    if (mode === "ninja") {
      // Verify the textures themselves; only then build animations from them.
      const missing = missingArt(this);
      if (missing.length > 0) {
        console.warn(`Sprite art failed to load (${missing.join(", ")}); using placeholder art.`);
        mode = "placeholder";
      } else {
        createArtAnims(this);
      }
    }
    setArtMode(this, mode);

    const q = new URLSearchParams(window.location.search);
    if (q.has("artroom")) {
      this.scene.start("game", { ...newRun(Tuning.player.maxHealth), showcase: { theme: q.get("theme") ?? "ruins", boss: q.has("boss") } });
    } else {
      this.scene.start("menu");
    }
  }
}
