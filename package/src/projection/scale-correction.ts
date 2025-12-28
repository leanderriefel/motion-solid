import type { Box } from "motion-utils";

/**
 * Scale correction for layout animations.
 *
 * When an element undergoes a layout animation with scale transforms,
 * certain CSS properties (like border-radius and box-shadow) get visually
 * distorted because they don't scale proportionally with the transform.
 *
 * These corrector functions convert pixel values to percentages (for border-radius)
 * or apply inverse scaling (for box-shadow) to maintain visual consistency.
 *
 * IMPORTANT: Scale correction only applies to values explicitly set via the
 * style prop or animation props. CSS class-based values are not corrected.
 */

const pxRegex = /(-?\d+\.?\d*|\.\d+)px/g;

/**
 * Convert a pixel value to a percentage of an axis length.
 */
function pixelsToPercent(pixels: number, axisLength: number): number {
  if (axisLength === 0) return 0;
  return (pixels / axisLength) * 100;
}

/**
 * Correct border-radius by converting px values to percentages.
 *
 * For individual corner properties (border-top-left-radius, etc.), the syntax is:
 *   `<horizontal> <vertical>` (space-separated, NO slash)
 *
 * For the shorthand (border-radius), the syntax uses a slash:
 *   `<horizontal> / <vertical>`
 *
 * Since we apply corrections to individual corner properties (via applyTo),
 * we use space-separated syntax.
 */
export function correctBorderRadius(
  latest: string | number,
  scaleX: number,
  scaleY: number,
  targetBox: Box | null,
): string | number {
  if (!targetBox) return latest;

  const targetWidth = targetBox.x.max - targetBox.x.min;
  const targetHeight = targetBox.y.max - targetBox.y.min;
  const safeScaleX =
    Number.isFinite(scaleX) && Math.abs(scaleX) > 0.0001 ? Math.abs(scaleX) : 1;
  const safeScaleY =
    Number.isFinite(scaleY) && Math.abs(scaleY) > 0.0001 ? Math.abs(scaleY) : 1;
  const scaledWidth = targetWidth * safeScaleX;
  const scaledHeight = targetHeight * safeScaleY;

  // If it's a number, treat it as pixels
  if (typeof latest === "number") {
    const xPercent = pixelsToPercent(latest, scaledWidth);
    const yPercent = pixelsToPercent(latest, scaledHeight);

    // Use space-separated syntax for individual corner properties
    return `${xPercent}% ${yPercent}%`;
  }

  // If it's a string, check if it contains px values
  if (typeof latest === "string") {
    // Check if it's a simple px value like "24px"
    const simplePxMatch = /^(-?\d+\.?\d*|\.\d+)px$/.exec(latest);
    if (simplePxMatch) {
      const pxValue = parseFloat(simplePxMatch[1]!);
      const xPercent = pixelsToPercent(pxValue, scaledWidth);
      const yPercent = pixelsToPercent(pxValue, scaledHeight);

      // Use space-separated syntax for individual corner properties
      return `${xPercent}% ${yPercent}%`;
    }

    // For complex values with multiple px values, replace each px with percentage
    // This handles values like "10px 20px" or "10px 20px 30px 40px"
    let hasXValue = false;
    const result = latest.replace(pxRegex, (_match, value) => {
      const pxValue = parseFloat(value);
      // Alternate between x and y axis for complex border-radius values
      const axisLength = hasXValue ? scaledHeight : scaledWidth;
      hasXValue = !hasXValue;
      return `${pixelsToPercent(pxValue, axisLength)}%`;
    });

    // If no replacements were made, return original
    if (result === latest) return latest;
    return result;
  }

  return latest;
}

/**
 * Correct box-shadow by applying inverse scale to pixel values.
 *
 * Box shadow values need to be scaled inversely to the element's scale transform
 * to maintain their visual appearance during layout animations.
 *
 * box-shadow: offset-x offset-y blur-radius spread-radius color
 */
