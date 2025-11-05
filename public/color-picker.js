// Color picker UI and functionality

let colors = [];
let pickerOpen = false;

// Initialize color picker
async function initColorPicker() {
  const toggleBtn = document.getElementById('theme-toggle');
  const picker = document.getElementById('color-picker');
  const optionsContainer = document.getElementById('color-options');
  
  if (!toggleBtn || !picker || !optionsContainer) return;
  
  // Load colors
  colors = await window.Theme.loadColors();
  
  // Build color options
  const currentTheme = window.Theme.getCurrentTheme();
  optionsContainer.innerHTML = colors.map((color, index) => {
    const isActive = color.background === currentTheme.background;
    return `
      <button class="color-option ${isActive ? 'active' : ''}" 
              data-index="${index}"
              style="--color-bg: ${color.background}; --color-text: ${color.text};">
        <span class="color-circle" style="background-color: ${color.background}; border: 1px solid ${color.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'};"></span>
        <span class="color-label">${color.label}</span>
      </button>
    `;
  }).join('');
  
  // Toggle picker
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pickerOpen = !pickerOpen;
    picker.style.display = pickerOpen ? 'block' : 'none';
  });
  
  // Handle color selection
  optionsContainer.addEventListener('click', (e) => {
    const option = e.target.closest('.color-option');
    if (!option) return;
    
    const index = parseInt(option.dataset.index);
    const selectedColor = colors[index];
    
    // Update theme
    window.Theme.saveTheme(selectedColor);
    window.Theme.applyTheme(selectedColor);
    
    // Update active state
    optionsContainer.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.remove('active');
    });
    option.classList.add('active');
    
    // Close picker
    pickerOpen = false;
    picker.style.display = 'none';
  });
  
  // Close picker when clicking outside
  document.addEventListener('click', (e) => {
    if (pickerOpen && !picker.contains(e.target) && !toggleBtn.contains(e.target)) {
      pickerOpen = false;
      picker.style.display = 'none';
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initColorPicker);
} else {
  initColorPicker();
}

