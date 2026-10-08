// Deep Ctrl - Frontend JavaScript
// Mobile Cursor Control App

const API_BASE_URL = 'https://deep-ctrl-backend.onrender.com/api';
const TOKEN = 'deep-ctrl-secret-token-2026';

const state = {
  isConnected: false,
  isDragging: false,
  dragStart: null,
  currentPos: { x: 0, y: 0 },
  smoothEnabled: false,
  autoClickEnabled: false,
  touchStart: null,
};

const elements = {
  statusText: document.getElementById('status-text'),
  statusDot: document.querySelector('.status-dot'),
  cursorPos: document.getElementById('cursor-pos'),
  cursorIndicator: document.getElementById('cursor-indicator'),
  touchZone: document.getElementById('touch-zone'),
  btnLeftClick: document.getElementById('btn-left-click'),
  btnRightClick: document.getElementById('btn-right-click'),
  btnDoubleClick: document.getElementById('btn-double-click'),
  btnDrag: document.getElementById('btn-drag'),
  scrollUp: document.getElementById('scroll-up'),
  scrollDown: document.getElementById('scroll-down'),
  toggleSmooth: document.getElementById('toggle-smooth'),
  toggleAutoClick: document.getElementById('toggle-auto-click'),
  serverInfo: document.getElementById('server-info'),
  notification: null,
};

elements.notification = document.createElement('div');
elements.notification.className = 'notification';
document.body.appendChild(elements.notification);

function showNotification(message, type = 'info') {
  elements.notification.textContent = message;
  elements.notification.className = `notification ${type} show`;
  setTimeout(() => {
    elements.notification.classList.remove('show');
  }, 3000);
}

async function apiRequest(endpoint, data = null) {
  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': TOKEN,
      },
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showNotification(error.message, 'error');
    throw error;
  }
}

function updateCursorPosition(x, y) {
  state.currentPos = { x, y };
  elements.cursorPos.textContent = `Position: (${Math.round(x)}, ${Math.round(y)})`;
  const zone = elements.touchZone;
  const offsetX = ((x / zone.clientWidth) * 100);
  const offsetY = ((y / zone.clientHeight) * 100);
  elements.cursorIndicator.style.transform = `translate(-50%, -50%) translate(${offsetX}%, ${offsetY}%)`;
}

async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: { 'x-api-token': TOKEN }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function connect() {
  const isHealthy = await checkConnection();
  if (isHealthy) {
    state.isConnected = true;
    elements.statusText.textContent = 'Connected';
    elements.statusDot.className = 'status-dot connected';
    elements.statusText.className = 'status-text connected';
    elements.serverInfo.textContent = 'Server: Connected';
    showNotification('Connected to Deep Ctrl Server!', 'success');
  } else {
    state.isConnected = false;
    elements.statusText.textContent = 'Disconnected';
    elements.statusDot.className = 'status-dot';
    elements.statusText.className = 'status-text';
    elements.serverInfo.textContent = 'Server: Not Connected';
    showNotification('Cannot connect to server. Check your network.', 'error');
  }
}

async function moveCursor(x, y) {
  if (!state.isConnected) return;
  try {
    await apiRequest('/move', { x, y });
    updateCursorPosition(x, y);
  } catch (error) {
    connect();
  }
}

async function click(button = 'left', double = false) {
  if (!state.isConnected) return;
  try {
    await apiRequest('/click', { button, double });
    showNotification(`${button} ${double ? 'double' : 'click'}ed`, 'success');
  } catch (error) {
    connect();
  }
}
// Event Listeners
elements.touchZone.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = elements.touchZone.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  state.touchStart = { x, y };
  elements.touchZone.classList.add('active');
});

elements.touchZone.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!state.isConnected) return;
  const touch = e.touches[0];
  const rect = elements.touchZone.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  if (state.smoothEnabled) {
    moveCursor(x, y);
  } else {
    moveCursor(x, y);
  }
});

elements.touchZone.addEventListener('touchend', (e) => {
  e.preventDefault();
  elements.touchZone.classList.remove('active');
  state.touchStart = null;
});

elements.btnLeftClick.addEventListener('click', () => click('left'));
elements.btnRightClick.addEventListener('click', () => click('right'));
elements.btnDoubleClick.addEventListener('click', () => click('left', true));

elements.scrollUp.addEventListener('click', () => scroll(true));
elements.scrollDown.addEventListener('click', () => scroll(false));

elements.toggleSmooth.addEventListener('change', (e) => {
  state.smoothEnabled = e.target.checked;
  showNotification(e.target.checked ? 'Smooth movement enabled' : 'Instant movement enabled');
});

elements.toggleAutoClick.addEventListener('change', (e) => {
  state.autoClickEnabled = e.target.checked;
  showNotification(e.target.checked ? 'Auto click enabled' : 'Auto click disabled');
});

// Initialize
async function init() {
  await connect();
}
init();

// Handle screen resize
window.addEventListener('resize', () => {
  // Update screen dimensions if needed
});

async function pressKey(key, hold = false) {
  if (!state.isConnected) return;
  try {
    await apiRequest('/press', { key, hold });
  } catch (error) {
    connect();
  }
}

async function startDrag(x, y) {
  state.isDragging = true;
  state.dragStart = { x, y };
  try {
    await apiRequest('/drag', { startX: x, startY: y });
  } catch (error) {
    state.isDragging = false;
    state.dragStart = null;
    connect();
  }
}

async function endDrag(x, y) {
  if (!state.isDragging) return;
  state.isDragging = false;
  try {
    await apiRequest('/drag', {
      startX: state.dragStart.x,
      startY: state.dragStart.y,
      endX: x,
      endY: y,
      duration: 0.2
    });
  } catch (error) {
    connect();
  }
}

async function scroll(vertical = true) {
  if (!state.isConnected) return;
  try {
    const direction = vertical ? 1 : 0;
    await apiRequest('/scroll', { x: 0, y: direction, amount: 50 });
  } catch (error) {
    connect();
  }
}