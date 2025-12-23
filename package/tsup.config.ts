import { defineConfig } from "tsup";
import * as preset from "tsup-preset-solid";

const presetOptions: preset.PresetOptions = {
  entries: [
    {
      entry: "src/index.ts",
    },
  ],
  drop_console: false,
  cjs: true,
};

export default defineConfig((config) => {
  const watching = !!config.watch;

  const parsedData = preset.parsePresetOptions(presetOptions, watching);

  if (!watching) {
    const packageFields = preset.generatePackageExports(parsedData);

    console.log(
      `\npackage.json exports:\n${JSON.stringify(packageFields, null, 2)}\n`,
    );
  }

  return preset.generateTsupOptions(parsedData);
});
