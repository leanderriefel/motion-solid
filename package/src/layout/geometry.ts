/**
 * Geometry utilities for layout projection.
 * Pure functions for box/delta math with mutable patterns to minimize allocations.
 */

// === Types ===

export type Axis = { min: number; max: number };
export type Box = { x: Axis; y: Axis };
export type AxisDelta = {
  translate: number;
  scale: number;
  origin: number;
  originPoint: number;
};
export type Delta = { x: AxisDelta; y: AxisDelta };
export type Point = { x: number; y: number };

// === Constants ===

const SCALE_PRECISION = 0.0001;
const SCALE_MIN = 1 - SCALE_PRECISION;
const SCALE_MAX = 1 + SCALE_PRECISION;
const TRANSLATE_PRECISION = 0.01;
const TRANSLATE_MIN = -TRANSLATE_PRECISION;
const TRANSLATE_MAX = TRANSLATE_PRECISION;
const TREE_SCALE_SNAP_MIN = 0.999999999999;
const TREE_SCALE_SNAP_MAX = 1.0000000000001;

// === Factory functions ===

export const createAxis = (): Axis => ({ min: 0, max: 0 });

export const createBox = (): Box => ({ x: createAxis(), y: createAxis() });

export const createAxisDelta = (): AxisDelta => ({
  translate: 0,
  scale: 1,
  origin: 0.5,
  originPoint: 0,
});

export const createDelta = (): Delta => ({
  x: createAxisDelta(),
  y: createAxisDelta(),
});

export const createPoint = (): Point => ({ x: 1, y: 1 });

// === Copy functions (mutate target to avoid allocations) ===

export function copyAxisInto(target: Axis, source: Axis): void {
  target.min = source.min;
  target.max = source.max;
}

export function copyBoxInto(target: Box, source: Box): void {
  copyAxisInto(target.x, source.x);
  copyAxisInto(target.y, source.y);
}

export function copyAxisDeltaInto(target: AxisDelta, source: AxisDelta): void {
  target.translate = source.translate;
  target.scale = source.scale;
  target.origin = source.origin;
  target.originPoint = source.originPoint;
}

export function copyBox(source: Box): Box {
  return {
    x: { min: source.x.min, max: source.x.max },
    y: { min: source.y.min, max: source.y.max },
  };
}

// === Calculation functions ===

export function calcLength(axis: Axis): number {
  return axis.max - axis.min;
}

export function calcAxisDelta(
  delta: AxisDelta,
  source: Axis,
  target: Axis,
  origin: number = 0.5,
): void {
  delta.origin = origin;
  delta.originPoint = mixNumber(source.min, source.max, delta.origin);

  const sourceLength = calcLength(source);
  const targetLength = calcLength(target);

  delta.scale = sourceLength !== 0 ? targetLength / sourceLength : 1;
  delta.translate =
    mixNumber(target.min, target.max, delta.origin) - delta.originPoint;

  // Snap to identity if within threshold
  if (
    (delta.scale >= SCALE_MIN && delta.scale <= SCALE_MAX) ||
    !Number.isFinite(delta.scale)
  ) {
    delta.scale = 1;
  }

  if (
    (delta.translate >= TRANSLATE_MIN && delta.translate <= TRANSLATE_MAX) ||
    !Number.isFinite(delta.translate)
  ) {
    delta.translate = 0;
  }
}

export function calcBoxDelta(
  delta: Delta,
  source: Box,
  target: Box,
  origin?: { originX?: number; originY?: number },
): void {
  calcAxisDelta(delta.x, source.x, target.x, origin?.originX);
  calcAxisDelta(delta.y, source.y, target.y, origin?.originY);
}

export function calcRelativeAxisPosition(
  target: Axis,
  layout: Axis,
  parent: Axis,
): void {
  target.min = layout.min - parent.min;
  target.max = target.min + calcLength(layout);
}

export function calcRelativePosition(
  target: Box,
  layout: Box,
  parent: Box,
): void {
  calcRelativeAxisPosition(target.x, layout.x, parent.x);
  calcRelativeAxisPosition(target.y, layout.y, parent.y);
}

export function calcRelativeAxis(
  target: Axis,
  relative: Axis,
  parent: Axis,
): void {
  target.min = parent.min + relative.min;
  target.max = target.min + calcLength(relative);
}

export function calcRelativeBox(target: Box, relative: Box, parent: Box): void {
  calcRelativeAxis(target.x, relative.x, parent.x);
  calcRelativeAxis(target.y, relative.y, parent.y);
}

// === Apply functions (mutate box based on delta) ===

