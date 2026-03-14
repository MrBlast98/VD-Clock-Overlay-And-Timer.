/**
 * VD Clock Map Overlay - Main Renderer Process
 * Handles UI logic, event handling, and IPC communication
 */

// ============================================
// Configuration & Constants
// ============================================
const CONFIG = {
  MAP_NAMES: [
    'Bay Harbor',
    'BloodBath Club',
    'Firelink Temple',
    'Happy Village',
    'Mercy Hospital Rooftop',
    'Sad Village',
    'Woodview Cabin'
  ],
  STORAGE_KEYS: {
    TIMER_STYLE: 'timerStyle',
    TIMER_COLOR: 'timerColorHex',
    CUSTOM_HOTKEYS: 'customHotkeys',
    TIMER_ALWAYS_ON_TOP: 'timerAlwaysOnTop'
  },
  DEFAULT_HOTKEYS: {
    startStop: ' ',
    reset: 'r'
  }
};

// ============================================
// State Management
// ============================================
const state = {
  // Image selector state
  images: [],
  selectedImageIndex: null,

  // Timer state
  timerRunning: false,
  timerMilliseconds: 0,
  timerIntervalId: null,

  // Score state
  player1Score: 0,
  player2Score: 0,

  // Hotkey state
  customHotkeys: { ...CONFIG.DEFAULT_HOTKEYS },
  listeningForHotkey: null
};

// ============================================
// DOM Elements Cache
// ============================================
const DOM = {
  // Maps section
  mapList: null,
  previewImage: null,
  nothingSelected: null,
  popoutBtn: null,

  // 1V1 section
  timerDisplay: null,
  timerStartBtn: null,
  timerStopBtn: null,
  timerResetBtn: null,
  timerPopoutBtn: null,

  // Style selector
  styleBtns: null,

  // Color selector
  colorBtns: null,

  // Score display
  p1Score: null,
  p2Score: null,
  p1Plus: null,
  p1Minus: null,
  p2Plus: null,
  p2Minus: null,
  resetScoreBtn: null,

  // Settings
  hotkeyInputs: null,
  resetHotKeyBtns: null,
  alwaysOnTopCheckbox: null,
  categoryTabs: null,
  categorySections: null
};

// ============================================
// Initialization
// ============================================

/**
 * Initialize the renderer when DOM is ready
 */
