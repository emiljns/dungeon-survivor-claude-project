// Shared constants. Logical resolution is small and scaled up with
// nearest-neighbour filtering for a crisp 16-bit-inspired look.

export const TILE = 16;
export const GAME_WIDTH = 640; // 40 tiles
export const GAME_HEIGHT = 352; // 22 tiles

export const FONT_FAMILY = '"Courier New", monospace';

export const PALETTE = {
  background: 0x080d18,
  text: "#e9f1ff",
  textDim: "#9dc8f5",
  accent: "#ffd166",
  danger: "#ff5d73",
} as const;
