"use strict";

class TraversalState {
  #ast = null;
  #currentPath = null;
  #nextPath = [];

  constructor(ast) {
    this.#ast = ast;
  }

  get currentPath() {
    return this.#currentPath;
  }

  get currentNode() {
    return this.getElementAt(this.#currentPath);
  }

  get parentNode() {
    return this.getElementAt(getAncestorPath(this.#currentPath));
  }

  // unlike parentNode, might return an array
  get parentElement() {
    return this.getElementAt(this.#currentPath.slice(0, -1));
  }

  get lastPathKey() {
    return this.#currentPath[this.#currentPath.length - 1];
  }

  get ancestors() {
    const ancestors = [];

    let path = this.#currentPath;
    while (path.length > 0) {
      path = getAncestorPath(path);
      ancestors.unshift(this.getElementAt(path));
    }

    return ancestors;
  }

  getElementAt(path) {
    let el = this.#ast;
    for (const part of path) el = el[part];

    return el;
  }

  #findNextPath(path, skip = false) {
    if (!skip) {
      const nextPathSegment = findNextPathSegment(this.currentNode, "");
      if (nextPathSegment) return this.#currentPath.concat(nextPathSegment);
    }

    for (let i = this.#currentPath.length - 1; i >= 0; i--) {
      const tryPath = path.slice(0, i);
      const lastSegment = path[i];
      if (typeof lastSegment === "string") {
        const newSegment = findNextPathSegment(
          this.getElementAt(tryPath),
          lastSegment
        );
        if (newSegment) return tryPath.concat(newSegment);
      } else {
        const newPath = tryPath.slice(0, tryPath.length - 1);
        const arrayName = tryPath[i - 1];
        const newIndex = findNextArrayIndex(
          this.getElementAt(newPath),
          arrayName,
          lastSegment
        );
        if (newIndex) return newPath.concat([arrayName, newIndex]);
      }
    }
  }

  _step() {
    if (!this.#nextPath) return false;

    this.#currentPath = this.#nextPath;
    this.#nextPath = this.#findNextPath(this.#currentPath);
    return true;
  }

  skip() {
    this.#nextPath = this.#findNextPath(this.#currentPath, true);
  }

  #insertAt(path, index, node, deleteCount = 0) {
    const host = this.getElementAt(path);
    if (!Array.isArray(host))
      throw new TypeError("can only insert into an array");

    const insertee = Array.isArray(node) ? node : [node];
    host.splice(index, deleteCount, ...insertee);

    return insertee.length;
  }

  #replaceCurrentNode(node) {
    this.parentElement[this.lastPathKey] = node;
  }

  replace(node, skip) {
    if (Array.isArray(node)) {
      this.#insertAt(this.#currentPath.slice(0, -1), this.lastPathKey, node, 1);
      if (skip)
        this.#currentPath[this.#currentPath.length - 1] =
          this.lastPathKey + node.length - 1;
    } else {
      this.#replaceCurrentNode(node);
    }

    this.#nextPath = this.#findNextPath(this.#currentPath, skip);
  }

  insertBefore(node) {
    const insertCount = this.#insertAt(
      this.#currentPath.slice(0, -1),
      this.lastPathKey - 1,
      node
    );
    this.#currentPath[this.#currentPath.length - 1] += insertCount;

    this.#nextPath = this.#findNextPath(this.#currentPath);
  }

  insertAfter(node, skipBoth) {
    const insertCount = this.#insertAt(
      this.#currentPath.slice(0, -1),
      this.lastPathKey + 1,
      node
    );

    if (!skipBoth) this.#nextPath = this.#findNextPath(this.#currentPath);
    else
      this.#nextPath = this.#findNextPath(
        this.#currentPath.slice(0, -1).concat(this.lastPathKey + insertCount),
        true
      );
  }
}

function getAncestorPath(path) {
  const i = path.length - 1; // last index
  if (typeof path[i] === "string")
    // means it's in an object
    return path.slice(0, i);
  else return path.slice(0, i - 1);
}

function findNextPathSegment(node, currentProp) {
  if (typeof node !== "object" || typeof node.type !== "string")
    throw new TypeError("node.type has to be a string");

  const nextProp = findNextProp(node, currentProp);
  if (!nextProp) return undefined;

  if (!(nextProp in node) || node[nextProp] === null)
    return findNextPathSegment(node, nextProp);

  if (!Array.isArray(node[nextProp])) return [nextProp];

  if (node[nextProp].length > 0) return [nextProp, 0];

  return findNextPathSegment(node, nextProp);
}

