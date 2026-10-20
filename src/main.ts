import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./game/config.ts";
import { GameScene } from "./game/GameScene.ts";
import { MenuScene } from "./game/MenuScene.ts";
import { PauseScene } from "./game/PauseScene.ts";
import { ResultsScene } from "./game/ResultsScene.ts";

const parent = document.querySelector<HTMLDivElement>("#app");
if (!parent) throw new Error("Missing #app mount element");

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PALETTE.background,
  pixelArt: true,
  disableContextMenu: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: "arcade",
    // Append ?debug to the URL to draw physics bodies.
    arcade: { debug: new URLSearchParams(window.location.search).has("debug") },
  },
  // Later scenes render on top: Pause and Results overlay the game.
  scene: [MenuScene, GameScene, PauseScene, ResultsScene],
});

// Dev builds expose the game for manual diagnostics (e.g. GameScene.debugSnapshot()).
if (import.meta.env.DEV) {
  (window as Window & { __game?: Phaser.Game }).__game = game;
}
