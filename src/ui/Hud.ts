import * as Phaser from "phaser";
import { Depth, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, HudLayout, PALETTE } from "../game/config.ts";
import type { HealthState } from "../logic/health.ts";
import type { RoomState } from "../logic/room.ts";
import { formatTime } from "../logic/score.ts";

export interface HudInfo {
  readonly health: HealthState;
  /** 0..1, 1 = dash ready. */
  readonly dashReadiness: number;
  readonly room: RoomState;
  /** Boss health 0..1, or null when no boss is present. */
  readonly boss: number | null;
  readonly score: number;
  readonly runTimeMs: number;
  /** True while fighting in a room whose clear grants an upgrade. */
  readonly rewardOnClear: boolean;
  /** Pocket coins this run. */
  readonly coins: number;
  /** Name of the carried weapon. */
  readonly weapon: string;
}

/** Screen-space HUD. scrollFactor 0 keeps it fixed if the camera moves. */
export class Hud {
  private readonly hearts: Phaser.GameObjects.Graphics;
  private readonly dashBar: Phaser.GameObjects.Graphics;
  private readonly status: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly coinText: Phaser.GameObjects.Text;
  private readonly weaponText: Phaser.GameObjects.Text;
  private shownHealth = "";
  private shownDash = -1;
  private shownBoss = -1;
  private bossBar: Phaser.GameObjects.Graphics | null = null;
  private bossLabel: Phaser.GameObjects.Text | null = null;

  constructor(private readonly scene: Phaser.Scene, roomLabel: string) {
    const label = { fontFamily: FONT_FAMILY, fontSize: "10px", color: PALETTE.text, fontStyle: "bold" };
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T): T => {
      o.setScrollFactor(0).setDepth(Depth.hud);
      return o;
    };
    fixed(scene.add.text(6, 3, "HP", label));
    fixed(scene.add.text(6, 15, "DASH", { ...label, fontSize: "8px" }));
    this.hearts = fixed(scene.add.graphics());
    this.dashBar = fixed(scene.add.graphics());
    fixed(scene.add.text(GAME_WIDTH - 6, 3, roomLabel, { ...label, color: PALETTE.textDim }).setOrigin(1, 0));
    this.status = fixed(scene.add.text(GAME_WIDTH - 6, 15, "", { ...label, fontSize: "9px" }).setOrigin(1, 0));
    // Top-left, not top-centre: several rooms have their door at the top centre.
    this.scoreText = fixed(scene.add.text(HudLayout.scoreX, 3, "", { ...label, color: PALETTE.accent }));
    // Second line, under score/time: pocket coins and the carried weapon.
    fixed(scene.add.circle(HudLayout.scoreX + 4, 20, 3.5, 0xffd166).setStrokeStyle(1, 0x8a5a10));
    this.coinText = fixed(scene.add.text(HudLayout.scoreX + 11, 15, "", { ...label, fontSize: "9px", color: PALETTE.accent }));
    this.weaponText = fixed(scene.add.text(HudLayout.scoreX + 52, 15, "", { ...label, fontSize: "9px", color: PALETTE.textDim }));
    this.hint = fixed(
      scene.add.text(GAME_WIDTH - 6, 26, "UPGRADE ON CLEAR", { ...label, fontSize: "8px", color: PALETTE.accent }).setOrigin(1, 0),
    );
  }

  update(info: HudInfo): void {
    this.drawHearts(info.health);
    this.drawDash(info.dashReadiness);
    this.drawBoss(info.boss);
    const status =
      info.room.phase === "cleared"
        ? "DOOR OPEN"
        : `ENEMIES ${info.room.enemiesRemaining}/${info.room.enemiesTotal}`;
    this.status.setText(status).setColor(info.room.phase === "cleared" ? "#7dff9b" : PALETTE.danger);
    // setText is a no-op when the string is unchanged, so this is cheap per frame.
    this.scoreText.setText(`SCORE ${String(info.score).padStart(6, "0")}   ${formatTime(info.runTimeMs)}`);
    this.hint.setVisible(info.rewardOnClear);
    this.coinText.setText(String(info.coins));
    this.weaponText.setText(info.weapon.toUpperCase());
  }

  /** Large centred message that fades out. */
  banner(title: string, subtitle: string, color: string = PALETTE.text, big = false): void {
    const cx = GAME_WIDTH / 2;
    const objs = [
      this.scene.add
        .text(cx, 120, title, { fontFamily: FONT_FAMILY, fontSize: big ? "30px" : "22px", color, fontStyle: "bold" })
        .setOrigin(0.5),
      this.scene.add
        .text(cx, big ? 152 : 146, subtitle, { fontFamily: FONT_FAMILY, fontSize: big ? "14px" : "11px", color: big ? color : PALETTE.textDim })
        .setOrigin(0.5),
    ];
    for (const o of objs) o.setScrollFactor(0).setDepth(Depth.hud).setStroke("#05070d", 4);
    this.scene.tweens.add({
      targets: objs,
      alpha: 0,
      delay: big ? 1700 : 1100,
      duration: 400,
      onComplete: () => objs.forEach((o) => o.destroy()),
    });
  }

  /** Shows the large boss bar at the bottom of the screen. */
  showBoss(name: string): void {
    if (this.bossBar) return;
    this.bossLabel = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, name, { fontFamily: FONT_FAMILY, fontSize: "9px", color: "#e0c3ff", fontStyle: "bold" })
      .setOrigin(0.5)
      .setStroke("#05070d", 3)
      .setScrollFactor(0)
      .setDepth(Depth.hud);
    this.bossBar = this.scene.add.graphics().setScrollFactor(0).setDepth(Depth.hud);
  }

  private drawBoss(fraction: number | null): void {
    if (!this.bossBar) return;
    const visible = fraction !== null && fraction > 0;
    this.bossBar.setVisible(visible);
    this.bossLabel?.setVisible(visible);
    if (!visible) return;
    const w = 240;
    const px = Math.round(fraction * (w - 2));
    if (px === this.shownBoss) return;
    this.shownBoss = px;
    const x = (GAME_WIDTH - w) / 2;
    const y = GAME_HEIGHT - 16;
    this.bossBar.clear();
    this.bossBar.fillStyle(0x0a0d16).fillRect(x - 1, y - 1, w + 2, 8);
    this.bossBar.fillStyle(0x2a1745).fillRect(x, y, w, 6);
    this.bossBar.fillStyle(fraction <= 0.5 ? 0xff4fd8 : 0x9b5de5).fillRect(x + 1, y + 1, px, 4);
  }

  private drawHearts(health: HealthState): void {
    const key = `${health.current}/${health.max}`;
    if (key === this.shownHealth) return;
    this.shownHealth = key;
    this.hearts.clear();
    for (let i = 0; i < health.max; i++) {
      const x = 26 + i * 11;
      this.hearts.fillStyle(0x0a0d16).fillRect(x, 4, 9, 9);
      this.hearts.fillStyle(i < health.current ? 0xff5d73 : 0x3a2030).fillRect(x + 1, 5, 7, 7);
      if (i < health.current) this.hearts.fillStyle(0xffb3bd).fillRect(x + 2, 6, 2, 2);
    }
  }

  private drawDash(readiness: number): void {
    const px = Math.round(readiness * 32);
    if (px === this.shownDash) return;
    this.shownDash = px;
    this.dashBar.clear();
    this.dashBar.fillStyle(0x0a0d16).fillRect(32, 16, 34, 6);
    this.dashBar.fillStyle(readiness >= 1 ? 0x8fb8ff : 0x3d5a8f).fillRect(33, 17, px, 4);
  }
}
