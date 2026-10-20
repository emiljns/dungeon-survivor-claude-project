// Per-level colour palettes for generated placeholder tiles.

export interface Theme {
  readonly id: string;
  readonly background: number;
  readonly floor: { readonly base: number; readonly line: number; readonly speck: number };
  readonly wall: {
    readonly base: number;
    readonly block: number;
    /** Front face shown where a wall sits above floor. */
    readonly face: number;
    readonly faceEdge: number;
    /** Bright outline on edges facing the floor. */
    readonly edge: number;
  };
  /** CSS colour for level banners. */
  readonly title: string;
  readonly light: {
    /** Alpha of the dark overlay outside light pools (kept ≤ 0.7 for readability). */
    readonly darkness: number;
    /** Tint of the darkness (a deep theme colour reads better than pure black). */
    readonly darkColor: number;
    /** Torch flame and additive glow colour. */
    readonly torch: number;
    /** Radius of the light that follows the player. */
    readonly playerRadius: number;
    /** Vignette strength, 0–1 (default 1). Daylight levels use less. */
    readonly vignette?: number;
  };
}

export const THEMES = {
  ruins: {
    id: "ruins",
    background: 0x080d18,
    floor: { base: 0x2b3042, line: 0x252a3a, speck: 0x32384c },
    wall: { base: 0x161b29, block: 0x1d2334, face: 0x2e3652, faceEdge: 0x7d8fc4, edge: 0x56648f },
    title: "#c9d4ff",
    light: { darkness: 0.58, darkColor: 0x04060d, torch: 0xffa040, playerRadius: 130 },
  },
  sewers: {
    id: "sewers",
    background: 0x06110f,
    floor: { base: 0x1f3a36, line: 0x1a312e, speck: 0x2c5a4a },
    wall: { base: 0x0e1f1d, block: 0x143029, face: 0x1f4a40, faceEdge: 0x6fe0b0, edge: 0x3f9a7c },
    title: "#7dffc9",
    light: { darkness: 0.6, darkColor: 0x020a08, torch: 0x7dffb0, playerRadius: 130 },
  },
  temple: {
    id: "temple",
    background: 0x120d06,
    floor: { base: 0x4a3d24, line: 0x3f331e, speck: 0x5c4b2c },
    wall: { base: 0x2a2012, block: 0x352915, face: 0x5a4522, faceEdge: 0xf0c060, edge: 0xb08a3c },
    title: "#ffd166",
    light: { darkness: 0.5, darkColor: 0x0c0703, torch: 0xffd166, playerRadius: 140 },
  },
  foundry: {
    id: "foundry",
    background: 0x0d0808,
    floor: { base: 0x2e2a2a, line: 0x262222, speck: 0x3d3030 },
    wall: { base: 0x161212, block: 0x1f1818, face: 0x3a2420, faceEdge: 0xff7a3d, edge: 0xa04a2a },
    title: "#ff8a4d",
    light: { darkness: 0.62, darkColor: 0x0a0303, torch: 0xff5a2a, playerRadius: 125 },
  },
  void: {
    id: "void",
    background: 0x07051a,
    floor: { base: 0x221a3d, line: 0x1c1533, speck: 0x34285c },
    wall: { base: 0x0f0b1f, block: 0x171030, face: 0x2c2052, faceEdge: 0xb68cff, edge: 0x6c4fc4 },
    title: "#c49bff",
    light: { darkness: 0.66, darkColor: 0x05031a, torch: 0xb68cff, playerRadius: 120 },
  },
  // v2 outdoor levels (Milestone 9). Light follows the day: morning, afternoon,
  // golden hour, dusk. Darkness stays low so daylight reads as daylight.
  village: {
    id: "village",
    background: 0x2f4a24,
    floor: { base: 0x7fa646, line: 0x739a3e, speck: 0x93b85a },
    wall: { base: 0x4d6b2e, block: 0x557636, face: 0x7a5a3a, faceEdge: 0xc49a6a, edge: 0x9cc068 },
    title: "#fff2b0",
    light: { darkness: 0, darkColor: 0x1a1408, torch: 0xffc070, playerRadius: 150, vignette: 0.25 },
  },
  forest: {
    id: "forest",
    background: 0x1e3318,
    floor: { base: 0x5f8f3a, line: 0x557f33, speck: 0x76a64c },
    wall: { base: 0x2f4a20, block: 0x365526, face: 0x5f6658, faceEdge: 0xa8b09a, edge: 0x7fae5a },
    title: "#c8f59a",
    light: { darkness: 0.1, darkColor: 0x0c1a08, torch: 0xffb060, playerRadius: 150, vignette: 0.4 },
  },
  river: {
    id: "river",
    background: 0x2a3a20,
    floor: { base: 0x8aa84a, line: 0x7e9a42, speck: 0x9fbc5e },
    wall: { base: 0x4f5f2c, block: 0x586a32, face: 0x7a5a3a, faceEdge: 0xe0a860, edge: 0xb0c870 },
    title: "#ffd28a",
    light: { darkness: 0.16, darkColor: 0x3a1c08, torch: 0xffa040, playerRadius: 150, vignette: 0.5 },
  },
  snow: {
    id: "snow",
    background: 0x1c2438,
    floor: { base: 0xdfe6f2, line: 0xcfd8e8, speck: 0xf2f6ff },
    wall: { base: 0x9aa6bc, block: 0xa8b4c8, face: 0x5f6678, faceEdge: 0xc8d4ea, edge: 0xf2f6ff },
    title: "#d8e8ff",
    light: { darkness: 0.34, darkColor: 0x0c1430, torch: 0x8ec8ff, playerRadius: 140, vignette: 0.7 },
  },
} as const satisfies Record<string, Theme>;
