const signinEndpoint = 'https://learn.reboot01.com/api/auth/signin';
const gqlEndpoint = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';

let jwtToken = null; 
const LOCAL_STORAGE_TOKEN_KEY = 'jwt_token'; // Key for localStorage

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
  const tokenData = await response.json();
  jwtToken = tokenData; // Store in-memory
  localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, jwtToken); // Store in localStorage
  return jwtToken;
}

export function getJwtToken() {
    // Prioritize in-memory token, then check localStorage
    if (jwtToken) {
        return jwtToken;
    }
    const storedToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (storedToken) {
        jwtToken = storedToken; // Populate in-memory from storage
        return jwtToken;
    }
    return null;
}

export function clearJwtToken() {
    jwtToken = null;
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY); // Remove from localStorage on logout
}

export async function fetchGraphQL(query, variables = {}) {
  const currentToken = getJwtToken(); // Use the getter to ensure we get a stored token if available
  if (!currentToken) {
      throw new Error('No JWT token available. Please log in.');
  }

  const response = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const errorText = await response.text();
    // If unauthorized, clear token and prompt re-login
    if (response.status === 401) {
        clearJwtToken();
        throw new Error('Session expired or unauthorized. Please log in again.');
    }
    throw new Error(`GraphQL query failed: ${errorText}`);
  }
  const responseJson = await response.json();
  if (responseJson.errors) {
    throw new Error('GraphQL returned errors: ' + JSON.stringify(responseJson.errors));
  }
  return responseJson.data;
}


  const userInfo = `query {
    user {
      labels {
        id
        labelName
      }
      id
      login
      firstName
      lastName
      email
      
    }
  }`;
export async function loadUserInfo() {

  const data = await fetchGraphQL( userInfo);
  if (data && data.user && data.user.length > 0) {
    return data.user[0];
  } else {
    console.warn("No user data found or user array is empty.");
    return null;
  }
}



  const  auditRatio = `query {
    user {
      id
      auditRatio
      totalUp
      totalDown
    }
  }`;
  
export async function loadAuditData() {

  const data = await fetchGraphQL(auditRatio);
  if (data && data.user && data.user.length > 0) {
    const user = data.user[0];
    return {
      done: user.totalUp,
      received: user.totalDown,
      ratio: user.auditRatio
    };
  } else {
    console.warn("No audit data found or user array is empty.");
    return { done: 0, received: 0, ratio: 0 };
  }
}

export async function loadSkills() {
  const skillsQuery = `query {
    skillTransactions: transaction(
      where: { type: { _like: "skill_%" } }
      distinct_on: type
      order_by: { type: desc, amount: desc }
    ) {
      type
      amount
    }
  }`;

  const skillsRawData = await fetchGraphQL(skillsQuery); 

  const skillsArray = (skillsRawData.skillTransactions || []).map(skill => ({
    type: skill.type.replace('skill_', ''), 
    amount: skill.amount  
  }));

  return { skillsArray };
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

const xpQuery = `query {
    transaction(where: { type: { _eq: "xp" } }) {
      amount
      createdAt
      userLogin
      path
    }
  }`;

export async function loadXPByProject() {
    const data = await fetchGraphQL(xpQuery);
    const xpByProject = {};

    if (data && data.transaction) {
        data.transaction.forEach(transaction => {
            const path = transaction.path;

            // Filter out specific paths
            if (path.includes('/bahrain/bh-module/checkpoint') || path.includes('/bahrain/bh-piscine')) {
                return; // Skip this transaction
            }

            let projectName = 'Unknown Project';
            
            // Most common case: path contains /xp/ followed by project name
            const xpPathIndex = path.indexOf('/xp/');
            if (xpPathIndex !== -1) {
                let remainingPath = path.substring(xpPathIndex + 4); // Get string after '/xp/'
                // Take the part before the next '/' or the whole remaining string
                const nextSlashIndex = remainingPath.indexOf('/');
                if (nextSlashIndex !== -1) {
                    projectName = remainingPath.substring(0, nextSlashIndex);
                } else if (remainingPath.length > 0) {
                    projectName = remainingPath;
                }
            } else {
                // Fallback for paths that don't have '/xp/', e.g., "div-01/piscine-js"
                const pathParts = path.split('/').filter(part => part !== '');
                if (pathParts.length > 0) {
                    // Prioritize the last part if it seems like a project name
                    // and not just 'xp' or a division.
                    const lastPart = pathParts[pathParts.length - 1];
                    if (lastPart && !lastPart.startsWith('div-') && lastPart !== 'xp' && lastPart !== 'skill') {
                        projectName = lastPart;
                    } else if (pathParts.length > 1) {
                        // If last part was generic, try the second to last.
                        const secondToLastPart = pathParts[pathParts.length - 2];
                        if (secondToLastPart && !secondToLastPart.startsWith('div-')) {
                            projectName = secondToLastPart;
                        }
                    } else {
                        projectName = pathParts[0]; // As a final fallback
                    }
                }
            }

            // Clean up project name, remove prefixes like "xp-"
            projectName = projectName.replace(/^xp-/, '');
            
            // Further refine names to be more readable
            if (projectName === 'piscine-js') {
                projectName = 'Piscine JS';
            }
            // Add more specific cleanups if you notice patterns (e.g., 'go-piscine' -> 'Go Piscine')

            if (!xpByProject[projectName]) {
                xpByProject[projectName] = 0;
            }
            xpByProject[projectName] += transaction.amount;
        });
    }

    const xpArray = Object.keys(xpByProject).map(key => ({
        project: key,
        amount: xpByProject[key]
    }));

    xpArray.sort((a, b) => b.amount - a.amount);

    return xpArray;
}