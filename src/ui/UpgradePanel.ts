import * as Phaser from "phaser";
import { Depth, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/config.ts";
import { upgradeDef, type UpgradeId, type UpgradeLevels } from "../logic/upgrades.ts";

const CARD_W = 168;
const CARD_H = 112;
const GAP = 16;

/**
 * Modal three-choice upgrade panel. Pick with a click or keys 1–3. All of its
 * objects and its keyboard listener are removed as soon as a choice is made.
 */
export class UpgradePanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly choices: readonly UpgradeId[],
    levels: UpgradeLevels,
    private readonly onPick: (id: UpgradeId) => void,
  ) {
    const cx = GAME_WIDTH / 2;
    const top = GAME_HEIGHT / 2 - CARD_H / 2 + 10;
    this.add(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.75).setOrigin(0).setInteractive());
    this.add(
      scene.add
        .text(cx, top - 44, "CHOOSE AN UPGRADE", { fontFamily: FONT_FAMILY, fontSize: "20px", color: PALETTE.accent, fontStyle: "bold" })
        .setOrigin(0.5)
        .setStroke("#05070d", 4),
    );
    this.add(
      scene.add
        .text(cx, top - 22, "Click a card or press 1–3", { fontFamily: FONT_FAMILY, fontSize: "10px", color: PALETTE.textDim })
        .setOrigin(0.5),
    );

    const totalW = choices.length * CARD_W + (choices.length - 1) * GAP;
    choices.forEach((id, i) => this.card(id, levels[id], i, cx - totalW / 2 + i * (CARD_W + GAP), top));

    this.keyHandler = (e: KeyboardEvent) => {
      const index = ["1", "2", "3"].indexOf(e.key);
      const id = index >= 0 ? this.choices[index] : undefined;
      if (id) this.pick(id);
    };
    scene.input.keyboard?.on("keydown", this.keyHandler);
  }

  private card(id: UpgradeId, level: number, index: number, x: number, y: number): void {
    const def = upgradeDef(id);
    const bg = this.add(
      this.scene.add
        .rectangle(x, y, CARD_W, CARD_H, 0x111626)
        .setOrigin(0)
        .setStrokeStyle(2, 0x3d5a8f)
        .setInteractive({ useHandCursor: true }),
    );
    bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffd166).setFillStyle(0x182038));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x3d5a8f).setFillStyle(0x111626));
    bg.on("pointerdown", () => this.pick(id));

    const text = (dy: number, s: string, size: string, color: string, bold = false): void => {
      this.add(
        this.scene.add
          .text(x + CARD_W / 2, y + dy, s, {
            fontFamily: FONT_FAMILY,
            fontSize: size,
            color,
            fontStyle: bold ? "bold" : "normal",
            align: "center",
            wordWrap: { width: CARD_W - 16 },
          })
          .setOrigin(0.5, 0),
      );
    };
    text(8, `[${index + 1}]`, "10px", PALETTE.textDim);
    text(24, def.name.toUpperCase(), "13px", PALETTE.text, true);
    text(48, def.description, "10px", PALETTE.textDim);

    // Level pips: filled = owned, highlighted = gained by picking this.
    const pips = this.add(this.scene.add.graphics());
    const pipsW = def.maxLevel * 12 - 4;
    for (let i = 0; i < def.maxLevel; i++) {
      const color = i < level ? 0x8fb8ff : i === level ? 0xffd166 : 0x2a3350;
      pips.fillStyle(color).fillRect(x + CARD_W / 2 - pipsW / 2 + i * 12, y + CARD_H - 20, 8, 8);
    }
  }

  private add<
    T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.ScrollFactor,
  >(o: T): T {
    o.setDepth(Depth.overlay).setScrollFactor(0);
    this.objects.push(o);
    return o;
  }

  private pick(id: UpgradeId): void {
    if (this.closed) return;
    this.closed = true;
    this.close();
    this.onPick(id);
  }

  /** Removes every object and the keyboard listener. Safe to call twice. */
  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off("keydown", this.keyHandler);
    this.keyHandler = null;
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}
