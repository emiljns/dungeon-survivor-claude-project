import { describe, expect, it } from "vitest";
import { ICE, slideVelocity } from "../src/logic/ice.ts";
import { parseLayout } from "../src/logic/layout.ts";

/** Runs `ms` of 16 ms frames from `v` toward `target`. */
function slide(v: { x: number; y: number }, target: { x: number; y: number }, ms: number, onIce = true) {
  let cur = v;
  for (let t = 0; t < ms; t += 16) cur = slideVelocity(cur, target, 16, onIce);
  return cur;
}

describe("ice", () => {
  it("off ice, movement is instant (the usual controls)", () => {
    expect(slideVelocity({ x: 120, y: 0 }, { x: 0, y: -120 }, 16, false)).toEqual({ x: 0, y: -120 });
  });

  it("on ice, the player keeps sliding after letting go, then comes to rest", () => {
    const after100 = slide({ x: 120, y: 0 }, { x: 0, y: 0 }, 100);
    expect(after100.x).toBeGreaterThan(60); // still most of the speed
    expect(after100.y).toBe(0);
    expect(slide({ x: 120, y: 0 }, { x: 0, y: 0 }, 5000)).toEqual({ x: 0, y: 0 });
  });

  it("on ice, starting and turning take time, but full speed is reached and never exceeded", () => {
    const start = slideVelocity({ x: 0, y: 0 }, { x: 120, y: 0 }, 16, true);
    expect(start.x).toBeGreaterThan(0);
    expect(start.x).toBeLessThan(20);
    const turned = slide({ x: 120, y: 0 }, { x: -120, y: 0 }, 200);
    expect(turned.x).toBeGreaterThan(0); // still drifting the old way
    const settled = slide({ x: 0, y: 0 }, { x: 120, y: 0 }, 3000);
    expect(settled.x).toBeCloseTo(120, 0);
    expect(settled.x).toBeLessThanOrEqual(120);
  });

  it("a dash on ice carries on past its end, slowing down", () => {
    const afterDash = slide({ x: 360, y: 0 }, { x: 0, y: 0 }, 200);
    expect(afterDash.x).toBeGreaterThan(120);
    expect(afterDash.x).toBeLessThan(360);
  });

  it("is framerate-independent: one 48 ms step equals three 16 ms steps", () => {
    const one = slideVelocity({ x: 120, y: 0 }, { x: 0, y: 0 }, 48, true);
    const three = slide({ x: 120, y: 0 }, { x: 0, y: 0 }, 48);
    expect(one.x).toBeCloseTo(three.x, 6);
  });

  it("grip is the tuning knob: a larger time constant slides further", () => {
    const grippy = slideVelocity({ x: 120, y: 0 }, { x: 0, y: 0 }, 100, true, ICE.gripMs / 2);
    const slick = slideVelocity({ x: 120, y: 0 }, { x: 0, y: 0 }, 100, true, ICE.gripMs * 2);
    expect(slick.x).toBeGreaterThan(grippy.x);
  });

  it("'i' in a layout is walkable ice: floor, not wall or water", () => {
    const l = parseLayout(["#####", "#Pii#", "#####"], 16);
    expect(l.ice[1]).toEqual([false, false, true, true, false]);
    expect(l.wall[1]?.[2]).toBe(false);
    expect(l.low[1]?.[2]).toBe(false);
  });
});
