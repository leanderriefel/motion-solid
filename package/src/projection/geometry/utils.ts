import type { Axis, AxisDelta, Box, Delta } from "motion-utils";
import { calcLength } from "./delta-calc";

const isAxisDeltaZero = (delta: AxisDelta): boolean =>
  delta.translate === 0 && delta.scale === 1;

export const isDeltaZero = (delta: Delta): boolean =>
  isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y);

export const axisEquals = (a: Axis, b: Axis): boolean =>
  a.min === b.min && a.max === b.max;

export const boxEquals = (a: Box, b: Box): boolean =>
  axisEquals(a.x, b.x) && axisEquals(a.y, b.y);

export const axisEqualsRounded = (a: Axis, b: Axis): boolean =>
  Math.round(a.min) === Math.round(b.min) &&
  Math.round(a.max) === Math.round(b.max);

export const boxEqualsRounded = (a: Box, b: Box): boolean =>
  axisEqualsRounded(a.x, b.x) && axisEqualsRounded(a.y, b.y);

export const aspectRatio = (box: Box): number =>
  calcLength(box.x) / calcLength(box.y);

export const axisDeltaEquals = (a: AxisDelta, b: AxisDelta): boolean =>
  a.translate === b.translate &&
  a.scale === b.scale &&
  a.originPoint === b.originPoint;
