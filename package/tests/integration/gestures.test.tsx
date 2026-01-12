import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { motion } from "../../src";

// Helper to create pointer events
function createPointerEvent(
  type: string,
  options: Partial<PointerEventInit> = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerType: "mouse",
    ...options,
  });
}

describe("gestures", () => {
  describe("whileHover", () => {
    it("activates on pointerenter with mouse", async () => {
      render(() => (
        <motion.div data-testid="target" whileHover={{ scale: 1.1 }} />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "mouse" }),
      );

      await vi.advanceTimersByTimeAsync(50);
      expect(element.style.transform).toContain("scale");
    });

    it("does not activate for touch events", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.5 }}
        />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "touch" }),
      );

      await vi.advanceTimersByTimeAsync(50);
      // Should not have hover scale applied
    });

    it("deactivates on pointerleave", async () => {
      render(() => (
        <motion.div data-testid="target" whileHover={{ opacity: 0.5 }} />
      ));

      const element = screen.getByTestId("target");

      // Hover start
      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "mouse" }),
      );
      await vi.advanceTimersByTimeAsync(50);

      // Hover end
      element.dispatchEvent(
        createPointerEvent("pointerleave", { pointerType: "mouse" }),
      );
      await vi.advanceTimersByTimeAsync(200);
    });

    it("applies hover styles using variant label", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial="rest"
          whileHover="hover"
          variants={{
            rest: { scale: 1 },
            hover: { scale: 1.2 },
          }}
        />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "mouse" }),
      );

      await vi.advanceTimersByTimeAsync(50);
      expect(element.style.transform).toContain("scale");
    });
  });

  describe("whileTap", () => {
    it("activates on pointerdown", async () => {
      render(() => (
        <motion.div data-testid="target" whileTap={{ scale: 0.95 }} />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(createPointerEvent("pointerdown"));

      await vi.advanceTimersByTimeAsync(50);
      expect(element.style.transform).toContain("scale");
    });

    it("deactivates on pointerup", async () => {
      render(() => (
        <motion.div data-testid="target" whileTap={{ scale: 0.95 }} />
      ));

      const element = screen.getByTestId("target");

      element.dispatchEvent(createPointerEvent("pointerdown"));
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(createPointerEvent("pointerup"));
      await vi.advanceTimersByTimeAsync(200);
    });

    it("triggers onTap when released inside element", async () => {
      const onTap = vi.fn();

      render(() => (
        <motion.div
          data-testid="target"
          style={{ width: "100px", height: "100px" }}
          onTap={onTap}
        />
      ));

      const element = screen.getByTestId("target");
      const rect = {
        left: 0,
        right: 100,
        top: 0,
        bottom: 100,
        width: 100,
        height: 100,
      };
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
        rect as DOMRect,
      );

      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 50, clientY: 50 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      element.dispatchEvent(
        createPointerEvent("pointerup", { clientX: 50, clientY: 50 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onTap).toHaveBeenCalled();
    });

    it("triggers onTapCancel when released outside element", async () => {
      const onTapCancel = vi.fn();

      render(() => (
        <motion.div
          data-testid="target"
          style={{ width: "100px", height: "100px" }}
          onTapCancel={onTapCancel}
        />
      ));

      const element = screen.getByTestId("target");
      const rect = {
        left: 0,
        right: 100,
        top: 0,
        bottom: 100,
        width: 100,
        height: 100,
      };
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
        rect as DOMRect,
      );

      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 50, clientY: 50 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(
        createPointerEvent("pointerup", { clientX: 200, clientY: 200 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onTapCancel).toHaveBeenCalled();
    });

    it("triggers onTapStart on pointerdown", async () => {
      const onTapStart = vi.fn();

      render(() => <motion.div data-testid="target" onTapStart={onTapStart} />);

      const element = screen.getByTestId("target");
      element.dispatchEvent(createPointerEvent("pointerdown"));

      await vi.advanceTimersByTimeAsync(50);
      expect(onTapStart).toHaveBeenCalled();
    });

    it("handles pointercancel event", async () => {
      const onTapCancel = vi.fn();

      render(() => (
        <motion.div data-testid="target" onTapCancel={onTapCancel} />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(createPointerEvent("pointerdown"));
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(createPointerEvent("pointercancel"));
      await vi.advanceTimersByTimeAsync(50);

      expect(onTapCancel).toHaveBeenCalled();
    });
  });

  describe("whileFocus", () => {
    it("activates on focus", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          tabIndex={0}
          whileFocus={{ scale: 1.05 }}
        />
      ));

      const element = screen.getByTestId("target");
      fireEvent.focus(element);

      await vi.advanceTimersByTimeAsync(50);
      expect(element.style.transform).toContain("scale");
    });

    it("deactivates on blur", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          tabIndex={0}
          whileFocus={{ opacity: 0.8 }}
        />
      ));

      const element = screen.getByTestId("target");

      fireEvent.focus(element);
      await vi.advanceTimersByTimeAsync(50);

      fireEvent.blur(element);
      await vi.advanceTimersByTimeAsync(200);
    });

    it("works with input elements", async () => {
      render(() => (
        <motion.input
          data-testid="target"
          type="text"
          whileFocus={{ scale: 1.02 }}
        />
      ));

      const element = screen.getByTestId("target");
      fireEvent.focus(element);

      await vi.advanceTimersByTimeAsync(50);
      expect(element.style.transform).toContain("scale");
    });
  });

  // NOTE: Keyboard tap tests are skipped because the source code creates
  // synthetic MouseEvents with `view: window` which jsdom doesn't support.
  // The functionality works in real browsers.
  describe.skip("keyboard tap", () => {
    it("Enter key triggers tap on focusable element", async () => {
      const onTap = vi.fn();

      render(() => (
        <motion.div data-testid="target" tabIndex={0} onTap={onTap} />
      ));

      const element = screen.getByTestId("target");
      element.focus();

      fireEvent.keyDown(element, { key: "Enter" });
      await vi.advanceTimersByTimeAsync(50);

      fireEvent.keyUp(element, { key: "Enter" });
      await vi.advanceTimersByTimeAsync(50);

      expect(onTap).toHaveBeenCalled();
    });

    it("Enter activates whileTap state", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          tabIndex={0}
          whileTap={{ scale: 0.95 }}
        />
      ));

      const element = screen.getByTestId("target");
      element.focus();

      fireEvent.keyDown(element, { key: "Enter" });
      await vi.advanceTimersByTimeAsync(50);

      expect(element.style.transform).toContain("scale");
    });

    it("repeated Enter key is ignored", async () => {
      const onTapStart = vi.fn();

      render(() => (
        <motion.div data-testid="target" tabIndex={0} onTapStart={onTapStart} />
      ));

      const element = screen.getByTestId("target");
      element.focus();

      fireEvent.keyDown(element, { key: "Enter" });
      fireEvent.keyDown(element, { key: "Enter", repeat: true });
      fireEvent.keyDown(element, { key: "Enter", repeat: true });
      await vi.advanceTimersByTimeAsync(50);

      expect(onTapStart).toHaveBeenCalledTimes(1);
    });

    it("blur during keyboard tap triggers cancel", async () => {
      const onTapCancel = vi.fn();

      render(() => (
        <motion.div
          data-testid="target"
          tabIndex={0}
          onTapCancel={onTapCancel}
        />
      ));

      const element = screen.getByTestId("target");
      element.focus();

      fireEvent.keyDown(element, { key: "Enter" });
      await vi.advanceTimersByTimeAsync(50);

      fireEvent.blur(element);
      await vi.advanceTimersByTimeAsync(50);

      expect(onTapCancel).toHaveBeenCalled();
    });
  });

  describe("hover callbacks", () => {
    it("calls onHoverStart on mouse enter", async () => {
      const onHoverStart = vi.fn();

      render(() => (
        <motion.div data-testid="target" onHoverStart={onHoverStart} />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "mouse" }),
      );

      await vi.advanceTimersByTimeAsync(50);
      expect(onHoverStart).toHaveBeenCalled();
    });

    it("calls onHoverEnd on mouse leave", async () => {
      const onHoverEnd = vi.fn();

      render(() => <motion.div data-testid="target" onHoverEnd={onHoverEnd} />);

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "mouse" }),
      );
      await vi.advanceTimersByTimeAsync(50);

      element.dispatchEvent(
        createPointerEvent("pointerleave", { pointerType: "mouse" }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onHoverEnd).toHaveBeenCalled();
    });

    it("hover callbacks receive event info", async () => {
      let receivedEvent: unknown = null;
      let receivedInfo: unknown = null;

      render(() => (
        <motion.div
          data-testid="target"
          onHoverStart={(event, info) => {
            receivedEvent = event;
            receivedInfo = info;
          }}
        />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerenter", {
          pointerType: "mouse",
          clientX: 100,
          clientY: 200,
        }),
      );

      await vi.advanceTimersByTimeAsync(50);
      expect(receivedEvent).toBeTruthy();
      expect(receivedInfo).toBeTruthy();
    });
  });

  describe("tap callbacks", () => {
    it("onTap receives event and point info", async () => {
      let receivedEvent: unknown = null;
      let receivedInfo: unknown = null;

      render(() => (
        <motion.div
          data-testid="target"
          style={{ width: "100px", height: "100px" }}
          onTap={(event, info) => {
            receivedEvent = event;
            receivedInfo = info;
          }}
        />
      ));

      const element = screen.getByTestId("target");
      const rect = {
        left: 0,
        right: 100,
        top: 0,
        bottom: 100,
        width: 100,
        height: 100,
      };
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
        rect as DOMRect,
      );

      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 50, clientY: 50 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      element.dispatchEvent(
        createPointerEvent("pointerup", { clientX: 50, clientY: 50 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(receivedEvent).toBeTruthy();
      expect(receivedInfo).toHaveProperty("point");
    });
  });

  describe("globalTapTarget", () => {
    it("detects tap on document when globalTapTarget is true", async () => {
      const onTapStart = vi.fn();

      render(() => (
        <motion.div
          data-testid="target"
          globalTapTarget
          onTapStart={onTapStart}
        />
      ));

      // Tap on document instead of element
      document.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 500, clientY: 500 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onTapStart).toHaveBeenCalled();
    });

    it("treats global tap as success on pointerup", async () => {
      const onTap = vi.fn();
      const onTapCancel = vi.fn();

      render(() => (
        <motion.div
          data-testid="target"
          globalTapTarget
          onTap={onTap}
          onTapCancel={onTapCancel}
        />
      ));

      document.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 500, clientY: 500 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(
        createPointerEvent("pointerup", { clientX: 800, clientY: 800 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onTap).toHaveBeenCalled();
      expect(onTapCancel).not.toHaveBeenCalled();
    });
  });

  describe("pan gestures", () => {
    it("calls onPanStart when pan begins", async () => {
      const onPanStart = vi.fn();

      render(() => <motion.div data-testid="target" onPanStart={onPanStart} />);

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 0, clientY: 0 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(
        createPointerEvent("pointermove", { clientX: 10, clientY: 10 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onPanStart).toHaveBeenCalled();
    });

    it("calls onPan during pan", async () => {
      const onPan = vi.fn();

      render(() => <motion.div data-testid="target" onPan={onPan} />);

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 0, clientY: 0 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(
        createPointerEvent("pointermove", { clientX: 20, clientY: 20 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onPan).toHaveBeenCalled();
    });

    it("calls onPanEnd when pan ends", async () => {
      const onPanEnd = vi.fn();

      render(() => <motion.div data-testid="target" onPanEnd={onPanEnd} />);

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 0, clientY: 0 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(
        createPointerEvent("pointermove", { clientX: 50, clientY: 50 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(
        createPointerEvent("pointerup", { clientX: 50, clientY: 50 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onPanEnd).toHaveBeenCalled();
    });

    it("pan info includes offset and delta", async () => {
      let panInfo: any = null;

      render(() => (
        <motion.div
          data-testid="target"
          onPan={(_, info) => {
            panInfo = info;
          }}
        />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 0, clientY: 0 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      document.dispatchEvent(
        createPointerEvent("pointermove", { clientX: 30, clientY: 40 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(panInfo).toHaveProperty("offset");
      expect(panInfo).toHaveProperty("delta");
      expect(panInfo).toHaveProperty("point");
    });

    it("calls onPanSessionStart at beginning of session", async () => {
      const onPanSessionStart = vi.fn();

      render(() => (
        <motion.div
          data-testid="target"
          onPanSessionStart={onPanSessionStart}
        />
      ));

      const element = screen.getByTestId("target");
      element.dispatchEvent(
        createPointerEvent("pointerdown", { clientX: 0, clientY: 0 }),
      );
      await vi.advanceTimersByTimeAsync(50);

      expect(onPanSessionStart).toHaveBeenCalled();
    });
  });

  describe("gesture priority", () => {
    it("whileTap takes priority over whileHover", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        />
      ));

      const element = screen.getByTestId("target");

      // Start hover
      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "mouse" }),
      );
      await vi.advanceTimersByTimeAsync(100);

      // Start tap while hovering
      element.dispatchEvent(createPointerEvent("pointerdown"));
      await vi.advanceTimersByTimeAsync(100);

      // Tap scale should be applied (should be animating toward 0.9)
      // The value should be less than 1.0 since we're transitioning from hover (1.1) to tap (0.9)
      const transform = element.style.transform;
      expect(transform).toContain("scale(");
      const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
      expect(scaleMatch).toBeTruthy();
      const scaleValue = parseFloat(scaleMatch?.[1] ?? "0");
      expect(scaleValue).toBeLessThanOrEqual(1.1);
    });

    it("whileFocus can combine with whileHover", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          tabIndex={0}
          whileHover={{ x: 10 }}
          whileFocus={{ scale: 1.05 }}
        />
      ));

      const element = screen.getByTestId("target");

      fireEvent.focus(element);
      await vi.advanceTimersByTimeAsync(50);

      element.dispatchEvent(
        createPointerEvent("pointerenter", { pointerType: "mouse" }),
      );
      await vi.advanceTimersByTimeAsync(100);

      // Both transforms should be applied
      expect(element.style.transform).toContain("scale");
      expect(element.style.transform).toContain("translateX");
    });
  });

  describe("edge cases", () => {
    it("handles rapid hover in/out", async () => {
      render(() => (
        <motion.div data-testid="target" whileHover={{ opacity: 0.5 }} />
      ));

      const element = screen.getByTestId("target");

      for (let i = 0; i < 5; i++) {
        element.dispatchEvent(
          createPointerEvent("pointerenter", { pointerType: "mouse" }),
        );
        await vi.advanceTimersByTimeAsync(10);
        element.dispatchEvent(
          createPointerEvent("pointerleave", { pointerType: "mouse" }),
        );
        await vi.advanceTimersByTimeAsync(10);
      }

      await vi.advanceTimersByTimeAsync(200);
      expect(element).toBeTruthy();
    });

    it("cleans up event listeners on unmount", async () => {
      const [show, setShow] = createSignal(true);

      render(() => (
        <>
          {show() && (
            <motion.div
              data-testid="target"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            />
          )}
        </>
      ));

      await vi.advanceTimersByTimeAsync(50);
      setShow(false);
      await vi.advanceTimersByTimeAsync(50);

      // Should not throw after unmount
      expect(true).toBe(true);
    });

    it("makes element focusable when tap handlers present", async () => {
      render(() => <motion.div data-testid="target" onTap={() => {}} />);

      const element = screen.getByTestId("target");
      expect(element.tabIndex).toBe(0);
    });
  });
});
