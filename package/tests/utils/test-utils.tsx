import { render as solidRender, cleanup } from "@solidjs/testing-library";
import { vi, afterEach } from "vitest";
import type { JSX } from "solid-js";

// Re-export everything from testing-library
export * from "@solidjs/testing-library";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

/**
 * Helper to create a mock IntersectionObserver that can be triggered manually
 */
export function createMockIntersectionObserver() {
  let callback: IntersectionObserverCallback | null = null;
  const instances: MockIntersectionObserver[] = [];

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];

    constructor(cb: IntersectionObserverCallback) {
      callback = cb;
      instances.push(this);
    }

    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  const trigger = (
    entries: Partial<IntersectionObserverEntry>[],
    observer?: IntersectionObserver,
  ) => {
    if (callback) {
      callback(
        entries as IntersectionObserverEntry[],
        observer ?? (instances[0] as IntersectionObserver),
      );
    }
  };

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

  return { trigger, instances, MockIntersectionObserver };
}

/**
 * Helper to advance timers and flush all pending promises/microtasks
 */
export async function advanceTimersAndFlush(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
}

/**
 * Run all pending timers and microtasks
 */
export async function flushTimers() {
  await vi.runAllTimersAsync();
}

/**
 * Helper to wait for an element to have a specific style value
 */
export async function waitForStyle(
  element: HTMLElement,
  property: string,
  expectedValue: string,
  timeout = 1000,
) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const value = element.style.getPropertyValue(property);
    if (value === expectedValue) return;
    await vi.advanceTimersByTimeAsync(16);
  }
  throw new Error(
    `Timed out waiting for style "${property}" to be "${expectedValue}". Current value: "${element.style.getPropertyValue(property)}"`,
  );
}

/**
 * Helper to create a pointer event with specific properties
 */
export function createPointerEvent(
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

/**
 * Helper to simulate a complete hover gesture
 */
export async function simulateHover(element: HTMLElement) {
  element.dispatchEvent(
    createPointerEvent("pointerenter", { pointerType: "mouse" }),
  );
  await vi.advanceTimersByTimeAsync(16);
}

/**
 * Helper to simulate hover end
 */
export async function simulateHoverEnd(element: HTMLElement) {
  element.dispatchEvent(
    createPointerEvent("pointerleave", { pointerType: "mouse" }),
  );
  await vi.advanceTimersByTimeAsync(16);
}

/**
 * Helper to simulate a tap gesture
 */
export async function simulateTap(element: HTMLElement) {
  element.dispatchEvent(createPointerEvent("pointerdown"));
  await vi.advanceTimersByTimeAsync(16);
  element.dispatchEvent(createPointerEvent("pointerup"));
  await vi.advanceTimersByTimeAsync(16);
}

/**
 * Helper to get the current transform style as an object
 */
export function parseTransform(
  transformString: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /(\w+)\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(transformString)) !== null) {
    const key = match[1];
    const value = match[2];
    if (key !== undefined && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Mock matchMedia to return a specific value for prefers-reduced-motion
 */
export function mockReducedMotion(prefersReduced: boolean) {
  const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      query === "(prefers-reduced-motion: reduce)" ? prefersReduced : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });

  return mockMatchMedia;
}
