// dashboard/progress.js
import { fetchGraphQL } from '../api/graphql.js';
import { progressData, currentProgressIndex, setProgressData, setCurrentProgressIndex } from '../state.js';

export async function fetchProgress() {
  const query = `{ progress { path grade createdAt updatedAt } }`;
  const data = await fetchGraphQL(query);
  const filtered = data.progress.filter(p => p.grade !== null);
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  setProgressData(filtered);
  setCurrentProgressIndex(0);
  showProgress(0);
}

export function showProgress(index) {
  const item = progressData[index];
  const progressCard = document.getElementById('progressCard');
  if (!item) return;

  progressCard.innerHTML = `
    <p><strong>Path:</strong> ${item.path}</p>
    <p><strong>Created At:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
    <p><strong>Updated At:</strong> ${new Date(item.updatedAt).toLocaleString()}</p>
  `;

  document.getElementById('prevButton').disabled = index === 0;
  document.getElementById('nextButton').disabled = index === progressData.length - 1;
}

export function bindProgressNavButtons() {
  document.getElementById('nextButton').addEventListener('click', () => {
    if (currentProgressIndex < progressData.length - 1) {
      setCurrentProgressIndex(currentProgressIndex + 1);
      showProgress(currentProgressIndex);
    }
  });

  document.getElementById('prevButton').addEventListener('click', () => {
    if (currentProgressIndex > 0) {
      setCurrentProgressIndex(currentProgressIndex - 1);
      showProgress(currentProgressIndex);
    }
  });
}
