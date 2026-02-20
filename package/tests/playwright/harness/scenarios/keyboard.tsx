import { motion } from "../../../../src";
import { createSignal } from "solid-js";
import type { ScenarioController, ScenarioProps } from "../types";

export function KeyboardScenario(props: ScenarioProps) {
  const [resetKey, setResetKey] = createSignal(0);

  let targetElement: HTMLDivElement | undefined;

  const focusTarget = () => {
    targetElement?.focus();
  };

  const blurTarget = () => {
    targetElement?.blur();
  };

  const keyDown = (key: string, repeat: boolean = false) => {
    if (!targetElement) return;

    targetElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        repeat,
        bubbles: true,
      }),
    );
  };

  const keyUp = (key: string) => {
    if (!targetElement) return;

    targetElement.dispatchEvent(
      new KeyboardEvent("keyup", {
        key,
        bubbles: true,
      }),
    );
  };

  const controller: ScenarioController = {
    act(action, payload) {
      props.log({ type: "action", node: action, payload });

      switch (action) {
        case "focus":
          focusTarget();
          return;
        case "blur":
          blurTarget();
          return;
        case "keydown":
          if (typeof payload === "string") keyDown(payload, false);
          return;
        case "keyup":
          if (typeof payload === "string") keyUp(payload);
          return;
        case "keydownRepeat":
          if (typeof payload === "string") keyDown(payload, true);
          return;
        case "triggerEnterTap":
          focusTarget();
          keyDown("Enter", false);
          keyUp("Enter");
          return;
        case "triggerRepeatEnter":
          focusTarget();
          keyDown("Enter", false);
          keyDown("Enter", true);
          keyDown("Enter", true);
          keyUp("Enter");
          return;
        case "triggerBlurCancel":
          focusTarget();
          keyDown("Enter", false);
          blurTarget();
          return;
        case "click":
          targetElement?.click();
          return;
        case "reset":
          setResetKey((prev) => prev + 1);
          return;
      }
    },
    getState() {
      return {
        resetKey: resetKey(),
        isFocused: document.activeElement === targetElement,
      };
    },
  };

  props.registerController(controller);

  return (
    <div data-testid="scenario-keyboard" class="harness-panel">
      <div class="harness-description">Keyboard/tap integration harness.</div>

      <div data-testid="keyboard-stage" class="harness-stage">
        <motion.div
          key={resetKey()}
          ref={targetElement}
          data-testid="keyboard-target"
          tabIndex={0}
          whileTap={{ scale: 0.9 }}
          onKeyDown={(event: KeyboardEvent) => {
            props.log({
              type: "keyDown",
              node: event.key,
              payload: event.repeat,
            });
          }}
          onKeyUp={(event: KeyboardEvent) => {
            props.log({ type: "keyUp", node: event.key });
          }}
          onTapStart={() => {
            props.log({ type: "tapStart", node: "keyboard-target" });
          }}
          onTap={() => {
            props.log({ type: "tap", node: "keyboard-target" });
          }}
          onTapCancel={() => {
            props.log({ type: "tapCancel", node: "keyboard-target" });
          }}
          style={{
            width: "160px",
            height: "64px",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "user-select": "none",
            cursor: "pointer",
            "border-radius": "12px",
            outline: "none",
            border: "2px solid rgb(37, 99, 235)",
            "background-color": "rgb(219, 234, 254)",
          }}
        >
          Press Enter
        </motion.div>
      </div>
    </div>
  );
}
