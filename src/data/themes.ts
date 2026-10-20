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
}

export const THEMES = {
  ruins: {
    id: "ruins",
    background: 0x080d18,
    floor: { base: 0x2b3042, line: 0x252a3a, speck: 0x32384c },
    wall: { base: 0x161b29, block: 0x1d2334, face: 0x2e3652, faceEdge: 0x7d8fc4, edge: 0x56648f },
    title: "#c9d4ff",
  },
  sewers: {
    id: "sewers",
    background: 0x06110f,
    floor: { base: 0x1f3a36, line: 0x1a312e, speck: 0x2c5a4a },
    wall: { base: 0x0e1f1d, block: 0x143029, face: 0x1f4a40, faceEdge: 0x6fe0b0, edge: 0x3f9a7c },
    title: "#7dffc9",
  },
  temple: {
    id: "temple",
    background: 0x120d06,
    floor: { base: 0x4a3d24, line: 0x3f331e, speck: 0x5c4b2c },
    wall: { base: 0x2a2012, block: 0x352915, face: 0x5a4522, faceEdge: 0xf0c060, edge: 0xb08a3c },
    title: "#ffd166",
  },
  foundry: {
    id: "foundry",
    background: 0x0d0808,
    floor: { base: 0x2e2a2a, line: 0x262222, speck: 0x3d3030 },
    wall: { base: 0x161212, block: 0x1f1818, face: 0x3a2420, faceEdge: 0xff7a3d, edge: 0xa04a2a },
    title: "#ff8a4d",
  },
  void: {
    id: "void",
    background: 0x07051a,
    floor: { base: 0x221a3d, line: 0x1c1533, speck: 0x34285c },
    wall: { base: 0x0f0b1f, block: 0x171030, face: 0x2c2052, faceEdge: 0xb68cff, edge: 0x6c4fc4 },
    title: "#c49bff",
  },
} as const satisfies Record<string, Theme>;
