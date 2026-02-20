import { motion } from "../../../../src";
import { For, Show, createSignal } from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

export function ViewportOrchestrationScenario(props: ScenarioProps) {
  const [isOrchestrationActive, setIsOrchestrationActive] = createSignal(false);
  const [childCount, setChildCount] = createSignal(3);
  const [runAfterChildrenEmpty, setRunAfterChildrenEmpty] = createSignal(false);
  const [viewportMounted, setViewportMounted] = createSignal(true);

  let resetTimer: number | null = null;

  const clearResetTimer = () => {
    if (resetTimer !== null) {
      window.clearTimeout(resetTimer);
      resetTimer = null;
    }
  };

  const restartAfterChildren = () => {
    setRunAfterChildrenEmpty(false);
    clearResetTimer();

    resetTimer = window.setTimeout(() => {
      setRunAfterChildrenEmpty(true);
      resetTimer = null;
    }, 0);
  };

  const resetViewport = () => {
    setViewportMounted(false);
    clearResetTimer();

    resetTimer = window.setTimeout(() => {
      setViewportMounted(true);
      resetTimer = null;
    }, 0);
  };

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "startOrchestration":
          setIsOrchestrationActive(true);
          return;
        case "resetOrchestration":
          setIsOrchestrationActive(false);
          return;
        case "setChildCount":
          if (typeof payload === "number") {
            setChildCount(Math.max(0, Math.min(8, Math.floor(payload))));
          }
          return;
        case "runAfterChildrenEmpty":
          restartAfterChildren();
          return;
        case "resetViewport":
          resetViewport();
          return;
        case "reset":
          clearResetTimer();
          setIsOrchestrationActive(false);
          setChildCount(3);
          setRunAfterChildrenEmpty(false);
          setViewportMounted(true);
          return;
      }
    },
    getState() {
      return {
        isOrchestrationActive: isOrchestrationActive(),
        childCount: childCount(),
        runAfterChildrenEmpty: runAfterChildrenEmpty(),
        viewportMounted: viewportMounted(),
      };
    },
  };

  props.registerController(controller);

  return (
    <div data-testid="scenario-viewport-orchestration" class="harness-panel">
      <div class="harness-description">
        Viewport/observer and orchestration timing harness.
      </div>

      <section data-testid="orchestration-section" class="harness-stage">
        <div class="harness-subtitle">delayChildren + staggerChildren</div>

        <motion.div
          data-testid="orchestration-parent"
          initial="hidden"
          animate={isOrchestrationActive() ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0.2 },
            visible: {
              opacity: 1,
              transition: {
                duration: 0.12,
                delayChildren: 0.08,
                staggerChildren: 0.06,
              },
            },
          }}
          onAnimationStart={() => {
            props.log({ type: "orchestrationParentStart", node: "parent" });
          }}
          onAnimationComplete={() => {
            props.log({
              type: "orchestrationParentComplete",
              node: "parent",
            });
          }}
          style={{
            display: "flex",
            gap: "8px",
            "align-items": "center",
            "min-height": "40px",
          }}
        >
          <For each={Array.from({ length: childCount() }, (_, index) => index)}>
            {(index) => (
              <motion.div
                data-testid={`orchestration-child-${index}`}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.1, ease: "linear" }}
                onAnimationStart={() => {
                  props.log({
                    type: "orchestrationChildStart",
                    node: `child-${index}`,
                  });
                }}
                onAnimationComplete={() => {
                  props.log({
                    type: "orchestrationChildComplete",
                    node: `child-${index}`,
                  });
                }}
                style={{
                  width: "22px",
                  height: "22px",
                  "border-radius": "9999px",
                  "background-color": "rgb(59, 130, 246)",
                }}
              />
            )}
          </For>
        </motion.div>
      </section>

      <section data-testid="after-children-empty-section" class="harness-stage">
        <div class="harness-subtitle">
          when="afterChildren" with no children
        </div>

        <motion.div
          data-testid="after-children-empty"
          initial="hidden"
          animate={runAfterChildrenEmpty() ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0.2 },
            visible: {
              opacity: 1,
              transition: {
                when: "afterChildren",
                duration: 0.12,
                ease: "linear",
              },
            },
          }}
          onAnimationComplete={() => {
            props.log({ type: "afterChildrenComplete", node: "empty-parent" });
          }}
          style={{
            width: "140px",
            height: "34px",
            "border-radius": "8px",
            "background-color": "rgb(209, 250, 229)",
          }}
        />
      </section>

      <section data-testid="viewport-once-section" class="harness-stage">
        <div class="harness-subtitle">viewport once behavior</div>

        <div data-testid="viewport-scroll-space" style={{ height: "1500px" }}>
          <div style={{ height: "780px" }} />

          <Show when={viewportMounted()}>
            <motion.div
              data-testid="viewport-target"
              initial={{ opacity: 0.2 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ duration: 0.16, ease: "linear" }}
              onViewportEnter={() => {
                props.log({ type: "viewportEnter", node: "viewport-target" });
              }}
              onViewportLeave={() => {
                props.log({ type: "viewportLeave", node: "viewport-target" });
              }}
              style={{
                width: "180px",
                height: "80px",
                "border-radius": "10px",
                "background-color": "rgb(251, 191, 36)",
              }}
            />
          </Show>

          <div style={{ height: "760px" }} />
        </div>
      </section>
    </div>
  );
}
