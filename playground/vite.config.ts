import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      "motion-solid": path.resolve(__dirname, "../package/src/index.ts"),
    },
    dedupe: ["solid-js", "solid-js/web"],
  },
});
