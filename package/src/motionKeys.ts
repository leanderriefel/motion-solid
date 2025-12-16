export const motionPropNames = [
  "initial",
  "animate",
  "exit",
  "variants",
  "transition",
  "whileHover",
  "whileTap",
  "whileInView",
  "viewport",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onHoverStart",
  "onHoverEnd",
  "onTapStart",
  "onTapCancel",
  "onTap",
  "onViewportEnter",
  "onViewportLeave"
] as const

type MotionPropName = (typeof motionPropNames)[number]

export const motionPropSet = new Set<string>(motionPropNames)

export function isMotionProp(key: string): key is MotionPropName {
  return motionPropSet.has(key)
}
