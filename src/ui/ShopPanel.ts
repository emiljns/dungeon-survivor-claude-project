import * as Phaser from "phaser";
import type { SheetId } from "../data/artManifest.ts";
import { Depth, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/config.ts";
import { canBuy, type ShopItem, type ShopItemId } from "../logic/economy.ts";
import { sheetKey, type ArtMode } from "../rendering/Art.ts";

const PANEL_W = 420;
const ROW_H = 30;

export interface ShopConfig {
  readonly title: string;
  readonly greeting: string;
  /** Portrait sheet (sprite-art mode only). */
  readonly face: SheetId;
  /** Label of the currency shown in the header, e.g. "SAVED COINS". */
  readonly currency: string;
  /** Current coins and stock; called again after every purchase. */
  readonly state: () => { readonly coins: number; readonly items: readonly ShopItem[] };
  /** Performs a purchase; returns a short message (success or why not). */
  readonly buy: (id: ShopItemId) => string;
  readonly onClose: () => void;
}

/**
 * Modal shop: a portrait, the coin balance and up to six items. Buy with a
 * click or keys 1–6; close with Esc or E. Rebuilds its rows after each
 * purchase; removes every object and listener when closed.
 */
export class ShopPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private rows: Phaser.GameObjects.GameObject[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private message!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private closed = false;
  private readonly top: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: ShopConfig,
    art: ArtMode,
  ) {
    const cx = GAME_WIDTH / 2;
    const items = config.state().items;
    const panelH = 96 + items.length * ROW_H + 24;
    this.top = GAME_HEIGHT / 2 - panelH / 2;
    const left = cx - PANEL_W / 2;
    this.add(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.72).setOrigin(0).setInteractive());
    this.add(scene.add.rectangle(cx, GAME_HEIGHT / 2, PANEL_W, panelH, 0x111626).setStrokeStyle(2, 0xffd166));
    if (art === "ninja") this.add(scene.add.image(left + 30, this.top + 30, sheetKey(config.face), 0));
    const text = (x: number, y: number, s: string, size: string, color: string, bold = false): Phaser.GameObjects.Text =>
      this.add(scene.add.text(x, y, s, { fontFamily: FONT_FAMILY, fontSize: size, color, fontStyle: bold ? "bold" : "normal" }));
    text(left + 58, this.top + 10, config.title, "15px", PALETTE.accent, true);
    text(left + 58, this.top + 30, config.greeting, "10px", PALETTE.textDim);
    this.coinsText = text(left + PANEL_W - 12, this.top + 12, "", "11px", PALETTE.accent, true).setOrigin(1, 0);
    this.message = text(cx, this.top + panelH - 34, "", "10px", PALETTE.text).setOrigin(0.5, 0);
    text(cx, this.top + panelH - 18, "1–6 / click  Buy        Esc / E  Leave", "9px", PALETTE.textDim).setOrigin(0.5, 0);

    this.render();
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "e" || e.key === "E") {
        this.close();
        return;
      }
      const index = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      const item = index >= 0 ? this.config.state().items[index] : undefined;
      if (item) this.purchase(item);
    };
    scene.input.keyboard?.on("keydown", this.keyHandler);
  }

  private render(): void {
    for (const o of this.rows) o.destroy();
    this.rows = [];
    const { coins, items } = this.config.state();
    this.coinsText.setText(`${this.config.currency} ${coins}`);
    const left = GAME_WIDTH / 2 - PANEL_W / 2 + 12;
    items.slice(0, 6).forEach((item, i) => {
      const y = this.top + 58 + i * ROW_H;
      const affordable = canBuy(item, coins);
      const bg = this.row(
        this.scene.add
          .rectangle(left, y, PANEL_W - 24, ROW_H - 4, affordable ? 0x182038 : 0x0d111d)
          .setOrigin(0)
          .setStrokeStyle(1, affordable ? 0x3d5a8f : 0x222a40)
          .setInteractive({ useHandCursor: affordable }),
      );
      bg.on("pointerover", () => affordable && bg.setStrokeStyle(1, 0xffd166));
      bg.on("pointerout", () => bg.setStrokeStyle(1, affordable ? 0x3d5a8f : 0x222a40));
      bg.on("pointerdown", () => this.purchase(item));
      const color = item.available ? PALETTE.text : PALETTE.textDim;
      const t = (x: number, dy: number, s: string, size: string, c: string, bold = false): Phaser.GameObjects.Text =>
        this.row(this.scene.add.text(x, y + dy, s, { fontFamily: FONT_FAMILY, fontSize: size, color: c, fontStyle: bold ? "bold" : "normal" }));
      t(left + 6, 3, `[${i + 1}] ${item.name.toUpperCase()}`, "11px", color, true);
      t(left + 6, 15, item.description, "9px", PALETTE.textDim);
      const price = item.note ?? `${item.price} c`;
      t(left + PANEL_W - 32, 8, price, "11px", item.note ? PALETTE.textDim : affordable ? PALETTE.accent : PALETTE.danger, true).setOrigin(1, 0);
    });
  }

  private purchase(item: ShopItem): void {
    if (this.closed) return;
    this.message.setText(this.config.buy(item.id));
    this.render();
  }

  private add<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.ScrollFactor>(o: T): T {
    o.setDepth(Depth.overlay).setScrollFactor(0);
    this.objects.push(o);
    return o;
  }

  private row<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.ScrollFactor>(o: T): T {
    o.setDepth(Depth.overlay + 1).setScrollFactor(0);
    this.rows.push(o);
    return o;
  }

  /** Removes every object and the keyboard listener, then reports closing. Safe to call twice. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.keyHandler) this.scene.input.keyboard?.off("keydown", this.keyHandler);
    this.keyHandler = null;
    for (const o of [...this.objects, ...this.rows]) o.destroy();
    this.objects.length = 0;
    this.rows = [];
    this.config.onClose();
  }
}
