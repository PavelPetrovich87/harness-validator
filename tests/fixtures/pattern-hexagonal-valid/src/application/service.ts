import { createUser, type User } from '../domain/model.js';

export function getUser(name: string): User {
  return createUser(name);
}
