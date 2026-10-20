import { describe, expect, it } from "vitest";
import { pointInRect, segmentRectEntry, sweepCircle, type Rect } from "../src/logic/collision.ts";
import { stepProjectile, type ProjectileState } from "../src/logic/projectile.ts";

const FRAME_MS = 1000 / 60;

function bullet(over: Partial<ProjectileState> = {}): ProjectileState {
  return { x: 0, y: 0, vx: 0, vy: 0, radius: 2, lifeMs: 1000, ...over };
}

describe("segmentRectEntry", () => {
  const box: Rect = { x: 10, y: -5, width: 10, height: 10 };

  it("returns the entry fraction for a crossing segment", () => {
    expect(segmentRectEntry({ x: 0, y: 0 }, { x: 40, y: 0 }, box)).toBeCloseTo(0.25, 12);
  });

  it("returns null for a segment that stops short or passes beside", () => {
    expect(segmentRectEntry({ x: 0, y: 0 }, { x: 9, y: 0 }, box)).toBeNull();
    expect(segmentRectEntry({ x: 0, y: 20 }, { x: 40, y: 20 }, box)).toBeNull();
  });

  it("returns 0 when the segment starts inside the rect", () => {
    expect(segmentRectEntry({ x: 15, y: 0 }, { x: 100, y: 0 }, box)).toBe(0);
  });

  it("handles axis-parallel segments without dividing by zero", () => {
    expect(segmentRectEntry({ x: 15, y: -50 }, { x: 15, y: 50 }, box)).toBeCloseTo(0.45, 12);
    expect(segmentRectEntry({ x: 50, y: -50 }, { x: 50, y: 50 }, box)).toBeNull();
  });
});

describe("sweepCircle", () => {
  it("reports the nearest of several rects, not the first in the list", () => {
    const far: Rect = { x: 100, y: -5, width: 10, height: 10 };
    const near: Rect = { x: 50, y: -5, width: 10, height: 10 };
    const hit = sweepCircle({ x: 0, y: 0 }, { x: 200, y: 0 }, 0, [far, near]);
    expect(hit?.index).toBe(1);
  });

  it("inflates rects by the radius so a grazing bullet still hits", () => {
    const wall: Rect = { x: 50, y: 0, width: 10, height: 10 };
    // Path runs 1.5px above the wall's top edge.
    expect(sweepCircle({ x: 0, y: -1.5 }, { x: 100, y: -1.5 }, 0, [wall])).toBeNull();
    expect(sweepCircle({ x: 0, y: -1.5 }, { x: 100, y: -1.5 }, 2, [wall])).not.toBeNull();
  });
});

describe("projectile tunnelling", () => {
  // A 2px-thin wall between x=100 and x=102.
  const thinWall: Rect = { x: 100, y: -50, width: 2, height: 100 };

  it("a naive end-position overlap check would miss a fast bullet (documents the risk)", () => {
    const p = bullet({ x: 90, vx: 6000 }); // 100px per frame at 60fps
    const end = { x: p.x + p.vx * (FRAME_MS / 1000), y: 0 };
    expect(pointInRect({ x: p.x, y: p.y }, thinWall)).toBe(false);
    expect(pointInRect(end, thinWall)).toBe(false); // jumped clean over it
  });

  it("the swept step stops a very fast bullet at a 2px wall", () => {
    const step = stepProjectile(bullet({ x: 90, vx: 6000 }), FRAME_MS, [thinWall], []);
    expect(step.kind).toBe("wall");
    if (step.kind === "wall") expect(step.x).toBeCloseTo(98, 6); // wall face minus radius
  });

  it("stops bullets at absurd speeds and during long frame spikes", () => {
    for (const vx of [1_000, 20_000, 200_000]) {
      for (const dt of [FRAME_MS, 100, 250]) {
        // Start 10px in front of the wall; every combination overshoots it.
        const step = stepProjectile(bullet({ x: 90, vx }), dt, [thinWall], []);
        expect(step.kind, `vx=${vx} dt=${dt}`).toBe("wall");
      }
    }
  });

  it("never lets a bullet pass a 16px wall over many frames in any direction", () => {
    const wall: Rect = { x: -8, y: -8, width: 16, height: 16 };
    for (let deg = 0; deg < 360; deg += 7.5) {
      const a = (deg * Math.PI) / 180;
      // Start 200px out, aim through the centre at 3000px/s.
      let p = bullet({ x: -Math.cos(a) * 200, y: -Math.sin(a) * 200, vx: Math.cos(a) * 3000, vy: Math.sin(a) * 3000 });
      let result: string = "flying";
      for (let frame = 0; frame < 60 && result === "flying"; frame++) {
        const step = stepProjectile(p, FRAME_MS, [wall], []);
        result = step.kind;
        if (step.kind === "flying") p = step.state;
      }
      expect(result, `angle ${deg}`).toBe("wall");
    }
  });

  it("hits a wall when spawned inside it (e.g. firing while hugging a wall)", () => {
    const wall: Rect = { x: 0, y: 0, width: 16, height: 16 };
    const step = stepProjectile(bullet({ x: 8, y: 8, vx: 400 }), FRAME_MS, [wall], []);
    expect(step.kind).toBe("wall");
  });
});

describe("stepProjectile targets and lifetime", () => {
  const enemy: Rect = { x: 50, y: -6, width: 12, height: 12 };
  const wall: Rect = { x: 80, y: -50, width: 16, height: 100 };

  it("hits a target that is in front of the wall", () => {
    const step = stepProjectile(bullet({ vx: 6000 }), FRAME_MS, [wall], [enemy]);
    expect(step).toMatchObject({ kind: "target", index: 0 });
  });

  it("a wall protects a target standing behind it", () => {
    const behind: Rect = { x: 120, y: -6, width: 12, height: 12 };
    const step = stepProjectile(bullet({ vx: 12000 }), FRAME_MS, [wall], [behind]);
    expect(step.kind).toBe("wall");
  });

  it("keeps flying and ticks down lifetime in open space", () => {
    const step = stepProjectile(bullet({ vx: 600, lifeMs: 500 }), 100, [], []);
    expect(step.kind).toBe("flying");
    if (step.kind === "flying") {
      expect(step.state.x).toBeCloseTo(60, 9);
      expect(step.state.lifeMs).toBeCloseTo(400, 9);
    }
  });

  it("expires when its lifetime runs out", () => {
    expect(stepProjectile(bullet({ vx: 600, lifeMs: 50 }), 100, [], []).kind).toBe("expired");
  });
});
