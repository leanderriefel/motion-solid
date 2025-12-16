declare module "motion" {
  import type { AnimationPlaybackControls, MotionKeyframes, MotionTransition, ResolvedValues, ViewportOptions } from "./types"

  export function animate(
    element: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | MotionKeyframes,
    options?: MotionTransition & { onUpdate?: (latest: ResolvedValues) => void }
  ): AnimationPlaybackControls

  export function inView(target: Element, enter: () => void, options?: ViewportOptions): (() => void) | undefined
}
