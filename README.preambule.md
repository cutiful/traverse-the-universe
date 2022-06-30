# traverse-the-universe

Yet another ESTree AST traversal library, making use of `this` binding and generators.

## Installation

NPM:

```
npm install traverse-the-universe
```

Yarn:

```
yarn add traverse-the-universe
```

Browsers (UMD):
```html
<script src="https://unpkg.com/traverse-the-universe"></script>
<script>
  traverseTheUniverse(ast, callback);
</script>
```

## Usage

Generate the abstract syntax tree using [acorn](https://www.npmjs.com/package/acorn) or a compatible library. Then, call `traverse(ast, callback)`, where `callback` is a function that accepts `node` as the only argument. Call methods on `this` to manipulate the tree.

If `callback` is a generator, the part after `yield` will be called before exiting the node. Only one `yield` is allowed.

### Examples

```js
import traverse from "traverse-the-universe";
// const traverse = require("traverse-the-universe");

traverse(ast, function (node) {
  console.log(node.type); // Identifier
  console.log(this.node.type); // equivalent to the line above, might be a bit slower

  console.log(this.path); // [ "body", 0, "body", "body", 0, "expression", "callee", "object" ]
  console.log(this.key); // "object"
  console.log(this.parentNode.type); // MemberExpression

  console.log(this.ancestors); // returns an array of parent nodes
  console.log(this.ancestors.map((a) => a.type)); // ["Program", "WhileStatement", "BlockStatement", "ExpressionStatement", "CallExpression", "MemberExpression"]

  this.skip(); // go to the next node on the next iteration, skipping the children of the current node

  const newNode = { ...node, name: "newName" };
  this.replace(newNode); // replace the current node with a new one, visit its children afterwards
  this.replace(newNode, true); // same, but without visiting its children
});
```

Using generators to run code before leaving each node:

```js
import traverse from "traverse-the-universe";
// const traverse = require("traverse-the-universe");

traverse(ast, function* (node) {
  console.log(node.type);

  yield;

  // will be executed before leaving the node (i. e. after all its children have been visited)
  console.log(node.type);
});
```

Inserting nodes before or after the current one:

```js
import traverse from "traverse-the-universe";
// const traverse = require("traverse-the-universe");

const logExpression = {
  type: "ExpressionStatement",
  expression: {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: { type: "Identifier", name: "console" },
      property: { type: "Identifier", name: "log" },
      computed: false,
      optional: false,
    },
    arguments: [
      {
        type: "Literal",
        value: "variable declaration",
        raw: "'variable declaration'",
      },
    ],
    optional: false,
  },
};
traverse(ast, function (node) {
  if (
    this.parentNode.type === "BlockStatement" &&
    node.type === "VariableDeclaration"
  ) {
    this.insertBefore(logExpression); // insert the node before the current one
    this.insertAfter(logExpression); // insert the node after the current one, visit the children of the current node and the inserted node afterwards
    this.insertAfter(logExpression, true); // same, but skipping both the current and inserted nodes
  }
});
```

# Documentation
