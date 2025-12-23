import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["motion-solid"],
    },
    resolve: {
      alias: {
        "motion-solid": fileURLToPath(
          new URL("../package/src/index.ts", import.meta.url),
        ),
      },
    },
  },
});
