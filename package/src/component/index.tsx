import type { Component } from "solid-js";
import type { ElementTag, HTMLElements, SVGElements } from "../types";
import {
  createMotionComponent,
  type MotionProps,
} from "./create-motion-component.tsx";

export {
  createMotionComponent,
  type MotionProps,
} from "./create-motion-component.tsx";
export { MotionStateContext, useMotionState } from "./context";
export {
  MotionConfig,
  MotionConfigContext,
  useMotionConfig,
  type MotionConfigContextValue,
  type MotionConfigProps,
  type ReducedMotionConfig,
} from "./motion-config.tsx";
export { motionKeys } from "./motion-keys";
export {
  AnimatePresence,
  PresenceContext,
  useIsPresent,
  usePresence,
  usePresenceData,
  type AnimatePresenceProps,
  type PresenceContextValue,
} from "./presence.tsx";

/**
 * Cache of created motion components to avoid recreating them
 */
const componentCache = new Map<string, Component<MotionProps<ElementTag>>>();

/**
 * Get or create a motion component for the given tag
 */
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

/**
 * Type for the motion proxy object
 * Provides motion.div, motion.span, etc. syntax
 */
export type MotionProxy = {
  [Tag in keyof HTMLElements]: Component<MotionProps<Tag>>;
} & {
  [Tag in keyof SVGElements]: Component<MotionProps<Tag>>;
};

/**
 * The motion proxy object that provides motion.div, motion.span, etc.
 *
 * @example
 * ```tsx
 * import { motion } from "motion-solid";
 *
 * function App() {
 *   return (
 *     <motion.div
 *       initial={{ opacity: 0 }}
 *       animate={{ opacity: 1 }}
 *     >
 *       Hello World
 *     </motion.div>
 *   );
 * }
 * ```
 */
export const motion = new Proxy({} as MotionProxy, {
  get: (
    _target: MotionProxy,
    tag: string,
  ): Component<MotionProps<ElementTag>> => {
    return getMotionComponent(tag as ElementTag);
  },
});
