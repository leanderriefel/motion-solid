const validMotionProps = new Set([
  "animate",
  "exit",
  "variants",
  "initial",
  "style",
  "values",
  "transition",
  "transformTemplate",
  "custom",
  "inherit",
  "layoutDependency",
  "onBeforeLayoutMeasure",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onDragStart",
  "onDrag",
  "onDragEnd",
  "onMeasureDragConstraints",
  "onDirectionLock",
  "onDragTransitionEnd",
  "_dragX",
  "_dragY",
  "onHoverStart",
  "onHoverEnd",
  "onViewportEnter",
  "onViewportLeave",
  "globalTapTarget",
  "ignoreStrict",
  "viewport",
  "data-framer-portal-id",
]);

export const isValidMotionProp = (key: string) => {
  return (
    key.startsWith("while") ||
    (key.startsWith("drag") && key !== "draggable") ||
    key.startsWith("layout") ||
    key.startsWith("onTap") ||
    key.startsWith("onPan") ||
    key.startsWith("onLayout") ||
    validMotionProps.has(key)
  );
};
