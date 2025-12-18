import type { Component, ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { createDynamic } from "solid-js/web";
import { createStore } from "solid-js/store";
import { mergeRefs } from "@solid-primitives/refs";
import type {
  ElementInstance,
  ElementTag,
  MotionElement,
  MotionOptions,
} from "../types";
import { createMotionState } from "../state";
import { useAnimationState } from "../animation";
import { useGestures, useDragGesture } from "../gestures";
import { MotionStateContext, useMotionState } from "./context";
import { useMotionConfig } from "./motion-config";
import { motionKeys } from "./motion-keys";
import { usePresenceContext } from "./presence";

export type MotionProps<Tag extends ElementTag> = ComponentProps<Tag> &
  MotionOptions & {
    key?: string | number;
  };

export const createMotionComponent = <Tag extends ElementTag = "div">(
  tag: Tag,
): Component<MotionProps<Tag>> => {
  return (props) => {
    const context = useMotionState();
    const parent = context ? context[0] : null;
    const presence = usePresenceContext();
    const motionConfig = useMotionConfig();
    const [local, motionOptions, elementProps] = splitProps(
      props,
      ["ref"],
      motionKeys,
    );

    const resolvedMotionOptions = mergeProps(motionOptions, {
      get transition() {
        return motionOptions.transition ?? motionConfig?.transition();
      },
      get initial() {
        if (presence && !presence.initial()) return false;
        return motionOptions.initial;
      },
      get custom() {
        if (motionOptions.custom !== undefined) return motionOptions.custom;
        return presence?.custom();
      },
    });

    const [state, setState] = createStore(
      createMotionState({
        options: resolvedMotionOptions,
        parent,
      }),
    );

    useAnimationState({
      state,
      setState,
      options: resolvedMotionOptions,
      presence,
    });
    useGestures({ state, setState, options: resolvedMotionOptions });
    useDragGesture({ state, setState, options: resolvedMotionOptions });

    const ref = mergeRefs<ElementInstance<Tag> & MotionElement>(
      local.ref as ElementInstance<Tag> & MotionElement,
      (el) => {
        setState("element", el);
      },
    );

    return (
      <MotionStateContext.Provider value={[state, setState]}>
        {createDynamic(() => tag, {
          ...(elementProps as ComponentProps<Tag>),
          ref,
        })}
      </MotionStateContext.Provider>
    );
  };
};
