(function () {
  'use strict';

  /**
   * A Module that abstracts Virtual DOM interactions.
   * It's purpose is to perform actions on DOM-like Objects
   *
   * @module vdom
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
   * @returns {function(content): HTMLElement}
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

  function Assert() {
    const ok = [];
    return {
      getOk: () => ok,
      is: (actual, expected) => {
        const result = actual === expected;
        if (!result) {
          console.log(`expected "${expected}" but was "${actual}"`);
          try {
            throw Error();
          } catch (err) {
            console.log(err);
          }
        }
        ok.push(result);
      },
      true: cond => ok.push(cond),
    };
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
   * Adds a testGroup to the test report
   *
   * @param {String} name
   * @param {Function} callback
   */
  function describe(name, callback) {
    reportGroup(name);
    return callback(test);
  }

  const appendInput = ($input, $output) => _ => {
    const $element = createDomElement('p', {}, $input.value);
    $output.append($element);
    return $element;
  };

  const changeLabel = $button => event => {
    $button.textContent = 'Save: ' + event.target.value;
  };

  describe('Testable Units', test => {
    test('appendInput', assert => {
      // given
      const $input = createDomElement('input', { value: 'Puerro' });
      const $output = createDomElement('div');

      // when
      const $element = appendInput($input, $output)();

      // then
      assert.is($output.children.length, 1);
      assert.is($element.tagName, 'P');
      assert.is($element.textContent, 'Puerro');
    });

    test('changeLabel', assert => {
      // given
      const $input = createDomElement('input', { value: 'Puerro' });
      const $button = createDomElement('button', { type: 'button' });

      // when
      changeLabel($button)({ target: $input });

      // then
      assert.is($button.textContent, 'Save: Puerro');
    });
  });

}());
