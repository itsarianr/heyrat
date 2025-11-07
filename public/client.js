/*
 * Heyran Client Bundle
 * - Theme & color picker
 * - Favorites management
 * - Screenshot selection
 */
(function () {
  const COLORS = [
    { label: 'روشن', background: '#ffffff', text: '#000000' },
    { label: 'تاریک', background: '#121212', text: '#e6e6e6' },
    { label: 'کاغذی', background: '#f7f3e9', text: '#2b2118' },
    { label: 'بژ', background: '#faf4e6', text: '#4a2f16' },
    { label: 'زیتونی', background: '#f2f4f1', text: '#3a3a2a' }
  ];

  const THEME_KEY = 'heyrat_theme';

  function getStoredTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (!stored) return COLORS[0];
      const parsed = JSON.parse(stored);
      return parsed && parsed.background ? parsed : COLORS[0];
    } catch (err) {
      return COLORS[0];
    }
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', theme.background);
    root.style.setProperty('--theme-text', theme.text);
    if (document.body) {
      document.body.style.backgroundColor = theme.background;
      document.body.style.color = theme.text;
    }
  }

  // Apply immediately to avoid flash
  applyTheme(getStoredTheme());

  function initTheme() {
    applyTheme(getStoredTheme());
  }

  function buildColorOptions(colors, currentTheme) {
    return colors.map((color, index) => {
      const isActive = color.background === currentTheme.background;
      const borderColor = color.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
      return `
        <button class="color-option ${isActive ? 'active' : ''}" data-index="${index}">
          <span class="color-circle" style="background-color: ${color.background}; border: 1px solid ${borderColor};"></span>
          <span class="color-label">${color.label}</span>
        </button>
      `;
    }).join('');
  }

  function initColorPicker() {
    const toggleBtn = document.getElementById('theme-toggle');
    const picker = document.getElementById('color-picker');
    const optionsContainer = document.getElementById('color-options');

    if (!toggleBtn || !picker || !optionsContainer) return;

    let pickerOpen = false;
    const colors = COLORS.slice();
    const currentTheme = getStoredTheme();
    optionsContainer.innerHTML = buildColorOptions(colors, currentTheme);

    function closePicker() {
      pickerOpen = false;
      picker.style.display = 'none';
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pickerOpen = !pickerOpen;
      picker.style.display = pickerOpen ? 'block' : 'none';
    });

    optionsContainer.addEventListener('click', (e) => {
      const option = e.target.closest('.color-option');
      if (!option) return;
      const index = parseInt(option.dataset.index, 10);
      const selectedColor = colors[index];
      saveTheme(selectedColor);
      applyTheme(selectedColor);

      optionsContainer.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      closePicker();
    });

    document.addEventListener('click', (e) => {
      if (!pickerOpen) return;
      if (!picker.contains(e.target) && !toggleBtn.contains(e.target)) {
        closePicker();
      }
    });
  }

  // ----- Favorites -----
  const FAVORITES_KEY = 'heyrat_favorites';

  function getFavorites() {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }

  function addFavorite(coupletId, coupletData) {
    const favorites = getFavorites();
    favorites[coupletId] = coupletData;
    saveFavorites(favorites);
    return favorites;
  }

  function removeFavorite(coupletId) {
    const favorites = getFavorites();
    delete favorites[coupletId];
    saveFavorites(favorites);
    return favorites;
  }

  function isFavorite(coupletId) {
    const favorites = getFavorites();
    return !!favorites[coupletId];
  }

  function toggleFavorite(coupletId, coupletData) {
    if (isFavorite(coupletId)) {
      removeFavorite(coupletId);
      return false;
    }
    addFavorite(coupletId, coupletData);
    return true;
  }

  function updateFavoriteButton(btn, isFav) {
    if (isFav) {
      btn.classList.add('favorited');
    } else {
      btn.classList.remove('favorited');
    }
  }

  function initFavoriteButtons() {
    if (!window.POEM_DATA) return;

    const buttons = document.querySelectorAll('.favorite-btn');
    const poemData = window.POEM_DATA;

    buttons.forEach(btn => {
      const coupletId = btn.dataset.coupletId;
      const coupletElement = btn.closest('.couplet');
      if (!coupletElement) return;
      const verses = coupletElement.querySelectorAll('.verse');
      const coupletText = Array.from(verses).map(v => v.textContent.trim());

      const coupletData = {
        poetId: poemData.poetId,
        poetName: poemData.poetName,
        bookId: poemData.bookId,
        bookTitle: poemData.bookTitle,
        sectionId: poemData.sectionId,
        poemId: poemData.poemId,
        coupletIndex: parseInt(coupletId.split('-').pop(), 10),
        verses: coupletText
      };

      updateFavoriteButton(btn, isFavorite(coupletId));

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowFav = toggleFavorite(coupletId, coupletData);
        updateFavoriteButton(btn, nowFav);
      });
    });
  }

  // Expose favorites API for inline scripts (favorites page)
  window.Favorites = {
    getFavorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite
  };

  // ----- Screenshot selection -----
  function initScreenshotCapture() {
    const startBtn = document.getElementById('start-selection');
    const doneBtn = document.getElementById('finish-selection');
    const hint = document.getElementById('selection-hint');
    const couplets = document.querySelectorAll('.couplet');
    const poetName = document.querySelector('main nav span:nth-child(3)')?.textContent?.trim() || '';

    if (!startBtn || !doneBtn || couplets.length === 0) return;

    let selecting = false;

    function showHint() {
      if (!hint) return;
      hint.classList.remove('fade-out');
      hint.style.display = 'block';
      void hint.offsetWidth;
      hint.classList.add('fade-in');
    }

    function hideHint() {
      if (!hint) return;
      hint.classList.remove('fade-in');
      hint.classList.add('fade-out');
      setTimeout(() => {
        hint.style.display = 'none';
        hint.classList.remove('fade-out');
      }, 300);
    }

    startBtn.addEventListener('click', () => {
      selecting = true;
      startBtn.style.display = 'none';
      doneBtn.style.display = 'inline-block';
      showHint();
      couplets.forEach(c => c.classList.add('selectable'));
      document.body.classList.add('selecting-mode');
    });

    couplets.forEach(c => {
      c.addEventListener('click', (e) => {
        if (!selecting) return;
        if (e.target.closest('button')) return;
        c.classList.toggle('selected');
      });
    });

    async function downloadCanvas(canvas, filename) {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    async function shareCanvas(canvas, filename) {
      if (!navigator.share) {
        await downloadCanvas(canvas, filename);
        return;
      }

      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            await downloadCanvas(canvas, filename);
            resolve();
            return;
          }

          const file = new File([blob], filename, { type: 'image/png' });
          const shareData = { files: [file] };

          let usedShare = false;

          try {
            if (!navigator.canShare || navigator.canShare(shareData)) {
              await navigator.share(shareData);
              usedShare = true;
            }
          } catch (err) {
            // continue to fallback attempts
          }

          if (!usedShare) {
            try {
              const dataUrl = canvas.toDataURL('image/png');
              await navigator.share({ url: dataUrl });
              usedShare = true;
            } catch (err) {
              // ignore and fallback to download
            }
          }

          if (!usedShare) {
            await downloadCanvas(canvas, filename);
          }

          resolve();
        }, 'image/png');
      });
    }

    doneBtn.addEventListener('click', async () => {
      selecting = false;
      doneBtn.style.display = 'none';
      startBtn.style.display = 'inline-block';
      hideHint();
      document.body.classList.remove('selecting-mode');

      const selected = Array.from(document.querySelectorAll('.couplet.selected'));
      if (selected.length === 0) {
        alert('هیچ بیتی انتخاب نکردی!');
        couplets.forEach(c => c.classList.remove('selectable', 'selected'));
        return;
      }

      const theme = getStoredTheme();

      const container = document.createElement('div');
      container.className = 'screenshot-container';
      container.style.backgroundColor = theme.background;
      container.style.color = theme.text;
      container.style.setProperty('--theme-bg', theme.background);
      container.style.setProperty('--theme-text', theme.text);

      selected.forEach(orig => {
        const clone = orig.cloneNode(true);
        clone.classList.remove('selectable', 'selected');
        clone.querySelectorAll('.selectable, .selected').forEach(el => {
          el.classList.remove('selectable', 'selected');
        });
        clone.querySelectorAll('.favorite-btn').forEach(btn => btn.remove());

        clone.style.color = theme.text;
        clone.querySelectorAll('*').forEach(el => {
          if (!el.style.color) {
            el.style.color = theme.text;
          }
        });

        container.appendChild(clone);
      });

      const footer = document.createElement('div');
      footer.className = 'screenshot-footer';
      footer.innerHTML = `
        <p class="poet-name">${poetName}</p>
        <p class="site-info">heyraan.com</p>
      `;
      container.appendChild(footer);

      document.body.appendChild(container);

      try {
        const canvas = await html2canvas(container, { scale: 2, backgroundColor: theme.background });
        const filename = 'poem.png';
        const shouldShare = navigator.share && window.innerWidth <= 768;

        if (shouldShare) {
          await shareCanvas(canvas, filename);
        } else {
          await downloadCanvas(canvas, filename);
        }
      } catch (err) {
        console.error('html2canvas error', err);
        alert('مشکلی در ساخت تصویر پیش آمد.');
      } finally {
        container.remove();
        couplets.forEach(c => c.classList.remove('selected', 'selectable'));
      }
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(() => {
    initTheme();
    initColorPicker();
    initFavoriteButtons();
    initScreenshotCapture();
  });
})();
