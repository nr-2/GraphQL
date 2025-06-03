import { jwtToken } from '../state.js';

const gqlEndpoint = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';

export async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }

  return json.data;
}
