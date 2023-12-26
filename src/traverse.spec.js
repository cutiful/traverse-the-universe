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

import traverse from "./traverse.js";
import { parse } from "acorn";
import { generate } from "astring";

const consoleLogExpression = {
  type: "ExpressionStatement",
  expression: {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: "console",
      },
      property: {
        type: "Identifier",
        name: "log",
      },
      computed: false,
      optional: false,
    },
    arguments: [
      {
        type: "Literal",
        value: 1,
        raw: "1",
      },
    ],
    optional: false,
  },
};

describe("traversal", () => {
  it("goes into every expression", () => {
    const source = `const a = 1;
  function f(b, c, d = 2) {
    const e = () => c + 2;
  }`;
    const ast = parse(source, { ecmaVersion: "latest" });

    const list = [];
    traverse(ast, function (node) {
      list.push(node.type);
    });

    expect(list).toEqual([
      "Program",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "Literal",
      "FunctionDeclaration",
      "Identifier",
      "Identifier",
      "Identifier",
      "AssignmentPattern",
      "Identifier",
      "Literal",
      "BlockStatement",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "ArrowFunctionExpression",
      "BinaryExpression",
      "Identifier",
      "Literal",
    ]);
  });

  it("works with code blocks", () => {
    const source = `{
    const a = 1;
    const b = 2, c = 3;
  }

  const d = 4;
  `;
    const ast = parse(source, { ecmaVersion: "latest" });

    const list = [];
    traverse(ast, function (node) {
      list.push(node.type);
    });

    expect(list).toEqual([
      "Program",
      "BlockStatement",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "Literal",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "Literal",
      "VariableDeclarator",
      "Identifier",
      "Literal",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "Literal",
    ]);
  });

  it("skips correctly", () => {
    const source = `{
    const a = 1;
    const b = 2, c = 3;
  }

  function f() {
    console.log(a);
    console.log(b);
  }

  const d = 4;`;
    const ast = parse(source, { ecmaVersion: "latest" });

    const list = [];
    traverse(ast, function (node) {
      list.push(node.type);
      if (/Function/.test(node.type)) this.skip();
    });

    expect(list).toEqual([
      "Program",
      "BlockStatement",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "Literal",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "Literal",
      "VariableDeclarator",
      "Identifier",
      "Literal",
      "FunctionDeclaration",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "Literal",
    ]);
  });

  it("finds ancestors", () => {
    const source = `{
    const a = 1;
    const b = 2, c = 3;
  }

  function f() {
    console.log(() => "meow");
    console.log(b);
  }

  const d = 4;`;
    const ast = parse(source, { ecmaVersion: "latest" });

    const list = [];
    traverse(ast, function (node) {
      if (/ArrowFunction/.test(node.type))
        list.push(...this.ancestors.map((a) => a.type));
    });

    expect(list).toEqual([
      "Program",
      "FunctionDeclaration",
      "BlockStatement",
      "ExpressionStatement",
      "CallExpression",
    ]);
  });

  it("calls the generator when exiting a node", () => {
    const source = `{
    const a = 1;
    const b = 2, c = 3;
  }

  function f() {
    console.log(() => "meow");
    console.log(b);
  }

  const d = 4;`;
    const ast = parse(source, { ecmaVersion: "latest" });

    const entered = [];
    const left = [];
    traverse(ast, function* (node) {
      entered.push(this.path.join("/"));
      yield;
      left.push(this.path.join("/"));
    });

    expect(entered).toEqual([
      "",
      "body/0",
      "body/0/body/0",
      "body/0/body/0/declarations/0",
      "body/0/body/0/declarations/0/id",
      "body/0/body/0/declarations/0/init",
      "body/0/body/1",
      "body/0/body/1/declarations/0",
      "body/0/body/1/declarations/0/id",
      "body/0/body/1/declarations/0/init",
      "body/0/body/1/declarations/1",
      "body/0/body/1/declarations/1/id",
      "body/0/body/1/declarations/1/init",
      "body/1",
      "body/1/id",
      "body/1/body",
      "body/1/body/body/0",
      "body/1/body/body/0/expression",
      "body/1/body/body/0/expression/callee",
      "body/1/body/body/0/expression/callee/object",
      "body/1/body/body/0/expression/callee/property",
      "body/1/body/body/0/expression/arguments/0",
      "body/1/body/body/0/expression/arguments/0/body",
      "body/1/body/body/1",
      "body/1/body/body/1/expression",
      "body/1/body/body/1/expression/callee",
      "body/1/body/body/1/expression/callee/object",
      "body/1/body/body/1/expression/callee/property",
      "body/1/body/body/1/expression/arguments/0",
      "body/2",
      "body/2/declarations/0",
      "body/2/declarations/0/id",
      "body/2/declarations/0/init",
    ]);
    expect(left).toEqual([
      "body/0/body/0/declarations/0/id",
      "body/0/body/0/declarations/0/init",
      "body/0/body/0/declarations/0",
      "body/0/body/0",
      "body/0/body/1/declarations/0/id",
      "body/0/body/1/declarations/0/init",
      "body/0/body/1/declarations/0",
      "body/0/body/1/declarations/1/id",
      "body/0/body/1/declarations/1/init",
      "body/0/body/1/declarations/1",
      "body/0/body/1",
      "body/0",
      "body/1/id",
      "body/1/body/body/0/expression/callee/object",
      "body/1/body/body/0/expression/callee/property",
      "body/1/body/body/0/expression/callee",
      "body/1/body/body/0/expression/arguments/0/body",
      "body/1/body/body/0/expression/arguments/0",
      "body/1/body/body/0/expression",
      "body/1/body/body/0",
      "body/1/body/body/1/expression/callee/object",
      "body/1/body/body/1/expression/callee/property",
      "body/1/body/body/1/expression/callee",
      "body/1/body/body/1/expression/arguments/0",
      "body/1/body/body/1/expression",
      "body/1/body/body/1",
      "body/1/body",
      "body/1",
      "body/2/declarations/0/id",
      "body/2/declarations/0/init",
      "body/2/declarations/0",
      "body/2",
      "",
    ]);
  });

  it("traverses null nodes", () => {
    const source = `const [a, , b] = [1, 2, 3];`;
    const ast = parse(source, { ecmaVersion: "latest" });

    const list = [];
    traverse(ast, function (node) {
      list.push(node.type);
    });

    expect(list).toEqual([
      "Program",
      "VariableDeclaration",
      "VariableDeclarator",
      "ArrayPattern",
      "Identifier",
      "Identifier",
      "ArrayExpression",
      "Literal",
      "Literal",
      "Literal",
    ]);
  });
});

