"use client";

import { createNoise3D } from "simplex-noise";
import { onCleanup, onMount } from "solid-js";
import { motion } from "../../../package/src/component/index";
import { cn } from "~/utils/cn";

const TWO_PI = Math.PI * 2;
const FORCEFIELD_RADIUS = 250;
const FORCEFIELD_STRENGTH = 25;

const FILL_STYLES = Array.from(
  { length: 101 },
  (_, i) => `rgba(20, 136, 252, ${i / 100})`,
);

export const BackgroundDots = (props: { class?: string; opacity?: number }) => {
  let canvasRef!: HTMLCanvasElement;
  let rafId: number;

  const abortController = new AbortController();
  const signal = abortController.signal;

  onMount(() => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    let h: number = window.innerHeight;
    let w: number = window.innerWidth;

    const scale = window.devicePixelRatio || 1;
    canvasRef.width = w * scale;
    canvasRef.height = h * scale;
    ctx.scale(scale, scale);

    const noise = createNoise3D();

    let mouseX: number | undefined;
    let mouseY: number | undefined;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;

      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener("pointermove", handlePointerMove, { signal });

    const handleResize = () => {
      h = window.innerHeight;
      w = window.innerWidth;

      if (!canvasRef) return;

      const scale = window.devicePixelRatio || 1;
      canvasRef.width = w * scale;
      canvasRef.height = h * scale;
      ctx.scale(scale, scale);
    };

    window.addEventListener("resize", handleResize, { signal });

    // Reuse buckets to avoid GC churn
    const buckets: number[][] = Array.from({ length: 101 }, () => []);

    const drawDots = (timestamp: number) => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i <= 100; i++) buckets[i].length = 0;

      const noiseTime1 = timestamp / 20000;
      const noiseTime2 = timestamp / 10000;

      for (let x = -24; x < w + 24; x += 16) {
        for (let y = -24; y < h + 24; y += 16) {
          const sizedX = x / 500;
          const sizedY = y / 500;

          const rad = noise(sizedX, sizedY, noiseTime1) * 2;
          if (rad + 0.5 < 0) continue;

          const delta = noise(sizedX, sizedY, noiseTime2) * 3;

          let offsetX = 0,
            offsetY = 0;

          if (mouseX !== undefined && mouseY !== undefined) {
            const distX = x - mouseX;
            const distY = y - mouseY;
            const distanceSq = distX * distX + distY * distY;
            if (distanceSq < FORCEFIELD_RADIUS * FORCEFIELD_RADIUS) {
              const distance = Math.sqrt(distanceSq);
              const pushStrength =
                (1 - distance / FORCEFIELD_RADIUS) * FORCEFIELD_STRENGTH;
              offsetX = (distX / distance) * pushStrength;
              offsetY = (distY / distance) * pushStrength;
            }
          }

          const dotX = x + Math.cos(delta) * 15 + offsetX;
          const dotY = y + Math.sin(delta) * 15 + offsetY;

          const alpha = Math.max(
            0,
            Math.min(100, Math.floor((rad + 0.75 - Math.random()) * 100)),
          );

          buckets[alpha].push(dotX, dotY);
        }
      }

      // Batch draw calls by alpha group
      for (let i = 0; i <= 100; i++) {
        const bucket = buckets[i];
        if (bucket.length === 0) continue;

        ctx.fillStyle = FILL_STYLES[i];
        ctx.beginPath();
        for (let j = 0; j < bucket.length; j += 2) {
          ctx.rect(bucket[j] - 0.75, bucket[j + 1] - 0.75, 1.5, 1.5);
        }
        ctx.fill();
      }

      rafId = requestAnimationFrame(drawDots);
    };

    rafId = requestAnimationFrame(drawDots);
  });

  onCleanup(() => {
    abortController.abort();
    if (rafId) cancelAnimationFrame(rafId);
  });

  return (
    <>
      <motion.canvas
        ref={canvasRef}
        class={cn(
          "fixed inset-0 w-screen h-screen motion-reduce:hidden -z-2",
          props.class,
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: props.opacity ?? 1 }}
        transition={{ duration: 3, ease: "easeInOut" }}
      />
    </>
  );
};
