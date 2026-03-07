import { Feature, frame, type PanInfo } from "motion-dom";

type PanEventHandler = (event: PointerEvent, info: PanInfo) => void;

const asyncHandler =
  (handler?: PanEventHandler) => (event: PointerEvent, info: PanInfo) => {
    if (handler) {
      frame.update(() => handler(event, info), false, true);
    }
  };

const createPoint = (event: PointerEvent) => ({
  x: event.clientX,
  y: event.clientY,
});

const createPanInfo = (
  point: { x: number; y: number },
  delta: { x: number; y: number },
  offset: { x: number; y: number },
  velocity: { x: number; y: number },
): PanInfo => ({
  point,
  delta,
  offset,
  velocity,
});

const isPrimaryPointer = (event: PointerEvent) =>
  event.pointerType === "mouse"
    ? typeof event.button !== "number" || event.button <= 0
    : event.isPrimary !== false;

export class PanFeature extends Feature<Element> {
  private removePointerDownListener: VoidFunction = () => undefined;
  private removeWindowListeners: VoidFunction = () => undefined;
  private isPanning = false;
  private sessionStarted = false;
  private startPoint = { x: 0, y: 0 };
  private lastPoint = { x: 0, y: 0 };
  private lastTime = 0;
  private velocity = { x: 0, y: 0 };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.sessionStarted) return;

    const point = createPoint(event);
    const now = performance.now();
    const delta = {
      x: point.x - this.lastPoint.x,
      y: point.y - this.lastPoint.y,
    };
    const offset = {
      x: point.x - this.startPoint.x,
      y: point.y - this.startPoint.y,
    };
    const dt = now - this.lastTime;

    if (dt > 0) {
      this.velocity = {
        x: ((point.x - this.lastPoint.x) / dt) * 1000,
        y: ((point.y - this.lastPoint.y) / dt) * 1000,
      };
    }

    const info = createPanInfo(point, delta, offset, this.velocity);

    if (!this.isPanning) {
      this.isPanning = true;
      asyncHandler(this.node.getProps().onPanStart)(event, info);
    }

    asyncHandler(this.node.getProps().onPan)(event, info);

    this.lastPoint = point;
    this.lastTime = now;
  };

  private onPointerEnd = (event: PointerEvent) => {
    if (!this.sessionStarted) return;

    const point = createPoint(event);
    const info = createPanInfo(
      point,
      { x: 0, y: 0 },
      {
        x: point.x - this.startPoint.x,
        y: point.y - this.startPoint.y,
      },
      this.velocity,
    );

    if (this.isPanning) {
      frame.postRender(() => this.node.getProps().onPanEnd?.(event, info));
    }

    this.sessionStarted = false;
    this.isPanning = false;
  };

  private onPointerDown = (event: PointerEvent) => {
    if (!isPrimaryPointer(event)) return;

    const point = createPoint(event);
    this.sessionStarted = true;
    this.isPanning = false;
    this.startPoint = point;
    this.lastPoint = point;
    this.lastTime = performance.now();
    this.velocity = { x: 0, y: 0 };

    asyncHandler(this.node.getProps().onPanSessionStart)(
      event,
      createPanInfo(point, { x: 0, y: 0 }, { x: 0, y: 0 }, this.velocity),
    );
  };

  override mount() {
    const current = this.node.current;
    if (!current) return;

    current.addEventListener(
      "pointerdown",
      this.onPointerDown as EventListener,
    );
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerEnd);
    window.addEventListener("pointercancel", this.onPointerEnd);

    this.removePointerDownListener = () =>
      current.removeEventListener(
        "pointerdown",
        this.onPointerDown as EventListener,
      );
    this.removeWindowListeners = () => {
      window.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("pointerup", this.onPointerEnd);
      window.removeEventListener("pointercancel", this.onPointerEnd);
    };
  }

  override unmount() {
    this.removePointerDownListener();
    this.removeWindowListeners();
  }
}
