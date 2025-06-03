// api/auth.js
import { setJwtToken } from '../state.js';

const signinEndpoint = 'https://learn.reboot01.com/api/auth/signin';

export async function login(username, password) {
  const authHeader = 'Basic ' + btoa(`${username}:${password}`);
  const response = await fetch(signinEndpoint, {
    method: 'POST',
    headers: { Authorization: authHeader }
  });

  if (!response.ok) {
    throw new Error('Invalid login');
  }

  const token = await response.json();
  setJwtToken(token);
}
