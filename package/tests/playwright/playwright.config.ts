import { defineConfig, devices } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, "../..");
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: resolve(currentDir, "specs"),
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  reporter: isCI
    ? [
        ["list"],
        [
          "html",
          {
            outputFolder: resolve(packageRoot, "playwright-report"),
            open: "never",
          },
        ],
      ]
    : [["list"]],
  outputDir: resolve(packageRoot, "test-results"),
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "bun run test:browser:harness",
    cwd: packageRoot,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      grep: /@smoke/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      grep: /@smoke/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