function initialize() {
  try {
    cacheDOM();
    loadState();
    setupEventListeners();
    loadImages();
    setupCategoryTabs();
    setup1V1();
    setupHotkeySettings();
    
    // Register global hotkeys with main process
    syncHotkeysToMain();
    
    // Listen for global hotkeys
    if (window.api?.onGlobalHotkey) {
      window.api.onGlobalHotkey((action) => {
        if (action === 'startStop') toggleTimer();
        else if (action === 'reset') resetTimer();
      });
    }
    
    console.log('Renderer initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

/**
 * Cache all DOM element references for performance
 */
function cacheDOM() {
  // Maps section
  DOM.mapList = document.getElementById('mapList');
  DOM.previewImage = document.getElementById('previewImage');
  DOM.nothingSelected = document.getElementById('nothingSelected');
  DOM.popoutBtn = document.getElementById('popoutBtn');

  // 1V1 section
  DOM.timerDisplay = document.getElementById('timerDisplay');
  DOM.timerStartBtn = document.getElementById('timerStartBtn');
  DOM.timerStopBtn = document.getElementById('timerStopBtn');
  DOM.timerResetBtn = document.getElementById('timerResetBtn');
  DOM.timerPopoutBtn = document.getElementById('timerPopoutBtn');

  // Style selector
  DOM.styleBtns = document.querySelectorAll('.style-btn');

  // Color selector
  DOM.colorBtns = document.querySelectorAll('.color-btn');

  // Score display
  DOM.p1Score = document.getElementById('p1Score');
  DOM.p2Score = document.getElementById('p2Score');
  DOM.p1Plus = document.getElementById('p1Plus');
  DOM.p1Minus = document.getElementById('p1Minus');
  DOM.p2Plus = document.getElementById('p2Plus');
  DOM.p2Minus = document.getElementById('p2Minus');
  DOM.resetScoreBtn = document.getElementById('resetScoreBtn');

  // Settings
  DOM.hotkeyInputs = document.querySelectorAll('.hotkey-input');
  DOM.resetHotKeyBtns = document.querySelectorAll('.reset-hotkey-btn');
  DOM.alwaysOnTopCheckbox = document.getElementById('timertAlwaysOnTop');
  DOM.categoryTabs = document.querySelectorAll('.category-tab');
  DOM.categorySections = document.querySelectorAll('.category-section');
}

/**
 * Load saved state from localStorage
 */
function loadState() {
  try {
    // Load custom hotkeys
    const savedHotkeys = localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOM_HOTKEYS);
    if (savedHotkeys) {
      state.customHotkeys = JSON.parse(savedHotkeys);
    }
  } catch (error) {
    console.error('Error loading state:', error);
    state.customHotkeys = { ...CONFIG.DEFAULT_HOTKEYS };
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  if (DOM.previewImage) {
    setupDragAndDrop();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initialize);

// ============================================
// Image Management
// ============================================

/**
 * Load images from IPC and render map buttons
 */
function loadImages() {
  try {
    if (!window.api?.loadImages) {
      console.warn('Image loading API not available');
      return;
    }

    window.api.loadImages()
      .then(loadedImages => {
        state.images = loadedImages || [];
        renderMapButtons();
      })
      .catch(error => {
        console.error('Error loading images:', error);
        if (DOM.mapList) {
          DOM.mapList.innerHTML = '<div style="color: #666; padding: 10px;">Error loading images</div>';
        }
      });
  } catch (error) {
    console.error('Error in loadImages:', error);
  }
}

/**
 * Render map button list
 */
function renderMapButtons() {
  if (!DOM.mapList) return;
  
  DOM.mapList.innerHTML = '';

  if (state.images.length === 0) {
    const msg = document.createElement('div');
    msg.style.color = '#666';
    msg.style.padding = '10px';
    msg.textContent = 'No images found in /images folder';
    DOM.mapList.appendChild(msg);
    return;
  }

  for (let i = 0; i < state.images.length; i++) {
    const mapName = CONFIG.MAP_NAMES[i] || `Map ${i + 1}`;
    const btn = document.createElement('button');
    btn.className = 'map-btn';
    btn.textContent = mapName;
    btn.dataset.index = i;
    btn.addEventListener('click', () => selectImage(i));
    DOM.mapList.appendChild(btn);
  }
}

/**
 * Select and display an image
 * @param {number} index - Image index
 */
function selectImage(index) {
  try {
    if (index < 0 || index >= state.images.length) return;

    state.selectedImageIndex = index;
    
    if (DOM.previewImage) {
      DOM.previewImage.src = state.images[index].path;
      DOM.previewImage.classList.add('visible');
    }
    
    if (DOM.nothingSelected) {
      DOM.nothingSelected.style.display = 'none';
    }
    
    if (DOM.popoutBtn) {
      DOM.popoutBtn.style.display = 'block';
    }

    // Update active button highlighting
    document.querySelectorAll('.map-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-index="${index}"]`)?.classList.add('active');
  } catch (error) {
    console.error('Error selecting image:', error);
  }
}

/**
 * Setup drag and drop for preview image
 */
function setupDragAndDrop() {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  DOM.previewImage.addEventListener('mousedown', (e) => {
    if (!DOM.previewImage.classList.contains('visible')) return;
    isDragging = true;
    offsetX = e.clientX - DOM.previewImage.offsetLeft;
    offsetY = e.clientY - DOM.previewImage.offsetTop;
    DOM.previewImage.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      DOM.previewImage.style.left = (e.clientX - offsetX) + 'px';
      DOM.previewImage.style.top = (e.clientY - offsetY) + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    DOM.previewImage.style.cursor = 'grab';
  });

  DOM.previewImage.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  // Pop out button
  if (DOM.popoutBtn) {
    DOM.popoutBtn.addEventListener('click', () => {
      if (state.selectedImageIndex >= 0 && state.selectedImageIndex < state.images.length) {
        const imageName = CONFIG.MAP_NAMES[state.selectedImageIndex] || `Map ${state.selectedImageIndex + 1}`;
        window.api?.popoutImage(state.images[state.selectedImageIndex].path, imageName);
      }
    });
  }
}

// ============================================
// Category Tabs Management
// ============================================

/**
 * Setup category tab switching
 */
function setupCategoryTabs() {
  if (!DOM.categoryTabs) return;

  DOM.categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => handleCategoryTabClick(tab));
  });

  // Auto-open maps section
  const mapsTab = document.querySelector('[data-category="maps"]');
  if (mapsTab) {
    handleCategoryTabClick(mapsTab);
  }
}

/**
 * Handle category tab click
 * @param {HTMLElement} tab - The clicked tab element
 */
function handleCategoryTabClick(tab) {
  try {
    const category = tab.dataset.category;
    const container = document.querySelector('.container');

    // Remove active class from all tabs and sections
    DOM.categoryTabs.forEach(t => t.classList.remove('active'));
    DOM.categorySections.forEach(s => s.classList.remove('active'));

    // Add active class to clicked tab and section
    tab.classList.add('active');
    const section = document.getElementById(`${category}-section`);
    if (section) section.classList.add('active');

    // Toggle container class and preview area for 1V1
    if (category === '1v1') {
      container?.classList.add('show-1v1');
    } else {
      container?.classList.remove('show-1v1');
    }

    const previewArea = document.querySelector('.preview-area');
    if (previewArea) {
      previewArea.style.display = category === 'maps' ? 'flex' : 'none';
    }
  } catch (error) {
    console.error('Error handling category tab click:', error);
  }
}

// ============================================
// 1V1 Timer & Scoreboard
// ============================================

/**
 * Setup 1V1 timer and scoreboard functionality
 */
function setup1V1() {
  try {
    setupTimerButtons();
    setupStyleSelector();
    setupColorSelector();
    setupScoreButtons();
    loadSavedTimerSettings();
  } catch (error) {
    console.error('Error in setup1V1:', error);
  }
}

/**
 * Setup timer control buttons
 */
function setupTimerButtons() {
  if (DOM.timerStartBtn) DOM.timerStartBtn.addEventListener('click', toggleTimer);
  if (DOM.timerStopBtn) DOM.timerStopBtn.addEventListener('click', stopTimer);
  if (DOM.timerResetBtn) DOM.timerResetBtn.addEventListener('click', resetTimer);
  if (DOM.timerPopoutBtn) {
    DOM.timerPopoutBtn.addEventListener('click', () => {
      window.api?.popoutTimer();
    });
  }
  
  document.addEventListener('keydown', handleHotkeys);
}

/**
 * Setup timer style selector buttons
 */
function setupStyleSelector() {
  if (!DOM.styleBtns) return;

  DOM.styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const style = btn.dataset.style;
      
      // Update UI
      DOM.styleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update timer
      if (DOM.timerDisplay) {
        DOM.timerDisplay.classList.remove('style-classic', 'style-cyber', 'style-retro', 'style-glitch', 'style-minimal');
        if (style !== 'classic') {
          DOM.timerDisplay.classList.add(`style-${style}`);
        }
      }
      
      // Save and notify
      localStorage.setItem(CONFIG.STORAGE_KEYS.TIMER_STYLE, style);
      window.api?.updateTimerStyle(style);
    });
  });
}

