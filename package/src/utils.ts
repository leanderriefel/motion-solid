import type { ElementRef, MotionKeyframes, MotionTarget, RefCallback, RefObject, ResolvedValues, Variants } from "./types"

export function applyRef(targetRef: RefCallback<ElementRef> | RefObject<ElementRef> | undefined, value: ElementRef | null) {
  if (!targetRef) return
  if (typeof targetRef === "function") {
    targetRef(value)
    return
  }
  targetRef.value = value
}

export function resolveVariant(target: MotionTarget | undefined, variants: Variants | undefined): MotionKeyframes | undefined {
  if (target === undefined) return undefined
  if (typeof target === "string") return variants?.[target]
  return target
}

export function pickFirstFrame(target: MotionKeyframes): ResolvedValues {
  if (Array.isArray(target)) return target[0] ?? {}
  return target
}

export function applyStyles(element: ElementRef, values: ResolvedValues) {
  const style = (element as HTMLElement).style
  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (typeof value === "number" && !Number.isFinite(value)) return
    style.setProperty(key, `${value}`)
  })
}
