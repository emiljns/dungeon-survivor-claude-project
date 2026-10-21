import * as Phaser from "phaser";
import { Depth, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/config.ts";

const W = 440;
const H = 84;

/**
 * A text box at the bottom of the screen (signs). Closes with E, Esc, Enter
 * or a click; removes every object and listener when closed.
 */
export class DialogPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    title: string,
    text: string,
    private readonly onClose: () => void,
  ) {
    const cx = GAME_WIDTH / 2;
    const top = GAME_HEIGHT - H - 14;
    const add = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.ScrollFactor>(o: T): T => {
      o.setDepth(Depth.overlay).setScrollFactor(0);
      this.objects.push(o);
      return o;
    };
    const box = add(scene.add.rectangle(cx, top + H / 2, W, H, 0x111626, 0.94).setStrokeStyle(2, 0xd8b070).setInteractive());
    box.on("pointerdown", () => this.close());
    add(scene.add.text(cx - W / 2 + 12, top + 8, title, { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.accent, fontStyle: "bold" }));
    add(
      scene.add.text(cx - W / 2 + 12, top + 24, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: PALETTE.text,
        lineSpacing: 3,
        wordWrap: { width: W - 24 },
      }),
    );
    add(scene.add.text(cx + W / 2 - 10, top + H - 14, "[E] close", { fontFamily: FONT_FAMILY, fontSize: "9px", color: PALETTE.textDim }).setOrigin(1, 0));
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E" || e.key === "Escape" || e.key === "Enter") this.close();
    };
    // Registered after this frame, so the E that opened the sign does not close it at once.
    scene.time.delayedCall(0, () => {
      if (!this.closed && this.keyHandler) scene.input.keyboard?.on("keydown", this.keyHandler);
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.keyHandler) this.scene.input.keyboard?.off("keydown", this.keyHandler);
    this.keyHandler = null;
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
    this.onClose();
  }
}
