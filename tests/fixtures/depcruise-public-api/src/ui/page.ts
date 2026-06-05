import { getUser } from '../services/index.js';

export function renderPage() {
  return `<div>${getUser().name}</div>`;
}
