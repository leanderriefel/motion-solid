import { onCleanup, onMount } from "solid-js";
import { createNoise3D } from "simplex-noise";
import { cn } from "~/utils/cn";

const DEBUG =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") !== null;

const GRID_PADDING = 24;
const GRID_STEP = 16;
const DOT_SIZE = 1.5;
const DOT_ORBIT_RADIUS = 15;
const NOISE_SCALE = 500;
const FORCEFIELD_RADIUS = 250;
const FORCEFIELD_RADIUS_SQ = FORCEFIELD_RADIUS * FORCEFIELD_RADIUS;
const FORCEFIELD_STRENGTH = 25;
const BASE_COLOR = [20 / 255, 136 / 255, 252 / 255] as const;
const MOUSE_SENTINEL = -10000;
const OFFSCREEN_SENTINEL = -2;

const FILL_STYLES = Array.from(
  { length: 101 },
  (_, i) => `rgba(20, 136, 252, ${i / 100})`,
);

type PointerState = {
  active: boolean;
  x: number;
  y: number;
};

type DotGrid = {
  positions: Float32Array;
  samples: Float32Array;
  count: number;
};

type BackgroundRenderer = {
  frameIntervalMs: number;
  resize(width: number, height: number, dpr: number): void;
  draw(timestamp: number, pointer: PointerState): void;
  clear(): void;
  dispose(): void;
};

const EMPTY_GRID: DotGrid = {
  positions: new Float32Array(0),
  samples: new Float32Array(0),
  count: 0,
};

const VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;

uniform vec2 uViewport;
uniform vec2 uMouse;
uniform float uScale;
uniform float uTime;

varying float vAlpha;

vec4 permute(vec4 value) {
  return mod(((value * 34.0) + 1.0) * value, 289.0);
}

vec4 taylorInvSqrt(vec4 value) {
  return 1.79284291400159 - 0.85373472095314 * value;
}

float snoise(vec3 value) {
  const vec2 c = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 d = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(value + dot(value, c.yyy));
  vec3 x0 = value - i + dot(i, c.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + c.xxx;
  vec3 x2 = x0 - i2 + c.yyy;
  vec3 x3 = x0 - d.yyy;

  i = mod(i, 289.0);
  vec4 p = permute(
    permute(
      permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0)
    )
    + i.x + vec4(0.0, i1.x, i2.x, 1.0)
  );

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * d.wyz - d.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(
    dot(p0, p0),
    dot(p1, p1),
    dot(p2, p2),
    dot(p3, p3)
  ));

  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(
    dot(x0, x0),
    dot(x1, x1),
    dot(x2, x2),
    dot(x3, x3)
  ), 0.0);

  m = m * m;
  return 42.0 * dot(
    m * m,
    vec4(
      dot(p0, x0),
      dot(p1, x1),
      dot(p2, x2),
      dot(p3, x3)
    )
  );
}

