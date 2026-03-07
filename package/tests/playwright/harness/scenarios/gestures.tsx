import { createSignal } from "solid-js";
import { motion } from "../../../../src";
import type { ScenarioController, ScenarioProps } from "../types";

type DragMode = "free" | "x" | "locked";

export function GesturesScenario(props: ScenarioProps) {
  const [dragMode, setDragMode] = createSignal<DragMode>("free");

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "setDragMode":
          if (payload === "free" || payload === "x" || payload === "locked") {
            setDragMode(payload);
          }
          return;
        case "reset":
          setDragMode("free");
          return;
      }
    },
    getState() {
      return {
        dragMode: dragMode(),
      };
    },
  };

  props.registerController(controller);

  return (
    <div data-testid="scenario-gestures" class="harness-panel">
      <div class="harness-description">
        Drag gesture harness for free drag, axis locking, and fully disabled
        dragging.
      </div>

      <div data-testid="gestures-stage" class="harness-stage">
        <div
          style={{
            display: "flex",
            "justify-content": "space-between",
            "align-items": "center",
            "margin-bottom": "12px",
            gap: "12px",
          }}
        >
          <div
            style={{
              "font-size": "12px",
              "font-weight": "600",
              color: "rgb(71, 85, 105)",
              "text-transform": "uppercase",
              "letter-spacing": "0.08em",
            }}
          >
            mode: {dragMode()}
          </div>
        </div>

        <div
          data-testid="gesture-drag-area"
          style={{
            position: "relative",
            height: "280px",
            overflow: "hidden",
            border: "1px solid rgb(226, 232, 240)",
            "border-radius": "28px",
            background:
              "radial-gradient(circle at center, rgb(255, 255, 255) 0%, rgb(248, 250, 252) 60%, rgb(226, 232, 240) 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0px",
              background:
                "linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)",
              "background-size": "32px 32px",
            }}
          />

          <motion.div
            data-testid="gesture-drag-box"
            drag={
              dragMode() === "free" ? true : dragMode() === "x" ? "x" : false
            }
            dragConstraints={{ top: -96, right: 136, bottom: 96, left: -136 }}
            dragElastic={0}
            dragMomentum={false}
            whileDrag={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "88px",
              height: "88px",
              "margin-top": "-44px",
              "margin-left": "-44px",
              "border-radius": "24px",
              background:
                "linear-gradient(145deg, rgb(15, 23, 42) 0%, rgb(37, 99, 235) 58%, rgb(56, 189, 248) 100%)",
              "box-shadow": "0px 24px 60px -28px rgba(37, 99, 235, 0.55)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
