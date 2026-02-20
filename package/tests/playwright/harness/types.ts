import type { Accessor } from "solid-js";

export type HarnessScenarioName =
  | "callbacks"
  | "presence"
  | "layout"
  | "viewport-orchestration"
  | "reduced-motion"
  | "keyboard";

export type HarnessEventType =
  | "animationStart"
  | "animationComplete"
  | "exitComplete"
  | "outerExitComplete"
  | "innerExitComplete"
  | "layoutStart"
  | "layoutComplete"
  | "viewportEnter"
  | "viewportLeave"
  | "orchestrationParentStart"
  | "orchestrationParentComplete"
  | "orchestrationChildStart"
  | "orchestrationChildComplete"
  | "afterChildrenComplete"
  | "tapStart"
  | "tap"
  | "tapCancel"
  | "keyDown"
  | "keyUp"
  | "action";

export interface HarnessEvent {
  id: number;
  time: number;
  scenario: HarnessScenarioName;
  type: HarnessEventType;
  node?: string;
  payload?: unknown;
}

export interface ScenarioController {
  act: (action: string, payload?: unknown) => void;
  getState: () => Record<string, unknown>;
}

export interface ScenarioProps {
  options: Accessor<Record<string, string>>;
  log: (event: Omit<HarnessEvent, "id" | "time" | "scenario">) => void;
  registerController: (controller: ScenarioController) => void;
}
