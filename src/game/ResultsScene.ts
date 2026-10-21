import * as Phaser from "phaser";
import { newRun } from "../logic/progression.ts";
import { formatTime } from "../logic/score.ts";
import type { BestRecord } from "../systems/HighScoreStore.ts";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE, Tuning } from "./config.ts";

export interface RunResult {
  readonly outcome: "victory" | "defeat";
  readonly score: number;
  readonly levelReached: number;
  readonly levelName: string;
  readonly runTimeMs: number;
  readonly enemiesDefeated: number;
  readonly roomsCleared: number;
  /** The record after merging this run. */
  readonly best: BestRecord;
  readonly newBestScore: boolean;
  /** False when local storage was unavailable (the run still counts for this session). */
  readonly saved: boolean;
  /** Coins picked up this run, coins banked from it, and the bank afterwards. */
  readonly coinsEarned: number;
  readonly coinsKept: number;
  readonly bank: number;
}

function isRunResult(d: unknown): d is RunResult {
  if (typeof d !== "object" || d === null) return false;
  const r = d as Partial<Record<keyof RunResult, unknown>>;
  return (
    (r.outcome === "victory" || r.outcome === "defeat") &&
    typeof r.score === "number" &&
    typeof r.levelReached === "number" &&
    typeof r.runTimeMs === "number" &&
    typeof r.best === "object" &&
    r.best !== null
  );
}

/**
 * Game-over / victory results, shown over the frozen game scene. Retry
 * restarts the game scene with an explicit fresh run (it shuts the old run
 * down first); Menu stops it.
 */
export class ResultsScene extends Phaser.Scene {
  private done = false;

  constructor() {
    super("results");
  }

  init(): void {
    this.done = false;
  }

  create(data: unknown): void {
    if (!isRunResult(data)) throw new Error("ResultsScene started without a RunResult");
    const r = data;
    const win = r.outcome === "victory";
    const cx = GAME_WIDTH / 2;
    // Title sits inside the 286px panel (panel top = GAME_HEIGHT/2 - 143 = 33).
    const top = 56;
    const accent = win ? "#7dff9b" : PALETTE.danger;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.78).setOrigin(0);
    this.add.rectangle(cx, GAME_HEIGHT / 2, 360, 286, 0x111626).setStrokeStyle(2, win ? 0x7dff9b : 0xff5d73);
    this.add
      .text(cx, top, win ? "VICTORY" : "GAME OVER", { fontFamily: FONT_FAMILY, fontSize: "28px", color: accent, fontStyle: "bold" })
      .setOrigin(0.5);
    this.add
      .text(cx, top + 26, win ? "The Void falls silent." : `Fell in Level ${r.levelReached} · ${r.levelName}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);

    const rows: [string, string][] = [
      ["SCORE", String(r.score)],
      ["HIGHEST LEVEL", `${r.levelReached} / 5`],
      ["TIME", formatTime(r.runTimeMs)],
      ["ENEMIES DEFEATED", String(r.enemiesDefeated)],
      ["ROOMS CLEARED", String(r.roomsCleared)],
      ["BEST SCORE", `${r.best.bestScore}${r.saved ? "" : "  (not saved)"}`],
      ["COINS EARNED / KEPT", `${r.coinsEarned} / ${r.coinsKept}${win ? "" : "  (half)"}`],
      ["SAVED COINS", `${r.bank}${r.saved ? "" : "  (not saved)"}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = top + 54 + i * 18;
      this.add.text(cx - 130, y, label, { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.textDim });
      this.add.text(cx + 130, y, value, { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.text, fontStyle: "bold" }).setOrigin(1, 0);
    });

    if (r.newBestScore) {
      const badge = this.add
        .text(cx, top + 54 + rows.length * 18 + 8, "NEW BEST SCORE!", { fontFamily: FONT_FAMILY, fontSize: "13px", color: PALETTE.accent, fontStyle: "bold" })
        .setOrigin(0.5);
      this.tweens.add({ targets: badge, alpha: 0.4, duration: 450, yoyo: true, repeat: -1 });
    }

    this.add
      .text(cx, GAME_HEIGHT / 2 + 126, "[R] / Click  Retry     [M]  Menu", { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.accent })
      .setOrigin(0.5);

    // Short delay so a held fire button or key does not skip the screen.
    this.time.delayedCall(700, () => {
      const kb = this.input.keyboard;
      kb?.once("keydown-R", () => this.retry());
      kb?.once("keydown-ENTER", () => this.retry());
      kb?.once("keydown-M", () => this.menu());
      this.input.once("pointerdown", () => this.retry());
    });
  }

  private retry(): void {
    if (this.done) return;
    this.done = true;
    // Back to the Home Village (near its gate) for the next run. Explicit
    // fresh data: Phaser would otherwise reuse the last run's data.
    this.scene.start("game", { ...newRun(Tuning.player.maxHealth), village: true });
  }

  private menu(): void {
    if (this.done) return;
    this.done = true;
    this.scene.stop("game");
    this.scene.start("menu");
  }
}
