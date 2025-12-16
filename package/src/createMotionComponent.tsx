import { Dynamic } from "solid-js/web"
import { createEffect, createMemo, createSignal, onCleanup, onMount, splitProps } from "solid-js"
import { animate, inView } from "motion"
import { motionPropNames } from "./motionKeys"
import { usePresence } from "./presence"
import { applyRef, applyStyles, pickFirstFrame, resolveVariant } from "./utils"
import type {
  AnimationPlaybackControls,
  ElementRef,
  MotionComponentProps,
  MotionKeyframes,
  MotionProps,
  MotionTarget,
  MotionTransition,
  ResolvedValues
} from "./types"

function stopAnimation(controls: AnimationPlaybackControls | undefined) {
  controls?.stop?.()
  controls?.cancel?.()
}

function startAnimation(element: ElementRef, target: MotionKeyframes, transition: MotionTransition | undefined, onUpdate?: (latest: ResolvedValues) => void) {
  return animate(element as unknown as Element, target as unknown as Keyframe[] | PropertyIndexedKeyframes, {
    ...transition,
    onUpdate
  }) as unknown as AnimationPlaybackControls
}

function setupHover(
  element: ElementRef,
  motionProps: MotionProps,
  setHovering: (value: boolean) => void
) {
  const handleEnter = () => {
    setHovering(true)
    motionProps.onHoverStart?.()
  }

  const handleLeave = () => {
    setHovering(false)
    motionProps.onHoverEnd?.()
  }

  element.addEventListener("pointerenter", handleEnter)
  element.addEventListener("pointerleave", handleLeave)

  return () => {
    element.removeEventListener("pointerenter", handleEnter)
    element.removeEventListener("pointerleave", handleLeave)
  }
}

function setupPress(
  element: ElementRef,
  motionProps: MotionProps,
  setPressing: (value: boolean) => void
) {
  const handleDown = () => {
    setPressing(true)
    motionProps.onTapStart?.()
  }

  const handleUp = () => {
    setPressing(false)
    motionProps.onTap?.()
  }

  const handleCancel = () => {
    setPressing(false)
    motionProps.onTapCancel?.()
  }

  element.addEventListener("pointerdown", handleDown)
  element.addEventListener("pointerup", handleUp)
  element.addEventListener("pointercancel", handleCancel)
  element.addEventListener("pointerleave", handleCancel)

  return () => {
    element.removeEventListener("pointerdown", handleDown)
    element.removeEventListener("pointerup", handleUp)
    element.removeEventListener("pointercancel", handleCancel)
    element.removeEventListener("pointerleave", handleCancel)
  }
}

function setupInView(
  element: ElementRef,
  motionProps: MotionProps,
  setInView: (value: boolean) => void
) {
  if (!motionProps.whileInView && !motionProps.onViewportEnter && !motionProps.onViewportLeave) return undefined

  const stop = inView(element as unknown as Element, () => {
    setInView(true)
    motionProps.onViewportEnter?.()
  }, {
    root: motionProps.viewport?.root,
    margin: motionProps.viewport?.margin,
    amount: motionProps.viewport?.amount,
    once: motionProps.viewport?.once
  })

  const leaveObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        setInView(false)
        motionProps.onViewportLeave?.()
      }
    })
  }, {
    root: motionProps.viewport?.root ?? undefined,
    rootMargin: motionProps.viewport?.margin,
    threshold: motionProps.viewport?.amount === "all" ? 1 : motionProps.viewport?.amount === "some" ? 0 : motionProps.viewport?.amount
  })

  leaveObserver.observe(element as unknown as Element)

  return () => {
    stop?.()
    leaveObserver.disconnect()
  }
}

function resolveTarget(target: MotionTarget | undefined, variants: MotionProps["variants"]): MotionKeyframes | undefined {
  return resolveVariant(target, variants)
}

export function createMotionComponent<T extends keyof JSX.IntrinsicElements>(tag: T) {
  const MotionComponent = (props: MotionComponentProps<T>) => {
    const [motionProps, localProps] = splitProps(props, motionPropNames)
    const presence = usePresence()

    let element: ElementRef | null = null
    let controls: AnimationPlaybackControls | undefined
    let cleanupHover: (() => void) | undefined
    let cleanupPress: (() => void) | undefined
    let cleanupInView: (() => void) | undefined
    let unregister: (() => void) | undefined

    const [isHovering, setIsHovering] = createSignal(false)
    const [isPressing, setIsPressing] = createSignal(false)
    const [isInView, setIsInView] = createSignal(false)

    const variants = () => motionProps.variants

    const resolvedInitial = () => resolveTarget(motionProps.initial, variants())
    const resolvedAnimate = () => resolveTarget(motionProps.animate, variants())
    const resolvedExit = () => resolveTarget(motionProps.exit, variants())
    const resolvedHover = () => resolveTarget(motionProps.whileHover, variants())
    const resolvedTap = () => resolveTarget(motionProps.whileTap, variants())
    const resolvedInView = () => resolveTarget(motionProps.whileInView, variants())

    const activeTarget = createMemo(() => {
      const present = presence?.isPresent() ?? true
      if (!present && resolvedExit()) return resolvedExit()
      if (isPressing() && resolvedTap()) return resolvedTap()
      if (isHovering() && resolvedHover()) return resolvedHover()
      if (isInView() && resolvedInView()) return resolvedInView()
      return resolvedAnimate() ?? resolvedInitial()
    })

    const applyInitial = () => {
      if (!element) return
      const target = resolvedInitial()
      if (!target) return
      applyStyles(element, pickFirstFrame(target))
    }

    const exitComplete = () => {
      presence?.onExitComplete?.(exitComplete)
    }

    const setRef = (value: ElementRef | null) => {
      element = value
      applyRef(localProps.ref, value)
    }

    onMount(() => {
      applyInitial()
      if (!element) return
      if (presence) unregister = presence.register(exitComplete)
      if (motionProps.whileHover || motionProps.onHoverStart || motionProps.onHoverEnd) {
        cleanupHover = setupHover(element, motionProps, setIsHovering)
      }
      if (motionProps.whileTap || motionProps.onTap || motionProps.onTapStart || motionProps.onTapCancel) {
        cleanupPress = setupPress(element, motionProps, setIsPressing)
      }
      if (motionProps.whileInView || motionProps.onViewportEnter || motionProps.onViewportLeave) {
        cleanupInView = setupInView(element, motionProps, setIsInView)
      }
    })

    onCleanup(() => {
      stopAnimation(controls)
      cleanupHover?.()
      cleanupPress?.()
      cleanupInView?.()
      unregister?.()
    })

    createEffect(() => {
      const target = activeTarget()
      const current = element
      if (!current || !target) return

      stopAnimation(controls)
      motionProps.onAnimationStart?.()
      controls = startAnimation(current, target, motionProps.transition, motionProps.onUpdate)
      controls?.finished?.then(() => {
        motionProps.onAnimationComplete?.()
        if (!(presence?.isPresent() ?? true) && resolvedExit()) {
          exitComplete()
        }
      }).catch(() => {})
    })

    return <Dynamic component={tag as string} {...localProps} ref={setRef} />
  }

  return MotionComponent
}
