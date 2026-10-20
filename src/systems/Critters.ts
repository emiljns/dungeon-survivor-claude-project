import * as Phaser from "phaser";
import type { CritterKind, PlacedCritter } from "../data/decor.ts";
import { Depth, TILE } from "../game/config.ts";
import type { Rect } from "../logic/collision.ts";
import { newCritter, stepCritter, type CritterState } from "../logic/critter.ts";
import type { Vec2 } from "../logic/vector.ts";
import { inView } from "../logic/view.ts";
import { sheetKey, type ArtMode } from "../rendering/Art.ts";
import { LIGHT_TEXTURE_SIZE, LightTex } from "../rendering/LightTextures.ts";

interface Critter {
  readonly kind: CritterKind;
  readonly home: Vec2;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image | null;
  state: CritterState;
}

/** Critters farther than this outside the view are frozen and hidden. */
const ACTIVE_MARGIN = 64;
const PLACEHOLDER_COLOR: Readonly<Record<CritterKind, number>> = { chicken: 0xf2f2f2, cat: 0xf0a050, frog: 0x6ac04a, fish: 0xf0d040 };

/**
 * Ambient animals. No bodies and no health: they never block, never take
 * bullets and have no health bars. They wander near home and flee the
 * player, and only update near the camera.
 */
export class Critters {
  private readonly critters: Critter[] = [];

  constructor(
    scene: Phaser.Scene,
    placed: readonly PlacedCritter[],
    art: ArtMode,
    now: number,
    /** Open ground for land critters, water for fish. */
    private readonly canStand: (kind: CritterKind, x: number, y: number) => boolean,
  ) {
    for (const p of placed) {
      const home = { x: (p.col + 0.5) * TILE, y: (p.row + 0.5) * TILE };
      const sprite =
        art === "ninja"
          ? scene.add.sprite(home.x, home.y, sheetKey(p.kind), 0)
          : scene.add.sprite(home.x, home.y, LightTex.light).setScale(10 / LIGHT_TEXTURE_SIZE).setTint(PLACEHOLDER_COLOR[p.kind]);
      // Fish swim under the surface; everything else stands among the actors.
      sprite.setDepth(p.kind === "fish" ? Depth.props : Depth.actors - 1);
      if (p.kind === "fish") sprite.setAlpha(0.75);
      const shadow =
        p.kind === "fish" ? null : scene.add.image(home.x, home.y + 6, LightTex.shadow).setDepth(Depth.shadows).setScale(0.4, 0.3);
      this.critters.push({ kind: p.kind, home, sprite, shadow, state: newCritter(home, now, Math.random) });
    }
  }

  update(now: number, dtMs: number, player: Vec2, view: Rect): void {
    for (const c of this.critters) {
      const on = inView(c.state, view, ACTIVE_MARGIN);
      if (on !== c.sprite.visible) {
        c.sprite.setVisible(on).setActive(on);
        c.shadow?.setVisible(on);
      }
      if (!on) continue;
      const before = c.state.mode;
      c.state = stepCritter(c.state, c.home, player, now, dtMs, Math.random, (x, y) => this.canStand(c.kind, x, y));
      const s = c.state;
      c.sprite.setPosition(s.x, s.y).setFlipX(s.facing > 0);
      c.shadow?.setPosition(s.x, s.y + 6);
      if (c.kind === "fish") continue; // fish frames are side/front views, not a walk cycle
      const moving = s.mode !== "idle";
      if (moving && before === "idle" && c.sprite.anims) c.sprite.play(`na-${c.kind}-move`, true);
      else if (!moving && before !== "idle") c.sprite.stop().setFrame(0);
    }
  }

  get count(): number {
    return this.critters.length;
  }

  /** Positions (diagnostics and tests in the browser). */
  get positions(): Vec2[] {
    return this.critters.map((c) => ({ x: c.state.x, y: c.state.y }));
  }
}