/**
 * Setup timer color selector buttons
 */
function setupColorSelector() {
  if (!DOM.colorBtns) return;

  DOM.colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      const colorName = btn.dataset.name;
      
      // Update UI
      DOM.colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update timer display color
      if (DOM.timerDisplay) {
        DOM.timerDisplay.style.color = color;
      }
      
      // Save and notify
      localStorage.setItem(CONFIG.STORAGE_KEYS.TIMER_COLOR, colorName);
      localStorage.setItem(CONFIG.STORAGE_KEYS.TIMER_COLOR + 'Hex', color);
      window.api?.updateTimerColor(color, colorName);
    });
  });
}

/**
 * Setup score control buttons
 */
function setupScoreButtons() {
  if (DOM.p1Plus) DOM.p1Plus.addEventListener('click', () => addScore(1));
  if (DOM.p1Minus) DOM.p1Minus.addEventListener('click', () => subtractScore(1));
  if (DOM.p2Plus) DOM.p2Plus.addEventListener('click', () => addScore(2));
  if (DOM.p2Minus) DOM.p2Minus.addEventListener('click', () => subtractScore(2));
  if (DOM.resetScoreBtn) DOM.resetScoreBtn.addEventListener('click', resetScores);
}

/**
 * Load saved timer settings from localStorage
 */
function loadSavedTimerSettings() {
  // Load saved style
  const savedStyle = localStorage.getItem(CONFIG.STORAGE_KEYS.TIMER_STYLE) || 'classic';
  const styleBtn = document.querySelector(`[data-style="${savedStyle}"]`);
  if (styleBtn) styleBtn.click();

  // Load saved color
  const savedColorName = localStorage.getItem(CONFIG.STORAGE_KEYS.TIMER_COLOR);
  if (savedColorName) {
    const colorBtn = document.querySelector(`[data-name="${savedColorName}"]`);
    if (colorBtn) colorBtn.click();
  }
}

