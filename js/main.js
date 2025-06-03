import { login} from './api/auth.js';
import { loadUserInfo } from './dashboard/user.js';
import { loadAuditData, drawPie } from './dashboard/audit.js';
import { loadSkillsAndXPData } from './dashboard/xp.js';
import { fetchProgress, bindProgressNavButtons } from './dashboard/progress.js';
import { createLines } from './ui/animations.js';

document.addEventListener('DOMContentLoaded', () => {
  createLines();
  bindProgressNavButtons();

  document.getElementById('loginButton').addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
      document.getElementById('loginError').textContent = 'Please enter both username and password';
      return;
    }

    try {
      await login(username, password);
      document.getElementById('loginBox').style.display = 'none';
      document.getElementById('dashboardContent').style.display = 'block';

      await loadUserInfo();
      await loadAuditData();
      await loadSkillsAndXPData();
      await fetchProgress();
    } catch (err) {
      document.getElementById('loginError').textContent = err.message;
    }
  });

  document.getElementById('logoutButton').addEventListener('click', () => {
    location.reload(); 
  });
});
