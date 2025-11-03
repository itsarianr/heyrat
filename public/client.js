// --- Element references ---
const startBtn = document.getElementById('start-selection');
const doneBtn = document.getElementById('finish-selection');
const couplets = document.querySelectorAll('.couplet');
const hint = document.getElementById('selection-hint');
// try to read poet name from the breadcrumb; fallback to empty
const poetName = document.querySelector('main nav span:nth-child(3)')?.textContent?.trim() || "";

// --- State ---
let selecting = false;

// --- Helpers ---
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

// --- Start selection mode ---
if (startBtn) {
  startBtn.addEventListener('click', () => {
    selecting = true;
    startBtn.style.display = 'none';
    if (doneBtn) doneBtn.style.display = 'inline-block';
    showHint();
    couplets.forEach(c => c.classList.add('selectable'));
  });
}

// --- Handle couplet clicks ---
couplets.forEach(c => {
  c.addEventListener('click', () => {
    if (!selecting) return;
    c.classList.toggle('selected');
  });
});

// --- Finish and generate screenshot ---
if (doneBtn) {
  doneBtn.addEventListener('click', async () => {
    selecting = false;
    doneBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
    hideHint();

    const selected = Array.from(document.querySelectorAll('.couplet.selected'));
    if (selected.length === 0) {
      alert('هیچ بیتی انتخاب نکردی!');
      couplets.forEach(c => c.classList.remove('selectable', 'selected'));
      return;
    }

    // Build screenshot container (dynamic size)
    const container = document.createElement('div');
    container.className = 'screenshot-container';

    // Clone selected couplets but remove selection-related classes
    selected.forEach(orig => {
      const clone = orig.cloneNode(true);
      clone.classList.remove('selectable', 'selected');
      // remove these classes from children too (defensive)
      clone.querySelectorAll('.selectable, .selected').forEach(el => {
        el.classList.remove('selectable', 'selected');
      });
      container.appendChild(clone);
    });

    // Add footer (poet name + site info)
    const footer = document.createElement('div');
    footer.className = 'screenshot-footer';
    footer.innerHTML = `
      <p class="poet-name">${poetName}</p>
      <p class="site-info">heyraan.com</p>
    `;
    container.appendChild(footer);

    // Append offscreen
    document.body.appendChild(container);

    // Generate image (backgroundColor white, scale 2 for quality)
    try {
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = 'poem.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('html2canvas error', err);
      alert('مشکلی در ساخت تصویر پیش آمد.');
    } finally {
      // Cleanup
      container.remove();
      couplets.forEach(c => c.classList.remove('selected', 'selectable'));
    }
  });
}
