import { login, loadUserInfo, loadAuditData, loadSkillsAndXPData, fetchProgress, clearJwtToken, getJwtToken } from './api.js';
import { drawPie, drawXPOverTime, drawSkills } from './charts.js';

let progressData = [];
let currentProgressIndex = 0;
// const logoutEndpoint = 'https://learn.reboot01.com/api/auth/signout'; // Defined here as it's directly used in logout functionality.

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

/**
 * Loads all necessary dashboard data (user info, audit data, skills, XP over time, progress)
 * and updates the UI accordingly. Handles loading state.
 */
export async function loadDashboardData() {
  const loader = document.getElementById('loader');
  const dashboardContent = document.getElementById('dashboardContent');
  const dashboardHeader = document.querySelector('.dashboard-header');
  const dashboardMain = document.querySelector('.dashboard');

  loader.style.display = 'block'; // Show loader

  try {
    const userInfo = await loadUserInfo();
    document.getElementById('username').textContent = userInfo.user[0].login;
    document.getElementById('firstName').textContent = userInfo.user[0].attrs.firstName || 'N/A';
    document.getElementById('lastName').textContent = userInfo.user[0].attrs.lastName || 'N/A';
    document.getElementById('email').textContent = userInfo.user[0].attrs.email || 'N/A';

    const auditData = await loadAuditData();
    const doneRatio = auditData.done / (auditData.done + auditData.received) * 100 || 0;
    const receivedRatio = auditData.received / (auditData.done + auditData.received) * 100 || 0;
    drawPie(auditData.done, auditData.received);
    document.getElementById('auditText').textContent = `Done: ${doneRatio.toFixed(2)}%, Received: ${receivedRatio.toFixed(2)}%`;

    const { skillsArray, xpOverTimeArray } = await loadSkillsAndXPData();
    drawSkills(skillsArray);
    drawXPOverTime(xpOverTimeArray);

    const progress = await fetchProgress();
    progressData = progress.progress.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    currentProgressIndex = 0;
    showProgress(currentProgressIndex);

    dashboardContent.style.display = 'grid'; // Use grid for dashboard layout
    dashboardHeader.style.display = 'flex'; // Display header
    dashboardMain.style.display = 'block'; // Display dashboard main content

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    alert('Failed to load dashboard data. Please try again.');
    // Optionally, force logout if data loading fails after login
    clearJwtToken();
    document.getElementById('loginBox').style.display = 'block';
    dashboardContent.style.display = 'none';
    dashboardHeader.style.display = 'none';
    dashboardMain.style.display = 'none';
  } finally {
    loader.style.display = 'none'; // Hide loader
  }
}

/**
 * Sets up all event listeners for buttons and input fields.
 */
export function setupEventListeners() {
  const loginButton = document.getElementById('loginButton');
  const loginUsernameInput = document.getElementById('loginUsername');
  const loginPasswordInput = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const passwordToggle = document.getElementById('passwordToggle');
  const logoutButton = document.getElementById('logoutButton');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');

  // Login button click listener
  loginButton.addEventListener('click', async () => {
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;
    loginError.style.display = 'none'; // Hide previous errors

    if (!username || !password) {
      loginError.textContent = 'Please enter both username and password.';
      loginError.style.display = 'block';
      return;
    }

    try {
      await login(username, password);
      document.getElementById('loginBox').style.display = 'none';
      await loadDashboardData(); // Load data after successful login
    } catch (e) {
      loginError.textContent = e.message || 'Login failed. Please check your credentials.';
      loginError.style.display = 'block';
      console.error('Login error:', e);
    }
  });

  // Password toggle functionality
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const type = loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      loginPasswordInput.setAttribute('type', type);
      passwordToggle.classList.toggle('fa-eye');
      passwordToggle.classList.toggle('fa-eye-slash');
    });
  }

  // Logout button click listener (Client-side only)
  logoutButton.addEventListener('click', () => {
    clearJwtToken(); // Clear the JWT token locally
    progressData = []; // Clear progress data
    currentProgressIndex = 0; // Reset progress index

    // Hide dashboard and show login box
    document.getElementById('loginBox').style.display = 'block';
    document.getElementById('dashboardContent').style.display = 'none';
    document.querySelector('.dashboard-header').style.display = 'none'; // Hide header on logout
    document.querySelector('.dashboard').style.display = 'none'; // Hide dashboard on logout

    // Clear login form fields and any previous errors
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
  });

  // Progress navigation buttons
  prevButton.addEventListener('click', () => {
    if (currentProgressIndex < progressData.length - 1) {
      currentProgressIndex++;
      showProgress(currentProgressIndex);
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentProgressIndex > 0) {
      currentProgressIndex--;
      showProgress(currentProgressIndex);
    }
  });

  // Handle Enter key for login
  loginUsernameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      loginPasswordInput.focus();
    }
  });

  loginPasswordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      loginButton.click();
    }
  });
}

/**
 * Creates and appends decorative lines to the lines-container.
 * Adjusts number of lines based on screen width.
 */
export function createLines() {
  const container = document.getElementById('lines-container');
  const lineCount = window.innerWidth < 768 ? 8 : 15; // Fewer lines on smaller screens

  container.innerHTML = ''; // Clear existing lines

  for (let i = 0; i < lineCount; i++) {
    const line = document.createElement('div');
    line.classList.add('line');

    // Randomize properties for visual variety
    const width = Math.random() * 100 + 50; // 50px to 150px
    const top = Math.random() * 100; // 0% to 100%
    const delay = Math.random() * 5; // 0s to 5s
    const duration = 5 + Math.random() * 5; // 5s to 10s

    line.style.width = `${width}px`;
    line.style.top = `${top}%`;
    line.style.opacity = '0'; // Start invisible for animation
    line.style.animation = `line-move ${duration}s linear infinite ${delay}s, fadeIn 1s ease-out ${delay}s forwards`; // Combined animations

    container.appendChild(line);
  }
}

