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
    { label: 'زیتونی', background: '#eff7eb', text: '#3a3a2a' }
  ];

  const THEME_KEY = 'heyrat_theme';
  const POEM_DATA = window.POEM_DATA || null;
  const AUTH = window.AUTH || { isAuthenticated: false, hasDisplayName: false };

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

  const TOAST_AUTO_HIDE = 6500;

  function showToast(config) {
    const stack = document.getElementById('toast-stack');
    if (!stack || !config || !config.message) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const messageEl = document.createElement('span');
    messageEl.className = 'toast__message';
    messageEl.textContent = config.message;
    toast.appendChild(messageEl);

    if (config.action && config.action.href && config.action.label) {
      const actionLink = document.createElement('a');
      actionLink.className = 'toast__action';
      actionLink.href = config.action.href;
      actionLink.textContent = config.action.label;
      toast.appendChild(actionLink);
    }

    stack.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    const hideAfter = config.action ? TOAST_AUTO_HIDE + 2000 : TOAST_AUTO_HIDE;

    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 320);
    }, hideAfter);
  }

  // ----- Favorites -----
  const FAVORITES_KEY = 'heyrat_favorites';

  function getFavorites() {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return {};

    let parsed;
    try {
      parsed = JSON.parse(stored) || {};
    } catch (err) {
      return {};
    }

    let mutated = false;
    Object.values(parsed).forEach(entry => {
      if (entry && !entry.sectionId && entry.poemId) {
        entry.sectionId = entry.poemId;
        if (!entry.sectionTitle && entry.poemTitle) {
          entry.sectionTitle = entry.poemTitle;
        }
        delete entry.poemId;
        delete entry.poemTitle;
        mutated = true;
      }
    });

    if (mutated) {
      saveFavorites(parsed);
    }

    return parsed;
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
    if (!POEM_DATA) return;

    const buttons = document.querySelectorAll('.favorite-btn');
    const poemData = POEM_DATA;

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
        sectionTitle: poemData.sectionTitle,
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

  // ----- Post sheet & selection -----
  function initPostSheet() {
    const sheet = document.getElementById('post-sheet');
    if (!sheet) return null;

    const panel = sheet.querySelector('.post-sheet__panel');
    if (panel && !panel.hasAttribute('tabindex')) {
      panel.setAttribute('tabindex', '-1');
    }

    const closeTriggers = sheet.querySelectorAll('[data-sheet-close]');
    const textarea = document.getElementById('post-textarea');
    const charCountEl = document.getElementById('post-char-count');
    const coupletsContainer = document.getElementById('post-sheet-couplets');
    const submitBtn = document.getElementById('post-submit-btn');
    const errorEl = document.getElementById('post-sheet-error');
    const submitDefaultText = submitBtn ? submitBtn.textContent : '';

    const maxChars = textarea ? parseInt(textarea.getAttribute('maxlength'), 10) || 280 : 280;
    const state = { selection: [] };
    let submitting = false;

    function formatCount(count) {
      return count.toLocaleString('fa-IR');
    }

    function updateCharCount() {
      if (!textarea || !charCountEl) return;
      const current = textarea.value.length;
      charCountEl.textContent = `${formatCount(current)} / ${formatCount(maxChars)}`;
      if (current > maxChars) {
        charCountEl.classList.add('post-sheet__char-count--over');
      } else {
        charCountEl.classList.remove('post-sheet__char-count--over');
      }
    }

    function setError(message) {
      if (!errorEl) return;
      if (!message) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      } else {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
    }

    function renderSelection(selection) {
      if (!coupletsContainer) return;
      coupletsContainer.innerHTML = '';
      const fragment = document.createDocumentFragment();

      selection.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'post-sheet__couplet';

        const first = document.createElement('p');
        first.className = 'post-sheet__verse post-sheet__verse--first';
        first.textContent = item.verseFirst || '';
        wrapper.appendChild(first);

        if (item.verseSecond) {
          const second = document.createElement('p');
          second.className = 'post-sheet__verse post-sheet__verse--second';
          second.textContent = item.verseSecond || '';
          wrapper.appendChild(second);
        }

        fragment.appendChild(wrapper);
      });

      coupletsContainer.appendChild(fragment);
    }

    function closeSheet() {
      sheet.classList.remove('post-sheet--open');
      sheet.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('post-sheet-open');
      setError('');
      state.selection = [];
      submitting = false;
      if (textarea) {
        textarea.value = '';
        updateCharCount();
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.textContent = submitDefaultText;
      }
    }

    function openSheet(selection) {
      if (!selection || selection.length === 0) return;

      state.selection = selection.map(item => ({
        coupletIndex: item.coupletIndex,
        verseFirst: item.verseFirst,
        verseSecond: item.verseSecond
      }));

      renderSelection(state.selection);
      setError('');

      if (textarea) {
        textarea.value = '';
        updateCharCount();
      }

      sheet.classList.add('post-sheet--open');
      sheet.setAttribute('aria-hidden', 'false');
      document.body.classList.add('post-sheet-open');

      requestAnimationFrame(() => {
        if (panel) {
          panel.focus();
        }
        if (textarea) {
          textarea.focus();
        }
      });
    }

    if (textarea) {
      textarea.addEventListener('input', updateCharCount);
      updateCharCount();
    }

    closeTriggers.forEach(el => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        closeSheet();
      });
    });

    sheet.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSheet();
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (submitting) return;

        if (!AUTH.isAuthenticated) {
          window.location.href = '/auth/login';
          return;
        }

        if (!AUTH.hasDisplayName) {
          window.location.href = '/profile/display-name';
          return;
        }

        if (!state.selection.length) {
          setError('ابتدا ابیاتی را انتخاب کنید.');
          return;
        }

        const body = textarea ? textarea.value.trim() : '';
        if (body.length > maxChars) {
          setError('متن شما از حد مجاز طولانی‌تر است.');
          return;
        }

        submitting = true;
        setError('');
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        submitBtn.textContent = 'در حال ارسال...';

        try {
          const payload = {
            poetId: POEM_DATA?.poetId || null,
            bookId: POEM_DATA?.bookId || null,
            sectionId: POEM_DATA?.sectionId || null,
            poetName: POEM_DATA?.poetName || '',
            bookTitle: POEM_DATA?.bookTitle || '',
            sectionTitle: POEM_DATA?.sectionTitle || '',
            body,
            couplets: state.selection.map(item => ({
              coupletIndex: item.coupletIndex,
              verseFirst: item.verseFirst,
              verseSecond: item.verseSecond
            }))
          };

          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.status === 401) {
            window.location.href = '/auth/login';
            return;
          }

          if (response.status === 409) {
            const data = await response.json().catch(() => ({}));
            window.location.href = data.redirect || '/profile/display-name';
            return;
          }

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            setError(data?.error || 'ارسال نوشته با مشکل روبه‌رو شد.');
            return;
          }

          const data = await response.json().catch(() => ({}));
          closeSheet();
          showToast({
            message: 'نوشتهٔ شما ثبت شد.',
            action: {
              label: 'مشاهده فید',
              href: data.feedUrl || '/feed'
            }
          });
        } catch (err) {
          console.error('create post error', err);
          setError('ارسال نوشته با مشکل مواجه شد. لطفاً دوباره تلاش کنید.');
        } finally {
          submitting = false;
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
          submitBtn.textContent = submitDefaultText;
        }
      });
    }

    return {
      open: openSheet,
      close: closeSheet
    };
  }

  function initCoupletSelection(postSheet) {
    const screenshotBtn = document.getElementById('start-selection');
    const postBtn = document.getElementById('start-post');
    const doneBtn = document.getElementById('finish-selection');
    const hint = document.getElementById('selection-hint');
    const couplets = document.querySelectorAll('.couplet');
    const poetName = document.querySelector('main nav span:nth-child(3)')?.textContent?.trim() || '';

    if (!screenshotBtn || !doneBtn || couplets.length === 0) return;

    let selecting = false;
    let mode = null;

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

    function clearSelection() {
      couplets.forEach(c => c.classList.remove('selectable', 'selected'));
    }

    function mapCoupletData(element) {
      const index = Number.parseInt(element.dataset.coupletIndex || '', 10);
      const verses = element.querySelectorAll('.verse');
      return {
        coupletIndex: Number.isNaN(index) ? null : index,
        verseFirst: verses[0]?.textContent?.trim() || '',
        verseSecond: verses[1]?.textContent?.trim() || ''
      };
    }

    function enterSelection(desiredMode) {
      selecting = true;
      mode = desiredMode;
      screenshotBtn.style.display = 'none';
      if (postBtn) {
        postBtn.style.display = 'none';
      }
      doneBtn.style.display = 'inline-block';
      showHint();
      couplets.forEach(c => c.classList.add('selectable'));
      document.body.classList.add('selecting-mode');
    }

    screenshotBtn.addEventListener('click', () => {
      enterSelection('screenshot');
    });

    if (postBtn) {
      postBtn.addEventListener('click', () => {
        if (!AUTH.isAuthenticated) {
          window.location.href = '/auth/login';
          return;
        }
        if (!AUTH.hasDisplayName) {
          window.location.href = '/profile/display-name';
          return;
        }
        enterSelection('post');
      });
    }

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

    async function handleScreenshot(selectedElements) {
      const theme = getStoredTheme();

      const container = document.createElement('div');
      container.className = 'screenshot-container';
      container.style.backgroundColor = theme.background;
      container.style.color = theme.text;
      container.style.setProperty('--theme-bg', theme.background);
      container.style.setProperty('--theme-text', theme.text);

      selectedElements.forEach(orig => {
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
        clearSelection();
      }
    }

    doneBtn.addEventListener('click', async () => {
      if (!selecting) return;

      selecting = false;
      doneBtn.style.display = 'none';
      screenshotBtn.style.display = 'inline-block';
      if (postBtn) {
        postBtn.style.display = 'inline-block';
      }
      hideHint();
      document.body.classList.remove('selecting-mode');

      const selectedElements = Array.from(document.querySelectorAll('.couplet.selected'));
      if (selectedElements.length === 0) {
        alert('هیچ بیتی انتخاب نکرده‌اید!');
        clearSelection();
        mode = null;
        return;
      }

      const selectionData = selectedElements.map(mapCoupletData);

      if (mode === 'screenshot') {
        await handleScreenshot(selectedElements);
      } else if (mode === 'post') {
        if (postSheet) {
          postSheet.open(selectionData);
        } else {
          console.warn('Post sheet is not initialised.');
        }
        clearSelection();
      } else {
        clearSelection();
      }

      mode = null;
    });
  }

  function initFeedInteractions() {
    const feed = document.getElementById('feed');
    if (!feed) return;

    feed.addEventListener('click', async (event) => {
      const likeButton = event.target.closest('[data-like-button]');
      if (!likeButton) return;

      event.preventDefault();

      if (!AUTH.isAuthenticated) {
        window.location.href = '/auth/login';
        return;
      }

      if (!AUTH.hasDisplayName) {
        window.location.href = '/profile/display-name';
        return;
      }

      if (likeButton.disabled) return;

      const postId = likeButton.dataset.postId;
      if (!postId) return;

      const isActive = likeButton.getAttribute('aria-pressed') === 'true';
      likeButton.disabled = true;

      try {
        const response = await fetch(`/api/posts/${postId}/likes`, {
          method: isActive ? 'DELETE' : 'POST'
        });

        if (response.status === 401) {
          window.location.href = '/auth/login';
          return;
        }

        if (response.status === 409) {
          const data = await response.json().catch(() => ({}));
          window.location.href = data.redirect || '/profile/display-name';
          return;
        }

        if (!response.ok) {
          throw new Error('toggle like failed');
        }

        const data = await response.json().catch(() => ({}));
        const likeCount = typeof data.likeCount === 'number' ? data.likeCount : null;
        const liked = typeof data.liked === 'boolean' ? data.liked : !isActive;

        likeButton.setAttribute('aria-pressed', liked ? 'true' : 'false');
        likeButton.setAttribute('aria-label', liked ? 'لغو پسند' : 'پسند');
        likeButton.classList.toggle('feed-post__like-button--active', liked);

        const countEl = likeButton.querySelector('[data-like-count]');
        if (countEl && likeCount !== null) {
          countEl.textContent = likeCount.toLocaleString('fa-IR');
        }
      } catch (err) {
        console.error('toggle like error', err);
        showToast({ message: 'ثبت پسند با خطا مواجه شد.' });
      } finally {
        likeButton.disabled = false;
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
    const postSheet = initPostSheet();
    initCoupletSelection(postSheet);
    initFeedInteractions();
  });
})();
