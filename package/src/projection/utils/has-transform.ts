import type { ResolvedValues } from "../types";

const isIdentityScale = (scale: string | number | undefined): boolean => {
  if (scale === undefined) return true;
  if (typeof scale === "number") return scale === 1;
  const trimmed = scale.trim();
  if (trimmed === "1") return true;
  const parsed = parseFloat(trimmed);
  return !Number.isNaN(parsed) && parsed === 1;
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

const isIdentityTranslate = (value: string | number | undefined): boolean => {
  if (value === undefined) return true;
  if (typeof value === "number") return value === 0;

  const trimmed = value.trim();
  if (trimmed === "0" || trimmed === "0%") return true;

  const parsed = parseFloat(trimmed);
  return !Number.isNaN(parsed) && parsed === 0;
};

const hasNonIdentityValue = (
  values: ResolvedValues,
  key: string,
  altKey?: string,
): boolean => {
  const value = readValue(values, key, altKey);
  if (value === undefined) return false;

  if (typeof value === "number") return value !== 0;

  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "none") return false;

  const parsed = parseFloat(trimmed);
  return Number.isNaN(parsed) || parsed !== 0;
};

export const hasScale = (values: ResolvedValues): boolean => {
  const scale = readValue(values, "scale");
  const scaleX = readValue(values, "scale-x", "scaleX");
  const scaleY = readValue(values, "scale-y", "scaleY");
  const scaleZ = readValue(values, "scale-z", "scaleZ");
  return (
    !isIdentityScale(scale) ||
    !isIdentityScale(scaleX) ||
    !isIdentityScale(scaleY) ||
    !isIdentityScale(scaleZ)
  );
};

export const has2DTranslate = (values: ResolvedValues): boolean => {
  const x = readValue(values, "x", "translateX");
  const y = readValue(values, "y", "translateY");
  const translateX = readValue(values, "translate-x");
  const translateY = readValue(values, "translate-y");
  return (
    !isIdentityTranslate(x) ||
    !isIdentityTranslate(y) ||
    !isIdentityTranslate(translateX) ||
    !isIdentityTranslate(translateY)
  );
};

export const hasTransform = (values: ResolvedValues): boolean => {
  const transformValue = readValue(values, "transform");
  const hasTransformString =
    typeof transformValue === "string" &&
    transformValue.trim() !== "" &&
    transformValue.trim() !== "none";

  return (
    hasTransformString ||
    hasScale(values) ||
    has2DTranslate(values) ||
    hasNonIdentityValue(values, "z", "translateZ") ||
    hasNonIdentityValue(values, "translate-z") ||
    hasNonIdentityValue(values, "rotate") ||
    hasNonIdentityValue(values, "rotate-x", "rotateX") ||
    hasNonIdentityValue(values, "rotate-y", "rotateY") ||
    hasNonIdentityValue(values, "rotate-z", "rotateZ") ||
    hasNonIdentityValue(values, "skew") ||
    hasNonIdentityValue(values, "skew-x", "skewX") ||
    hasNonIdentityValue(values, "skew-y", "skewY") ||
    hasNonIdentityValue(values, "perspective") ||
    hasNonIdentityValue(values, "transform-perspective", "transformPerspective")
  );
};
