import { babel } from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";

const babelOptions = {
  exclude: "node_modules/**",
  presets: ["@babel/preset-env"],
};

export default [
  {
    input: "src/traverse.js",
    output: [
      {
        file: "dist/traverse.min.js",
        format: "umd",
        name: "traverseTheUniverse",
      },
    ],
    plugins: [babel({ ...babelOptions, babelHelpers: "bundled" }), terser()],
  },
  {
    external: [/@babel\/runtime/],
    input: ["src/traverse.js", "src/props.js"],
    output: [
      {
        dir: "dist/",
        entryFileNames: "[name].cjs",
        format: "cjs",
        exports: "default",
      },
      {
        dir: "dist/",
        entryFileNames: "[name].mjs",
        format: "es",
      },
    ],
    plugins: [
      babel({
        ...babelOptions,
        babelHelpers: "runtime",
        plugins: ["@babel/plugin-transform-runtime"],
      }),
    ],
  },
];
