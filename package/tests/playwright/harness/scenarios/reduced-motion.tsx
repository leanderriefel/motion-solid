import { AnimatePresence, MotionConfig, motion } from "../../../../src";
import { Show, createSignal } from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

type ReducedMode = "always" | "never" | "user";

export function ReducedMotionScenario(props: ScenarioProps) {
  const [mode, setMode] = createSignal<ReducedMode>("never");
  const [visible, setVisible] = createSignal(true);
  const [duration, setDuration] = createSignal(0.28);

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "setReducedMotion":
          if (
            payload === "always" ||
            payload === "never" ||
            payload === "user"
          ) {
            setMode(payload);
          }
          return;
        case "setDuration":
          if (typeof payload === "number") {
            setDuration(Math.max(0, Math.min(1.5, payload)));
          }
          return;
        case "show":
          setVisible(true);
          return;
        case "hide":
          setVisible(false);
          return;
        case "toggle":
          setVisible((prev) => !prev);
          return;
        case "reset":
          setMode("never");
          setVisible(true);
          setDuration(0.28);
          return;
      }
    },
    getState() {
      return {
        mode: mode(),
        visible: visible(),
        duration: duration(),
      };
    },
  };

  props.registerController(controller);

  return (
    <div data-testid="scenario-reduced-motion" class="harness-panel">
      <div class="harness-description">
        Reduced-motion lifecycle and timing harness.
      </div>

      <MotionConfig reducedMotion={mode()}>
        <div data-testid="reduced-motion-stage" class="harness-stage">
          <AnimatePresence
            onExitComplete={() => {
              props.log({ type: "exitComplete", node: "reduced-motion" });
            }}
          >
            <Show when={visible()}>
              <motion.div
                data-testid="reduced-motion-item"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: duration(), ease: "linear" }}
                onAnimationStart={(target: unknown) => {
                  props.log({
                    type: "animationStart",
                    node: "reduced-motion-item",
                    payload: {
                      mode: mode(),
                      target,
                    },
                  });
                }}
                onAnimationComplete={(target: unknown) => {
                  props.log({
                    type: "animationComplete",
                    node: "reduced-motion-item",
                    payload: {
                      mode: mode(),
                      target,
                    },
                  });
                }}
                style={{
                  width: "160px",
                  height: "56px",
                  "border-radius": "12px",
                  "background-color": "rgb(147, 197, 253)",
                }}
              />
            </Show>
          </AnimatePresence>
        </div>
      </MotionConfig>
    </div>
  );
}