describe("modification", () => {
  it("replaces node without skipping", () => {
    const source = `function f() {
    console.log(() => "meow");
    console.log(b);
  }

  const d = 4;`;
    const ast = parse(source, { ecmaVersion: "latest" });

    let visitedIdentifierC = false;
    traverse(ast, function (node) {
      if (node.type === "ArrowFunctionExpression")
        this.replace({
          type: "ObjectExpression",
          properties: [
            {
              type: "Identifier",
              name: "c",
            },
          ],
        });

      if (node.type === "Identifier" && node.name === "c")
        visitedIdentifierC = true;
    });

    expect(generate(ast)).toBe(
      `function f() {
  console.log({
    c
  });
  console.log(b);
}
const d = 4;
`,
    );

    expect(visitedIdentifierC).toBe(true);
  });

  it("replaces node and skips it", () => {
    const source = `function f() {
    console.log(() => "meow");
    console.log(b);
  }

  const d = 4;
`;
    const ast = parse(source, { ecmaVersion: "latest" });

    let visitedIdentifierC = false;
    traverse(ast, function (node) {
      if (node.type === "ArrowFunctionExpression")
        this.replace(
          {
            type: "ObjectExpression",
            properties: [
              {
                type: "Identifier",
                name: "c",
              },
            ],
          },
          true,
        );

      if (node.type === "Identifier" && node.name === "c")
        visitedIdentifierC = true;
    });

    // prettier-ignore
    expect(generate(ast)).toBe(
`function f() {
  console.log({
    c
  });
  console.log(b);
}
const d = 4;
`);

    expect(visitedIdentifierC).toBe(false);
  });

  it("replaces node with an array of nodes without skipping", () => {
    const source = `function f() {
    console.log(() => "meow");
    console.log(b);
  }

  const d = 4;
  `;
    const ast = parse(source, { ecmaVersion: "latest" });

    let visitedIdentifierCTimes = 0;
    traverse(ast, function (node) {
      if (node.type === "ArrowFunctionExpression")
        this.replace([
          {
            type: "ObjectExpression",
            properties: [
              {
                type: "Identifier",
                name: "c",
              },
            ],
          },
          {
            type: "ObjectExpression",
            properties: [
              {
                type: "Identifier",
                name: "c",
              },
            ],
          },
        ]);

      if (node.type === "Identifier" && node.name === "c")
        visitedIdentifierCTimes++;
    });

    // prettier-ignore
    expect(generate(ast)).toBe(
`function f() {
  console.log({
    c
  }, {
    c
  });
  console.log(b);
}
const d = 4;
`);

    expect(visitedIdentifierCTimes).toBe(2);
  });

  it("replaces node with an array of nodes and skips", () => {
    const source = `function f() {
    console.log(() => "meow");
    console.log(b);
  }

  const d = 4;
  `;
    const ast = parse(source, { ecmaVersion: "latest" });

    let visitedIdentifierCTimes = 0;
    traverse(ast, function (node) {
      if (node.type === "ArrowFunctionExpression")
        this.replace(
          [
            {
              type: "ObjectExpression",
              properties: [
                {
                  type: "Identifier",
                  name: "c",
                },
              ],
            },
            {
              type: "ObjectExpression",
              properties: [
                {
                  type: "Identifier",
                  name: "c",
                },
              ],
            },
          ],
          true,
        );

      if (node.type === "Identifier" && node.name === "c")
        visitedIdentifierCTimes++;
    });

    // prettier-ignore
    expect(generate(ast)).toBe(
`function f() {
  console.log({
    c
  }, {
    c
  });
  console.log(b);
}
const d = 4;
`);

    expect(visitedIdentifierCTimes).toBe(0);
  });

  it("inserts before node", () => {
    const source = `function f() {
    console.log(() => "meow");
  }`;
    const ast = parse(source, { ecmaVersion: "latest" });

    traverse(ast, function (node) {
      if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "CallExpression"
      )
        this.insertBefore(consoleLogExpression);
    });

    // prettier-ignore
    expect(generate(ast)).toBe(
`function f() {
  console.log(1);
  console.log(() => "meow");
}
`);
  });

  it("inserts after node without skipping", () => {
    const source = `function f() {
    console.log(() => "meow");
  }`;
    const ast = parse(source, { ecmaVersion: "latest" });

    let visitedOne = false;
    traverse(ast, function (node) {
      if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "CallExpression" &&
        node.expression.arguments[0].type === "ArrowFunctionExpression"
      )
        this.insertAfter(consoleLogExpression);

      if (node.type === "Literal" && node.value === 1) visitedOne = true;
    });

    // prettier-ignore
    expect(generate(ast)).toBe(
`function f() {
  console.log(() => "meow");
  console.log(1);
}
`);
    expect(visitedOne).toBe(true);
  });

  it("inserts after node and skips", () => {
    const source = `function f() {
    console.log(() => "meow");
  }`;
    const ast = parse(source, { ecmaVersion: "latest" });

    let visitedOne = false;
    traverse(ast, function (node) {
      if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "CallExpression" &&
        node.expression.arguments[0].type === "ArrowFunctionExpression"
      )
        this.insertAfter(consoleLogExpression, true);

      if (node.type === "Literal" && node.value === 1) visitedOne = true;
    });

    // prettier-ignore
    expect(generate(ast)).toBe(
`function f() {
  console.log(() => "meow");
  console.log(1);
}
`);
    expect(visitedOne).toBe(false);
  });
});
