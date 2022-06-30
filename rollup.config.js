import { babel } from "@rollup/plugin-babel";

const babelOptions = {
  exclude: "node_modules/**",
  presets: ["@babel/preset-env"],
};

export default [
  {
    input: "src/traverse.js",
    output: [
      {
        file: "dist/traverse.js",
        format: "umd",
        name: "traverseTheUniverse",
      },
    ],
    plugins: [babel({ ...babelOptions, babelHelpers: "bundled" })],
  },
  {
    external: [/@babel\/runtime/],
    input: "src/traverse.js",
    output: [
      {
        file: "dist/traverse.cjs",
        format: "cjs",
        exports: "default",
      },
      {
        file: "dist/traverse.mjs",
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
