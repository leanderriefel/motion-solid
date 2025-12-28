import type { Box, Delta, Point } from "motion-utils";
import type { ResolvedValues } from "../types";

export type ScaleCorrectorNode = {
  target?: Box;
  projectionDelta?: Delta;
  treeScale?: Point;
};

export type ScaleCorrector = (
  latest: string | number,
  node: ScaleCorrectorNode,
) => string | number;

export interface ScaleCorrectorDefinition {
  correct: ScaleCorrector;
  applyTo?: string[];
  isCSSVariable?: boolean;
}

export interface ScaleCorrectorMap {
  [key: string]: ScaleCorrectorDefinition;
}

export type ResolvedStyleValues = ResolvedValues | undefined;
