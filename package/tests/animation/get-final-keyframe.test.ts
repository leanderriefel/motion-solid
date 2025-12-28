import { describe, it, expect } from "vitest";
import { getFinalKeyframe } from "../../src/animation/get-final-keyframe";

describe("getFinalKeyframe", () => {
  it("returns undefined for empty keyframes", () => {
    expect(getFinalKeyframe([], {})).toBeUndefined();
  });

  it("returns last keyframe for normal animation", () => {
    expect(getFinalKeyframe([0, 50, 100], {})).toBe(100);
    expect(getFinalKeyframe(["0px", "50px", "100px"], {})).toBe("100px");
  });

  it("returns last keyframe when repeat is undefined", () => {
    expect(getFinalKeyframe([0, 100], { repeatType: "reverse" })).toBe(100);
  });

  it("returns last keyframe for even repeat count with reverse", () => {
    expect(
      getFinalKeyframe([0, 100], { repeat: 2, repeatType: "reverse" }),
    ).toBe(100);
    expect(
      getFinalKeyframe([0, 100], { repeat: 4, repeatType: "reverse" }),
    ).toBe(100);
  });

  it("returns first keyframe for odd repeat count with reverse", () => {
    expect(
      getFinalKeyframe([0, 100], { repeat: 1, repeatType: "reverse" }),
    ).toBe(0);
    expect(
      getFinalKeyframe([0, 100], { repeat: 3, repeatType: "reverse" }),
    ).toBe(0);
  });

  it("returns last keyframe for loop repeatType regardless of count", () => {
    expect(getFinalKeyframe([0, 100], { repeat: 1, repeatType: "loop" })).toBe(
      100,
    );
    expect(getFinalKeyframe([0, 100], { repeat: 3, repeatType: "loop" })).toBe(
      100,
    );
  });

  it("returns last keyframe for mirror repeatType (treated as loop)", () => {
    expect(
      getFinalKeyframe([0, 100], { repeat: 1, repeatType: "mirror" }),
    ).toBe(100);
  });

  it("returns last keyframe when repeatType defaults to loop", () => {
    expect(getFinalKeyframe([0, 100], { repeat: 3 })).toBe(100);
  });

  it("handles single keyframe", () => {
    expect(getFinalKeyframe([100], {})).toBe(100);
    expect(getFinalKeyframe([100], { repeat: 1, repeatType: "reverse" })).toBe(
      100,
    );
  });
});
