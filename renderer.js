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

  // Dual Timer state
  player1TimeMs: 0,
  player1Running: false,
  player1IntervalId: null,
  player1HasGone: false,
  
  player2TimeMs: 0,
  player2Running: false,
  player2IntervalId: null,
  player2HasGone: false,
  
  activePlayer: 1,

  // Score state
  player1Score: 0,
  player2Score: 0,
  player1Name: localStorage.getItem('player1Name') || 'PLAYER 1',
  player2Name: localStorage.getItem('player2Name') || 'PLAYER 2',

  // Hotkey state
  timerHotkeys: {
    switchLeft: 'ArrowLeft',
    switchRight: 'ArrowRight',
    toggleTimer: ' '
  },
  listeningForHotkey: null,
  customHotkeys: { ...CONFIG.DEFAULT_HOTKEYS },
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
  player1NameMain: null,
  player2NameMain: null,
  player1TimerMain: null,
  player2TimerMain: null,
  scoreDisplayMain: null,
  player1StartMain: null,
  player1StopMain: null,
  player2StartMain: null,
  player2StopMain: null,
  resetScoreBtnMain: null,
  timerPopoutBtn: null,

  // Timer hotkey info
  hotkeyInfoText: null,

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

  // Timer hotkeys
  hotkeyLeftBtn: null,
  hotkeyRightBtn: null,
  hotkeyToggleBtn: null,
  resetHotkeysBtn: null,

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
    
    // New dual-timer system uses local hotkeys (arrow keys + space)
    // Global hotkeys deprecated - handled by handleTimerHotkeys()
    
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
  DOM.player1NameMain = document.getElementById('player1NameMain');
  DOM.player2NameMain = document.getElementById('player2NameMain');
  DOM.player1TimerMain = document.getElementById('player1TimerMain');
  DOM.player2TimerMain = document.getElementById('player2TimerMain');
  DOM.scoreDisplayMain = document.getElementById('scoreDisplayMain');
  DOM.player1StartMain = document.getElementById('player1StartMain');
  DOM.player1StopMain = document.getElementById('player1StopMain');
  DOM.player2StartMain = document.getElementById('player2StartMain');
  DOM.player2StopMain = document.getElementById('player2StopMain');
  DOM.resetScoreBtnMain = document.getElementById('resetScoreBtnMain');
  DOM.timerPopoutBtn = document.getElementById('timerPopoutBtn');

  // Timer hotkey customization
  DOM.hotkeyLeftBtn = document.getElementById('hotkeyLeftBtn');
  DOM.hotkeyRightBtn = document.getElementById('hotkeyRightBtn');
  DOM.hotkeyToggleBtn = document.getElementById('hotkeyToggleBtn');
  DOM.resetHotkeysBtn = document.getElementById('resetHotkeysBtn');
  DOM.hotkeyInfoText = document.getElementById('hotkeyInfoText');

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
    setupEditablePlayerNames();
    setupTimerHotkeys();
    loadSavedTimerSettings();
  } catch (error) {
    console.error('Error in setup1V1:', error);
  }
}

/**
 * Setup timer control buttons
 */
function setupTimerButtons() {
  if (DOM.player1StartMain) DOM.player1StartMain.addEventListener('click', () => startPlayerTimer(1));
  if (DOM.player1StopMain) DOM.player1StopMain.addEventListener('click', () => stopPlayerTimer(1));
  if (DOM.player2StartMain) DOM.player2StartMain.addEventListener('click', () => startPlayerTimer(2));
  if (DOM.player2StopMain) DOM.player2StopMain.addEventListener('click', () => stopPlayerTimer(2));
  if (DOM.resetScoreBtnMain) DOM.resetScoreBtnMain.addEventListener('click', resetScores);
  if (DOM.timerPopoutBtn) {
    DOM.timerPopoutBtn.addEventListener('click', () => {
      window.api?.popoutTimer();
    });
  }
  
  document.addEventListener('keydown', handleTimerHotkeys);
}

/**
 * Setup timer style selector buttons
 */
function setupStyleSelector() {
  // Style selector removed - colors are now handled by color selector
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
      
      // Update timer display colors
      if (DOM.player1TimerMain) {
        DOM.player1TimerMain.style.color = color;
        DOM.player1TimerMain.style.textShadow = `0 0 20px ${color}99`;
      }
      if (DOM.player2TimerMain) {
        DOM.player2TimerMain.style.color = color;
        DOM.player2TimerMain.style.textShadow = `0 0 20px ${color}99`;
      }
      
      // Save and notify
      localStorage.setItem(CONFIG.STORAGE_KEYS.TIMER_COLOR, colorName);
      localStorage.setItem(CONFIG.STORAGE_KEYS.TIMER_COLOR + 'Hex', color);
      window.api?.updateTimerColor(color, colorName);
    });
  });
}