export function correctBoxShadow(
  latest: string | number,
  scaleX: number,
  scaleY: number,
  _targetBox: Box | null,
): string | number {
  if (typeof latest !== "string") return latest;

  // Average scale for uniform correction (since shadows expand in all directions)
  const averageScale = (scaleX + scaleY) / 2;
  if (Math.abs(averageScale - 1) < 0.0001) return latest;

  // Parse and correct each shadow in the value (handles multiple shadows separated by commas)
  const shadows = splitShadows(latest);
  const correctedShadows = shadows.map((shadow) =>
    correctSingleShadow(shadow, scaleX, scaleY, averageScale),
  );

  return correctedShadows.join(", ");
}

/**
 * Split box-shadow value by commas, but respect parentheses (for rgb/rgba/hsl colors)
 */
function splitShadows(value: string): string[] {
  const shadows: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 0; i < value.length; i++) {
    const char = value[i]!;
    if (char === "(") parenDepth++;
    if (char === ")") parenDepth--;

    if (char === "," && parenDepth === 0) {
      shadows.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    shadows.push(current.trim());
  }

  return shadows;
}

/**
 * Correct a single box-shadow value.
 * Format: [inset] offset-x offset-y [blur-radius [spread-radius]] [color]
 */
function correctSingleShadow(
  shadow: string,
  scaleX: number,
  scaleY: number,
  averageScale: number,
): string {
  // Tokenize the shadow value
  const tokens: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 0; i < shadow.length; i++) {
    const char = shadow[i]!;
    if (char === "(") parenDepth++;
    if (char === ")") parenDepth--;

    if ((char === " " || char === "\t") && parenDepth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) tokens.push(current.trim());

  // Process tokens
  const result: string[] = [];
  let pxValueIndex = 0;

  for (const token of tokens) {
    // Check if it's a length value (px, em, rem, etc.)
    const pxMatch = /^(-?\d+\.?\d*|\.\d+)px$/.exec(token);

    if (pxMatch) {
      const value = parseFloat(pxMatch[1]!);
      let correctedValue: number;

      // offset-x uses scaleX, offset-y uses scaleY, blur and spread use average
      if (pxValueIndex === 0) {
        correctedValue = value / scaleX;
      } else if (pxValueIndex === 1) {
        correctedValue = value / scaleY;
      } else {
        correctedValue = value / averageScale;
      }

      result.push(`${correctedValue}px`);
      pxValueIndex++;
    } else {
      result.push(token);
    }
  }

  return result.join(" ");
}

/**
 * Type for scale corrector functions.
 */
type ScaleCorrector = (
  value: string | number,
  scaleX: number,
  scaleY: number,
  targetBox: Box | null,
) => string | number;

/**
 * Map of CSS properties that need scale correction.
 */
export const scaleCorrectedKeys: Record<
  string,
  {
    correct: ScaleCorrector;
    applyTo?: string[];
  }
> = {
  "border-radius": {
    correct: correctBorderRadius,
    applyTo: [
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-left-radius",
      "border-bottom-right-radius",
    ],
  },
  "border-top-left-radius": { correct: correctBorderRadius },
  "border-top-right-radius": { correct: correctBorderRadius },
  "border-bottom-left-radius": { correct: correctBorderRadius },
  "border-bottom-right-radius": { correct: correctBorderRadius },
  "box-shadow": { correct: correctBoxShadow },
};

/**
 * Check if a key needs scale correction.
 */
export function needsScaleCorrection(key: string): boolean {
  return key in scaleCorrectedKeys;
}

/**
 * Apply scale correction to a value.
 */
export function applyScaleCorrection(
  key: string,
  value: string | number,
  scaleX: number,
  scaleY: number,
  targetBox: Box | null,
): { key: string; value: string | number }[] {
  const corrector = scaleCorrectedKeys[key];
  if (!corrector) return [{ key, value }];

  const corrected = corrector.correct(value, scaleX, scaleY, targetBox);

  if (corrector.applyTo) {
    return corrector.applyTo.map((targetKey) => ({
      key: targetKey,
      value: corrected,
    }));
  }

  return [{ key, value: corrected }];
}
