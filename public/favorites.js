// Favorites management using localStorage

const FAVORITES_KEY = 'heyrat_favorites';

// Get all favorites
function getFavorites() {
  const stored = localStorage.getItem(FAVORITES_KEY);
  return stored ? JSON.parse(stored) : {};
}

// Save favorites
function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

// Add a favorite couplet
function addFavorite(coupletId, coupletData) {
  const favorites = getFavorites();
  favorites[coupletId] = coupletData;
  saveFavorites(favorites);
  return favorites;
}

// Remove a favorite couplet
function removeFavorite(coupletId) {
  const favorites = getFavorites();
  delete favorites[coupletId];
  saveFavorites(favorites);
  return favorites;
}

// Check if a couplet is favorited
function isFavorite(coupletId) {
  const favorites = getFavorites();
  return !!favorites[coupletId];
}

// Toggle favorite status
function toggleFavorite(coupletId, coupletData) {
  if (isFavorite(coupletId)) {
    removeFavorite(coupletId);
    return false;
  } else {
    addFavorite(coupletId, coupletData);
    return true;
  }
}

// Initialize favorite buttons on poem page
function initFavoriteButtons() {
  if (!window.POEM_DATA) return;

  const buttons = document.querySelectorAll('.favorite-btn');
  const poemData = window.POEM_DATA;

  buttons.forEach(btn => {
    const coupletId = btn.dataset.coupletId;
    const coupletElement = btn.closest('.couplet');
    const verses = coupletElement.querySelectorAll('.verse');
    
    // Get couplet text
    const coupletText = Array.from(verses).map(v => v.textContent.trim());
    
    // Create couplet data object
    const coupletData = {
      poetId: poemData.poetId,
      poetName: poemData.poetName,
      bookId: poemData.bookId,
      bookTitle: poemData.bookTitle,
      sectionId: poemData.sectionId,
      poemId: poemData.poemId,
      coupletIndex: parseInt(coupletId.split('-').pop()),
      verses: coupletText
    };

    // Set initial state
    updateFavoriteButton(btn, isFavorite(coupletId));

    // Handle click
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering couplet selection
      const isNowFavorite = toggleFavorite(coupletId, coupletData);
      updateFavoriteButton(btn, isNowFavorite);
    });
  });
}

// Update button appearance based on favorite status
function updateFavoriteButton(btn, isFav) {
  if (isFav) {
    btn.classList.add('favorited');
    // Fill is handled by CSS transition, just add the class
  } else {
    btn.classList.remove('favorited');
    // Fill is handled by CSS transition, just remove the class
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFavoriteButtons);
} else {
  initFavoriteButtons();
}

// Export for use in other scripts
window.Favorites = {
  getFavorites,
  isFavorite,
  toggleFavorite,
  addFavorite,
  removeFavorite
};