/**
 * Setup editable player names
 */
function setupEditablePlayerNames() {
  const setupNameEditing = (nameElement, playerNum) => {
    if (!nameElement) return;
    
    nameElement.addEventListener('click', () => {
      // Only allow editing if timers are not running
      if ((playerNum === 1 && state.player1Running) || (playerNum === 2 && state.player2Running)) {
        return;
      }
      
      const currentName = nameElement.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.className = 'player-name-input';
      input.style.cssText = `
        font-size: 18px;
        padding: 5px;
        border: 2px solid #00ff88;
        background: rgba(0, 0, 0, 0.8);
        color: #00ff88;
        text-align: center;
        font-weight: bold;
      `;
      
      nameElement.replaceWith(input);
      input.focus();
      input.select();
      
      const saveName = () => {
        const newName = input.value.trim() || (playerNum === 1 ? 'Player 1' : 'Player 2');
        const storageKey = playerNum === 1 ? 'player1Name' : 'player2Name';
        
        nameElement.textContent = newName;
        input.replaceWith(nameElement);
        localStorage.setItem(storageKey, newName);
        
        // Update state reference if needed
        state.listeningForHotkey = false;
      };
      
      input.addEventListener('blur', saveName);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveName();
        }
      });
    });
  };
  
  setupNameEditing(DOM.player1NameMain, 1);
  setupNameEditing(DOM.player2NameMain, 2);
}

/**
 * Setup score control buttons
 */
function setupScoreButtons() {
  // Score buttons are now integrated in the main timer display
}

/**
 * Setup timer hotkey customization
 */
function setupTimerHotkeys() {
  loadSavedHotkeys();
  
  // Send custom hotkeys to main process for global registration
  if (window.api?.setGlobalHotkeys) {
    window.api.setGlobalHotkeys(state.timerHotkeys);
  }
  
  // Listen for global hotkey triggers from main process
  if (window.api?.onGlobalTimerHotkey) {
    window.api.onGlobalTimerHotkey((data) => {
      if (data.action === 'switchLeft') {
        switchPlayer(1);
      } else if (data.action === 'switchRight') {
        switchPlayer(2);
      } else if (data.action === 'toggleTimer') {
        toggleActivePlayerTimer();
      }
    });
  }
  
  const setupHotkeyButton = (btn, hotkeyType) => {
    if (!btn) return;
    
    btn.addEventListener('click', () => {
      state.listeningForHotkey = hotkeyType;
      btn.textContent = 'Press any key...';
      btn.style.background = '#00ff88';
      btn.style.color = '#000';
    });
  };
  
  setupHotkeyButton(DOM.hotkeyLeftBtn, 'switchLeft');
  setupHotkeyButton(DOM.hotkeyRightBtn, 'switchRight');
  setupHotkeyButton(DOM.hotkeyToggleBtn, 'toggleTimer');
  
  if (DOM.resetHotkeysBtn) {
    DOM.resetHotkeysBtn.addEventListener('click', () => {
      state.timerHotkeys = {
        switchLeft: 'ArrowLeft',
        switchRight: 'ArrowRight',
        toggleTimer: ' '
      };
      localStorage.setItem('timerHotkeys', JSON.stringify(state.timerHotkeys));
      updateHotkeyDisplay();
      // Update global hotkeys
      if (window.api?.setGlobalHotkeys) {
        window.api.setGlobalHotkeys(state.timerHotkeys);
      }
    });
  }
  
  // Update display
  updateHotkeyDisplay();
  
  // Listen for key presses when customizing
  document.addEventListener('keydown', (e) => {
    if (state.listeningForHotkey) {
      e.preventDefault();
      const key = e.key;
      state.timerHotkeys[state.listeningForHotkey] = key;
      localStorage.setItem('timerHotkeys', JSON.stringify(state.timerHotkeys));
      updateHotkeyDisplay();
      state.listeningForHotkey = null;
      // Update global hotkeys
      if (window.api?.setGlobalHotkeys) {
        window.api.setGlobalHotkeys(state.timerHotkeys);
      }
    }
  });
}

/**
 * Load saved timer hotkeys from localStorage
 */
function loadSavedHotkeys() {
  const saved = localStorage.getItem('timerHotkeys');
  if (saved) {
    try {
      state.timerHotkeys = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved hotkeys:', e);
    }
  }
}

/**
 * Update hotkey button displays
 */
