import type { JSX } from "solid-js"
import { createMotionComponent } from "./createMotionComponent"
import { AnimatePresence, Presence, usePresence } from "./presence"
export type {
  MotionComponentProps,
  MotionKeyframes,
  MotionProps,
  MotionTarget,
  MotionTransition,
  Variants,
  ViewportOptions
} from "./types"

const componentCache = new Map<string, (props: MotionComponentProps<keyof JSX.IntrinsicElements>) => JSX.Element>()

function getMotionComponent(tag: string) {
  if (!componentCache.has(tag)) {
    componentCache.set(tag, createMotionComponent(tag as keyof JSX.IntrinsicElements))
  }
  return componentCache.get(tag)!
}

export const motion = new Proxy<Record<string, unknown>>({}, {
  get: (_, key: string) => {
    return getMotionComponent(key)
  }
})

export { createMotionComponent, Presence, AnimatePresence, usePresence }
