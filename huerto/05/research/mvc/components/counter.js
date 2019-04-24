import { h } from '../../../../../puerro/util/vdom';

export {
  view as counterComponent
}

/**
 * 
 * @param {number} count 
 * @param {string} text 
 * @param {function(): void} onCountChange 
 */
const view = (count, text, onCountChange) =>
  h('div', {},
    h('h2', {}, text),
    h('button', { click: e => onCountChange(-1) }, '-'),
    h('span', {}, count),
    h('button', { click: e => onCountChange(1) }, '+')
  );