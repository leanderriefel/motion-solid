import type { Component } from "solid-js";
import type { ElementTag, HTMLElements, SVGElements } from "../types";
import {
  createMotionComponent,
  type MotionComponentOptions,
  type MotionProps,
} from "./create-motion-component";

export {
  createMotionComponent,
  type MotionComponentOptions,
  type MotionProps,
} from "./create-motion-component";
export {
  MotionConfig,
  MotionConfigContext,
  useMotionConfig,
  type MotionConfigContextValue,
  type MotionConfigProps,
  type ReducedMotionConfig,
} from "./motion-config";
export { motionKeys } from "./motion-keys";
export {
  AnimatePresence,
  PresenceContext,
  useIsPresent,
  usePresence,
  usePresenceContext,
  usePresenceData,
  type AnimatePresenceMode,
  type AnimatePresenceProps,
  type PresenceContextValue,
} from "./presence";
export { LayoutGroup, type LayoutGroupProps } from "./layout-group";
export { useInstantLayoutTransition, useResetProjection } from "./layout-hooks";
export { MotionContext, useMotionContext } from "./motion-context";

const componentCache = new Map<string, Component<MotionProps<ElementTag>>>();

const getMotionComponent = <Tag extends ElementTag>(
  tag: Tag,
): Component<MotionProps<Tag>> => {
  const cached = componentCache.get(tag);
  if (cached) {
    return cached as Component<MotionProps<Tag>>;
  }

  const component = createMotionComponent(tag);
  componentCache.set(tag, component as Component<MotionProps<ElementTag>>);
  return component;
};

export type MotionProxy = {
  [Tag in keyof HTMLElements]: Component<MotionProps<Tag>>;
} & {
  [Tag in keyof SVGElements]: Component<MotionProps<Tag>>;
} & {
  create<Props extends Record<string, unknown>>(
    component: Component<Props>,
    options?: MotionComponentOptions,
  ): Component<Props & MotionProps<ElementTag>>;
};

export const motion = new Proxy(
  {
    create<Props extends Record<string, unknown>>(
      component: Component<Props>,
      options?: MotionComponentOptions,
    ) {
      return createMotionComponent(
        component as unknown as Component<Record<string, unknown>>,
        options,
      ) as unknown as Component<Props & MotionProps<ElementTag>>;
    },
  } as MotionProxy,
  {
    get(target, key: string) {
      if (key === "create") {
        return target.create;
      }

      return getMotionComponent(key as ElementTag);
    },
  },
);
