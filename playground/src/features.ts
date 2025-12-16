export type FeatureStatus = "supported" | "planned"

export type Feature = {
  id: string
  label: string
  status: FeatureStatus
  demoRoute?: string
}

export type FeatureGroup = {
  id: string
  label: string
  features: Feature[]
}

const supported = (id: string, label: string, demoRoute?: string): Feature => ({
  id,
  label,
  status: "supported",
  demoRoute,
})

const planned = (id: string, label: string): Feature => ({
  id,
  label,
  status: "planned",
})

export const featureGroups: FeatureGroup[] = [
  {
    id: "motion-components",
    label: "motion components",
    features: [
      supported("initial", "initial", "basics"),
      supported("animate", "animate", "basics"),
      supported("exit", "exit", "presence"),
      supported("transition", "transition", "basics"),
      supported("variants", "variants", "variants"),
      supported("style", "style", "style"),
      supported("onUpdate", "onUpdate", "events"),
      supported("onAnimationStart", "onAnimationStart", "events"),
      supported("onAnimationComplete", "onAnimationComplete", "events"),
      supported("whileHover", "whileHover", "hover-tap"),
      supported("onHoverStart", "onHoverStart", "hover-tap"),
      supported("onHoverEnd", "onHoverEnd", "hover-tap"),
      supported("whileTap", "whileTap", "hover-tap"),
      supported("onTapStart", "onTapStart", "hover-tap"),
      supported("onTap", "onTap", "hover-tap"),
      supported("onTapCancel", "onTapCancel", "hover-tap"),
      planned("whileFocus", "whileFocus"),
      planned("onPan", "onPan"),
      planned("onPanStart", "onPanStart"),
      planned("drag", "drag"),
      planned("whileDrag", "whileDrag"),
      planned("dragConstraints", "dragConstraints"),
      planned("dragSnapToOrigin", "dragSnapToOrigin"),
      planned("dragElastic", "dragElastic"),
      planned("dragMomentum", "dragMomentum"),
      planned("dragTransition", "dragTransition"),
      planned("dragDirectionLock", "dragDirectionLock"),
      planned("dragPropagation", "dragPropagation"),
      planned("dragControls", "dragControls"),
      planned("dragListener", "dragListener"),
      planned("onDrag", "onDrag"),
      planned("onDragStart", "onDragStart"),
      planned("onDragEnd", "onDragEnd"),
      planned("onDirectionLock", "onDirectionLock"),
      supported("whileInView", "whileInView", "in-view"),
      supported("viewport", "viewport", "in-view"),
      supported("onViewportEnter", "onViewportEnter", "in-view"),
      supported("onViewportLeave", "onViewportLeave", "in-view"),
      planned("layout", "layout"),
      planned("layoutId", "layoutId"),
      planned("layoutDependency", "layoutDependency"),
      planned("layoutScroll", "layoutScroll"),
      planned("layoutRoot", "layoutRoot"),
      planned("onLayoutAnimationStart", "onLayoutAnimationStart"),
      planned("onLayoutAnimationComplete", "onLayoutAnimationComplete"),
      supported("inherit", "inherit", "variants"),
      supported("custom", "custom", "variants"),
      planned("transformTemplate", "transformTemplate"),
      planned("tbd", "(unspecified)"),
    ],
  },
  {
    id: "presence",
    label: "presence",
    features: [
      supported("presence", "Presence / AnimatePresence", "presence"),
      planned("animated-show", "animated show component"),
      planned("animated-for", "animated for component"),
      planned("animated-switch", "animated switch component"),
    ],
  },
  { id: "layout-group", label: "layout group", features: [planned("layout-group", "layout group")] },
  { id: "motion-config", label: "motion config", features: [planned("motion-config", "motion config")] },
  {
    id: "hooks",
    label: "hooks",
    features: [
      planned("use-scroll", "use scroll"),
      planned("use-spring", "use spring"),
      planned("use-time", "use time"),
      planned("use-transform", "use transform"),
      planned("use-velocity", "use velocity"),
      planned("use-animate", "use animate"),
      planned("use-animation-frame", "use animation frame"),
      planned("use-drag-controls", "use drag controls"),
      planned("use-in-view", "use in view"),
      planned("use-page-in-view", "use page in view"),
      planned("use-reduced-motion", "use reduced motion"),
    ],
  },
]

