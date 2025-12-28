import { mixNumber } from "motion-dom";
import type { Axis, Box, Delta, Point } from "motion-utils";
import type { ResolvedValues } from "../types";
import { hasTransform } from "../utils/has-transform";

type ProjectionNodeLike = {
  projectionDelta?: Delta;
  options: { layoutScroll?: boolean };
  scroll?: { offset: Point };
  parent?: unknown;
  latestValues: ResolvedValues;
};

export function scalePoint(point: number, scale: number, originPoint: number) {
  const distanceFromOrigin = point - originPoint;
  const scaled = scale * distanceFromOrigin;
  return originPoint + scaled;
}

export function applyPointDelta(
  point: number,
  translate: number,
  scale: number,
  originPoint: number,
  boxScale?: number,
): number {
  if (boxScale !== undefined) {
    point = scalePoint(point, boxScale, originPoint);
  }

  return scalePoint(point, scale, originPoint) + translate;
}

export function applyAxisDelta(
  axis: Axis,
  translate: number = 0,
  scale: number = 1,
  originPoint: number,
  boxScale?: number,
): void {
  axis.min = applyPointDelta(axis.min, translate, scale, originPoint, boxScale);
  axis.max = applyPointDelta(axis.max, translate, scale, originPoint, boxScale);
}

export function applyBoxDelta(box: Box, { x, y }: Delta): void {
  applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
  applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
}

export function applyTreeDeltas(
  box: Box,
  treeScale: Point,
  treePath: ProjectionNodeLike[],
  isSharedTransition: boolean = false,
): void {
  const treeLength = treePath.length;
  if (!treeLength) return;

  treeScale.x = treeScale.y = 1;

  let node: ProjectionNodeLike;
  let delta: Delta | undefined;

  for (let i = 0; i < treeLength; i++) {
    node = treePath[i]!;
    delta = node.projectionDelta;

    if (
      isSharedTransition &&
      node.options.layoutScroll &&
      node.scroll &&
      node.parent
    ) {
      transformBox(box, {
        x: -node.scroll.offset.x,
        y: -node.scroll.offset.y,
      });
    }

    if (delta) {
      treeScale.x *= delta.x.scale;
      treeScale.y *= delta.y.scale;

      applyBoxDelta(box, delta);
    }

    if (isSharedTransition && hasTransform(node.latestValues)) {
      transformBox(box, node.latestValues);
    }
  }
}

export function translateAxis(axis: Axis, distance: number): void {
  axis.min = axis.min + distance;
  axis.max = axis.max + distance;
}

const readValue = (
  values: ResolvedValues,
  key: string,
  altKey?: string,
): string | number | undefined => {
  const direct = values[key];
  if (direct !== undefined) return direct;
  if (altKey) return values[altKey];
  return undefined;
};

const readNumber = (
  values: ResolvedValues,
  key: string,
  altKey?: string,
): number | undefined => {
  const value = readValue(values, key, altKey);
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export function transformAxis(
  axis: Axis,
  axisTranslate?: number,
  axisScale?: number,
  boxScale?: number,
  axisOrigin: number = 0.5,
): void {
  const originPoint = mixNumber(axis.min, axis.max, axisOrigin);

  applyAxisDelta(axis, axisTranslate, axisScale, originPoint, boxScale);
}

export function transformBox(box: Box, transform: ResolvedValues): void {
  transformAxis(
    box.x,
    readNumber(transform, "x"),
    readNumber(transform, "scale-x", "scaleX"),
    readNumber(transform, "scale"),
    readNumber(transform, "origin-x", "originX") ?? 0.5,
  );
  transformAxis(
    box.y,
    readNumber(transform, "y"),
    readNumber(transform, "scale-y", "scaleY"),
    readNumber(transform, "scale"),
    readNumber(transform, "origin-y", "originY") ?? 0.5,
  );
}
