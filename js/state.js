export let jwtToken = null;
export let progressData = [];
export let currentProgressIndex = 0;

export function setJwtToken(token) {
  jwtToken = token;
}

export function setProgressData(data) {
  progressData = data;
}

export function setCurrentProgressIndex(index) {
  currentProgressIndex = index;
}