function findNextProp(node, currentProp) {
  const propList = propsToVisit[node.type];
  const currentPropIndex = propList.indexOf(currentProp);
  if (currentPropIndex === propList.length - 1) return undefined;
  return propList[currentPropIndex + 1];
}

function findNextArrayIndex(node, arrayName, currentIndex) {
  if (currentIndex === node[arrayName].length - 1) return undefined;
  return currentIndex + 1;
}

/**
 * Traverses the supplied AST. Doesn't go into node `id`s (for
 * `FunctionDeclaration`, `VariableDeclarator`, etc) or `label`s
 * (`LabeledStatement`, `BreakStatement`).
 * @arg ast
 * @arg callback - Function to be called on each node. Is bound to `TraversalState`, so you can use e. g. `this.replace(node)`.
 * @arg {object} notes - Object that is passed to the callback as the third argument. Use it to store any data you want.
 */
function traverse(ast, callback, notes) {
  const state = new TraversalState(ast);
  while (state._step()) callback.call(state, state.currentNode, notes);
}

// basically, go anywhere there might be nodes, except Location, Identifier, Literal and such
const propsToVisit = {
  Identifier: [],
  Literal: [],

  Program: ["body"],

  ExpressionStatement: ["expression"],
  BlockStatement: ["body"],
  EmptyStatement: [],
  DebuggerStatement: [],
  WithStatement: ["object", "body"],
  ReturnStatement: ["argument"],
  LabeledStatement: ["body"],
  BreakStatement: [],
  ContinueStatement: [],
  IfStatement: ["test", "consequent", "alternate"],
  SwitchStatement: ["discriminant", "cases"],
  SwitchCase: ["test", "consequent"],
  ThrowStatement: ["argument"],
  TryStatement: ["block", "handler", "finalizer"],
  CatchClause: ["body"],
  WhileStatement: ["test", "body"],
  DoWhileStatement: ["body", "test"],
  ForStatement: ["init", "test", "update", "body"],
  ForInStatement: ["left", "right", "body"],

  FunctionDeclaration: ["body"],
  VariableDeclaration: ["declarations"],
  VariableDeclarator: ["init"],

  ThisExpression: [],
  ArrayExpression: ["elements"],
  ObjectExpression: ["properties"],
  Property: ["key", "value"],
  FunctionExpression: ["body"],

  UnaryExpression: ["argument"],
  UpdateExpression: ["argument"],
  BinaryExpression: ["left", "right"],
  AssignmentExpression: ["left", "right"],
  LogicalExpression: ["left", "right"],

  MemberExpression: ["object", "property"],
  ConditionalExpression: ["test", "alternate", "consequent"],
  CallExpression: ["callee", "arguments"],
  NewExpression: ["callee", "arguments"],
  SequenceExpression: ["expressions"],

  ForOfStatement: ["left", "right", "body"],

  Super: [],
  SpreadElement: ["argument"],

  ArrowFunctionExpression: ["body"],

  YieldExpression: ["argument"],

  TemplateLiteral: ["expressions"],
  TaggedTemplateLiteralExpression: ["tag", "quasi"],
  TemplateElement: [],

  ObjectPattern: [], // Should we visit these? They can have AssignmentPattern with Expression on the right.
  ArrayPattern: [],
  RestElement: [],
  AssignmentPattern: ["right"],

  ClassBody: ["body"],
  MethodDefinition: ["key", "value"],
  ClassDeclaration: ["superClass", "body"],
  ClassExpression: ["superClass", "body"],
  MetaProperty: [],

  ImportDeclaration: ["specifiers"],
  ImportSpecifier: [],
  ImportDefaultSpecifier: [],
  ImportNamespaceSpecifier: [],
  ExportNamedDeclaration: ["declaration", "specifiers"],
  ExportSpecifier: [],
  ExportDefaultDeclaration: ["declaration"],
  ExportAllDeclaration: [],

  AwaitExpression: ["argument"],
  ChainExpression: [],
  ImportExpression: ["source"],

  PropertyDefinition: ["key", "value"],
  PrivateIdentifier: [],
  StaticBlock: [],
};

module.exports = traverse;
