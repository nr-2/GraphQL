import { fetchGraphQL } from '../api/graphql.js';

export async function loadUserInfo() {
  const query = `{ user { id login attrs } }`;
  const data = await fetchGraphQL(query);
  const user = data.user[0];

  document.getElementById('username').textContent = user.login;
  document.getElementById('firstName').textContent = user.attrs.firstName || 'N/A';
  document.getElementById('lastName').textContent = user.attrs.lastName || 'N/A';
  document.getElementById('email').textContent = user.attrs.email || 'N/A';
}
