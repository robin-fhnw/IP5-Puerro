(function () {
  'use strict';

  /**
   * A Module that abstracts Virtual DOM interactions.
   * It's purpose is to perform actions on DOM-like Objects
   *
   * @module vdom
   */

  /**
   * @typedef {{ tagName: string, attributes: object, children: any  }} VNode
   */

  /**
   * Creates a node object which can be rendered
   *
   * @param {string} tagName
   * @param {object} attributes
   * @param {VNode[] | VNode | any} nodes
   *
   * @returns {VNode}
   */
  const vNode = (tagName, attributes = {}, ...nodes) => ({
    tagName,
    attributes: null == attributes ? {} : attributes,
    children: null == nodes ? [] : [].concat(...nodes), // collapse nested arrays.
  });
  const h = vNode;

  /**
   * Creates a new HTML Element.
   * If the attribute is a function it will add it as an EventListener.
   * Otherwise as an attribute.
   *
   * @param {string} tagName name of the tag
   * @param {object} attributes attributes or listeners to set in element
   * @param {*} innerHTML content of the tag
   *
   * @returns {function(content): HTMLElement}
   */
  const createDomElement = (tagName, attributes = {}, innerHTML = '') => {
    const $element = document.createElement(tagName);
    $element.innerHTML = innerHTML;
    Object.keys(attributes)
      .filter(key => null != attributes[key]) // don't render attributes with value null/undefined
      .forEach(key => {
        if (typeof attributes[key] === 'function') {
          $element.addEventListener(key, attributes[key]);
        } else {
          $element.setAttribute(key, attributes[key]);
        }
      });
    return $element;
  };

  /**
   * renders a given node object
   *
   * @param {import('./vdom').VNode} node
   *
   * @returns {HTMLElement}
   */
  const render = node => {
    if (null == node) {
      return document.createTextNode('');
    }
    if (typeof node === 'string' || typeof node === 'number') {
      return document.createTextNode(node);
    }
    const $element = createDomElement(node.tagName, node.attributes);
    node.children.forEach(c => $element.appendChild(render(c)));
    return $element;
  };

  /**
   * Compares two VDOM nodes and applies the differences to the dom
   *
   * @param {HTMLElement} $parent
   * @param {import('./vdom').VNode} oldNode
   * @param {import('./vdom').VNode} newNode
   * @param {number} index
   */
  const diff = ($parent, newNode, oldNode, index = 0) => {
    if (null == oldNode) {
      $parent.appendChild(render(newNode));
      return;
    }
    if (null == newNode) {
      $parent.removeChild($parent.childNodes[index]);
      return;
    }
    if (changed(oldNode, newNode)) {
      $parent.replaceChild(render(newNode), $parent.childNodes[index]);
      return;
    }
    if (newNode.tagName) {
      newNode.children.forEach((newNode, i) => {
        diff($parent.childNodes[index], newNode, oldNode.children[i], i);
      });
    }
  };

  /**
   * compares two VDOM nodes and returns true if they are different
   *
   * @param {VNode} node1
   * @param {VNode} node2
   */
  const changed = (node1, node2) => {
    const nodeChanged =
      typeof node1 !== typeof node2 ||
      ((typeof node1 === 'string' || typeof node1 === 'number') && node1 !== node2) ||
      node1.type !== node2.type;
    const attributesChanged =
      !!node1.attributes &&
      !!node2.attributes &&
      (Object.keys(node1.attributes).length !== Object.keys(node2.attributes).length ||
        Object.keys(node1.attributes).some(
          a =>
            node1.attributes[a] !== node2.attributes[a] &&
            (null == node1.attributes[a] ? '' : node1.attributes[a]).toString() !==
              (null == node2.attributes[a] ? '' : node2.attributes[a]).toString()
        ));
    return nodeChanged || attributesChanged;
  };

  /**
   * Observable Pattern Implementation
   *
   * @module observable
   */

  const ObservableObject = object => {
    const listeners   = [];
    const subscribers = {};

    const notify = newObject => {
      if (object == newObject) return;
      const oldObject = object;
      object = newObject;

      Object.keys(newObject).forEach(key => {
        const newValue = newObject[key];
        const oldValue = oldObject[key];
        if (oldValue === newValue) return;
        (subscribers[key] || []).forEach(subscriber => subscriber(newValue, oldValue));
      });
      listeners.forEach(listener => listener(newObject, oldObject));
    };

    return {
      get:       ()              => object,
      set:       newObject       => notify({ ...object, ...newObject }),
      push:      (key, value)    => notify({ ...object, ...{ [key]: value } }),
      remove:    key             => notify({ ...object, ...{ [key]: undefined } }),
      replace:   newObject       => notify(newObject),
      onChange:  callback        => { listeners.push(callback); callback(object, object); },
      subscribe: (key, callback) => {
        subscribers[key] = subscribers[key] || [];
        subscribers[key].push(callback);
        callback(object[key], object[key]);
      },
      // unsubscribe, removeOnChange
    };
  };

  const store = ObservableObject({});

  class Controller {
    constructor($root, state, view, diffing = true) {
      this.$root = $root;
      this.state = ObservableObject({ ...state });
      this.view = view;
      this.diffing = diffing;
      this.vDom = null;
      this.init();
      this.onInit();
    }

    init() {
      this.vDom = this.view(this);
      this.$root.prepend(render(this.vDom));
      this.store.onChange(s => this.refresh());
      this.state.onChange(s => this.refresh());
    }

    onInit() {}

    refresh() {
      const newVDom = this.view(this);
      this.repaint(newVDom);
      this.vDom = newVDom;
    }

    repaint(newVDom) {
      if (this.diffing) {
        diff(this.$root, newVDom, this.vDom);
      } else {
        this.$root.replaceChild(render(newVDom), this.$root.firstChild);
      }
    }

    get model() {
      return { ...store.get(), ...this.state.get() };
    }

           get store() { return store; }
    static get store() { return store; }
  }

  const model = { counter: 0 };

  class CounterController extends Controller {
      increment() {
          this.state.push('counter', ++this.model.counter);
      }

      decrement() {
          this.state.push('counter', --this.model.counter);
      }
  }

  const View = controller => h('div', {}, 
      h('button', { click: _ => controller.decrement()}, '-'),
      h('label', {}, controller.model.counter),
      h('button', { click: _ => controller.increment()}, '+')
  );

  const model$1 = {
      counter1: 0,
      counter2: 0,
      sum:      0,
      product:  0,
  };

  class ResultController extends Controller {
      setCounter1(counter) {
          this.state.push('counter1', counter);
          this.state.push('sum',      this.model.counter1 + this.model.counter2);
          this.state.push('product',  this.model.counter1 * this.model.counter2);
      }

      setCounter2(counter) {
          this.state.push('counter2', counter);
          this.state.push('sum',      this.model.counter1 + this.model.counter2);
          this.state.push('product',  this.model.counter1 * this.model.counter2);
      }
  }

  const View$1 = controller => h('div', {}, 
      h('label', {}, 'Sum:    ' + controller.model.sum ),
      h('br'),
      h('label', {}, 'Product:' + controller.model.product),
  );

  const adder      = new CounterController(document.querySelector('#adder'),      model,   View);
  const multiplier = new CounterController(document.querySelector('#multiplier'), model,   View);
  const result     = new ResultController (document.querySelector('#result'),     model$1, View$1);

  adder     .state.subscribe('counter', counter => result.setCounter1(counter));
  multiplier.state.subscribe('counter', counter => result.setCounter2(counter));

}());