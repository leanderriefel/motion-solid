import { LayoutGroup, motion } from "../../../../src";
import { For, createMemo, createSignal } from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

export function LayoutScenario(props: ScenarioProps) {
  const [expanded, setExpanded] = createSignal(false);
  const [selected, setSelected] = createSignal<"a" | "b">("a");
  const [sortMetric, setSortMetric] = createSignal<"impact" | "speed">(
    "impact",
  );

  const queue = createMemo(() => {
    const metric = sortMetric();

    return [...reorderItems].sort(
      (left, right) => right[metric] - left[metric],
    );
  });

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "toggleExpanded":
          setExpanded((value) => !value);
          return;
        case "setExpanded":
          if (typeof payload === "boolean") {
            setExpanded(payload);
          }
          return;
        case "switchShared":
          setSelected((value) => (value === "a" ? "b" : "a"));
          return;
        case "setSelected":
          if (payload === "a" || payload === "b") {
            setSelected(payload);
          }
          return;
        case "setSortMetric":
          if (payload === "impact" || payload === "speed") {
            setSortMetric(payload);
          }
          return;
        case "reset":
          setExpanded(false);
          setSelected("a");
          setSortMetric("impact");
          return;
      }
    },
    getState() {
      return {
        expanded: expanded(),
        selected: selected(),
        sortMetric: sortMetric(),
        reorderIds: queue().map((item) => item.id),
      };
    },
  };

  props.registerController(controller);

  return (
    <div data-testid="scenario-layout" class="harness-panel">
      <div class="harness-description">
        Layout projection harness for size changes and shared layout handoff.
      </div>

      <div data-testid="layout-stage" class="harness-stage">
        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          <motion.div
            data-testid="layout-box"
            layout
            onLayoutAnimationStart={() => {
              props.log({ type: "layoutStart", node: "layout-box" });
            }}
            onLayoutAnimationComplete={() => {
              props.log({ type: "layoutComplete", node: "layout-box" });
            }}
            style={{
              width: expanded() ? "240px" : "120px",
              height: expanded() ? "120px" : "72px",
              "border-radius": expanded() ? "24px" : "12px",
              "box-shadow": expanded()
                ? "0px 18px 40px rgba(15, 23, 42, 0.2)"
                : "0px 8px 20px rgba(15, 23, 42, 0.14)",
              "background-color": "rgb(14, 165, 233)",
            }}
          />

          <LayoutGroup id="layout-tabs">
            <div
              data-testid="layout-tabs"
              style={{
                position: "relative",
                display: "flex",
                gap: "12px",
                width: "fit-content",
                padding: "8px",
                "border-radius": "999px",
                "background-color": "rgb(226, 232, 240)",
              }}
            >
              {(["a", "b"] as const).map((item) => (
                <button
                  type="button"
                  data-testid={`layout-tab-${item}`}
                  onClick={() => {
                    setSelected(item);
                  }}
                  style={{
                    position: "relative",
                    border: "none",
                    background: "transparent",
                    padding: "10px 18px",
                    "font-size": "14px",
                    "font-weight": "600",
                    color: "rgb(15, 23, 42)",
                  }}
                >
                  {selected() === item && (
                    <motion.div
                      data-testid={`layout-shared-${item}`}
                      layoutId="pill"
                      onLayoutAnimationStart={() => {
                        props.log({ type: "layoutStart", node: "shared-pill" });
                      }}
                      onLayoutAnimationComplete={() => {
                        props.log({
                          type: "layoutComplete",
                          node: "shared-pill",
                        });
                      }}
                      style={{
                        position: "absolute",
                        inset: "0px",
                        "border-radius": "999px",
                        "background-color": "white",
                        "box-shadow": "0px 8px 18px rgba(15, 23, 42, 0.1)",
                      }}
                    />
                  )}
                  <span style={{ position: "relative", "z-index": 1 }}>
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          <motion.div
            layout
            data-testid="layout-reorder-list"
            style={{
              display: "grid",
              gap: "12px",
              width: "320px",
            }}
          >
            <For each={queue()}>
              {(item) => (
                <motion.button
                  layout
                  type="button"
                  data-testid={`layout-reorder-${item.id}`}
                  onLayoutAnimationStart={() => {
                    props.log({
                      type: "layoutStart",
                      node: `reorder-${item.id}`,
                    });
                  }}
                  onLayoutAnimationComplete={() => {
                    props.log({
                      type: "layoutComplete",
                      node: `reorder-${item.id}`,
                    });
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    border: "1px solid rgb(203, 213, 225)",
                    "border-radius": "20px",
                    padding: "16px",
                    "text-align": "left",
                    "background-color": "white",
                    "box-shadow": "0px 10px 24px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      "justify-content": "space-between",
                      gap: "12px",
                      "align-items": "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          "font-size": "14px",
                          "font-weight": "600",
                          color: "rgb(15, 23, 42)",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          "margin-top": "4px",
                          "font-size": "12px",
                          color: "rgb(100, 116, 139)",
                        }}
                      >
                        {item.owner}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "6px 10px",
                      "border-radius": "999px",
                      "background-color": "rgb(241, 245, 249)",
                      "font-size": "12px",
                      "font-weight": "600",
                      color: "rgb(15, 23, 42)",
                    }}
                  >
                    {sortMetric() === "impact" ? item.impact : item.speed}
                  </div>
                </motion.button>
              )}
            </For>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const reorderItems = [
  {
    id: "sync",
    label: "Sync profile settings",
    owner: "Platform",
    impact: 92,
    speed: 44,
  },
  {
    id: "feed",
    label: "Reduce feed jank",
    owner: "Experience",
    impact: 78,
    speed: 81,
  },
  {
    id: "invite",
    label: "Tighten invite flow",
    owner: "Growth",
    impact: 64,
    speed: 88,
  },
] as const;
