import { defineConfig } from "tsup";
import { solidPlugin } from "esbuild-plugin-solid";
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

  return preset.generateTsupOptions(parsedData).map((option) => {
    if (option.platform !== "browser") return option;

    return {
      ...option,
      esbuildPlugins: [
        solidPlugin({
          solid: {
            generate: "dom",
            hydratable: true,
          },
        }),
        ...(option.esbuildPlugins ?? []).filter(
          (plugin) => plugin.name !== "esbuild:solid",
        ),
      ],
    };
  });
});
