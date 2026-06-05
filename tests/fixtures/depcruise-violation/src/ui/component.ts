import { db } from '../data-access/db.js';

export function loadUser() {
  return db.query('SELECT * FROM users');
}
