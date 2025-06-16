import { setupEventListeners, createLines, loadDashboardData } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    createLines();

    window.addEventListener('resize', () => {
        createLines();
    });
});

