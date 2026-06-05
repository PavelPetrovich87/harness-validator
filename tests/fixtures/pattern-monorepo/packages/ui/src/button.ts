import { coreApi } from '../../core/src/index.js';

export function renderButton() {
  return `<button>${coreApi().data.length}</button>`;
}
