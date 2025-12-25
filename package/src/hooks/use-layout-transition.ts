import type { Accessor } from "solid-js";
import {
  layoutTransition,
  type LayoutTransitionOptions,
  type LayoutTransitionTargets,
} from "../layout/layout-manager";

type LayoutTransitionTargetInput = LayoutTransitionTargets | null | undefined;

type LayoutTransitionOptionsInput = LayoutTransitionOptions | undefined;

const resolveAccessor = <T>(value: T | Accessor<T>): T => {
  return typeof value === "function" ? (value as Accessor<T>)() : value;
};

export const useLayoutTransition = (
  target?: LayoutTransitionTargetInput | Accessor<LayoutTransitionTargetInput>,
  options?:
    | LayoutTransitionOptionsInput
    | Accessor<LayoutTransitionOptionsInput>,
) => {
  const hasTarget = typeof target !== "undefined";

  return (update: () => void) => {
    const resolvedOptions = options ? resolveAccessor(options) : undefined;

    if (!hasTarget) {
      layoutTransition(update, resolvedOptions);
      return;
    }

    const resolvedTarget = resolveAccessor(
      target as
        | LayoutTransitionTargetInput
        | Accessor<LayoutTransitionTargetInput>,
    );
    if (resolvedTarget == null) {
      update();
      return;
    }

    layoutTransition(resolvedTarget, update, resolvedOptions);
  };
};
