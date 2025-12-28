import { complex, mixNumber } from "motion-dom";
import type { ScaleCorrectorDefinition } from "./types";

export const correctBoxShadow: ScaleCorrectorDefinition = {
  correct: (latest: string | number, { treeScale, projectionDelta }) => {
    if (typeof latest !== "string") return latest;
    const original = latest;
    const shadow = complex.parse(latest);

    if (shadow.length > 5) return original;

    const template = complex.createTransformer(latest);
    const offset = typeof shadow[0] !== "number" ? 1 : 0;

    const xScale = projectionDelta!.x.scale * treeScale!.x;
    const yScale = projectionDelta!.y.scale * treeScale!.y;

    (shadow[0 + offset] as number) /= xScale;
    (shadow[1 + offset] as number) /= yScale;

    const averageScale = mixNumber(xScale, yScale, 0.5);

    if (typeof shadow[2 + offset] === "number")
      (shadow[2 + offset] as number) /= averageScale;

    if (typeof shadow[3 + offset] === "number")
      (shadow[3 + offset] as number) /= averageScale;

    return template(shadow);
  },
};
