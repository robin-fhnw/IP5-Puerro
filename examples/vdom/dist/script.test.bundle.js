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
  * Creates a new HTML Element.
  * If the attribute is a function it will add it as an EventListener.
  * Otherwise as an attribute.
  *
  * @param {string} tagName name of the tag
  * @param {object} attributes attributes or listeners to set in element
  * @param {*} innerHTML content of the tag
  *
  * @returns {HTMLElement}
  */
  const createDomElement = (tagName, attributes = {}, innerHTML = '') => {
    const $element = document.createElement(tagName);
    $element.innerHTML = innerHTML;
    Object.keys(attributes)
      .filter(key => null != attributes[key]) // don't create attributes with value null/undefined
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
   * Converts a DOM Node to a Virtual Node
   *
   * @param {HTMLElement} $node
   *
   * @returns {VNode}
   */
  const toVDOM = $node => {
    const tagName = $node.tagName;
    const $children = $node.children;

    const attributes = Object.values($node.attributes).reduce((attributes, attribute) => {
      attributes[attribute.name] = attribute.value;
      return attributes;
    }, {});

    if ($children.length > 0) {
      return vNode(tagName, attributes, Array.from($children).map(toVDOM));
    }

    return vNode(tagName, attributes, $node.textContent);
  };

  /**
   * Renders a given node object
   * Considers ELEMENT_NODE AND TEXT_NODE https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
   *
   * @param {VNode} node
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
   * @param {VNode} oldNode
   * @param {VNode} newNode
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
   * A Module to use for testing.
   *
   * @module test
   */

  /**
   * Adds a testGroup to the test report
   *
   * @param {String} name
   * @param {Function} callback
   */
  function describe(name, callback) {
    reportGroup(name);
    return callback(test);
  }

  /**
   * Adds and executes a test.
   *
   * @param {String} name
   * @param {Function} callback
   */
  function test(name, callback) {
    const assert = Assert();
    callback(assert);
    report(name, assert.getOk());
  }

  /**
   * Creates a new Assert object
   */
  function Assert() {
    const ok = [];

    const assert = (actual, expected, result)=> {
      if (!result) {
        console.log(`expected "${expected}" but was "${actual}"`);
        try {
          throw Error();
        } catch (err) {
          console.log(err);
        }
      }
      ok.push(result);
    };

    return {
      getOk: () => ok,
      is: (actual, expected) => assert(actual, expected, actual === expected),
      objectIs: (actual, expected) =>
        assert(actual, expected,
          Object.entries(actual).toString() === Object.entries(expected).toString()
        ),
      true: cond => ok.push(cond),
    };
  }

  /**
   * Creates group heading, to group tests together
   *
   * @param {string} name
   */
  function reportGroup(name) {
    const style = `
    font-weight: bold;
    margin-top: 10px;
  `;
    const $reportGroup = createDomElement('div', { style }, `Test ${name}`);
    document.body.appendChild($reportGroup);
  }


  /**
   * Reports an executed test to the DOM
   *
   * @param {string} origin
   * @param {Array<bool>} ok
   */
  function report(origin, ok) {
    const style = `
    color: ${ok.every(elem => elem) ? 'green' : 'red'};
    padding-left: 20px;
  `;
    const $report = createDomElement('div', { style },`
    ${ok.filter(elem => elem).length}/${ok.length} Tests in ${origin} ok.
  `);
    document.body.appendChild($report);
  }

  /**
   * Creates the virtual DOM based on the given items
   * 
   * @param {Array} items to create the vdom with
   */
  const createVDOM = items => h('tbody', {}, 
    items.map(item =>  h('tr', { class: 'row' }, h('td', { class: 'item' }, item)))
  ); 

  /**
   * Handles the button click
   * 
   * @param {HTMLTableElement} $table 
   */
  const handleClick = $table => _ => {
    const items = ['Puerro', 'Huerto']; // items could be fetched from API's, DOM elements or others
    const vDOM = createVDOM(items);
    diff($table, vDOM, toVDOM($table.firstElementChild));
    return vDOM;
  };

  describe('vDOM', test => {
    test('createVDOM', assert => {
      // given
      const items = ['Puerro', 'Huerto'];

      // when
      const vDOM = createVDOM(items);

      // then
      assert.is(vDOM.children.length, 2);
      assert.is(render(vDOM).querySelector('td').textContent, 'Puerro'); // possibility to interact via DOM API
    });

    test('handleClick', assert => {
      // given
      const $table  = createDomElement('table', {}, '<tbody><tbody>');
      const $button = createDomElement('button', { type: 'button' });

      // when
      handleClick($table)();

      // then
      assert.is($table.querySelector('td').textContent, 'Puerro');
    });
  });

}());
