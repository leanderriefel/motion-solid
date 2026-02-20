import { AnimatePresence, motion } from "../../../../src";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

type ModeValue = "sync" | "wait" | "popLayout";
type PresenceItem = "a" | "b" | "c";

const nextItem = (current: PresenceItem): PresenceItem => {
  if (current === "a") return "b";
  if (current === "b") return "c";
  return "a";
};

export function PresenceScenario(props: ScenarioProps) {
  const [mode, setMode] = createSignal<ModeValue>("sync");
  const [current, setCurrent] = createSignal<PresenceItem>("a");
  const [outerVisible, setOuterVisible] = createSignal(true);
  const [innerVisible, setInnerVisible] = createSignal(true);
  const [nested, setNested] = createSignal(false);
  const [propagate, setPropagate] = createSignal(false);
  const [initialFalseItems, setInitialFalseItems] = createSignal([1]);

  let sequenceTimer: number | null = null;
  let rapidTimer: number | null = null;
  let stageElement: HTMLDivElement | undefined;

  const clearTimers = () => {
    if (sequenceTimer !== null) {
      window.clearTimeout(sequenceTimer);
      sequenceTimer = null;
    }

    if (rapidTimer !== null) {
      window.clearTimeout(rapidTimer);
      rapidTimer = null;
    }
  };

  createEffect(() => {
    const modeOption = props.options().mode;
    if (
      modeOption === "sync" ||
      modeOption === "wait" ||
      modeOption === "popLayout"
    ) {
      setMode(modeOption);
    }
  });

  const renderItem = createMemo(() => {
    const item = current();

    return (
      <motion.div
        data-testid={`presence-item-${item}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, ease: "linear" }}
        onAnimationStart={() => {
          props.log({ type: "animationStart", node: `presence-${item}` });
        }}
        onAnimationComplete={() => {
          props.log({ type: "animationComplete", node: `presence-${item}` });
        }}
        style={{
          width: "120px",
          height: "56px",
          "border-radius": "10px",
          "background-color": "rgb(59, 130, 246)",
          color: "white",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "font-size": "20px",
          "font-weight": "700",
        }}
      >
        {item.toUpperCase()}
      </motion.div>
    );
  });

  const queueABC = () => {
    clearTimers();
    setCurrent("a");
    sequenceTimer = window.setTimeout(() => {
      setCurrent("b");
      sequenceTimer = window.setTimeout(() => {
        setCurrent("c");
        sequenceTimer = null;
      }, 16);
    }, 16);
  };

  const rapidToggleInner = (cycles: number, intervalMs: number) => {
    clearTimers();

    let completed = 0;

    const step = () => {
      if (completed >= cycles) {
        setInnerVisible(true);
        rapidTimer = null;
        return;
      }

      setInnerVisible((prev) => !prev);
      completed += 1;
      rapidTimer = window.setTimeout(step, intervalMs);
    };

    step();
  };

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "setMode":
          if (
            payload === "sync" ||
            payload === "wait" ||
            payload === "popLayout"
          ) {
            setMode(payload);
          }
          return;
        case "setCurrent":
          if (payload === "a" || payload === "b" || payload === "c") {
            setCurrent(payload);
          }
          return;
        case "cycle":
          setCurrent((prev) => nextItem(prev));
          return;
        case "queueABC":
          queueABC();
          return;
        case "setNested":
          if (typeof payload === "boolean") setNested(payload);
          return;
        case "setPropagate":
          if (typeof payload === "boolean") setPropagate(payload);
          return;
        case "showInner":
          setInnerVisible(true);
          return;
        case "hideInner":
          setInnerVisible(false);
          return;
        case "toggleInner":
          setInnerVisible((prev) => !prev);
          return;
        case "showOuter":
          setOuterVisible(true);
          return;
        case "hideOuter":
          setOuterVisible(false);
          return;
        case "toggleOuter":
          setOuterVisible((prev) => !prev);
          return;
        case "rapidToggleInner": {
          const config =
            payload && typeof payload === "object"
              ? (payload as { cycles?: number; intervalMs?: number })
              : null;
          rapidToggleInner(config?.cycles ?? 6, config?.intervalMs ?? 28);
          return;
        }
        case "addInitialFalseItem":
          setInitialFalseItems((prev) => [...prev, prev.length + 1]);
          return;
        case "resetInitialFalse":
          setInitialFalseItems([1]);
          return;
        case "reset":
          clearTimers();
          setMode("sync");
          setCurrent("a");
          setOuterVisible(true);
          setInnerVisible(true);
          setNested(false);
          setPropagate(false);
          setInitialFalseItems([1]);
          return;
      }
    },
    getState() {
      const modeItems = stageElement?.querySelectorAll(
        '[data-testid^="presence-item-"]',
      ).length;

      return {
        mode: mode(),
        current: current(),
        outerVisible: outerVisible(),
        innerVisible: innerVisible(),
        nested: nested(),
        propagate: propagate(),
        mountedItemCount: modeItems ?? 0,
        initialFalseItemCount: initialFalseItems().length,
      };
    },
  };

  props.registerController(controller);

  return (
    <div data-testid="scenario-presence" class="harness-panel">
      <div class="harness-description">
        AnimatePresence mode, propagation and race harness.
      </div>

      <div
        ref={stageElement}
        data-testid="presence-stage"
        class="harness-stage"
      >
        <div
          data-testid="presence-flow"
          style={{
            position: "relative",
            display: "flex",
            "align-items": "center",
            gap: "12px",
            "min-height": "80px",
          }}
        >
          <AnimatePresence
            mode={mode()}
            onExitComplete={() => {
              props.log({ type: "outerExitComplete", node: "outer" });
            }}
            root={stageElement}
          >
            <Show when={outerVisible()}>
              <motion.div
                data-testid="presence-outer"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "linear" }}
                style={{ display: "flex", gap: "10px", position: "relative" }}
              >
                <Show
                  when={!nested()}
                  fallback={
                    <AnimatePresence
                      propagate={propagate()}
                      onExitComplete={() => {
                        props.log({
                          type: "innerExitComplete",
                          node: "nested-inner",
                        });
                      }}
                    >
                      <Show when={innerVisible()}>{renderItem()}</Show>
                    </AnimatePresence>
                  }
                >
                  <AnimatePresence
                    mode={mode()}
                    onExitComplete={() => {
                      props.log({ type: "exitComplete", node: "inner" });
                    }}
                  >
                    <Show when={innerVisible()}>{renderItem()}</Show>
                  </AnimatePresence>
                </Show>
              </motion.div>
            </Show>
          </AnimatePresence>

          <div
            data-testid="presence-sibling"
            style={{
              width: "80px",
              height: "30px",
              "background-color": "rgb(226, 232, 240)",
              "border-radius": "8px",
            }}
          />
        </div>
      </div>

      <div class="harness-stage" data-testid="initial-false-stage">
        <div class="harness-subtitle">
          initial={"{"}false{"}"} behavior
        </div>
        <AnimatePresence initial={false}>
          <For each={initialFalseItems()}>
            {(item) => (
              <motion.div
                data-testid={`initial-false-item-${item}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.16, ease: "linear" }}
                onAnimationStart={() => {
                  props.log({
                    type: "animationStart",
                    node: `initial-false-item-${item}`,
                  });
                }}
                style={{
                  width: "160px",
                  height: "36px",
                  "margin-bottom": "6px",
                  "background-color": "rgb(196, 181, 253)",
                  "border-radius": "8px",
                }}
              />
            )}
          </For>
        </AnimatePresence>
      </div>
    </div>
  );
}
