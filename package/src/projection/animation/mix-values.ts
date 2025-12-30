import { mixNumber, percent, px } from "motion-dom";
import { circOut, noop, progress as calcProgress } from "motion-utils";
import type { ResolvedValues } from "../types";

const borders = ["top-left", "top-right", "bottom-left", "bottom-right"];
const numBorders = borders.length;

const asNumber = (value: string | number): number =>
  typeof value === "string" ? parseFloat(value) : value;

const isPxValue = (value: string | number): boolean =>
  typeof value === "number" || px.test(String(value));

export function mixValues(
  target: ResolvedValues,
  follow: ResolvedValues,
  lead: ResolvedValues,
  progress: number,
  shouldCrossfadeOpacity: boolean,
  isOnlyMember: boolean,
): void {
  if (shouldCrossfadeOpacity) {
    target.opacity = mixNumber(
      0,
      (lead.opacity as number) ?? 1,
      easeCrossfadeIn(progress),
    );
    (target as ResolvedValues & { opacityExit?: number }).opacityExit =
      mixNumber((follow.opacity as number) ?? 1, 0, easeCrossfadeOut(progress));
  } else if (isOnlyMember) {
    target.opacity = mixNumber(
      (follow.opacity as number) ?? 1,
      (lead.opacity as number) ?? 1,
      progress,
    );
  }

  for (let i = 0; i < numBorders; i++) {
    const borderKey = `border-${borders[i]}-radius`;
    let followRadius = getRadius(follow, borderKey);
    let leadRadius = getRadius(lead, borderKey);

    if (followRadius === undefined && leadRadius === undefined) continue;

    followRadius ||= 0;
    leadRadius ||= 0;

    const canMix =
      followRadius === 0 ||
      leadRadius === 0 ||
      isPxValue(followRadius) === isPxValue(leadRadius);

    if (canMix) {
      target[borderKey] = Math.max(
        mixNumber(asNumber(followRadius), asNumber(leadRadius), progress),
        0,
      );

      if (percent.test(leadRadius) || percent.test(followRadius)) {
        target[borderKey] = `${target[borderKey]}%`;
      }
    } else {
      target[borderKey] = leadRadius;
    }
  }

  if (follow.rotate || lead.rotate) {
    target.rotate = mixNumber(
      (follow.rotate as number) || 0,
      (lead.rotate as number) || 0,
      progress,
    );
  }
}

const getRadius = (values: ResolvedValues, radiusName: string) =>
  values[radiusName] !== undefined
    ? values[radiusName]
    : values["border-radius"];

const easeCrossfadeIn = compress(0, 0.5, circOut);
const easeCrossfadeOut = compress(0.5, 0.95, noop);

function compress(
  min: number,
  max: number,
  easing: (v: number) => number,
): (v: number) => number {
  return (p: number) => {
    if (p < min) return 0;
    if (p > max) return 1;
    return easing(calcProgress(min, max, p));
  };
}