float hash12(vec2 value) {
  vec3 p3 = fract(vec3(value.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  float rad = snoise(vec3(aPosition / 500.0, uTime / 20.0)) * 2.0;
  if (rad < -0.5) {
    vAlpha = 0.0;
    gl_Position = vec4(${OFFSCREEN_SENTINEL}.0, ${OFFSCREEN_SENTINEL}.0, 0.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  float delta = snoise(vec3(aPosition / 500.0, uTime / 10.0)) * 3.0;
  vec2 offset = vec2(cos(delta), sin(delta)) * ${DOT_ORBIT_RADIUS}.0;

  vec2 mouseDelta = aPosition - uMouse;
  float mouseDistanceSq = dot(mouseDelta, mouseDelta);
  if (uMouse.x > ${MOUSE_SENTINEL + 1}.0 && mouseDistanceSq < ${FORCEFIELD_RADIUS_SQ}.0) {
    float mouseDistance = max(sqrt(mouseDistanceSq), 0.0001);
    float pushStrength = (1.0 - mouseDistance / ${FORCEFIELD_RADIUS}.0) * ${FORCEFIELD_STRENGTH}.0;
    offset += (mouseDelta / mouseDistance) * pushStrength;
  }

  float flicker = hash12(aPosition * 0.125 + floor(uTime * 8.0));
  vAlpha = floor(clamp((rad + 0.75 - flicker) * 100.0, 0.0, 100.0)) / 100.0;

  vec2 transformed = aPosition + offset;
  vec2 clip = transformed / uViewport * 2.0 - 1.0;

  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = ${DOT_SIZE} * uScale;
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

varying float vAlpha;

void main() {
  if (vAlpha <= 0.0) {
    discard;
  }

  gl_FragColor = vec4(
    ${BASE_COLOR[0].toFixed(8)},
    ${BASE_COLOR[1].toFixed(8)},
    ${BASE_COLOR[2].toFixed(8)},
    vAlpha
  );
}
`;

const MINIMAL_VERTEX_SHADER = `
attribute vec2 aPosition;
uniform vec2 uViewport;
uniform float uScale;

void main() {
  vec2 clip = aPosition / uViewport * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = ${DOT_SIZE} * uScale;
}
`;

const MINIMAL_FRAGMENT_SHADER = `
precision mediump float;
void main() {
  gl_FragColor = vec4(
    ${BASE_COLOR[0].toFixed(8)},
    ${BASE_COLOR[1].toFixed(8)},
    ${BASE_COLOR[2].toFixed(8)},
    0.8
  );
}
`;

export const BackgroundDots = (props: { class?: string; opacity?: number }) => {
  // oxlint-disable-next-line no-unassigned-vars
  let canvasRef!: HTMLCanvasElement;
  let rafId = 0;

  onMount(() => {
    if (!canvasRef) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const pointer: PointerState = { active: false, x: 0, y: 0 };

    const debugParam = new URLSearchParams(window.location.search).get("debug");
    const forceCanvas2D = DEBUG && debugParam === "2d";
    const useMinimalShader = DEBUG && debugParam === "webgl";

    let renderer: BackgroundRenderer | undefined;
    let rendererType: string;
    if (forceCanvas2D) {
      renderer = createCanvas2DRenderer(canvasRef);
      rendererType = "Canvas2D (forced)";
    } else {
      const webgl = createWebGlRenderer(canvasRef, useMinimalShader);
      renderer = webgl ?? createCanvas2DRenderer(canvasRef);
      rendererType = webgl
        ? useMinimalShader
          ? "WebGL (minimal shader)"
          : "WebGL"
        : "Canvas2D (fallback)";
    }
    if (!renderer) {
      if (DEBUG) console.error("[BackgroundDots] No renderer available");
      return;
    }

    if (DEBUG) {
      console.log("[BackgroundDots]", {
        renderer: rendererType,
        debugParam,
        hint: "?debug=2d forces Canvas2D, ?debug=webgl uses minimal WebGL shader",
      });
    }

    let w = window.innerWidth;
    let h = window.innerHeight;
    let running = false;
    let lastDraw = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      renderer.resize(w, h, window.devicePixelRatio || 1);
    };

    const stop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      running = false;
      renderer.clear();
    };

    const frame = (timestamp: number) => {
      if (document.hidden || reducedMotionQuery.matches) {
        running = false;
        rafId = 0;
        renderer.clear();
        return;
      }

      if (lastDraw === 0 || timestamp - lastDraw >= renderer.frameIntervalMs) {
        renderer.draw(timestamp, pointer);
        lastDraw = timestamp;
        if (
          DEBUG &&
          Math.floor(timestamp / 5000) >
            Math.floor((timestamp - renderer.frameIntervalMs) / 5000)
        ) {
          console.log("[BackgroundDots] draw tick", {
            timestamp: Math.floor(timestamp),
          });
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;

      pointer.active = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const resetPointer = () => {
      pointer.active = false;
    };

    const start = () => {
      if (running || reducedMotionQuery.matches || document.hidden) return;

      running = true;
      rafId = requestAnimationFrame(frame);
    };

    const handleResize = () => {
      resize();
      lastDraw = 0;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }
      start();
    };

    const handleReducedMotionChange = () => {
      if (reducedMotionQuery.matches) {
        stop();
        return;
      }
      start();
    };

    resize();
    start();

    const removeReducedMotionListener = addMediaQueryListener(
      reducedMotionQuery,
      handleReducedMotionChange,
    );

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("blur", resetPointer, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    onCleanup(() => {
      stop();
      removeReducedMotionListener();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("blur", resetPointer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      renderer.dispose();
    });
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        class={cn(
          "pointer-events-none fixed inset-0 h-screen w-screen motion-reduce:hidden z-[-2]",
          props.class,
        )}
        aria-hidden="true"
        style={{ opacity: props.opacity ?? 1 }}
      />
      {DEBUG && (
        <div
          class="fixed bottom-4 left-4 z-9999 rounded-lg bg-red-500/90 px-3 py-2 font-mono text-xs text-white shadow-lg"
          role="status"
        >
          <div>BackgroundDots DEBUG</div>
          <div>?debug=2d → force Canvas2D</div>
          <div>?debug=webgl → minimal WebGL shader</div>
        </div>
      )}
    </>
  );
};

function createWebGlRenderer(
  canvas: HTMLCanvasElement,
  useMinimalShader = false,
): BackgroundRenderer | undefined {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
    powerPreference: "low-power",
  });

  if (!gl) {
    if (DEBUG) console.warn("[BackgroundDots] WebGL context failed");
    return undefined;
  }

  const vertexSource = useMinimalShader
    ? MINIMAL_VERTEX_SHADER
    : VERTEX_SHADER_SOURCE;
  const fragmentSource = useMinimalShader
    ? MINIMAL_FRAGMENT_SHADER
    : FRAGMENT_SHADER_SOURCE;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return undefined;
  }

  const program = linkProgram(gl, vertexShader, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!program) return undefined;

  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    gl.deleteProgram(program);
    return undefined;
  }

  const positionLocation = gl.getAttribLocation(program, "aPosition");
  const viewportLocation = gl.getUniformLocation(program, "uViewport");
  const mouseLocation = gl.getUniformLocation(program, "uMouse");
  const scaleLocation = gl.getUniformLocation(program, "uScale");
  const timeLocation = gl.getUniformLocation(program, "uTime");

  if (
    positionLocation < 0 ||
    viewportLocation === null ||
    scaleLocation === null ||
    (!useMinimalShader && (mouseLocation === null || timeLocation === null))
  ) {
    if (DEBUG)
      console.warn("[BackgroundDots] WebGL uniform/attrib locations failed", {
        positionLocation,
        viewportLocation,
        mouseLocation,
        scaleLocation,
        timeLocation,
      });
    gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);
    return undefined;
  }

  let pointCount = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let dpr = 1;

  gl.clearColor(0, 0, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    frameIntervalMs: 1000 / 60,
    resize(width, height, nextDpr) {
      viewportWidth = width;
      viewportHeight = height;
      dpr = nextDpr > 0 ? nextDpr : 1;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);

      const grid = createDotGrid(width, height);
      pointCount = grid.count;
      if (DEBUG)
        console.log("[BackgroundDots] WebGL resize", {
          width,
          height,
          pointCount,
        });

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, grid.positions, gl.STATIC_DRAW);
    },
    draw(timestamp, pointer) {
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (pointCount === 0 || viewportWidth === 0 || viewportHeight === 0) {
        return;
      }

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(viewportLocation, viewportWidth, viewportHeight);
      if (mouseLocation)
        gl.uniform2f(
          mouseLocation,
          pointer.active ? pointer.x : MOUSE_SENTINEL,
          pointer.active ? pointer.y : MOUSE_SENTINEL,
        );
      gl.uniform1f(scaleLocation, dpr);
      if (timeLocation) gl.uniform1f(timeLocation, timestamp * 0.001);

      gl.drawArrays(gl.POINTS, 0, pointCount);
    },
    clear() {
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    dispose() {
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    },
  };
}

function createCanvas2DRenderer(
  canvas: HTMLCanvasElement,
): BackgroundRenderer | undefined {
  const ctx = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true,
  });

  if (!ctx) return undefined;

  const noise = createNoise3D();
  const buckets: number[][] = Array.from({ length: 101 }, () => []);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let grid = EMPTY_GRID;

  return {
    frameIntervalMs: 1000 / 30,
    resize(nextWidth, nextHeight, nextDpr) {
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr > 0 ? nextDpr : 1;
      grid = createDotGrid(width, height);
      if (DEBUG)
        console.log("[BackgroundDots] Canvas2D resize", {
          width,
          height,
          pointCount: grid.count,
        });

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
    },
    draw(timestamp, pointer) {
      if (width === 0 || height === 0 || grid.count === 0) return;

      ctx.clearRect(0, 0, width, height);

      for (let i = 1; i <= 100; i++) buckets[i].length = 0;

      const noiseTime1 = timestamp / 20000;
      const noiseTime2 = timestamp / 10000;
      const flickerTick = Math.floor(timestamp / 125);

      const positions = grid.positions;
      const samples = grid.samples;

      for (let i = 0, offset = 0; i < grid.count; i++, offset += 2) {
        const x = positions[offset];
        const y = positions[offset + 1];
        const sizedX = samples[offset];
        const sizedY = samples[offset + 1];

        const rad = noise(sizedX, sizedY, noiseTime1) * 2;
        if (rad < -0.5) continue;

        const delta = noise(sizedX, sizedY, noiseTime2) * 3;
        let offsetX = Math.cos(delta) * DOT_ORBIT_RADIUS;
        let offsetY = Math.sin(delta) * DOT_ORBIT_RADIUS;

        if (pointer.active) {
          const distX = x - pointer.x;
          const distY = y - pointer.y;
          const distanceSq = distX * distX + distY * distY;
          if (distanceSq < FORCEFIELD_RADIUS_SQ) {
            const distance = Math.max(Math.sqrt(distanceSq), 0.0001);
            const pushStrength =
              (1 - distance / FORCEFIELD_RADIUS) * FORCEFIELD_STRENGTH;
            offsetX += (distX / distance) * pushStrength;
            offsetY += (distY / distance) * pushStrength;
          }
        }

        const alpha = Math.floor(
          clamp((rad + 0.75 - hashDotAlpha(i, flickerTick)) * 100, 0, 100),
        );
        if (alpha === 0) continue;

        buckets[alpha].push(x + offsetX, y + offsetY);
      }

      for (let i = 1; i <= 100; i++) {
        const bucket = buckets[i];
        if (bucket.length === 0) continue;

        ctx.fillStyle = FILL_STYLES[i];
        ctx.beginPath();
        for (let j = 0; j < bucket.length; j += 2) {
          ctx.rect(
            bucket[j] - DOT_SIZE / 2,
            bucket[j + 1] - DOT_SIZE / 2,
            DOT_SIZE,
            DOT_SIZE,
          );
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      ctx.clearRect(0, 0, width, height);
    },
    dispose() {},
  };
}

function createDotGrid(width: number, height: number): DotGrid {
  if (width <= 0 || height <= 0) return EMPTY_GRID;

  const positions: number[] = [];
  const samples: number[] = [];

  for (let x = -GRID_PADDING; x < width + GRID_PADDING; x += GRID_STEP) {
    for (let y = -GRID_PADDING; y < height + GRID_PADDING; y += GRID_STEP) {
      positions.push(x, y);
      samples.push(x / NOISE_SCALE, y / NOISE_SCALE);
    }
  }

  return {
    positions: new Float32Array(positions),
    samples: new Float32Array(samples),
    count: positions.length / 2,
  };
}

function addMediaQueryListener(
  mediaQuery: MediaQueryList,
  listener: () => void,
) {
  const handler = () => {
    listener();
  };
  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return undefined;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }

  const log = gl.getShaderInfoLog(shader) ?? "WebGL shader compilation failed.";
  console.warn("[BackgroundDots]", log);
  if (DEBUG)
    console.warn(
      "[BackgroundDots] Shader source:",
      source.slice(0, 200) + "...",
    );
  gl.deleteShader(shader);
  return undefined;
}

function linkProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = gl.createProgram();
  if (!program) return undefined;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program;
  }

  console.warn(
    gl.getProgramInfoLog(program) ?? "WebGL program linking failed.",
  );
  gl.deleteProgram(program);
  return undefined;
}

function hashDotAlpha(index: number, tick: number) {
  const value = Math.imul(index + 1, 1103515245) ^ Math.imul(tick + 1, 12345);
  return ((value >>> 0) & 1023) / 1023;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
