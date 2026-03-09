import { AnimatePresence, LayoutGroup, motion } from "../../../../src";
import { For, Show, createMemo, createSignal } from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

const sharedForegroundShellStyle = {
  position: "relative",
  overflow: "hidden",
  "border-radius": "24px",
  "box-shadow": "0px 14px 34px rgba(15, 23, 42, 0.08)",
} as const;

export function LayoutScenario(props: ScenarioProps) {
  const [expanded, setExpanded] = createSignal(false);
  const [selected, setSelected] = createSignal<"a" | "b">("a");
  const [sortMetric, setSortMetric] = createSignal<"impact" | "speed">(
    "impact",
  );
  const [expandedDetailId, setExpandedDetailId] = createSignal<string | null>(
    null,
  );
  const [foregroundOpenId, setForegroundOpenId] = createSignal<string | null>(
    null,
  );

  const queue = createMemo(() => {
    const metric = sortMetric();

    return [...reorderItems].sort(
      (left, right) => right[metric] - left[metric],
    );
  });

  const selectedForeground = createMemo(
    () =>
      foregroundCards.find((card) => card.id === foregroundOpenId()) ?? null,
  );

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
        case "toggleExpandedDetail":
          if (typeof payload === "string") {
            setExpandedDetailId((value) =>
              value === payload ? null : payload,
            );
          }
          return;
        case "setExpandedDetail":
          if (payload === null || typeof payload === "string") {
            setExpandedDetailId(payload);
          }
          return;
        case "openForeground":
          if (typeof payload === "string") {
            setForegroundOpenId(payload);
          }
          return;
        case "closeForeground":
          setForegroundOpenId(null);
          return;
        case "reset":
          setExpanded(false);
          setSelected("a");
          setSortMetric("impact");
          setExpandedDetailId(null);
          setForegroundOpenId(null);
          return;
      }
    },
    getState() {
      return {
        expanded: expanded(),
        selected: selected(),
        sortMetric: sortMetric(),
        reorderIds: queue().map((item) => item.id),
        expandedDetailId: expandedDetailId(),
        foregroundOpenId: foregroundOpenId(),
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

          <motion.div
            layout
            data-testid="layout-expand-list"
            style={{
              display: "grid",
              gap: "12px",
              width: "360px",
            }}
          >
            <For each={expandItems}>
              {(item) => {
                const isExpanded = () => expandedDetailId() === item.id;

                return (
                  <motion.button
                    layout
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    type="button"
                    data-testid={`layout-expand-${item.id}`}
                    onClick={() =>
                      setExpandedDetailId((value) =>
                        value === item.id ? null : item.id,
                      )
                    }
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
                    <motion.div
                      layout="position"
                      data-testid={`layout-expand-header-${item.id}`}
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
                        {item.score}
                      </div>
                    </motion.div>

                    <AnimatePresence initial={false}>
                      <Show when={isExpanded()}>
                        <motion.div
                          layout
                          data-testid={`layout-expand-detail-${item.id}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.18 }}
                          style={{
                            margin: "16px 0 0",
                            padding: "12px",
                            display: "grid",
                            gap: "8px",
                            "border-radius": "16px",
                            "background-color": "rgb(241, 245, 249)",
                          }}
                        >
                          <For each={item.details}>
                            {(detail) => (
                              <motion.p
                                layout="position"
                                style={{
                                  margin: "0",
                                  "font-size": "13px",
                                  "line-height": "1.6",
                                  color: "rgb(71, 85, 105)",
                                }}
                              >
                                {detail}
                              </motion.p>
                            )}
                          </For>
                          <motion.div
                            layout="position"
                            style={{
                              display: "flex",
                              gap: "12px",
                              "margin-top": "12px",
                              "font-size": "12px",
                              color: "rgb(100, 116, 139)",
                            }}
                          >
                            <span>Impact: {item.impact}</span>
                            <span>Speed: {item.speed}</span>
                          </motion.div>
                        </motion.div>
                      </Show>
                    </AnimatePresence>
                  </motion.button>
                );
              }}
            </For>
          </motion.div>

          <LayoutGroup id="layout-foreground">
            <div
              data-testid="layout-foreground-stage"
              style={{
                position: "relative",
                width: "420px",
                "min-height": "260px",
              }}
            >
              <motion.div
                layout
                data-testid="layout-foreground-list"
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                <For each={foregroundCards}>
                  {(card) => {
                    const isOpen = () => foregroundOpenId() === card.id;

                    return (
                      <button
                        type="button"
                        onClick={() => setForegroundOpenId(card.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          border: "none",
                          background: "transparent",
                          padding: "0",
                          "text-align": "left",
                          "pointer-events": isOpen() ? "none" : "auto",
                        }}
                      >
                        <motion.div
                          layout
                          layoutId={`foreground-card-${card.id}`}
                          layoutDependency={foregroundOpenId()}
                          layoutCrossfade={false}
                          data-testid={`layout-foreground-row-${card.id}`}
                          style={{
                            ...sharedForegroundShellStyle,
                            width: "100%",
                            border: "1px solid rgb(203, 213, 225)",
                            padding: "16px",
                            "background-color": "white",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "14px",
                              "align-items": "center",
                            }}
                          >
                            <motion.div
                              layoutId={`foreground-square-${card.id}`}
                              layoutCrossfade={false}
                              data-testid={`layout-foreground-square-${card.id}`}
                              style={{
                                width: "56px",
                                height: "56px",
                                "border-radius": "18px",
                                "background-color": card.color,
                              }}
                            />
                            <motion.div
                              layoutId={`foreground-text-${card.id}`}
                              layout="position"
                              layoutCrossfade={false}
                              data-testid={`layout-foreground-text-${card.id}`}
                              style={{
                                display: "grid",
                                gap: "4px",
                              }}
                            >
                              <div
                                style={{
                                  "font-size": "15px",
                                  "font-weight": "600",
                                  color: "rgb(15, 23, 42)",
                                }}
                              >
                                {card.title}
                              </div>
                              <div
                                style={{
                                  "font-size": "13px",
                                  "line-height": "1.5",
                                  color: "rgb(100, 116, 139)",
                                }}
                              >
                                {card.summary}
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      </button>
                    );
                  }}
                </For>
              </motion.div>

              <AnimatePresence initial={false} mode="sync">
                <Show when={selectedForeground()} keyed>
                  {(card) => (
                    <div
                      data-testid="layout-foreground-overlay"
                      style={{
                        position: "absolute",
                        inset: "0",
                        "z-index": 20,
                      }}
                    >
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        type="button"
                        aria-label="Close foreground"
                        onClick={() => setForegroundOpenId(null)}
                        style={{
                          position: "absolute",
                          inset: "0",
                          border: "none",
                          background: "rgba(15, 23, 42, 0.28)",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          inset: "16px",
                          display: "flex",
                          "align-items": "center",
                          "justify-content": "center",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            "max-width": "720px",
                            filter:
                              "drop-shadow(0px 30px 90px rgba(15, 23, 42, 0.22))",
                          }}
                        >
                          <motion.div
                            layoutId={`foreground-card-${card.id}`}
                            layoutDependency={foregroundOpenId()}
                            layoutCrossfade={false}
                            data-testid={`layout-foreground-modal-${card.id}`}
                            style={{
                              ...sharedForegroundShellStyle,
                              width: "100%",
                              border: "1px solid rgb(203, 213, 225)",
                              padding: "20px",
                              "background-color": "white",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "16px",
                                "align-items": "flex-start",
                              }}
                            >
                              <motion.div
                                layoutId={`foreground-square-${card.id}`}
                                layoutCrossfade={false}
                                data-testid={`layout-foreground-modal-square-${card.id}`}
                                style={{
                                  width: "96px",
                                  height: "96px",
                                  "border-radius": "24px",
                                  "background-color": card.color,
                                }}
                              />
                              <motion.div
                                layoutId={`foreground-text-${card.id}`}
                                layout="position"
                                layoutCrossfade={false}
                                data-testid={`layout-foreground-modal-text-${card.id}`}
                                style={{
                                  display: "grid",
                                  gap: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    "font-size": "18px",
                                    "font-weight": "600",
                                    color: "rgb(15, 23, 42)",
                                  }}
                                >
                                  {card.title}
                                </div>
                                <div
                                  style={{
                                    "font-size": "14px",
                                    "line-height": "1.6",
                                    color: "rgb(100, 116, 139)",
                                  }}
                                >
                                  {card.summary}
                                </div>
                              </motion.div>
                            </div>

                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              transition={{ duration: 0.18, delay: 0.04 }}
                              style={{
                                margin: "18px 0 0",
                                "font-size": "14px",
                                "line-height": "1.7",
                                color: "rgb(15, 23, 42)",
                              }}
                            >
                              {card.detail}
                            </motion.div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  )}
                </Show>
              </AnimatePresence>
            </div>
          </LayoutGroup>
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

const expandItems = [
  {
    id: "sync",
    label: "Sync profile settings",
    owner: "Platform",
    score: 92,
    impact: 92,
    speed: 44,
    details: [
      "Touches auth, preferences, and the app shell in one pass, so the card grows and nearby siblings need to reflow smoothly.",
      "The taller expanded state is a good baseline for checking that lower rows keep a continuous transform instead of snapping.",
    ],
  },
  {
    id: "feed",
    label: "Reduce feed jank",
    owner: "Experience",
    score: 78,
    impact: 78,
    speed: 81,
    details: ["Mostly rendering work with a small API contract change."],
  },
  {
    id: "invite",
    label: "Tighten invite flow",
    owner: "Growth",
    score: 64,
    impact: 64,
    speed: 88,
    details: [
      "Short implementation, high confidence, and strong conversion upside.",
      "This intentionally uses a taller detail body than the feed card so switching between the two rows forces the search card below to reflow every time.",
      "That repeated lower-sibling movement is the regression shape the browser harness samples frame-by-frame.",
    ],
  },
  {
    id: "search",
    label: "Search result polish",
    owner: "Core",
    score: 86,
    impact: 86,
    speed: 58,
    details: [
      "Ranking is stable; the remaining work is layout and interaction cleanup inside a denser result card.",
      "It sits below the rows we alternate between, so it is the easiest sibling to catch snapping during repeated expansions.",
    ],
  },
] as const;

const foregroundCards = [
  {
    id: "alpha",
    title: "Release notes",
    summary:
      "Shared shell, square, and text should all animate into the dialog.",
    detail:
      "The card background should not snap on open. The shared shell, square, and text should project into the modal without being replaced by unrelated DOM.",
    color: "rgb(37, 99, 235)",
  },
  {
    id: "beta",
    title: "Migration prep",
    summary: "A second row to keep the shared-layout stack honest.",
    detail:
      "Closing the dialog should hand the same visual elements back into the list without duplicating the card shell.",
    color: "rgb(234, 88, 12)",
  },
  {
    id: "gamma",
    title: "Support handoff",
    summary: "A third row to catch repeated shared-layout handoff drift.",
    detail:
      "Alternating across three cards should still keep the shell, square, and text visually continuous while the modal opens and closes.",
    color: "rgb(5, 150, 105)",
  },
] as const;
