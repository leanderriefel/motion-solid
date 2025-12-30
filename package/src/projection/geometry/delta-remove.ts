import { mixNumber, percent } from "motion-dom";
import type { Axis, Box } from "motion-utils";
import type { ResolvedValues } from "../types";
import { scalePoint } from "./delta-apply";

const readValue = (values: ResolvedValues, key: string, altKey?: string) => {
  const direct = values[key];
  if (direct !== undefined) return direct;
  if (altKey) return values[altKey];
  return undefined;
};

export function removePointDelta(
  point: number,
  translate: number,
  scale: number,
  originPoint: number,
  boxScale?: number,
): number {
  point -= translate;
  point = scalePoint(point, 1 / scale, originPoint);

  if (boxScale !== undefined) {
    point = scalePoint(point, 1 / boxScale, originPoint);
  }

  return point;
}

export function removeAxisDelta(
  axis: Axis,
  translate: number | string = 0,
  scale: number = 1,
  origin: number = 0.5,
  boxScale?: number,
  originAxis: Axis = axis,
  sourceAxis: Axis = axis,
): void {
  if (percent.test(translate)) {
    translate = parseFloat(translate as string);
    const relativeProgress = mixNumber(
      sourceAxis.min,
      sourceAxis.max,
      translate / 100,
    );
    translate = relativeProgress - sourceAxis.min;
  }

  if (typeof translate !== "number") return;

  let originPoint = mixNumber(originAxis.min, originAxis.max, origin);
  if (axis === originAxis) originPoint -= translate;

  axis.min = removePointDelta(
    axis.min,
    translate,
    scale,
    originPoint,
    boxScale,
  );
  axis.max = removePointDelta(
    axis.max,
    translate,
    scale,
    originPoint,
    boxScale,
  );
}

export function removeAxisTransforms(
  axis: Axis,
  transforms: ResolvedValues,
  [key, scaleKey, originKey]: [string, string, string],
  origin?: Axis,
  sourceAxis?: Axis,
): void {
  removeAxisDelta(
    axis,
    readValue(transforms, key),
    (readValue(
      transforms,
      scaleKey,
      scaleKey === "scale-x" ? "scaleX" : "scaleY",
    ) as number) ?? (readValue(transforms, "scale") as number),
    (readValue(
      transforms,
      originKey,
      originKey === "origin-x" ? "originX" : "originY",
    ) as number) ?? 0.5,
    readValue(transforms, "scale") as number,
    origin,
    sourceAxis,
  );
}

const xKeys = ["x", "scale-x", "origin-x"] as [string, string, string];
const yKeys = ["y", "scale-y", "origin-y"] as [string, string, string];

export function removeBoxTransforms(
  box: Box,
  transforms: ResolvedValues,
  originBox?: Box,
  sourceBox?: Box,
): void {
  removeAxisTransforms(
    box.x,
    transforms,
    xKeys,
    originBox ? originBox.x : undefined,
    sourceBox ? sourceBox.x : undefined,
  );
  removeAxisTransforms(
    box.y,
    transforms,
    yKeys,
    originBox ? originBox.y : undefined,
    sourceBox ? sourceBox.y : undefined,
  );
}
