import { AnimatePresence, motion } from "../../../../src";
import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

type TransitionVariant = "none" | "single" | "multiple" | "variant";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseDuration = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, 0, 1.5);
};

const extractTarget = (target: unknown) => {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return target;
  }

  const source = target as Record<string, unknown>;
  const summary: Record<string, unknown> = {};

  for (const key of [
    "opacity",
    "x",
    "y",
    "scale",
    "display",
    "visibility",
    "backgroundColor",
    "borderColor",
  ]) {
    if (source[key] !== undefined) summary[key] = source[key];
  }

  if (source.transitionEnd !== undefined) {
    summary.transitionEnd = source.transitionEnd;
  }

  return summary;
};

export function CallbacksScenario(props: ScenarioProps) {
  const [isVisible, setIsVisible] = createSignal(true);
  const [opacity, setOpacity] = createSignal(1);
  const [duration, setDuration] = createSignal(
    parseDuration(props.options().duration, 0.2),
  );
  const [transitionVariant, setTransitionVariant] =
    createSignal<TransitionVariant>("none");
  const [itemKey, setItemKey] = createSignal(0);

  let element: HTMLDivElement | undefined;
  let rapidTimer: number | null = null;

  const animateTarget = createMemo(() => {
    const base = {
      opacity: opacity(),
      x: 0,
    };

    const variant = transitionVariant();

    if (variant === "single") {
      return {
        ...base,
        transitionEnd: {
          "border-color": "rgb(255, 0, 0)",
        },
      };
    }

    if (variant === "multiple") {
      return {
        ...base,
        transitionEnd: {
          "border-color": "rgb(255, 0, 0)",
          "background-color": "rgb(0, 128, 0)",
        },
      };
    }

    if (variant === "variant") {
      return "visible";
    }

    return base;
  });

  const variants = {
    hidden: { opacity: 0, x: -28 },
    visible: {
      opacity: opacity(),
      x: 0,
      transitionEnd: {
        "border-color": "rgb(255, 0, 0)",
        "background-color": "rgb(0, 128, 0)",
      },
    },
  } as const;

  const clearRapidTimer = () => {
    if (rapidTimer !== null) {
      window.clearTimeout(rapidTimer);
      rapidTimer = null;
    }
  };

  const runRapidTargetSequence = (values: number[], stepMs: number) => {
    clearRapidTimer();

    let index = 0;

    const next = () => {
      if (index >= values.length) {
        rapidTimer = null;
        return;
      }

      setOpacity(values[index] ?? 1);
      index += 1;
      rapidTimer = window.setTimeout(next, stepMs);
    };

    next();
  };

  const applyDuration = (value: unknown) => {
    if (typeof value === "number") {
      setDuration(clamp(value, 0, 1.5));
      return;
    }

    if (typeof value === "string") {
      setDuration(parseDuration(value, duration()));
    }
  };

  const applyTransitionVariant = (value: unknown) => {
    if (
      value === "none" ||
      value === "single" ||
      value === "multiple" ||
      value === "variant"
    ) {
      setTransitionVariant(value);
    }
  };

  createEffect(() => {
    const configDuration = props.options().duration;
    if (!configDuration) return;
    setDuration(parseDuration(configDuration, duration()));
  });

  createEffect(() => {
    const configVariant = props.options().transition;
    if (!configVariant) return;
    applyTransitionVariant(configVariant);
  });

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "show":
          setIsVisible(true);
          return;
        case "hide":
          setIsVisible(false);
          return;
        case "toggle":
          setIsVisible((prev) => !prev);
          return;
        case "replace":
          setItemKey((prev) => prev + 1);
          setIsVisible(true);
          return;
        case "setOpacity":
          if (typeof payload === "number") {
            setOpacity(clamp(payload, 0, 1));
          }
          return;
        case "setDuration":
          applyDuration(payload);
          return;
        case "setTransitionVariant":
          applyTransitionVariant(payload);
          return;
        case "setZeroDuration":
          setDuration(0);
          return;
        case "runRapidTargets": {
          const values =
            Array.isArray(payload) &&
            payload.every((item) => typeof item === "number")
              ? (payload as number[])
              : [0.2, 0.75, 0.35, 1];

          runRapidTargetSequence(values, 35);
          return;
        }
        case "reset":
          clearRapidTimer();
          setIsVisible(true);
          setOpacity(1);
          setDuration(parseDuration(props.options().duration, 0.2));
          setTransitionVariant("none");
          return;
      }
    },
    getState() {
      return {
        isVisible: isVisible(),
        opacity: opacity(),
        duration: duration(),
        transitionVariant: transitionVariant(),
        itemKey: itemKey(),
        isMountedInDom: Boolean(element?.isConnected),
      };
    },
  };

  props.registerController(controller);

  onCleanup(() => {
    clearRapidTimer();
  });

  return (
    <div data-testid="scenario-callbacks" class="harness-panel">
      <div class="harness-description">
        Enter/exit callback harness for browser assertions.
      </div>

      <div data-testid="callbacks-stage" class="harness-stage">
        <AnimatePresence
          onExitComplete={() => {
            props.log({ type: "exitComplete", node: "callbacks" });
          }}
        >
          <Show when={isVisible()}>
            <motion.div
              data-testid="callbacks-item"
              ref={element}
              initial={
                transitionVariant() === "variant"
                  ? "hidden"
                  : { opacity: 0, x: -28 }
              }
              animate={animateTarget()}
              exit={{ opacity: 0, x: 28 }}
              variants={variants}
              transition={{ duration: duration(), ease: "linear" }}
              onAnimationStart={(target: unknown) => {
                props.log({
                  type: "animationStart",
                  node: `callbacks-item-${itemKey()}`,
                  payload: extractTarget(target),
                });
              }}
              onAnimationComplete={(target: unknown) => {
                props.log({
                  type: "animationComplete",
                  node: `callbacks-item-${itemKey()}`,
                  payload: extractTarget(target),
                });
              }}
              style={{
                width: "120px",
                height: "48px",
                "border-width": "2px",
                "border-style": "solid",
                "border-color": "rgb(0, 0, 0)",
                "background-color": "rgb(240, 240, 240)",
                "border-radius": "10px",
              }}
            />
          </Show>
        </AnimatePresence>
      </div>
    </div>
  );
}
