import { login, loadUserInfo, loadAuditData, loadSkills, fetchProgress, clearJwtToken, getJwtToken, loadXPByProject } from './api.js';
import { drawProgressBar, drawSkills, drawXPByProject } from './charts.js'; 

let progressData = [];
let currentProgressIndex = 0;

export function showProgress(index) {
  const progressCard = document.getElementById('progressCard');
  if (!progressCard) {
    return;
  }

  if (progressData.length === 0) {
    progressCard.innerHTML = '<p>No graded progress found.</p>';
    document.getElementById('prevButton').disabled = true;
    document.getElementById('nextButton').disabled = true;
    return;
  }

  const item = progressData[index];
  if (item) {
    progressCard.innerHTML = `
      <p><strong>Path:</strong> ${item.path}</p>
      <p><strong>Created At:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
      <p><strong>Updated At:</strong> ${new Date(item.updatedAt).toLocaleString()}</p>
    `;
  } else {
    progressCard.innerHTML = '<p>Progress item not found at this index.</p>';
  }

  const prevBtn = document.getElementById('prevButton');
  const nextBtn = document.getElementById('nextButton');
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.disabled = index === progressData.length - 1;
}

export function bindProgressNavButtons() {
  const nextBtn = document.getElementById('nextButton');
  const prevBtn = document.getElementById('prevButton');

  if (!nextBtn || !prevBtn) {
    return;
  }

  nextBtn.addEventListener('click', () => {
    if (currentProgressIndex < progressData.length - 1) {
      currentProgressIndex++;
      showProgress(currentProgressIndex);
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentProgressIndex > 0) {
      currentProgressIndex--;
      showProgress(currentProgressIndex);
    }
  });
}

async function updateUserInfo() {
  try {
    const user = await loadUserInfo();
    if (user) {
        const labelNameElement = document.getElementById('labelName');
        if (labelNameElement && user.labels && user.labels.length > 0) {
            labelNameElement.textContent = user.labels[0].labelName || 'N/A';
        } else if (labelNameElement) {
            labelNameElement.textContent = 'N/A';
        }

        // Update other user details using their specific IDs
        document.getElementById('username').textContent = user.login || 'N/A';
        document.getElementById('firstName').textContent = user.firstName || 'N/A';
        document.getElementById('lastName').textContent = user.lastName || 'N/A';
        document.getElementById('email').textContent = user.email || 'N/A';
    } else {
        // Fallback if no user data is found
        document.getElementById('labelName').textContent = 'N/A';
        document.getElementById('username').textContent = 'N/A';
        document.getElementById('firstName').textContent = 'N/A';
        document.getElementById('lastName').textContent = 'N/A';
        document.getElementById('email').textContent = 'N/A';
        document.getElementById('userInfo').innerHTML = '<p>User information not found.</p>';
    }
  } catch (error) {
    document.getElementById('userInfo').innerHTML = '<p>Error loading user information.</p>';
  }
}

async function updateAuditData() {
  try {
    const { done, received, ratio } = await loadAuditData();
    const displayRatio = received > 0
      ? (Math.round((done / received) * 10) / 10).toFixed(1)
      : done > 0
      ? '∞'
      : '0.0';

    const doneMB = (done / 1_000_000).toFixed(2);
    const receivedMB = (received / 1_000_000).toFixed(2);

    // Call the new drawProgressBar function
    drawProgressBar(done, received, parseFloat(ratio.toFixed(1)));

    document.getElementById('auditText').innerHTML =
      `Done: <strong>${doneMB} MB</strong><br>
      Received: <strong>${receivedMB} MB</strong><br>
      Ratio: <strong>${ratio !== undefined ? ratio.toFixed(1) : displayRatio}</strong> ${ratio >= 1.5 ? 'Almost perfect!' : ''}`;
  } catch (error) {
    document.getElementById('auditSection').innerHTML = '<p>Error loading audit data.</p>';
  }
}

async function updateSkills() {
  try {
    const { skillsArray} = await loadSkills();
    drawSkills(skillsArray);
  } catch (error) {
    document.getElementById('skillsSection').innerHTML = '<p>Error loading skills data.</p>';
  }
}

