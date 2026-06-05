import { type User } from '../domain/model.js';

export function saveUser(user: User) {
  console.log('Saving', user);
}
