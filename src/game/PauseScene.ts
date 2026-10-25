import * as Phaser from "phaser";
import { sanitizeUpgrades, UPGRADES } from "../logic/upgrades.ts";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./config.ts";
import { GameAudio } from "../systems/Audio.ts";

/**
 * Overlay shown over a paused GameScene. While the game scene is paused,
 * Phaser stops its update, physics, timers and tweens, so the whole
 * simulation is frozen. This scene owns the resume/quit input.
 *
 * It is put to sleep on resume rather than stopped. Phaser 3.90's
 * KeyboardPlugin.shutdown calls `game.events.off(BLUR, resetKeys)` without a
 * context, which removes the blur handler of *every* scene's keyboard,
 * including the still-running game scene's. After that, alt-tabbing with a
 * movement key held leaves the key stuck down. Sleeping avoids the shutdown.
 */
export class PauseScene extends Phaser.Scene {
  private done = false;
  private upgradesText!: Phaser.GameObjects.Text;

  constructor() {
    super("pause");
  }

  create(data: unknown): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.7).setOrigin(0);
    this.add.rectangle(cx, cy, 300, 200, 0x111626).setStrokeStyle(2, 0x3d5a8f);
    this.add.text(cx, cy - 76, "PAUSED", { fontFamily: FONT_FAMILY, fontSize: "26px", color: PALETTE.text, fontStyle: "bold" }).setOrigin(0.5);
    this.add
      .text(cx, cy - 46, "UPGRADES", { fontFamily: FONT_FAMILY, fontSize: "9px", color: PALETTE.textDim, fontStyle: "bold" })
      .setOrigin(0.5);
    this.upgradesText = this.add
      .text(cx, cy - 32, "", { fontFamily: FONT_FAMILY, fontSize: "10px", color: PALETTE.text, align: "center", lineSpacing: 2 })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, cy + 80, "[Esc] / [P]  Resume     [M]  Quit to menu", { fontFamily: FONT_FAMILY, fontSize: "10px", color: PALETTE.accent })
      .setOrigin(0.5);

    // Registered once per start; the scene sleeps between pauses, so these
    // persist without duplicating. Phaser removes them on shutdown.
    const kb = this.input.keyboard;
    kb?.on("keydown-ESC", () => this.resumeGame());
    kb?.on("keydown-P", () => this.resumeGame());
    kb?.on("keydown-M", () => this.quitToMenu());
    kb?.on("keydown-N", () => GameAudio.of(this.game).toggleMute());

    // `this.events` survives restarts, so the wake handler is removed on shutdown.
    this.events.on(Phaser.Scenes.Events.WAKE, this.onWake, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.WAKE, this.onWake, this));

    this.show(data);
  }

  private onWake(_sys: Phaser.Scenes.Systems, data: unknown): void {
    this.show(data);
  }

  private show(data: unknown): void {
    this.done = false;
    const upgrades = sanitizeUpgrades(typeof data === "object" && data !== null ? (data as { upgrades?: unknown }).upgrades : null);
    const owned = UPGRADES.filter((u) => upgrades[u.id] > 0).map((u) => `${u.name}  ${upgrades[u.id]}/${u.maxLevel}`);
    this.upgradesText.setText(owned.length > 0 ? owned.join("\n") : "none yet");
  }

  private resumeGame(): void {
    if (this.done) return;
    this.done = true;
    this.scene.resume("game");
    this.scene.sleep();
  }

  private quitToMenu(): void {
    if (this.done) return;
    this.done = true;
    // Quitting abandons the run: it is not recorded as a best score, and like
    // a death it banks only half of the pocket coins.
    const game = this.scene.get("game") as unknown as { abandonRun?: () => void };
    game.abandonRun?.();
    this.scene.stop("game");
    this.scene.start("menu");
  }
}
