import { render } from "solid-js/web";
import { createMemo, createSignal } from "solid-js";
import { CallbacksScenario } from "./scenarios/callbacks";
import { KeyboardScenario } from "./scenarios/keyboard";
import { LayoutScenario } from "./scenarios/layout";
import { PresenceScenario } from "./scenarios/presence";
import { ReducedMotionScenario } from "./scenarios/reduced-motion";
import { ViewportOrchestrationScenario } from "./scenarios/viewport-orchestration";
import type {
  HarnessEvent,
  HarnessScenarioName,
  ScenarioController,
} from "./types";

type HarnessApi = {
  loadScenario: (
    scenario: HarnessScenarioName,
    options?: Record<string, unknown>,
  ) => void;
  act: (action: string, payload?: unknown) => void;
  getState: () => Record<string, unknown>;
  getEvents: () => HarnessEvent[];
  clearEvents: () => void;
};

declare global {
  interface Window {
    __MOTION_HARNESS__?: HarnessApi;
    __MOTION_HARNESS_READY__?: boolean;
  }
}

const knownScenarios: HarnessScenarioName[] = [
  "callbacks",
  "presence",
  "layout",
  "viewport-orchestration",
  "reduced-motion",
  "keyboard",
];

const isKnownScenario = (value: string): value is HarnessScenarioName =>
  knownScenarios.includes(value as HarnessScenarioName);

const parseInitialState = () => {
  const params = new URLSearchParams(window.location.search);
  const scenarioParam = params.get("scenario") ?? "callbacks";
  const scenario = isKnownScenario(scenarioParam) ? scenarioParam : "callbacks";

  const options: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (key === "scenario") continue;
    options[key] = value;
  }

  return { scenario, options };
};

const toStringOptions = (input?: Record<string, unknown>) => {
  if (!input) return {};

  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    normalized[key] = String(value);
  }

  return normalized;
};

const initial = parseInitialState();

const [scenario, setScenario] = createSignal<HarnessScenarioName>(
  initial.scenario,
);
const [options, setOptions] = createSignal<Record<string, string>>(
  initial.options,
);
const [events, setEvents] = createSignal<HarnessEvent[]>([]);

let controller: ScenarioController | null = null;
let eventId = 0;

const clearEvents = () => {
  setEvents([]);
};

const registerController = (nextController: ScenarioController) => {
  controller = nextController;
};

const logEvent = (event: Omit<HarnessEvent, "id" | "time" | "scenario">) => {
  const next: HarnessEvent = {
    id: ++eventId,
    time: performance.now(),
    scenario: scenario(),
    ...event,
  };

  setEvents((prev) => [...prev, next]);
};

const loadScenario = (
  nextScenario: HarnessScenarioName,
  nextOptions?: Record<string, unknown>,
) => {
  if (!isKnownScenario(nextScenario)) return;

  clearEvents();
  setOptions(toStringOptions(nextOptions));

  if (scenario() === nextScenario) {
    controller?.act("reset");
    return;
  }

  controller = null;
  setScenario(nextScenario);
};

const harnessApi: HarnessApi = {
  loadScenario,
  act(action, payload) {
    controller?.act(action, payload);
  },
  getState() {
    return {
      scenario: scenario(),
      options: options(),
      ...(controller?.getState() ?? {}),
    };
  },
  getEvents() {
    return events();
  },
  clearEvents,
};

window.__MOTION_HARNESS__ = harnessApi;
window.__MOTION_HARNESS_READY__ = true;

function ScenarioRoot() {
  const currentScenario = createMemo(() => scenario());

  return (
    <div>
      <style>
        {`
          :root {
            color-scheme: light;
            font-family: "Segoe UI", "Inter", sans-serif;
          }

          body {
            margin: 0;
            background: #f8fafc;
            color: #0f172a;
          }

          .harness-shell {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }

          .harness-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            background: white;
            padding: 10px 12px;
            font-size: 12px;
          }

          .harness-panel {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .harness-description {
            font-size: 13px;
            color: #334155;
          }

          .harness-stage {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            background: white;
            padding: 12px;
          }

          .harness-subtitle {
            margin-bottom: 8px;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
          }
        `}
      </style>

      <main class="harness-shell" data-testid="harness-root">
        <header class="harness-header">
          <div data-testid="harness-scenario">{currentScenario()}</div>
          <div data-testid="harness-event-count">events: {events().length}</div>
        </header>

        {currentScenario() === "callbacks" && (
          <CallbacksScenario
            options={options}
            log={logEvent}
            registerController={registerController}
          />
        )}

        {currentScenario() === "presence" && (
          <PresenceScenario
            options={options}
            log={logEvent}
            registerController={registerController}
          />
        )}

        {currentScenario() === "layout" && (
          <LayoutScenario
            options={options}
            log={logEvent}
            registerController={registerController}
          />
        )}

        {currentScenario() === "viewport-orchestration" && (
          <ViewportOrchestrationScenario
            options={options}
            log={logEvent}
            registerController={registerController}
          />
        )}

        {currentScenario() === "reduced-motion" && (
          <ReducedMotionScenario
            options={options}
            log={logEvent}
            registerController={registerController}
          />
        )}

        {currentScenario() === "keyboard" && (
          <KeyboardScenario
            options={options}
            log={logEvent}
            registerController={registerController}
          />
        )}
      </main>
    </div>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Harness root element not found");
}

render(() => <ScenarioRoot />, root);