// ============================================
// Timer Control Functions
// ============================================

/**
 * Handle keyboard hotkeys for timer
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleHotkeys(e) {
  if (state.listeningForHotkey) return;

  const key = e.key.toLowerCase();
  
  // Check start/stop hotkey
  if (key === state.customHotkeys.startStop.toLowerCase() || 
      (e.code === 'Space' && state.customHotkeys.startStop === ' ')) {
    e.preventDefault();
    toggleTimer();
    return;
  }
  
  // Check reset hotkey
  if (key === state.customHotkeys.reset.toLowerCase()) {
    e.preventDefault();
    resetTimer();
  }
}

/**
 * Toggle timer between running and stopped
 */
function toggleTimer() {
  if (state.timerRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

/**
 * Start the timer
 */
function startTimer() {
  if (state.timerRunning) return;

  state.timerRunning = true;
  state.timerIntervalId = setInterval(() => {
    state.timerMilliseconds += 10;
    updateTimerDisplay();
    window.api?.updateTimerState({ milliseconds: state.timerMilliseconds, running: state.timerRunning });
  }, 10);

  if (DOM.timerStartBtn) {
    DOM.timerStartBtn.textContent = '⏸ Stop';
  }
}

/**
 * Stop the running timer
 */
function stopTimer() {
  state.timerRunning = false;
  clearInterval(state.timerIntervalId);
  window.api?.updateTimerState({ milliseconds: state.timerMilliseconds, running: state.timerRunning });
  
  if (DOM.timerStartBtn) {
    DOM.timerStartBtn.textContent = '▶ Start';
  }
}

/**
 * Reset timer to zero
 */
function resetTimer() {
  state.timerRunning = false;
  clearInterval(state.timerIntervalId);
  state.timerMilliseconds = 0;
  updateTimerDisplay();
  window.api?.updateTimerState({ milliseconds: state.timerMilliseconds, running: state.timerRunning });
  
  if (DOM.timerStartBtn) {
    DOM.timerStartBtn.textContent = '▶ Start';
  }
}

/**
 * Update timer display with formatted time
 */
function updateTimerDisplay() {
  if (!DOM.timerDisplay) return;

  const totalSeconds = Math.floor(state.timerMilliseconds / 1000);
  const centiseconds = Math.floor((state.timerMilliseconds % 1000) / 10);
  
  let display;
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    display = `${minutes}:${String(secs).padStart(2, '0')}`;
  } else {
    display = `${totalSeconds}.${String(centiseconds).padStart(2, '0')}`;
  }
  
  DOM.timerDisplay.textContent = display;
}

// ============================================
// Scoreboard Functions
// ============================================

/**
 * Add score to a player
 * @param {number} player - Player number (1 or 2)
 */
function addScore(player) {
  try {
    if (player === 1) {
      state.player1Score++;
      if (DOM.p1Score) DOM.p1Score.textContent = state.player1Score;
    } else if (player === 2) {
      state.player2Score++;
      if (DOM.p2Score) DOM.p2Score.textContent = state.player2Score;
    }
  } catch (error) {
    console.error('Error adding score:', error);
  }
}

/**
 * Subtract score from a player
 * @param {number} player - Player number (1 or 2)
 */
function subtractScore(player) {
  try {
    if (player === 1) {
      if (state.player1Score > 0) {
        state.player1Score--;
        if (DOM.p1Score) DOM.p1Score.textContent = state.player1Score;
      }
    } else if (player === 2) {
      if (state.player2Score > 0) {
        state.player2Score--;
        if (DOM.p2Score) DOM.p2Score.textContent = state.player2Score;
      }
    }
  } catch (error) {
    console.error('Error subtracting score:', error);
  }
}

/**
 * Reset both player scores to zero
 */
function resetScores() {
  try {
    state.player1Score = 0;
    state.player2Score = 0;
    if (DOM.p1Score) DOM.p1Score.textContent = '0';
    if (DOM.p2Score) DOM.p2Score.textContent = '0';
  } catch (error) {
    console.error('Error resetting scores:', error);
  }
}

// ============================================
// Hotkey Settings
// ============================================

/**
 * Setup hotkey customization UI
 */
function setupHotkeySettings() {
  try {
    updateHotkeyDisplays();
    setupHotkeyInputs();
    setupHotkeyResetButtons();
    setupAlwaysOnTopToggle();
  } catch (error) {
    console.error('Error in setupHotkeySettings:', error);
  }
}

/**
 * Update displayed hotkey values
 */
function updateHotkeyDisplays() {
  const startStopInput = document.getElementById('hotkeyStartStop');
  const resetInput = document.getElementById('hotkeyReset');
  
  if (startStopInput) {
    startStopInput.value = formatKeyDisplay(state.customHotkeys.startStop);
  }
  if (resetInput) {
    resetInput.value = formatKeyDisplay(state.customHotkeys.reset);
  }
}

/**
 * Setup hotkey input listeners
 */
function setupHotkeyInputs() {
  if (!DOM.hotkeyInputs) return;

  DOM.hotkeyInputs.forEach(input => {
    input.addEventListener('click', () => {
      startListeningForHotkey(input.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (state.listeningForHotkey) {
      e.preventDefault();
      const hotkeyName = state.listeningForHotkey
        .replace('hotkey', '')
        .replace(/^./, str => str.toLowerCase());
      
      state.customHotkeys[hotkeyName] = e.key.toLowerCase();
      saveHotkeys();
      
      const inputEl = document.getElementById(state.listeningForHotkey);
      if (inputEl) {
        inputEl.value = formatKeyDisplay(e.key.toLowerCase());
        inputEl.classList.remove('listening');
      }
      
      state.listeningForHotkey = null;
    }
  });
}

/**
 * Start listening for a new hotkey
 * @param {string} inputId - The input element ID
 */
function startListeningForHotkey(inputId) {
  if (state.listeningForHotkey) {
    const prevInput = document.getElementById(state.listeningForHotkey);
    if (prevInput) prevInput.classList.remove('listening');
  }
  
  state.listeningForHotkey = inputId;
  const inputEl = document.getElementById(inputId);
  if (inputEl) {
    inputEl.classList.add('listening');
    inputEl.value = 'Press any key...';
  }
}

/**
 * Setup hotkey reset buttons
 */
function setupHotkeyResetButtons() {
  if (!DOM.resetHotKeyBtns) return;

  DOM.resetHotKeyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      resetHotkey(btn.dataset.hotkey);
    });
  });
}

