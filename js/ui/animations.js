export function createLines() {
  const container = document.getElementById('lines-container');
  const lineCount = window.innerWidth < 768 ? 8 : 15;
  container.innerHTML = '';

  for (let i = 0; i < lineCount; i++) {
    const line = document.createElement('div');
    line.classList.add('line');
    line.style.width = `${Math.random() * 100 + 50}px`;
    line.style.top = `${Math.random() * 100}%`;
    line.style.opacity = '0';
    line.style.animationDelay = `${Math.random() * 5}s`;
    line.style.animationDuration = `${5 + Math.random() * 5}s`;
    container.appendChild(line);
  }
  window.addEventListener('resize', createLines);
}

export function typeWriter(element, text, speed = 50) {
  let i = 0;
  element.textContent = '';
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i++);
      setTimeout(type, speed);
    }
  }
  type();
}
