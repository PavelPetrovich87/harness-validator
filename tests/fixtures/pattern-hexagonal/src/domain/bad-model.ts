import { saveUser } from '../infrastructure/db.js';
import { createUser } from '../domain/model.js';

export function badDomainModel() {
  const user = createUser('Alice');
  saveUser(user);
  return user;
}
