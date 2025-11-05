// Theme/Color management

const THEME_KEY = 'heyrat_theme';
const DEFAULT_THEME = {
  label: 'سفید',
  background: '#ffffff',
  text: '#000000'
};

// Load colors from JSON
async function loadColors() {
  try {
    const response = await fetch('/colors.json');
    return await response.json();
  } catch (err) {
    console.error('Failed to load colors:', err);
    return [DEFAULT_THEME];
  }
}

// Get current theme from localStorage
function getCurrentTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_THEME;
    }
  }
  return DEFAULT_THEME;
}

// Save theme to localStorage
function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
}

// Apply theme to document
function applyTheme(theme) {
  document.documentElement.style.setProperty('--theme-bg', theme.background);
  document.documentElement.style.setProperty('--theme-text', theme.text);
  document.body.style.backgroundColor = theme.background;
  // Text color is handled via CSS variables, so we don't need to set it directly on body
}

// Initialize theme on page load
function initTheme() {
  const theme = getCurrentTheme();
  applyTheme(theme);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}

// Export for use in other scripts
window.Theme = {
  loadColors,
  getCurrentTheme,
  saveTheme,
  applyTheme,
  initTheme
};

