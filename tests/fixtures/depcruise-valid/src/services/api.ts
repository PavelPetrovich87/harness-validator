import { db } from '../data-access/db.js';

export function fetchData() {
  return db.query('SELECT * FROM data');
}
