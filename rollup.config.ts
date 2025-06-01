/* eslint-disable import-x/no-extraneous-dependencies */
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "src/cli.ts",
  output: {
    file: "dist/cli.js",
    format: "es",
    sourcemap: true,
    compact: true,
    inlineDynamicImports: false
  },
  perf: true,
  plugins: [
    typescript({ tsconfig: "tsconfig.json", sourceMap: true }),
    terser({ format: { ecma: 2020 }, compress: { passes: 3 }, sourceMap: true })
  ]
});