async function updateProgressData() {
  try {
    progressData = await fetchProgress();
    if (progressData.length === 0) {
      document.getElementById('progressCard').innerHTML = '<p>No graded progress found.</p>';
      document.getElementById('prevButton').disabled = true;
      document.getElementById('nextButton').disabled = true;
      return;
    }
    currentProgressIndex = 0;
    showProgress(currentProgressIndex);
  } catch (error) {
    document.getElementById('progressCard').innerHTML = `<p>Error loading progress: ${error.message}</p>`;
    document.getElementById('prevButton').disabled = true;
    document.getElementById('nextButton').disabled = true;
  }
}

async function updateXPByProjectData() {
  try {
    const xpData = await loadXPByProject();
    drawXPByProject(xpData);
  } catch (error) {
    document.getElementById('xpByProjectSection').innerHTML = `<p>Error loading XP by Project data: ${error.message}</p>`;
  }
}


export async function loadDashboardData() {
  await updateUserInfo();
  await updateAuditData();
  await updateSkills();
  await updateProgressData();
  await updateXPByProjectData(); 
}

export function setupEventListeners() {
  bindProgressNavButtons();

  const passwordInput = document.getElementById('loginPassword');
  const passwordToggle = document.getElementById('passwordToggle');
  const eyeIcon = passwordToggle ? passwordToggle.querySelector('i') : null;

  if (passwordInput && passwordToggle && eyeIcon) {
    passwordToggle.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
      } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
      }
    });
  }

  document.getElementById('loginButton').addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
      document.getElementById('loginError').textContent = 'Please enter both username and password';
      document.getElementById('loginError').style.display = 'block';
      return;
    }

    try {
      document.getElementById('loader').style.display = 'block';
      document.getElementById('loginButton').disabled = true;
      document.getElementById('loginButton').textContent = 'Logging in...';
      document.getElementById('loginError').style.display = 'none';


      await login(username, password); //call login
      //login success go to dash board 
      document.getElementById('loginBox').style.display = 'none'; //hide
      document.getElementById('dashboardContent').style.display = 'block';// show 
      document.querySelector('.dashboard-header').style.display = 'flex';
      document.querySelector('.dashboard').style.display = 'block';
      //Load all data
      await loadDashboardData();
    } catch (e) {
      //login fails, show error message
      document.getElementById('loginError').textContent = e.message || 'Login failed. Please check your credentials.';
      document.getElementById('loginError').style.display = 'block';
    } finally {
      document.getElementById('loader').style.display = 'none';
      document.getElementById('loginButton').disabled = false;
      document.getElementById('loginButton').textContent = 'Login to Dashboard';
    }
  });

  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('loginButton').click();
    }
  });

document.getElementById('logoutButton').addEventListener('click', async () => {
  // Client-side logout: clear the token and reset the UI
  clearJwtToken(); // Clear the JWT token
  progressData = []; // Reset progress data
  currentProgressIndex = 0; // Reset progress index

  document.getElementById('loginBox').style.display = 'block'; // Show login box
  document.getElementById('dashboardContent').style.display = 'none';
  document.querySelector('.dashboard-header').style.display = 'none';
  document.querySelector('.dashboard').style.display = 'none'; 

  document.getElementById('loginUsername').value = ''; // Clear username input
  document.getElementById('loginPassword').value = ''; // Clear password input
  document.getElementById('loginError').style.display = 'none'; // Hide login error
});

  // Check for existing token on page load
  if (getJwtToken()) {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    document.querySelector('.dashboard-header').style.display = 'flex';
    document.querySelector('.dashboard').style.display = 'block';
    loadDashboardData(); // Load data if token exists
  }
}

export function createLines() {
  const container = document.getElementById('lines-container');
  const lineCount = window.innerWidth < 768 ? 8 : 15;

  container.innerHTML = '';

  for (let i = 0; i < lineCount; i++) {
    const line = document.createElement('div');
    line.classList.add('line');

    const width = Math.random() * 100 + 50;
    const top = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = 5 + Math.random() * 5;

    line.style.width = `${width}px`;
    line.style.top = `${top}%`;
    line.style.opacity = '0';
    line.style.animationDelay = `${delay}s`;
    line.style.animationDuration = `${duration}s`;

    container.appendChild(line);
  }
}
