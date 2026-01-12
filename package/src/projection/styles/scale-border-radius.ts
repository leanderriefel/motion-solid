import { px } from "motion-dom";
import type { Axis } from "motion-utils";
import type { ScaleCorrectorDefinition } from "./types";

const pixelsToPercent = (pixels: number, axis: Axis) => {
  if (axis.max === axis.min) return 0;
  return (pixels / (axis.max - axis.min)) * 100;
};

export const correctBorderRadius: ScaleCorrectorDefinition = {
  correct: (latest, node) => {
    if (!node.target) return latest;

    const original = latest;

    if (typeof latest === "string") {
      if (px.test(latest)) {
        latest = parseFloat(latest);
      } else {
        return latest;
      }
    }

    if (
      node.target.x.max === node.target.x.min ||
      node.target.y.max === node.target.y.min
    ) {
      return typeof original === "number" ? `${original}px` : original;
    }

    const x = pixelsToPercent(latest, node.target.x);
    const y = pixelsToPercent(latest, node.target.y);

    return `${x}% ${y}%`;
  },
};
