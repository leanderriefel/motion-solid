import type { Delta, Point } from "motion-utils";
import type { ResolvedValues } from "../types";

const readValue = (
  values: ResolvedValues | undefined,
  key: string,
  altKey?: string,
): string | number => {
  if (!values) return 0;
  const direct = values[key];
  if (direct !== undefined) return direct;
  if (altKey) return values[altKey] ?? 0;
  return 0;
};

const formatNumber = (
  value: string | number | undefined,
  unit: string,
): string => {
  if (value === undefined) return "";
  if (typeof value === "number") return `${value}${unit}`;
  return value;
};

const sanitizeTreeScale = (value: number): number => {
  if (!Number.isFinite(value) || value === 0) return 1;
  return value;
};

export function buildProjectionTransform(
  delta: Delta,
  treeScale: Point,
  latestTransform?: ResolvedValues,
): string {
  let transform = "";

  const safeTreeScaleX = sanitizeTreeScale(treeScale.x);
  const safeTreeScaleY = sanitizeTreeScale(treeScale.y);

  const xTranslate = delta.x.translate / safeTreeScaleX;
  const yTranslate = delta.y.translate / safeTreeScaleY;
  const zTranslate = readValue(latestTransform, "z");
  if (xTranslate || yTranslate || zTranslate) {
    transform = `translate3d(${xTranslate}px, ${yTranslate}px, ${zTranslate}px) `;
  }

  if (safeTreeScaleX !== 1 || safeTreeScaleY !== 1) {
    transform += `scale(${1 / safeTreeScaleX}, ${1 / safeTreeScaleY}) `;
  }

  if (latestTransform) {
    const perspective = readValue(
      latestTransform,
      "transform-perspective",
      "transformPerspective",
    );
    const rotate = readValue(latestTransform, "rotate");
    const rotateX = readValue(latestTransform, "rotate-x", "rotateX");
    const rotateY = readValue(latestTransform, "rotate-y", "rotateY");
    const skewX = readValue(latestTransform, "skew-x", "skewX");
    const skewY = readValue(latestTransform, "skew-y", "skewY");

    if (perspective) {
      transform = `perspective(${formatNumber(perspective, "px")}) ${transform}`;
    }
    if (rotate) transform += `rotate(${formatNumber(rotate, "deg")}) `;
    if (rotateX) transform += `rotateX(${formatNumber(rotateX, "deg")}) `;
    if (rotateY) transform += `rotateY(${formatNumber(rotateY, "deg")}) `;
    if (skewX) transform += `skewX(${formatNumber(skewX, "deg")}) `;
    if (skewY) transform += `skewY(${formatNumber(skewY, "deg")}) `;
  }

  const elementScaleX = delta.x.scale * safeTreeScaleX;
  const elementScaleY = delta.y.scale * safeTreeScaleY;
  if (elementScaleX !== 1 || elementScaleY !== 1) {
    transform += `scale(${elementScaleX}, ${elementScaleY})`;
  }

  return transform || "none";
}
