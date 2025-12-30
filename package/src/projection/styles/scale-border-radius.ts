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

    if (typeof latest === "string") {
      if (px.test(latest)) {
        latest = parseFloat(latest);
      } else {
        return latest;
      }
    }

    const x = pixelsToPercent(latest, node.target.x);
    const y = pixelsToPercent(latest, node.target.y);

    return `${x}% ${y}%`;
  },
};
