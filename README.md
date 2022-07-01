# traverse-the-universe

Yet another ESTree AST traversal/modification library, making use of `this` binding and generators. Supports ES2022 via rules generated from [ESTree formal data](https://github.com/estree/formal).

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
  console.log(this.parentNode?.type); // MemberExpression

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
    this.parentNode?.type === "BlockStatement" &&
    node.type === "VariableDeclaration"
  ) {
    this.insertBefore(logExpression); // insert the node before the current one
    this.insertAfter(logExpression); // insert the node after the current one, visit the children of the current node and the inserted node afterwards
    this.insertAfter(logExpression, true); // same, but skipping both the current and inserted nodes
  }
});
```

# Documentation

<!-- The reason we aren't using the templating feature of jsdoc2md is that we couldn't run Prettier on a .hbs file -->
## Classes

<dl>
<dt><a href="#TraversalState">TraversalState</a></dt>
<dd><p>The traversal state which the callback will be bound to. Use <code>this</code> inside
the callback to access its methods.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#traverse">traverse(ast, callback)</a></dt>
<dd><p>Traverses the supplied AST. Goes into every child Node.</p>
</dd>
</dl>

<a name="TraversalState"></a>

## TraversalState
The traversal state which the callback will be bound to. Use `this` inside
the callback to access its methods.

**Kind**: global class  

* [TraversalState](#TraversalState)
    * [.path](#TraversalState+path)
    * [.node](#TraversalState+node)
    * [.parentNode](#TraversalState+parentNode)
    * [.parentElement](#TraversalState+parentElement)
    * [.key](#TraversalState+key)
    * [.ancestors](#TraversalState+ancestors)
    * [.getElementAt(path)](#TraversalState+getElementAt)
    * [.skip()](#TraversalState+skip)
    * [.replace(node, skip)](#TraversalState+replace)
    * [.insertBefore(node)](#TraversalState+insertBefore)
    * [.insertAfter(node, skipBoth)](#TraversalState+insertAfter)

<a name="TraversalState+path"></a>

### traversalState.path
Returns the path to the current node as an array of keys. E. g.: `[ "body", 0, "body", "body", 0, "expression", "callee", "object" ]` is the path to the node at `ast.body[0].body.body[0].expression.callee.object`.

**Kind**: instance property of [<code>TraversalState</code>](#TraversalState)  
<a name="TraversalState+node"></a>

### traversalState.node
Returns the current node.

**Kind**: instance property of [<code>TraversalState</code>](#TraversalState)  
<a name="TraversalState+parentNode"></a>

### traversalState.parentNode
Returns the parent node.

**Kind**: instance property of [<code>TraversalState</code>](#TraversalState)  
<a name="TraversalState+parentElement"></a>

### traversalState.parentElement
Returns the parent element. The difference between this method and [parentNode](#TraversalState+parentNode) is that the latter always returns an AST node, whereas this method may return an array of nodes. E. g. if the current node is located inside `body` of a `BlockStatement`.

**Kind**: instance property of [<code>TraversalState</code>](#TraversalState)  
<a name="TraversalState+key"></a>

### traversalState.key
Returns the last element of the path.

**Kind**: instance property of [<code>TraversalState</code>](#TraversalState)  
<a name="TraversalState+ancestors"></a>

### traversalState.ancestors
Returns an array of ancestor nodes.

**Kind**: instance property of [<code>TraversalState</code>](#TraversalState)  
<a name="TraversalState+getElementAt"></a>

### traversalState.getElementAt(path)
Returns the element at specified path.

**Kind**: instance method of [<code>TraversalState</code>](#TraversalState)  

| Param | Type |
| --- | --- |
| path | <code>array</code> | 

<a name="TraversalState+skip"></a>

### traversalState.skip()
Skips the children of the current node in the next iteration.

**Kind**: instance method of [<code>TraversalState</code>](#TraversalState)  
<a name="TraversalState+replace"></a>

### traversalState.replace(node, skip)
Replaces the current node.

**Kind**: instance method of [<code>TraversalState</code>](#TraversalState)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>object</code> | The new node. |
| skip | <code>boolean</code> | If true, skips the new node. |

<a name="TraversalState+insertBefore"></a>

### traversalState.insertBefore(node)
Inserts a node before the current one. Only works if the current node is located inside an array (e. g. inside `body` of a `BlockStatement`).

**Kind**: instance method of [<code>TraversalState</code>](#TraversalState)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>object</code> | The new node. |

<a name="TraversalState+insertAfter"></a>

### traversalState.insertAfter(node, skipBoth)
Inserts a node after the current one. Only works if the current node is located inside an array (e. g. inside `body` of a `BlockStatement`).

**Kind**: instance method of [<code>TraversalState</code>](#TraversalState)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>object</code> | The new node. |
| skipBoth | <code>boolean</code> | If true, skips both the current and the new nodes. |

<a name="traverse"></a>

## traverse(ast, callback)
Traverses the supplied AST. Goes into every child Node.

**Kind**: global function  

| Param | Description |
| --- | --- |
| ast | ESTree-compatible AST to traverse. |
| callback | Function to be called on each node. Is bound to `TraversalState`, so you can use e. g. `this.replace(node)`. |

