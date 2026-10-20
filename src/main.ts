import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./game/config.ts";
import { MenuScene } from "./game/MenuScene.ts";

const parent = document.querySelector<HTMLDivElement>("#app");
if (!parent) throw new Error("Missing #app mount element");

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PALETTE.background,
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene],
});
