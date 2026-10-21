import * as Phaser from "phaser";
import { Depth } from "../game/config.ts";
import { dropCoin, stepCoin, type CoinState } from "../logic/economy.ts";
import type { Vec2 } from "../logic/vector.ts";
import { sheetKey, type ArtMode } from "../rendering/Art.ts";
import { LIGHT_TEXTURE_SIZE, LightTex } from "../rendering/LightTextures.ts";

interface Coin {
  state: CoinState;
  readonly sprite: Phaser.GameObjects.Sprite;
}

/**
 * Coin pickups (one coin = one sprite = 1 coin). Coins burst out of whatever
 * dropped them, settle, then fly to the player once close (or all at once
 * after an area is cleared). Drawn above the darkness so they always read.
 */
export class Coins {
  private coins: Coin[] = [];
  private attractAll = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ArtMode,
    /** Called once per coin collected. */
    private readonly onCollect: (at: Vec2) => void,
  ) {}

  /** Bursts `count` coins out of `at`. */
  drop(at: Vec2, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.9;
      const sprite =
        this.art === "ninja"
          ? this.scene.add.sprite(at.x, at.y, sheetKey("coin")).play({ key: "na-coin-spin", startFrame: i % 4 })
          : this.scene.add.sprite(at.x, at.y, LightTex.light).setScale(7 / LIGHT_TEXTURE_SIZE).setTint(0xffd166);
      this.coins.push({ state: dropCoin(at, angle, 0.6 + Math.random() * 0.6), sprite: sprite.setDepth(Depth.effects - 1) });
    }
  }

  /** From now on every coin flies to the player (used when an area is cleared). */
  attract(): void {
    this.attractAll = true;
  }

  update(player: Vec2, dtMs: number): void {
    if (this.coins.length === 0) {
      this.attractAll = false;
      return;
    }
    this.coins = this.coins.filter((c) => {
      const next = stepCoin(c.state, player, dtMs, this.attractAll);
      if (!next) {
        c.sprite.destroy();
        this.onCollect({ x: c.state.x, y: c.state.y });
        return false;
      }
      c.state = next;
      c.sprite.setPosition(next.x, next.y);
      return true;
    });
  }

  get count(): number {
    return this.coins.length;
  }
}