function updateHotkeyDisplay() {
  if (DOM.hotkeyLeftBtn) {
    DOM.hotkeyLeftBtn.textContent = formatHotkeyDisplay(state.timerHotkeys.switchLeft);
    DOM.hotkeyLeftBtn.style.background = '#1a1a1a';
    DOM.hotkeyLeftBtn.style.color = '#00ff88';
  }
  if (DOM.hotkeyRightBtn) {
    DOM.hotkeyRightBtn.textContent = formatHotkeyDisplay(state.timerHotkeys.switchRight);
    DOM.hotkeyRightBtn.style.background = '#1a1a1a';
    DOM.hotkeyRightBtn.style.color = '#00ff88';
  }
  if (DOM.hotkeyToggleBtn) {
    DOM.hotkeyToggleBtn.textContent = formatHotkeyDisplay(state.timerHotkeys.toggleTimer);
    DOM.hotkeyToggleBtn.style.background = '#1a1a1a';
    DOM.hotkeyToggleBtn.style.color = '#00ff88';
  }
  
  // Update info text
  if (DOM.hotkeyInfoText) {
    const leftKey = formatHotkeyDisplay(state.timerHotkeys.switchLeft);
    const rightKey = formatHotkeyDisplay(state.timerHotkeys.switchRight);
    const toggleKey = formatHotkeyDisplay(state.timerHotkeys.toggleTimer);
    DOM.hotkeyInfoText.textContent = `Hotkeys: ${leftKey} ${rightKey} to switch | ${toggleKey} to toggle`;
  }
}

/**
 * Format hotkey for display
 */
function formatHotkeyDisplay(key) {
  const keyMap = {
    ' ': 'Space',
    'ArrowLeft': '← Left',
    'ArrowRight': '→ Right',
    'ArrowUp': '↑ Up',
    'ArrowDown': '↓ Down',
    'Enter': 'Enter',
    'Escape': 'Esc'
  };
  return keyMap[key] || key.toUpperCase();
}

/**
 * Load saved timer settings from localStorage
 */
function loadSavedTimerSettings() {
  // Load saved color
  const savedColorName = localStorage.getItem(CONFIG.STORAGE_KEYS.TIMER_COLOR) || 'blue';
  const colorBtn = document.querySelector(`[data-name="${savedColorName}"]`);
  if (colorBtn) {
    colorBtn.click();
  } else {
    // Fallback: click the first color button
    const firstColorBtn = document.querySelector('.timer-color-btn');
    if (firstColorBtn) firstColorBtn.click();
  }
  
  // Load saved player scores
  const savedPlayer1Score = localStorage.getItem('player1Score');
  const savedPlayer2Score = localStorage.getItem('player2Score');
  if (savedPlayer1Score) state.player1Score = parseInt(savedPlayer1Score, 10);
  if (savedPlayer2Score) state.player2Score = parseInt(savedPlayer2Score, 10);
  updateScoreDisplay();
  
  // Load saved player names
  const savedPlayer1Name = localStorage.getItem('player1Name') || 'Player 1';
  const savedPlayer2Name = localStorage.getItem('player2Name') || 'Player 2';
  if (DOM.player1NameMain) DOM.player1NameMain.textContent = savedPlayer1Name;
  if (DOM.player2NameMain) DOM.player2NameMain.textContent = savedPlayer2Name;
}

// ============================================
// Timer Control Functions
// ============================================

/**
 * Handle keyboard hotkeys for timer
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleTimerHotkeys(e) {
  if (state.listeningForHotkey) return;

  // Check custom hotkeys
  if (e.key === state.timerHotkeys.switchLeft) {
    e.preventDefault();
    switchPlayer(1);
    return;
  }
  if (e.key === state.timerHotkeys.switchRight) {
    e.preventDefault();
    switchPlayer(2);
    return;
  }
  if (e.key === state.timerHotkeys.toggleTimer) {
    e.preventDefault();
    toggleActivePlayerTimer();
    return;
  }
}

/**
 * Switch active player
 */
function switchPlayer(playerNum) {
  state.activePlayer = playerNum;
  updateActivePlayerDisplay();
}

/**
 * Update active player display
 */
function updateActivePlayerDisplay() {
  if (DOM.player1NameMain) {
    DOM.player1NameMain.classList.toggle('active', state.activePlayer === 1);
  }
  if (DOM.player2NameMain) {
    DOM.player2NameMain.classList.toggle('active', state.activePlayer === 2);
  }
}

/**
 * Toggle active player timer
 */
function toggleActivePlayerTimer() {
  if (state.activePlayer === 1) {
    if (state.player1Running) {
      stopPlayerTimer(1);
    } else {
      startPlayerTimer(1);
    }
  } else {
    if (state.player2Running) {
      stopPlayerTimer(2);
    } else {
      startPlayerTimer(2);
    }
  }
}

/**
 * Start timer for a specific player
 */
