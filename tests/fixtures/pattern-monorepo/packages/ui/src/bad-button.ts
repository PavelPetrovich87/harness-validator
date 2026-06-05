import { internalHelper } from '../../core/src/internal.js';

export function badButton() {
  return `<button>${internalHelper()}</button>`;
}
