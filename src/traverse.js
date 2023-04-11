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

import propsToVisit from "./props.js";

/**
 * The traversal state which the callback will be bound to. Use `this` inside
 * the callback to access its methods.
 */
class TraversalState {
  #ast = null;
  #path = null;
  #nextPath = [];
  #generators = new Map();

  constructor(ast) {
    this.#ast = ast;
  }

  /**
   * Returns the path to the current node as an array of keys. E. g.: `[ "body", 0, "body", "body", 0, "expression", "callee", "object" ]` is the path to the node at `ast.body[0].body.body[0].expression.callee.object`.
   */
  get path() {
    return this.#path;
  }

  /**
   * Returns the current node.
   */
  get node() {
    return this.getElementAt(this.#path);
  }

  /**
   * Returns the parent node.
   */
  get parentNode() {
    if (this.#path.length === 0) return undefined;
    return this.getElementAt(getAncestorPath(this.#path));
  }

  /**
   * Returns the parent element. The difference between this method and {@link TraversalState#parentNode} is that the latter always returns an AST node, whereas this method may return an array of nodes. E. g. if the current node is located inside `body` of a `BlockStatement`.
   */
  get parentElement() {
    if (this.#path.length === 0) return undefined;
    return this.getElementAt(this.#path.slice(0, -1));
  }

  /**
   * Returns the last element of the path.
   */
  get key() {
    return this.#path[this.#path.length - 1];
  }

  /**
   * Returns an array of ancestor nodes.
   */
  get ancestors() {
    const ancestors = [];

    let path = this.#path;
    while (path.length > 0) {
      path = getAncestorPath(path);
      ancestors.unshift(this.getElementAt(path));
    }

    return ancestors;
  }

  /**
   * Returns the element at specified path.
   * @arg {array} path
   */
  getElementAt(path) {
    let el = this.#ast;
    for (const part of path) el = el[part];

    return el;
  }

  #findNextPath(path, skip = false) {
    if (!skip) {
      const nextPathSegment = findNextPathSegment(this.node, "");
      if (nextPathSegment) return this.#path.concat(nextPathSegment);
    }

    for (let i = this.#path.length - 1; i >= 0; i--) {
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

  #incrementPaths() {
    if (this.path)
      this.#executeGeneratorsBetweenPaths(this.path, this.#nextPath || []);

    if (!this.#nextPath) return false;

    this.#path = this.#nextPath;
    this.#nextPath = this.#findNextPath(this.#path);
    return true;
  }

  #addGenerator(generator) {
    // paths are guaranteed not to include "/"
    this.#generators.set(this.path.join("/"), generator);
  }

  #executeGenerator(path) {
    const id = path.join("/");

    if (this.#generators.has(id)) {
      this.#path = path;
      if (!this.#generators.get(id).next().done)
        console.warn(`Generator ${id} isn't done, but won't be called again`);
      this.#generators.delete(id);
    }
  }

  #executeGeneratorsBetweenPaths(current, next) {
    const matches = findArrayMatchingLength(current, next);
    if (matches === current.length) return;

    for (let i = current.length; i > matches; i--) {
      const path = current.slice(0, i);
      this.#executeGenerator(path);
    }
  }

  #executeCallback(callback) {
    const ret = callback.call(this, this.node);
    if (typeof ret?.next === "function") {
      ret.next();
      this.#addGenerator(ret);
    }
  }

  #step(callback) {
    if (this.node !== null) this.#executeCallback(callback);

    if (this.#incrementPaths()) return true;

    // last iteration
    this.#executeGenerator([]);
    return false;
  }

  _execute(callback) {
    this.#incrementPaths();
    while (this.#step(callback));
  }

  /**
   * Skips the children of the current node in the next iteration.
   */
  skip() {
    this.#nextPath = this.#findNextPath(this.#path, true);
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
    this.parentElement[this.key] = node;
  }

  /**
   * Replaces the current node.
   * @arg {object} node - The new node.
   * @arg {boolean} skip - If true, skips the new node.
   */
  replace(node, skip) {
    if (Array.isArray(node)) {
      this.#insertAt(this.#path.slice(0, -1), this.key, node, 1);
      if (skip) this.#path[this.#path.length - 1] = this.key + node.length - 1;
    } else {
      this.#replaceCurrentNode(node);
    }

    this.#nextPath = this.#findNextPath(this.#path, skip);
  }

  /**
   * Inserts a node before the current one. Only works if the current node is located inside an array (e. g. inside `body` of a `BlockStatement`).
   * @arg {object} node - The new node.
   */
  insertBefore(node) {
    const insertCount = this.#insertAt(
      this.#path.slice(0, -1),
      this.key - 1,
      node
    );
    this.#path[this.#path.length - 1] += insertCount;

    this.#nextPath = this.#findNextPath(this.#path);
  }

  /**
   * Inserts a node after the current one. Only works if the current node is located inside an array (e. g. inside `body` of a `BlockStatement`).
   * @arg {object} node - The new node.
   * @arg {boolean} skipBoth - If true, skips both the current and the new nodes.
   */
  insertAfter(node, skipBoth) {
    const insertCount = this.#insertAt(
      this.#path.slice(0, -1),
      this.key + 1,
      node
    );

    if (!skipBoth) this.#nextPath = this.#findNextPath(this.#path);
    else
      this.#nextPath = this.#findNextPath(
        this.#path.slice(0, -1).concat(this.key + insertCount),
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
  if (node === null) return undefined;

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
 * Finds the number of matching elements in two arrays. Returns the number (not the last matching index!). Only works for simple elements, not objects.
 * @arg {array} arr1
 * @arg {array} arr2
 * @private
 */
function findArrayMatchingLength(arr1, arr2) {
  for (let i = 0; i < arr1.length; i++) {
    if (!arr1[i] && arr2.length < i + 1) return i;

    if (arr1[i] !== arr2[i]) return i;
  }

  return arr1.length;
}

/**
 * Traverses the supplied AST. Goes into every child Node.
 * @arg ast - ESTree-compatible AST to traverse.
 * @arg callback - Function to be called on each node. Is bound to `TraversalState`, so you can use e. g. `this.replace(node)`.
 */
function traverse(ast, callback) {
  new TraversalState(ast)._execute(callback);
}

export default traverse;
