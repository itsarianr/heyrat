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

  // ----- Post drafts (localStorage) -----
  const DRAFT_KEY = 'heyrat_post_draft';

  function savePostDraft(draft) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
      console.error('Failed to save draft', err);
    }
  }

  function loadPostDraft() {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (err) {
      console.error('Failed to load draft', err);
      return null;
    }
  }

  function clearPostDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.error('Failed to clear draft', err);
    }
  }

  async function publishDraft() {
    const draft = loadPostDraft();
    if (!draft) return false;

    if (!AUTH.isAuthenticated || !AUTH.hasDisplayName) {
      return false;
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });

      if (response.status === 401) {
        return false;
      }

      if (response.status === 409) {
        return false;
      }

      if (!response.ok) {
        return false;
      }

      clearPostDraft();
      return true;
    } catch (err) {
      console.error('Failed to publish draft', err);
      return false;
    }
  }

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

        if (!state.selection.length) {
          setError('ابتدا ابیاتی را انتخاب کنید.');
          return;
        }

        const body = textarea ? textarea.value.trim() : '';
        if (body.length > maxChars) {
          setError('متن شما از حد مجاز طولانی‌تر است.');
          return;
        }

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

        // If not authenticated, save draft and redirect to login
        if (!AUTH.isAuthenticated) {
          savePostDraft(payload);
          window.location.href = '/auth/login?draft=1';
          return;
        }

        // If authenticated but no display name, save draft and redirect
        if (!AUTH.hasDisplayName) {
          savePostDraft(payload);
          window.location.href = '/profile/display-name?draft=1';
          return;
        }

        // User is authenticated, submit the post
        submitting = true;
        setError('');
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        submitBtn.textContent = 'در حال ارسال...';

        try {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.status === 401) {
            savePostDraft(payload);
            window.location.href = '/auth/login?draft=1';
            return;
          }

          if (response.status === 409) {
            savePostDraft(payload);
            const data = await response.json().catch(() => ({}));
            window.location.href = (data.redirect || '/profile/display-name') + '?draft=1';
            return;
          }

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            setError(data?.error || 'ارسال دل‌نوشته با مشکل روبه‌رو شد.');
            return;
          }

          const data = await response.json().catch(() => ({}));
          closeSheet();
          clearPostDraft();
          showToast({
            message: 'دل‌نوشتهٔ شما ثبت شد.',
            action: {
              label: 'مشاهده دل‌نوشته‌ها',
              href: data.feedUrl || '/feed'
            }
          });
        } catch (err) {
          console.error('create post error', err);
          setError('ارسال دل‌نوشته با مشکل مواجه شد. لطفاً دوباره تلاش کنید.');
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
    const doneBtnMobile = document.getElementById('poem-finish-selection-mobile');
    const fab = document.getElementById('poem-fab');
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
      // Show mobile finish button and hide FAB
      if (doneBtnMobile) {
        doneBtnMobile.style.display = 'flex';
      }
      if (fab) {
        fab.style.display = 'none';
      }
      showHint();
      couplets.forEach(c => c.classList.add('selectable'));
      document.body.classList.add('selecting-mode');
    }

    screenshotBtn.addEventListener('click', () => {
      enterSelection('screenshot');
    });

    if (postBtn) {
      postBtn.addEventListener('click', () => {
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

    async function handleFinishSelection() {
      if (!selecting) return;

      selecting = false;
      doneBtn.style.display = 'none';
      // Hide mobile finish button and show FAB
      if (doneBtnMobile) {
        doneBtnMobile.style.display = 'none';
      }
      if (fab) {
        fab.style.display = 'flex';
      }
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
    }

    // Attach handler to both desktop and mobile finish buttons
    doneBtn.addEventListener('click', handleFinishSelection);

    if (doneBtnMobile) {
      doneBtnMobile.addEventListener('click', handleFinishSelection);
    }
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

        const iconEl = likeButton.querySelector('.feed-post__like-icon');
        if (iconEl) {
          iconEl.setAttribute('fill', liked ? 'currentColor' : 'none');
        }

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

  // Expose publishDraft for use in other pages
  window.publishDraft = publishDraft;

  // ----- Focus Mode (Mobile) -----
  function initFocusMode() {
    const focusMode = document.getElementById('focus-mode');
    const normalCouplets = document.getElementById('normal-couplets');
    const focusCouplets = focusMode?.querySelector('.focus-mode__couplets');
    const prevBtn = document.getElementById('focus-mode-prev');
    const nextBtn = document.getElementById('focus-mode-next');
    const exitBtn = document.getElementById('focus-mode-exit');
    
    if (!focusMode || !focusCouplets || !prevBtn || !nextBtn || !exitBtn) return;

    let activeIndex = 0;
    let allCouplets = Array.from(focusCouplets.querySelectorAll('.couplet'));
    const totalCouplets = allCouplets.length;

    if (totalCouplets === 0) return;

    function getVisibleIndices() {
      // Show: [activeIndex - 1, activeIndex, activeIndex + 1, activeIndex + 2]
      const indices = [];
      const start = Math.max(0, activeIndex - 1);
      const end = Math.min(totalCouplets - 1, activeIndex + 2);
      
      for (let i = start; i <= end; i++) {
        indices.push(i);
      }
      return indices;
    }

    function updateCoupletVisibility() {
      const visibleIndices = getVisibleIndices();
      
      allCouplets.forEach((couplet, index) => {
        const isVisible = visibleIndices.includes(index);
        const isActive = index === activeIndex;
        
        if (isVisible) {
          couplet.style.display = '';
          couplet.classList.toggle('couplet--active', isActive);
          couplet.classList.toggle('couplet--inactive', !isActive);
          
          // Add animation class
          couplet.classList.add('couplet--transitioning');
          setTimeout(() => {
            couplet.classList.remove('couplet--transitioning');
          }, 500);
        } else {
          couplet.style.display = 'none';
          couplet.classList.remove('couplet--active', 'couplet--inactive');
        }
      });
    }

    function updateNavigationButtons() {
      prevBtn.disabled = activeIndex === 0;
      nextBtn.disabled = activeIndex === totalCouplets - 1;
    }

    function goToNextCouplet() {
      if (activeIndex < totalCouplets - 1) {
        activeIndex++;
        updateCoupletVisibility();
        updateNavigationButtons();
      }
    }

    function goToPreviousCouplet() {
      if (activeIndex > 0) {
        activeIndex--;
        updateCoupletVisibility();
        updateNavigationButtons();
      }
    }

    function enterFocusMode() {
      // Hide normal view elements
      if (normalCouplets) normalCouplets.style.display = 'none';
      const header = document.querySelector('header');
      const breadcrumb = document.querySelector('.breadcrumb');
      const poemTitle = document.querySelector('.poem h2');
      const screenshotControls = document.querySelector('.screenshot-controls');
      const poemNav = document.querySelector('.poem-nav');
      const bottomNav = document.querySelector('.bottom-nav');
      const fab = document.getElementById('poem-fab');
      
      if (header) header.style.display = 'none';
      if (breadcrumb) breadcrumb.style.display = 'none';
      if (poemTitle) poemTitle.style.display = 'none';
      if (screenshotControls) screenshotControls.style.display = 'none';
      if (poemNav) poemNav.style.display = 'none';
      if (bottomNav) bottomNav.style.display = 'none';
      if (fab) fab.style.display = 'none';
      
      // Show focus mode
      focusMode.style.display = 'block';
      document.body.classList.add('focus-mode-active');
      
      // Initialize state
      activeIndex = 0;
      updateCoupletVisibility();
      updateNavigationButtons();
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function exitFocusMode() {
      // Show normal view elements
      if (normalCouplets) normalCouplets.style.display = '';
      const header = document.querySelector('header');
      const breadcrumb = document.querySelector('.breadcrumb');
      const poemTitle = document.querySelector('.poem h2');
      const screenshotControls = document.querySelector('.screenshot-controls');
      const poemNav = document.querySelector('.poem-nav');
      const bottomNav = document.querySelector('.bottom-nav');
      const fab = document.getElementById('poem-fab');
      
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
      if (poemTitle) poemTitle.style.display = '';
      if (screenshotControls) screenshotControls.style.display = '';
      if (poemNav) poemNav.style.display = '';
      if (bottomNav) bottomNav.style.display = '';
      if (fab) fab.style.display = '';
      
      // Hide focus mode
      focusMode.style.display = 'none';
      document.body.classList.remove('focus-mode-active');
      
      // Scroll to active couplet in normal view
      const activeCouplet = normalCouplets?.querySelector(`[data-couplet-index="${activeIndex}"]`);
      if (activeCouplet) {
        activeCouplet.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Event listeners
    prevBtn.addEventListener('click', goToPreviousCouplet);
    nextBtn.addEventListener('click', goToNextCouplet);
    exitBtn.addEventListener('click', exitFocusMode);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('focus-mode-active')) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextCouplet();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPreviousCouplet();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        exitFocusMode();
      }
    });

    // Touch/Swipe navigation
    let touchStartY = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    focusMode.addEventListener('touchstart', (e) => {
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    focusMode.addEventListener('touchend', (e) => {
      if (!document.body.classList.contains('focus-mode-active')) return;
      
      touchEndY = e.changedTouches[0].screenY;
      const swipeDistance = touchEndY - touchStartY;
      
      // Check if swipe distance is significant enough
      if (Math.abs(swipeDistance) >= minSwipeDistance) {
        if (swipeDistance < 0) {
          // Swipe up (negative distance) = next couplet
          goToNextCouplet();
        } else {
          // Swipe down (positive distance) = previous couplet
          goToPreviousCouplet();
        }
      }
    }, { passive: true });

    // Expose enterFocusMode for FAB menu
    window.enterFocusMode = enterFocusMode;
  }

  // ----- Poem FAB Menu (Mobile) -----
  function initPoemFabMenu() {
    const fab = document.getElementById('poem-fab');
    const menu = document.getElementById('poem-fab-menu');
    if (!fab || !menu) return;

    const backdrop = menu.querySelector('.poem-fab-menu__backdrop');
    const menuItems = menu.querySelectorAll('.poem-fab-menu__item');
    let isOpen = false;

    function openMenu() {
      isOpen = true;
      fab.style.opacity = '0';
      setTimeout(() => {
        if (isOpen) {
          fab.style.display = 'none';
        }
      }, 150);
      menu.classList.add('poem-fab-menu--open');
      fab.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
      isOpen = false;
      menu.classList.remove('poem-fab-menu--open');
      fab.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      // Show FAB again after menu closes (with slight delay for animation)
      setTimeout(() => {
        if (!isOpen) {
          fab.style.display = 'flex';
          requestAnimationFrame(() => {
            fab.style.opacity = '0.6';
          });
        }
      }, 200);
    }

    function toggleMenu() {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    // FAB click toggles menu
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Backdrop click closes menu
    if (backdrop) {
      backdrop.addEventListener('click', closeMenu);
    }

    // Menu item clicks
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;

        if (action === 'font-decrease' || action === 'font-increase') {
          // Font controls should not close the menu
          if (action === 'font-decrease') {
            adjustFontSize(-0.15);
          } else if (action === 'font-increase') {
            adjustFontSize(0.15);
          }
          return;
        }

        // Close menu for other actions
        closeMenu();

        if (action === 'screenshot') {
          // Trigger screenshot button click
          const screenshotBtn = document.getElementById('start-selection');
          if (screenshotBtn) {
            screenshotBtn.click();
          }
        } else if (action === 'post') {
          // Trigger post button click
          const postBtn = document.getElementById('start-post');
          if (postBtn) {
            postBtn.click();
          }
        } else if (action === 'focus') {
          // Enter focus mode
          if (window.enterFocusMode) {
            window.enterFocusMode();
          }
        }
      });
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (isOpen && !menu.contains(e.target) && !fab.contains(e.target)) {
        closeMenu();
      }
    });
  }

  // ----- Font Size Controls -----
  const FONT_SIZE_KEY = 'heyraan-font-size';
  const FONT_SIZE_MIN = 0.7;
  const FONT_SIZE_MAX = 2;
  const FONT_SIZE_STEP = 0.15;

  function getVerseElements() {
    return document.querySelectorAll('.verse, .focus-mode .verse');
  }

  function applyFontSize(size) {
    const verses = getVerseElements();
    verses.forEach(verse => {
      verse.style.fontSize = size + 'em';
    });
  }

  function adjustFontSize(delta) {
    const currentSize = parseFloat(localStorage.getItem(FONT_SIZE_KEY)) || 1;
    let newSize = currentSize + delta;
    newSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, newSize));
    localStorage.setItem(FONT_SIZE_KEY, newSize);
    applyFontSize(newSize);
  }

  function initFontSize() {
    const savedSize = localStorage.getItem(FONT_SIZE_KEY);
    if (savedSize) {
      applyFontSize(parseFloat(savedSize));
    }
  }

  // ----- Section List Pagination (API-based Lazy Loading) -----
  function initSectionPagination() {
    const sectionList = document.getElementById('section-list');
    const loader = document.getElementById('section-loader');
    const bookSection = document.querySelector('.book[data-poet-id][data-book-id]');
    
    if (!sectionList || !loader || !bookSection) return;
    
    const poetId = bookSection.dataset.poetId;
    const bookId = bookSection.dataset.bookId;
    const totalSections = parseInt(sectionList.dataset.totalSections, 10);
    let currentPage = parseInt(sectionList.dataset.currentPage, 10);
    let isLoading = false;
    const loadedCountEl = document.getElementById('loaded-count');
    
    async function loadMoreSections() {
      if (isLoading) return;
      
      isLoading = true;
      loader.classList.add('section-loader--loading');
      
      const nextPage = currentPage + 1;
      
      try {
        const response = await fetch(`/api/books/${poetId}/${bookId}/sections?page=${nextPage}`);
        
        if (!response.ok) {
          throw new Error('Failed to load sections');
        }
        
        const data = await response.json();
        
        if (data.sections && data.sections.length > 0) {
          // Add new sections to the list
          data.sections.forEach((section, index) => {
            const li = document.createElement('li');
            li.className = 'section-item section-item--revealing';
            li.innerHTML = `
              <a href="/${poetId}/${bookId}/${section.id}">
                <span>${section.title}</span>
              </a>
            `;
            sectionList.appendChild(li);
            
            // Remove animation class after it completes
            setTimeout(() => {
              li.classList.remove('section-item--revealing');
            }, 400 + (index * 30)); // Staggered animation
          });
          
          currentPage = data.page;
          sectionList.dataset.currentPage = currentPage;
          
          // Update progress counter
          const currentCount = sectionList.querySelectorAll('.section-item').length;
          if (loadedCountEl) {
            loadedCountEl.textContent = currentCount.toLocaleString('fa-IR');
          }
          
          // Hide loader if no more sections
          if (!data.hasMore) {
            loader.style.display = 'none';
          }
        }
      } catch (error) {
        console.error('Error loading sections:', error);
        loader.querySelector('.section-loader__text').textContent = 'خطا در بارگذاری. دوباره تلاش کنید.';
      } finally {
        loader.classList.remove('section-loader--loading');
        isLoading = false;
      }
    }
    
    // Scroll-based detection
    function handleScroll() {
      if (isLoading || loader.style.display === 'none') return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const loaderPosition = loader.offsetTop;
      
      // Trigger when user is within 300px of the loader
      if (scrollPosition >= loaderPosition - 300) {
        loadMoreSections();
      }
    }
    
    // Throttle scroll events for performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        handleScroll();
        scrollTimeout = null;
      }, 150);
    }, { passive: true });
    
    // Also trigger on initial load if page is short
    handleScroll();
  }

  // ----- Random Section Button -----
  function initRandomSectionButton() {
    const btn = document.getElementById('random-section-btn');
    if (!btn) return;

    const sectionIds = JSON.parse(btn.dataset.sectionIds);
    const poetId = btn.dataset.poetId;
    const bookId = btn.dataset.bookId;
    const textSpan = btn.querySelector('.random-section-btn__text');
    const originalText = 'فال شما';
    const loadingText = 'در حال گرفتن فال شما...';

    function resetButtonState() {
      btn.classList.remove('random-section-btn--loading');
      btn.disabled = false;
      textSpan.textContent = originalText;
    }

    // Reset on initial load
    resetButtonState();

    // Handle back-forward cache restore (Chrome/Safari)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        // Page was restored from bfcache
        resetButtonState();
      }
    });

    btn.addEventListener('click', () => {
      // Add loading state
      btn.classList.add('random-section-btn--loading');
      btn.disabled = true;
      textSpan.textContent = loadingText;

      // Generate random index
      const randomIndex = Math.floor(Math.random() * sectionIds.length);
      const randomSectionId = sectionIds[randomIndex];

      // Navigate after 1 second (allowing animation to complete)
      setTimeout(() => {
        window.location.href = `/${poetId}/${bookId}/${randomSectionId}`;
      }, 1000);
    });
  }

  // ----- Highlight Search Result -----
  function initHighlightedCouplet() {
    // Disabled for now - scroll and highlight not working
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(async () => {
    initTheme();
    initColorPicker();
    initFavoriteButtons();
    const postSheet = initPostSheet();
    initCoupletSelection(postSheet);
    initFeedInteractions();
    initPoemFabMenu();
    initFontSize();
    initFocusMode();
    initSectionPagination();
    initRandomSectionButton();
    initHighlightedCouplet();

    // Check for draft and auto-publish if user is authenticated and has display name
    // Also check URL params for draft flag (after login/display-name)
    const urlParams = new URLSearchParams(window.location.search);
    const hasDraftParam = urlParams.has('draft');

    if (AUTH.isAuthenticated && AUTH.hasDisplayName) {
      const published = await publishDraft();
      if (published) {
        // Redirect to feed page after publishing draft
        window.location.href = '/feed';
        return;
      }
    }
  });
})();
