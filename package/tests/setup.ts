import { vi, beforeEach, afterEach, expect } from "vitest";
import "@testing-library/jest-dom/vitest";

// Global fake timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

// Mock IntersectionObserver (not available in jsdom)
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(public callback: IntersectionObserverCallback) {
    // Store the callback so tests can trigger it
    (globalThis as any).__latestIntersectionObserverCallback = callback;
    (globalThis as any).__latestIntersectionObserver = this;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Mock matchMedia (for reduced motion tests)
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
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

// Mock requestAnimationFrame with microtask-based execution for fake timers
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  const id = ++rafId;
  rafCallbacks.set(id, cb);
  // Use setTimeout so fake timers can control it
  setTimeout(() => {
    const callback = rafCallbacks.get(id);
    if (callback) {
      rafCallbacks.delete(id);
      callback(performance.now());
    }
  }, 16); // ~60fps
  return id;
});

vi.stubGlobal("cancelAnimationFrame", (id: number) => {
  rafCallbacks.delete(id);
});

// Mock getComputedStyle to return reasonable defaults
const originalGetComputedStyle = window.getComputedStyle;
vi.stubGlobal(
  "getComputedStyle",
  (element: Element, pseudoElt?: string | null) => {
    const result = originalGetComputedStyle(element, pseudoElt);
    // Return a proxy that provides default values for common properties
    return new Proxy(result, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof value === "function") {
          return value.bind(target);
        }
        // Provide defaults for commonly accessed properties
        if (prop === "transform") return value || "none";
        if (prop === "opacity") return value || "1";
        if (prop === "position") return value || "static";
        return value;
      },
    });
  },
);

// Ensure Element.prototype.animate exists (jsdom doesn't have WAAPI)
if (typeof Element.prototype.animate !== "function") {
  Element.prototype.animate = function (
    _keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    _options?: number | KeyframeAnimationOptions,
  ): Animation {
    // Internal state
    const state = {
      playState: "finished" as AnimationPlayState,
      onfinish: null as ((event: AnimationPlaybackEvent) => void) | null,
      oncancel: null as ((event: AnimationPlaybackEvent) => void) | null,
      onremove: null as ((event: AnimationPlaybackEvent) => void) | null,
    };

    // Return a minimal mock Animation object with immediately resolved finished promise
    const animation = {
      finished: Promise.resolve(null as unknown as Animation),
      ready: Promise.resolve(null as unknown as Animation),
      pending: false,
      get playState() {
        return state.playState;
      },
      currentTime: 0,
      startTime: 0,
      effect: null,
      id: "",
      timeline: null,
      playbackRate: 1,
      replaceState: "active" as AnimationReplaceState,
      get oncancel() {
        return state.oncancel;
      },
      set oncancel(value) {
        state.oncancel = value;
      },
      get onfinish() {
        return state.onfinish;
      },
      set onfinish(value) {
        state.onfinish = value;
      },
      get onremove() {
        return state.onremove;
      },
      set onremove(value) {
        state.onremove = value;
      },
      cancel: vi.fn(() => {
        state.playState = "idle";
      }),
      finish: vi.fn(() => {
        state.playState = "finished";
        state.onfinish?.(new AnimationPlaybackEvent("finish"));
      }),
      play: vi.fn(),
      pause: vi.fn(),
      reverse: vi.fn(),
      updatePlaybackRate: vi.fn(),
      persist: vi.fn(),
      commitStyles: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    };

    return animation as unknown as Animation;
  };
}
