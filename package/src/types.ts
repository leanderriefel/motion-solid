import type { JSX } from "solid-js"

export type Numeric = number | string
export type ResolvedValues = Record<string, Numeric>

export type MotionKeyframes = ResolvedValues | ResolvedValues[]

export type Variants = Record<string, MotionKeyframes>

export type MotionTransition = {
  delay?: number
  duration?: number
  ease?: Numeric | Numeric[] | ((t: number) => number)
  repeat?: number
  repeatType?: "loop" | "reverse" | "mirror"
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse"
  onUpdate?: (latest: ResolvedValues) => void
}

export type ViewportAmount = number | "some" | "all"

export type ViewportOptions = {
  amount?: ViewportAmount
  root?: Element | null
  margin?: string
  once?: boolean
}

export interface AnimationPlaybackControls {
  stop?: () => void
  cancel?: () => void
  finished?: Promise<unknown>
}

export type MotionTarget = MotionKeyframes | string

export interface MotionProps {
  initial?: MotionTarget
  animate?: MotionTarget
  exit?: MotionTarget
  variants?: Variants
  transition?: MotionTransition
  whileHover?: MotionTarget
  whileTap?: MotionTarget
  whileInView?: MotionTarget
  viewport?: ViewportOptions
  onAnimationStart?: () => void
  onAnimationComplete?: () => void
  onUpdate?: (latest: ResolvedValues) => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
  onTapStart?: () => void
  onTapCancel?: () => void
  onTap?: () => void
  onViewportEnter?: () => void
  onViewportLeave?: () => void
}

export type RefCallback<T> = (value: T | null) => void
export type RefObject<T> = { value?: T | null }
export type ElementRef = HTMLElement | SVGElement

export type MotionComponentProps<T extends keyof JSX.IntrinsicElements> = MotionProps &
  JSX.IntrinsicElements[T] & { ref?: RefCallback<ElementRef> | RefObject<ElementRef> }
