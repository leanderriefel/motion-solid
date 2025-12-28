import type { Axis, AxisDelta, Box } from "motion-utils";

export function copyAxisInto(axis: Axis, originAxis: Axis): void {
  axis.min = originAxis.min;
  axis.max = originAxis.max;
}

export function copyBoxInto(box: Box, originBox: Box): void {
  copyAxisInto(box.x, originBox.x);
  copyAxisInto(box.y, originBox.y);
}

export function copyAxisDeltaInto(
  delta: AxisDelta,
  originDelta: AxisDelta,
): void {
  delta.translate = originDelta.translate;
  delta.scale = originDelta.scale;
  delta.originPoint = originDelta.originPoint;
  delta.origin = originDelta.origin;
}
