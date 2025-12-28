import { isCSSVariableName } from "motion-dom";
import { correctBorderRadius } from "./scale-border-radius";
import { correctBoxShadow } from "./scale-box-shadow";
import type { ScaleCorrectorMap } from "./types";

export const scaleCorrectors: ScaleCorrectorMap = {
  "border-radius": {
    ...correctBorderRadius,
    applyTo: [
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-left-radius",
      "border-bottom-right-radius",
    ],
  },
  "border-top-left-radius": correctBorderRadius,
  "border-top-right-radius": correctBorderRadius,
  "border-bottom-left-radius": correctBorderRadius,
  "border-bottom-right-radius": correctBorderRadius,
  "box-shadow": correctBoxShadow,
};

export function addScaleCorrector(correctors: ScaleCorrectorMap): void {
  for (const key in correctors) {
    const next = correctors[key];
    if (!next) continue;
    scaleCorrectors[key] = next;
    if (isCSSVariableName(key)) {
      scaleCorrectors[key].isCSSVariable = true;
    }
  }
}