/**
 * Reset hotkey to default
 * @param {string} hotkeyName - Name of hotkey to reset
 */
function resetHotkey(hotkeyName) {
  state.customHotkeys[hotkeyName] = CONFIG.DEFAULT_HOTKEYS[hotkeyName];
  saveHotkeys();
  
  const inputId = 'hotkey' + hotkeyName.charAt(0).toUpperCase() + hotkeyName.slice(1);
  const inputEl = document.getElementById(inputId);
  if (inputEl) {
    inputEl.value = formatKeyDisplay(state.customHotkeys[hotkeyName]);
    inputEl.classList.remove('listening');
  }
}

/**
 * Setup always-on-top toggle for timer window
 */
function setupAlwaysOnTopToggle() {
  if (!DOM.alwaysOnTopCheckbox) return;

  try {
    const savedAlwaysOnTop = localStorage.getItem(CONFIG.STORAGE_KEYS.TIMER_ALWAYS_ON_TOP) === 'true';
    DOM.alwaysOnTopCheckbox.checked = savedAlwaysOnTop;

    DOM.alwaysOnTopCheckbox.addEventListener('change', () => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.TIMER_ALWAYS_ON_TOP, 
        DOM.alwaysOnTopCheckbox.checked ? 'true' : 'false');
      window.api?.setTimerAlwaysOnTop(DOM.alwaysOnTopCheckbox.checked);
    });
  } catch (error) {
    console.error('Error setting up always-on-top toggle:', error);
  }
}

/**
 * Save custom hotkeys to localStorage and IPC
 */
function saveHotkeys() {
  localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOM_HOTKEYS, JSON.stringify(state.customHotkeys));
  syncHotkeysToMain();
}

/**
 * Sync hotkeys with main process
 */
function syncHotkeysToMain() {
  if (window.api?.setGlobalHotkeys) {
    window.api.setGlobalHotkeys(state.customHotkeys);
  }
}

/**
 * Format key for display
 * @param {string} key - The key to format
 * @returns {string} Formatted key display
 */
function formatKeyDisplay(key) {
  const keyMap = {
    ' ': 'Space',
    'enter': 'Enter',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→'
  };

  return keyMap[key] || key.toUpperCase();
}
