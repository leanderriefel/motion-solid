import type { MotionOptions, MotionState } from "./types";

export const createMotionState = (args?: {
  options?: MotionOptions;
  parent?: MotionState | null;
}): MotionState => ({
  element: null,
  values: {},
  goals: {},
  resolvedValues: {},
  activeGestures: {
    hover: false,
    tap: false,
    focus: false,
    drag: false,
    inView: false,
  },
  activeVariants: {},
  options: args?.options ?? {},
  parent: args?.parent ?? null,
});
