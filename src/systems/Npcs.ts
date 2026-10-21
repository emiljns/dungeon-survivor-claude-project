import * as Phaser from "phaser";
import type { NpcKind, PlacedNpc } from "../data/decor.ts";
import { Depth, FONT_FAMILY, TILE } from "../game/config.ts";
import type { Rect } from "../logic/collision.ts";
import type { Vec2 } from "../logic/vector.ts";
import { sheetKey, type ArtMode } from "../rendering/Art.ts";
import { LightTex } from "../rendering/LightTextures.ts";
import { Tex } from "../rendering/PlaceholderArt.ts";

export interface Npc {
  readonly kind: NpcKind;
  readonly position: Vec2;
  readonly rect: Rect;
}

/** How close the player must be to talk (centre to centre). */
const TALK_RANGE = 24;
const PROMPT: Readonly<Record<NpcKind, string>> = { shopkeeper: "[E] SHOP", merchant: "[E] TRADE" };

/**
 * Friendly characters: the village shopkeeper and the travelling merchant.
 * Each stands on one tile (solid for walking only, never hit by bullets),
 * bobs a little, and shows a prompt when the player is close.
 */
export class Npcs {
  private readonly npcs: Npc[] = [];
  private readonly prompt: Phaser.GameObjects.Text;
  readonly bodies: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene, placed: readonly PlacedNpc[], art: ArtMode) {
    this.bodies = scene.physics.add.staticGroup();
    for (const p of placed) {
      const x = (p.col + 0.5) * TILE;
      const y = (p.row + 0.5) * TILE;
      const sprite =
        art === "ninja"
          ? scene.add.sprite(x, y, sheetKey(p.kind === "shopkeeper" ? "shopkeeper" : "merchant"), 0)
          : scene.add.sprite(x, y, Tex.player).setTint(p.kind === "shopkeeper" ? 0xffd166 : 0x7dff9b);
      sprite.setDepth(Depth.actors);
      scene.add.image(x, y + 7, LightTex.shadow).setDepth(Depth.shadows).setScale(0.5, 0.35);
      scene.tweens.add({ targets: sprite, y: y - 1.5, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      this.bodies.add(scene.add.zone(x, y, TILE - 2, TILE - 2));
      this.npcs.push({ kind: p.kind, position: { x, y }, rect: { x: p.col * TILE, y: p.row * TILE, width: TILE, height: TILE } });
    }
    this.prompt = scene.add
      .text(0, 0, "", { fontFamily: FONT_FAMILY, fontSize: "10px", color: "#ffd166", fontStyle: "bold" })
      .setOrigin(0.5)
      .setStroke("#05070d", 3)
      .setDepth(Depth.hud)
      .setVisible(false);
  }

  /** The NPC within talking range of `player`, showing its prompt (or null). */
  nearby(player: Vec2): Npc | null {
    const npc = this.npcs.find((n) => Math.hypot(n.position.x - player.x, n.position.y - player.y) <= TALK_RANGE) ?? null;
    this.prompt.setVisible(npc !== null);
    if (npc) this.prompt.setText(PROMPT[npc.kind]).setPosition(npc.position.x, npc.position.y - 16);
    return npc;
  }

  hidePrompt(): void {
    this.prompt.setVisible(false);
  }

  get tiles(): readonly Rect[] {
    return this.npcs.map((n) => n.rect);
  }

  get count(): number {
    return this.npcs.length;
  }
}
