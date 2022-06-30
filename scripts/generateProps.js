/**
 * Copyright 2022 cutiful (https://github.com/cutiful)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from "fs/promises";
import prettier from "prettier";

const ignoreTypes = ["SourceLocation", "RegExp"];
const specPath = new URL(
  "../node_modules/estree-formal/formal-data/es2022.json",
  import.meta.url
);
const outputPath = new URL("../src/props.js", import.meta.url);

function resolveBases(bases) {
  const meta = bases
    .map((b) => spec[b]?.base)
    .flat()
    .filter((b) => b);
  if (meta.length === 0) return bases;

  return bases.concat(resolveBases(meta));
}

function getBaseProps(name) {
  return resolveBases(spec[name].base)
    .reverse()
    .reduce((a, v) => Object.assign({}, a, spec[v].props), {});
}

function getProps(name) {
  const localProps = spec[name].props;
  const baseProps = getBaseProps(name);
  return { ...baseProps, ...localProps };
}

function useProp(prop) {
  if (ignoreTypes.includes(prop.name)) return false;
  if (enumNames.includes(prop.name)) return false;

  switch (prop.kind) {
    case "reference":
      return /^[A-Z]/.test(prop.name); // means it's a node, not a simple type like "string"
    case "union":
      return prop.types.filter((v) => useProp(v)).length !== 0;
    case "array":
      return useProp(prop.base);
  }
}

function getPropsToUse(name) {
  const props = getProps(name);

  return Object.entries(props)
    .map(([n, v]) => (useProp(v) ? n : null))
    .filter((x) => x !== null);
}

const spec = JSON.parse(
  await fs.readFile(specPath, {
    encoding: "utf-8",
  })
);

const names = Object.keys(spec)
  .filter((n) => spec[n].kind === "interface")
  .filter((n) => spec[n].props.type?.value === n);
const enumNames = Object.keys(spec).filter((n) => spec[n].kind === "enum");
const result = Object.fromEntries(names.map((n) => [n, getPropsToUse(n)]));

const source = `// THIS FILE WAS GENERATED AUTOMATICALLY, DO NOT EDIT BY HAND
const nodes = ${JSON.stringify(result, null, 2)};

export default nodes;`;
const formatted = prettier.format(source, { parser: "babel" });

fs.writeFile(outputPath, formatted);
