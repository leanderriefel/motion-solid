import type { ResolvedValues } from "../types";

const isIdentityScale = (scale: string | number | undefined): boolean => {
  if (scale === undefined) return true;
  if (typeof scale === "number") return scale === 1;
  return scale === "1";
};

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

export const hasScale = (values: ResolvedValues): boolean => {
  const scale = readValue(values, "scale");
  const scaleX = readValue(values, "scale-x", "scaleX");
  const scaleY = readValue(values, "scale-y", "scaleY");
  return (
    !isIdentityScale(scale) ||
    !isIdentityScale(scaleX) ||
    !isIdentityScale(scaleY)
  );
};

export const has2DTranslate = (values: ResolvedValues): boolean => {
  const x = readValue(values, "x");
  const y = readValue(values, "y");
  return is2DTranslate(x) || is2DTranslate(y);
};

export const hasTransform = (values: ResolvedValues): boolean => {
  return (
    hasScale(values) ||
    has2DTranslate(values) ||
    readValue(values, "z") !== undefined ||
    readValue(values, "rotate") !== undefined ||
    readValue(values, "rotate-x", "rotateX") !== undefined ||
    readValue(values, "rotate-y", "rotateY") !== undefined ||
    readValue(values, "skew-x", "skewX") !== undefined ||
    readValue(values, "skew-y", "skewY") !== undefined
  );
};

const is2DTranslate = (value: string | number | undefined): boolean => {
  if (value === undefined) return false;
  if (typeof value === "number") return value !== 0;
  return value !== "0%" && value !== "0";
};