function scalePoint(point: number, scale: number, originPoint: number): number {
  const distanceFromOrigin = point - originPoint;
  return originPoint + scale * distanceFromOrigin;
}

function applyPointDelta(
  point: number,
  translate: number,
  scale: number,
  originPoint: number,
): number {
  return scalePoint(point, scale, originPoint) + translate;
}

export function applyAxisDelta(
  axis: Axis,
  translate: number,
  scale: number,
  originPoint: number,
): void {
  axis.min = applyPointDelta(axis.min, translate, scale, originPoint);
  axis.max = applyPointDelta(axis.max, translate, scale, originPoint);
}

export function applyBoxDelta(box: Box, { x, y }: Delta): void {
  applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
  applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
}

export function translateAxis(axis: Axis, distance: number): void {
  axis.min += distance;
  axis.max += distance;
}

// === Mix functions (interpolation for animation) ===

export function mixNumber(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function mixAxisDelta(
  output: AxisDelta,
  delta: AxisDelta,
  progress: number,
): void {
  output.translate = mixNumber(delta.translate, 0, progress);
  output.scale = mixNumber(delta.scale, 1, progress);
  output.origin = delta.origin;
  output.originPoint = delta.originPoint;
}

export function mixAxis(
  output: Axis,
  from: Axis,
  to: Axis,
  progress: number,
): void {
  output.min = mixNumber(from.min, to.min, progress);
  output.max = mixNumber(from.max, to.max, progress);
}

export function mixBox(
  output: Box,
  from: Box,
  to: Box,
  progress: number,
): void {
  mixAxis(output.x, from.x, to.x, progress);
  mixAxis(output.y, from.y, to.y, progress);
}

// === Comparison functions ===

export function isNear(
  value: number,
  target: number,
  threshold: number,
): boolean {
  return Math.abs(value - target) <= threshold;
}

export function axisEquals(a: Axis, b: Axis, threshold: number = 0.5): boolean {
  return (
    Math.abs(a.min - b.min) <= threshold && Math.abs(a.max - b.max) <= threshold
  );
}

export function boxEquals(a: Box, b: Box, threshold: number = 0.5): boolean {
  return axisEquals(a.x, b.x, threshold) && axisEquals(a.y, b.y, threshold);
}

export function boxEqualsRounded(a: Box, b: Box): boolean {
  return (
    Math.round(a.x.min) === Math.round(b.x.min) &&
    Math.round(a.x.max) === Math.round(b.x.max) &&
    Math.round(a.y.min) === Math.round(b.y.min) &&
    Math.round(a.y.max) === Math.round(b.y.max)
  );
}

export function axisDeltaEquals(
  a: AxisDelta | undefined,
  b: AxisDelta | undefined,
): boolean {
  if (!a || !b) return a === b;
  return (
    isNear(a.translate, b.translate, 0.5) && isNear(a.scale, b.scale, 0.0001)
  );
}

export function isDeltaZero(delta: Delta): boolean {
  return (
    isNear(delta.x.translate, 0, 0.5) &&
    isNear(delta.y.translate, 0, 0.5) &&
    isNear(delta.x.scale, 1, 0.0001) &&
    isNear(delta.y.scale, 1, 0.0001)
  );
}

// === Validation functions ===

export function isValidBox(box: Box): boolean {
  return (
    Number.isFinite(box.x.min) &&
    Number.isFinite(box.x.max) &&
    Number.isFinite(box.y.min) &&
    Number.isFinite(box.y.max)
  );
}

export function hasValidSize(box: Box): boolean {
  const width = calcLength(box.x);
  const height = calcLength(box.y);
  return width > 0.5 && height > 0.5;
}

export function isUsableBox(box: Box): boolean {
  return isValidBox(box) && hasValidSize(box);
}

// === Utility functions ===

export function aspectRatio(box: Box): number {
  const width = calcLength(box.x);
  const height = calcLength(box.y);
  if (width === 0 || height === 0) return 0;
  return width / height;
}

export function eachAxis(callback: (axis: "x" | "y") => void): void {
  callback("x");
  callback("y");
}

export function roundAxis(axis: Axis): void {
  axis.min = Math.round(axis.min);
  axis.max = Math.round(axis.max);
}

export function roundBox(box: Box): void {
  roundAxis(box.x);
  roundAxis(box.y);
}

export function snapTreeScale(treeScale: Point): void {
  if (treeScale.x < TREE_SCALE_SNAP_MAX && treeScale.x > TREE_SCALE_SNAP_MIN) {
    treeScale.x = 1;
  }
  if (treeScale.y < TREE_SCALE_SNAP_MAX && treeScale.y > TREE_SCALE_SNAP_MIN) {
    treeScale.y = 1;
  }
}
