import { setFeatureDefinitions } from "motion-dom";
import { AnimationFeature } from "../features/animation-feature";
import { DragFeature } from "../features/drag-feature";
import { FocusFeature } from "../features/focus-feature";
import { HoverFeature } from "../features/hover-feature";
import { InViewFeature } from "../features/inview-feature";
import { PanFeature } from "../features/pan-feature";
import { PressFeature } from "../features/press-feature";

const featureProps = {
  animation: [
    "animate",
    "variants",
    "whileHover",
    "whileTap",
    "exit",
    "whileInView",
    "whileFocus",
    "whileDrag",
  ],
  drag: ["drag", "dragControls"],
  hover: ["whileHover", "onHoverStart", "onHoverEnd"],
  tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
  pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
  inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
  focus: ["whileFocus"],
  layout: ["layout", "layoutId"],
} as const;

let initialized = false;

const hasFeatureProp = (
  props: Record<string, unknown>,
  keys: readonly string[],
) => keys.some((name) => Boolean(props[name]));

export const initFeatureDefinitions = () => {
  if (initialized) return;

  setFeatureDefinitions({
    animation: {
      Feature: AnimationFeature as never,
      isEnabled: (props) =>
        hasFeatureProp(
          props as Record<string, unknown>,
          featureProps.animation,
        ),
    },
    drag: {
      Feature: DragFeature as never,
      isEnabled: (props) =>
        hasFeatureProp(props as Record<string, unknown>, featureProps.drag),
    },
    hover: {
      Feature: HoverFeature as never,
      isEnabled: (props) =>
        hasFeatureProp(props as Record<string, unknown>, featureProps.hover),
    },
    tap: {
      Feature: PressFeature as never,
      isEnabled: (props) =>
        hasFeatureProp(props as Record<string, unknown>, featureProps.tap),
    },
    pan: {
      Feature: PanFeature as never,
      isEnabled: (props) =>
        hasFeatureProp(props as Record<string, unknown>, featureProps.pan),
    },
    inView: {
      Feature: InViewFeature as never,
      isEnabled: (props) =>
        hasFeatureProp(props as Record<string, unknown>, featureProps.inView),
    },
    focus: {
      Feature: FocusFeature as never,
      isEnabled: (props) =>
        hasFeatureProp(props as Record<string, unknown>, featureProps.focus),
    },
    layout: {
      isEnabled: (props) =>
        hasFeatureProp(props as Record<string, unknown>, featureProps.layout),
    },
  } as Parameters<typeof setFeatureDefinitions>[0]);

  initialized = true;
};