function startPlayerTimer(playerNum) {
  if (playerNum === 1) {
    if (state.player1Running) return;
    state.player1Running = true;
    const startTime = Date.now() - state.player1TimeMs;
    state.player1IntervalId = setInterval(() => {
      state.player1TimeMs = Date.now() - startTime;
      updatePlayerTimerDisplay(1);
    }, 16);
  } else {
    if (state.player2Running) return;
    state.player2Running = true;
    const startTime = Date.now() - state.player2TimeMs;
    state.player2IntervalId = setInterval(() => {
      state.player2TimeMs = Date.now() - startTime;
      updatePlayerTimerDisplay(2);
    }, 16);
  }
  updateButtonStates();
}

/**
 * Stop timer for a specific player
 */
function stopPlayerTimer(playerNum) {
  if (playerNum === 1) {
    if (state.player1IntervalId) clearInterval(state.player1IntervalId);
    state.player1Running = false;
    state.player1HasGone = true;
  } else {
    if (state.player2IntervalId) clearInterval(state.player2IntervalId);
    state.player2Running = false;
    state.player2HasGone = true;
  }
  updateButtonStates();
  checkAutoScore();
}

/**
 * Check for auto-scoring
 */
function checkAutoScore() {
  // Both timers must be stopped and both players must have taken their turn
  if (state.player1Running || state.player2Running) return;
  if (!state.player1HasGone || !state.player2HasGone) return;
  
  const timeDiff = state.player1TimeMs - state.player2TimeMs;
  
  if (timeDiff > 0) {
    state.player1Score++;
    localStorage.setItem('player1Score', state.player1Score);
    updateScoreDisplay();
    console.log(`${state.player1Name} gets a point!`);
  } else if (timeDiff < 0) {
    state.player2Score++;
    localStorage.setItem('player2Score', state.player2Score);
    updateScoreDisplay();
    console.log(`${state.player2Name} gets a point!`);
  }
  
  // Reset the "has gone" flags and clear timers for next round
  state.player1HasGone = false;
  state.player2HasGone = false;
  state.player1TimeMs = 0;
  state.player2TimeMs = 0;
  updatePlayerTimerDisplay(1);
  updatePlayerTimerDisplay(2);
}

/**
 * Update button states
 */
function updateButtonStates() {
  if (DOM.player1StartMain) DOM.player1StartMain.classList.toggle('active', state.player1Running);
  if (DOM.player2StartMain) DOM.player2StartMain.classList.toggle('active', state.player2Running);
}

/**
 * Update player timer display
 */
function updatePlayerTimerDisplay(playerNum) {
  const timeMs = playerNum === 1 ? state.player1TimeMs : state.player2TimeMs;
  const display = formatTime(timeMs);
  
  if (playerNum === 1 && DOM.player1TimerMain) {
    DOM.player1TimerMain.textContent = display;
  } else if (playerNum === 2 && DOM.player2TimerMain) {
    DOM.player2TimerMain.textContent = display;
  }
  
  // Send timer updates to main.js for popout window
  if (window.api?.updateTimerDisplay) {
    window.api.updateTimerDisplay({
      player1TimeMs: state.player1TimeMs,
      player1Running: state.player1Running,
      player2TimeMs: state.player2TimeMs,
      player2Running: state.player2Running,
      player1Score: state.player1Score,
      player2Score: state.player2Score,
      player1Name: state.player1Name,
      player2Name: state.player2Name
    });
  }
}

/**
 * Format time in milliseconds
 */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${seconds}.${String(centiseconds).padStart(2, '0')}`;
}

/**
 * Update score display
 */
function updateScoreDisplay() {
  if (DOM.scoreDisplayMain) {
    DOM.scoreDisplayMain.textContent = `${state.player1Score} — ${state.player2Score}`;
  }
}

/**
 * Reset scores
 */
function resetScores() {
  state.player1Score = 0;
  state.player2Score = 0;
  state.player1HasGone = false;
  state.player2HasGone = false;
  state.player1TimeMs = 0;
  state.player2TimeMs = 0;
  localStorage.setItem('player1Score', '0');
  localStorage.setItem('player2Score', '0');
  updateScoreDisplay();
  updatePlayerTimerDisplay(1);
  updatePlayerTimerDisplay(2);
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

// ============================================
// Hotkey Settings
// ============================================

/**
 * Setup hotkey customization UI
 */
// Old hotkey settings removed - using fixed local hotkeys for dual-timer system
// Arrow Left/Right to switch players, Space/Enter to toggle timer

// ============================================
// Old Hotkey System Deprecated
// ============================================
// Global hotkeys removed - dual-timer uses fixed local hotkeys
// Arrow Left/Right to switch players
// Space/Enter to toggle active player timer
// No configurable hotkeys for new system
