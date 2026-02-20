import { AnimatePresence, motion } from "../../../../src";
import { Show, createSignal, onCleanup } from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

export function LayoutScenario(props: ScenarioProps) {
  const [expanded, setExpanded] = createSignal(false);
  const [showLayoutChild, setShowLayoutChild] = createSignal(true);
  const [sharedOnLeft, setSharedOnLeft] = createSignal(true);

  let rapidTimer: number | null = null;

  const clearRapidTimer = () => {
    if (rapidTimer !== null) {
      window.clearTimeout(rapidTimer);
      rapidTimer = null;
    }
  };

  const runSharedRapidSwap = (cycles: number, intervalMs: number) => {
    clearRapidTimer();

    let completed = 0;

    const step = () => {
      if (completed >= cycles) {
        rapidTimer = null;
        return;
      }

      setSharedOnLeft((prev) => !prev);
      completed += 1;
      rapidTimer = window.setTimeout(step, intervalMs);
    };

    step();
  };

  const runPositionRapidToggle = (cycles: number, intervalMs: number) => {
    clearRapidTimer();

    let completed = 0;

    const step = () => {
      if (completed >= cycles) {
        rapidTimer = null;
        return;
      }

      setExpanded((prev) => !prev);
      completed += 1;
      rapidTimer = window.setTimeout(step, intervalMs);
    };

    step();
  };

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "toggleExpanded":
          setExpanded((prev) => !prev);
          return;
        case "showLayoutChild":
          setShowLayoutChild(true);
          return;
        case "hideLayoutChild":
          setShowLayoutChild(false);
          return;
        case "toggleLayoutChild":
          setShowLayoutChild((prev) => !prev);
          return;
        case "toggleShared":
          setSharedOnLeft((prev) => !prev);
          return;
        case "setShared":
          if (typeof payload === "boolean") {
            setSharedOnLeft(payload);
          }
          return;
        case "rapidSharedSwap": {
          const config =
            payload && typeof payload === "object"
              ? (payload as { cycles?: number; intervalMs?: number })
              : null;

          runSharedRapidSwap(config?.cycles ?? 6, config?.intervalMs ?? 24);
          return;
        }
        case "rapidPositionToggle": {
          const config =
            payload && typeof payload === "object"
              ? (payload as { cycles?: number; intervalMs?: number })
              : null;

          runPositionRapidToggle(config?.cycles ?? 8, config?.intervalMs ?? 20);
          return;
        }
        case "reset":
          clearRapidTimer();
          setExpanded(false);
          setShowLayoutChild(true);
          setSharedOnLeft(true);
          return;
      }
    },
    getState() {
      return {
        expanded: expanded(),
        showLayoutChild: showLayoutChild(),
        sharedOnLeft: sharedOnLeft(),
      };
    },
  };

  props.registerController(controller);

  onCleanup(() => {
    clearRapidTimer();
  });

  return (
    <div data-testid="scenario-layout" class="harness-panel">
      <div class="harness-description">
        Layout, layoutId and exit coordination harness.
      </div>

      <section data-testid="layout-position-section" class="harness-stage">
        <div class="harness-subtitle">layout="position"</div>

        <motion.div
          data-testid="layout-position-parent"
          layout
          onLayoutAnimationStart={() => {
            props.log({ type: "layoutStart", node: "position-parent" });
          }}
          onLayoutAnimationComplete={() => {
            props.log({ type: "layoutComplete", node: "position-parent" });
          }}
          transition={{ duration: 0.25, ease: "linear" }}
          style={{
            width: expanded() ? "420px" : "260px",
            display: "flex",
            "justify-content": "space-between",
            "align-items": "center",
            gap: "8px",
            border: "1px solid rgb(148, 163, 184)",
            "border-radius": "10px",
            padding: "10px",
          }}
        >
          <motion.div
            data-testid="layout-position-child"
            layout="position"
            onLayoutAnimationStart={() => {
              props.log({ type: "layoutStart", node: "position-child" });
            }}
            onLayoutAnimationComplete={() => {
              props.log({ type: "layoutComplete", node: "position-child" });
            }}
            transition={{ duration: 0.25, ease: "linear" }}
            style={{
              width: expanded() ? "220px" : "120px",
              padding: "10px",
              "background-color": "rgb(224, 242, 254)",
              "border-radius": "8px",
            }}
          >
            Position Child
          </motion.div>

          <motion.div
            data-testid="layout-position-static"
            layout
            style={{
              width: "80px",
              height: "32px",
              "background-color": "rgb(226, 232, 240)",
              "border-radius": "8px",
            }}
          />
        </motion.div>
      </section>

      <section data-testid="layout-exit-section" class="harness-stage">
        <div class="harness-subtitle">Parent layout + child exit</div>

        <motion.div
          data-testid="layout-exit-parent"
          layout
          transition={{ duration: 0.22, ease: "linear" }}
          onLayoutAnimationStart={() => {
            props.log({ type: "layoutStart", node: "exit-parent" });
          }}
          onLayoutAnimationComplete={() => {
            props.log({ type: "layoutComplete", node: "exit-parent" });
          }}
          style={{
            display: "flex",
            gap: "10px",
            "align-items": "center",
            border: "1px solid rgb(148, 163, 184)",
            "border-radius": "10px",
            padding: "10px",
          }}
        >
          <AnimatePresence>
            <Show when={showLayoutChild()}>
              <motion.div
                data-testid="layout-exit-child"
                layout
                initial={{ opacity: 1, width: 100 }}
                animate={{ opacity: 1, width: 100 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.22, ease: "linear" }}
                style={{
                  overflow: "hidden",
                  "background-color": "rgb(253, 230, 138)",
                  "border-radius": "8px",
                  "white-space": "nowrap",
                }}
              >
                Layout Child
              </motion.div>
            </Show>
          </AnimatePresence>

          <motion.div
            data-testid="layout-exit-sibling"
            layout="position"
            style={{
              width: "90px",
              height: "30px",
              "background-color": "rgb(186, 230, 253)",
              "border-radius": "8px",
            }}
          />
        </motion.div>
      </section>

      <section data-testid="layout-shared-section" class="harness-stage">
        <div class="harness-subtitle">Shared layoutId handoff</div>

        <div
          data-testid="layout-shared-root"
          style={{
            display: "grid",
            "grid-template-columns": "1fr 1fr",
            gap: "14px",
          }}
        >
          <div
            data-testid="layout-shared-left-slot"
            style={{
              border: "1px dashed rgb(148, 163, 184)",
              "border-radius": "10px",
              padding: "8px",
              height: "82px",
            }}
          >
            <AnimatePresence>
              <Show when={sharedOnLeft()}>
                <motion.div
                  data-testid="layout-shared-left"
                  layout
                  layoutId="shared-layout-pill"
                  transition={{ duration: 0.24, ease: "linear" }}
                  onLayoutAnimationStart={() => {
                    props.log({ type: "layoutStart", node: "shared-left" });
                  }}
                  onLayoutAnimationComplete={() => {
                    props.log({
                      type: "layoutComplete",
                      node: "shared-left",
                    });
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    "background-color": "rgb(167, 243, 208)",
                    "border-radius": "10px",
                  }}
                />
              </Show>
            </AnimatePresence>
          </div>

          <div
            data-testid="layout-shared-right-slot"
            style={{
              border: "1px dashed rgb(148, 163, 184)",
              "border-radius": "10px",
              padding: "8px",
              height: "82px",
            }}
          >
            <AnimatePresence>
              <Show when={!sharedOnLeft()}>
                <motion.div
                  data-testid="layout-shared-right"
                  layout
                  layoutId="shared-layout-pill"
                  transition={{ duration: 0.24, ease: "linear" }}
                  onLayoutAnimationStart={() => {
                    props.log({ type: "layoutStart", node: "shared-right" });
                  }}
                  onLayoutAnimationComplete={() => {
                    props.log({
                      type: "layoutComplete",
                      node: "shared-right",
                    });
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    "background-color": "rgb(191, 219, 254)",
                    "border-radius": "10px",
                  }}
                />
              </Show>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
