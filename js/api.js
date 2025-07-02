const signinEndpoint = 'https://learn.reboot01.com/api/auth/signin';
const gqlEndpoint = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';

let jwtToken = null;

export async function login(username, password) {
  const authHeader = 'Basic ' + btoa(`${username}:${password}`);
  const response = await fetch(signinEndpoint, {
    method: 'POST',
    headers: { Authorization: authHeader }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('Invalid login');
  }
  jwtToken = await response.json();
  return jwtToken; // Return token for storage if needed
}

export function getJwtToken() {
    return jwtToken;
}

export function clearJwtToken() {
    jwtToken = null;
}

export async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL query failed: ${errorText}`);
  }
  const responseJson = await response.json();
  if (responseJson.errors) {
    throw new Error('GraphQL returned errors: ' + JSON.stringify(responseJson.errors));
  }
  return responseJson.data;
}

export async function loadUserInfo() {
  const query = `{
    user {
      id
      login
      attrs
    }
  }`;
  const data = await fetchGraphQL(query);
  // Add a defensive check here
  if (data && data.user && data.user.length > 0) {
    return data.user[0];
  } else {
    // Return a default or throw an error if no user data is found
    console.warn("No user data found or user array is empty.");
    return null; // Or throw new Error("User data not found");
  }
}

export async function loadAuditData() {
  const query = `{
    transaction(where: {type: {_in: ["up", "down"]}}) {
      type
      amount
    }
  }`;
  const data = await fetchGraphQL(query);
  let done = 0;
  let received = 0;

  data.transaction.forEach(tx => {
    if (tx.type === 'up') done += tx.amount;
    else if (tx.type === 'down') received += tx.amount;
  });
  return { done, received };
}

export async function loadSkillsAndXPData() {
  const query = `{
    transaction(where: { type: { _eq: "xp" } }) {
      amount
      path
      createdAt
    }
  }`;
  const data = await fetchGraphQL(query);
  const xpByProject = {};
  const xpByDate = {};

  data.transaction.forEach(tx => {
    const pathParts = tx.path.split('/');
    let project = pathParts[2] || 'unknown';
    if (pathParts[3] && pathParts[3].trim() !== '') {
        project = pathParts[3];
    } else if (pathParts[2] && pathParts[2].trim() !== '') {
        project = pathParts[2];
    }

    const date = tx.createdAt.split('T')[0];

    xpByProject[project] = (xpByProject[project] || 0) + tx.amount;
    xpByDate[date] = (xpByDate[date] || 0) + tx.amount;
  });

  const skillsArray = Object.entries(xpByProject).map(([key, val]) => ({
    type: key,
    amount: val / 1000
  }));

  const xpOverTimeArray = Object.entries(xpByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      date: key,
      amount: val / 1000
    }));

  return { skillsArray, xpOverTimeArray };
}

export async function fetchProgress() {
  const query = `{
    progress {
      path
      grade
      createdAt
      updatedAt
    }
  }`;
  const data = await fetchGraphQL(query);
  let filteredProgress = data.progress.filter(p => p.grade !== null);
  return filteredProgress.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}