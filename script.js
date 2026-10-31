(() => {
  const STORAGE_KEY = 'constellation-entries';
  const NAMES_KEY = 'constellation-names';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  const MOODS = {
    radiant: { color: '#F0C05A', glow: 'rgba(240,192,90,0.55)' },
    warm:    { color: '#E08A6B', glow: 'rgba(224,138,107,0.55)' },
    calm:    { color: '#7FA8D9', glow: 'rgba(127,168,217,0.55)' },
    stormy:  { color: '#9C8ED9', glow: 'rgba(156,142,217,0.55)' },
    quiet:   { color: '#C9CEDA', glow: 'rgba(201,206,218,0.55)' },
  };

  const ADJECTIVES = ['Quiet', 'Wandering', 'Patient', 'Restless', 'Gentle', 'Distant', 'Hidden', 'Bright', 'Stubborn', 'Drifting', 'Curious', 'Steady'];
  const NOUNS = ['Harbor', 'Compass', 'Ember', 'Tide', 'Lantern', 'Orchard', 'Ridge', 'Current', 'Threshold', 'Meadow', 'Signal', 'Hollow'];

  const state = {
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    selectedDate: dateKey(new Date()),
  };

  // ---------- DOM ----------
  const monthLabelEl = document.getElementById('monthLabel');
  const starCountEl = document.getElementById('starCount');
  const constellationNameEl = document.getElementById('constellationName');
  const svg = document.getElementById('skyChart');
  const entryHeading = document.getElementById('entryHeading');
  const entryDateInput = document.getElementById('entryDate');
  const entryText = document.getElementById('entryText');
  const moodButtons = document.querySelectorAll('.mood-swatch');
  const saveBtn = document.getElementById('saveEntryBtn');
  const deleteBtn = document.getElementById('deleteEntryBtn');
  const newEntryBtn = document.getElementById('newEntryBtn');

  const renameBtn = document.getElementById('renameBtn');
  const streakEl = document.getElementById('streak');
  const nudgeEl = document.getElementById('nudge');
  const statusEl = document.getElementById('status');

  let selectedMood = 'radiant';
  let currentName = '';
  let statusTimer = null;

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', !!isError);
    clearTimeout(statusTimer);
    if (msg && !isError) statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 3500);
  }
  const monthKey = () => `${state.viewYear}-${String(state.viewMonth + 1).padStart(2, '0')}`;

  // ---------- Storage ----------
  function loadEntries() {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch { return {}; }
  }
  function saveEntries(entries) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); return true; }
    catch { return false; }
  }
  function loadNames() {
    try {
      const v = JSON.parse(localStorage.getItem(NAMES_KEY));
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch { return {}; }
  }
  function saveNames(names) {
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(names)); return true; } catch { return false; }
  }
  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---------- Deterministic star positions ----------
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
  function pseudoRandom(seedStr, salt) {
    const h = hashString(seedStr + '::' + salt);
    return (h % 10000) / 10000;
  }
  function starPosition(key) {
    // scatter within padded viewBox, avoiding dead-center clumping
    const x = 40 + pseudoRandom(key, 'x') * 520;
    const y = 30 + pseudoRandom(key, 'y') * 320;
    return { x, y };
  }

  // ---------- Sky rendering ----------
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function renderSky() {
    const { viewYear, viewMonth } = state;
    monthLabelEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    const entries = loadEntries();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    svg.innerHTML = '';

    // background dust — one faint dot per day, plus a handful of filler dust
    const dustLayer = el('g', {});
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const pos = starPosition(key);
      const dot = el('circle', { cx: pos.x, cy: pos.y, r: 1.4, class: 'dust' });
      dustLayer.appendChild(dot);
    }
    for (let i = 0; i < 40; i++) {
      const x = pseudoRandom(`${viewYear}-${viewMonth}`, `fx${i}`) * 600;
      const y = pseudoRandom(`${viewYear}-${viewMonth}`, `fy${i}`) * 380;
      dustLayer.appendChild(el('circle', { cx: x, cy: y, r: 0.8, class: 'dust' }));
    }
    svg.appendChild(dustLayer);

    // entries this month, chronological
    const litDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (entries[key]) litDays.push(key);
    }

    // connecting lines: only runs of consecutive days are joined
    const runs = [];
    litDays.forEach(k => {
      const day = Number(k.slice(8));
      const last = runs[runs.length - 1];
      if (last && Number(last[last.length - 1].slice(8)) === day - 1) last.push(k);
      else runs.push([k]);
    });
    runs.filter(r => r.length > 1).forEach(run => {
      const points = run.map(k => { const p = starPosition(k); return `${p.x},${p.y}`; }).join(' ');
      svg.appendChild(el('polyline', { points, class: 'constellation-line' }));
    });

    // stars
    litDays.forEach(key => {
      const entry = entries[key];
      const pos = starPosition(key);
      const mood = MOODS[entry.mood] || MOODS.radiant;
      const lengthBoost = Math.min(2.5, (entry.text || '').length / 120);
      const radius = 3 + lengthBoost;

      const glow = el('circle', {
        cx: pos.x, cy: pos.y, r: radius + 5,
        fill: mood.glow, class: 'star-glow'
      });
      const core = el('circle', {
        cx: pos.x, cy: pos.y, r: radius,
        fill: mood.color, class: 'star-core',
        'data-date': key
      });
      const title = el('title', {});
      title.textContent = `${key} — ${(entry.text || '').slice(0, 60)}`;
      core.appendChild(title);

      const group = el('g', {
        class: 'star', role: 'button', tabindex: '0',
        'aria-label': `${formatHeadingDate(key)}, ${entry.mood || 'radiant'} star. ${(entry.text || '').slice(0, 60)}`
      });
      const hit = el('circle', { cx: pos.x, cy: pos.y, r: 14, class: 'star-hit' });
      group.append(hit, glow, core);
      group.addEventListener('click', () => openStar(key));
      group.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStar(key); }
      });
      svg.appendChild(group);
    });

    starCountEl.textContent = String(litDays.length);
    if (litDays.length) {
      currentName = loadNames()[monthKey()] || `The ${pickName(viewYear, viewMonth, litDays, entries)}`;
      constellationNameEl.textContent = `“${currentName}”`;
    } else {
      currentName = '';
      constellationNameEl.textContent = 'no stars yet this month';
    }
    renameBtn.hidden = !litDays.length;
    updateStreak(entries);
  }

  function updateStreak(entries) {
    const d = new Date();
    if (!entries[dateKey(d)]) d.setDate(d.getDate() - 1); // today may not be written yet
    let streak = 0;
    while (entries[dateKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    streakEl.textContent = String(streak);

    // gentle nudge when the last week has no stars at all
    const hasRecent = Array.from({ length: 7 }, (_, i) => {
      const x = new Date(); x.setDate(x.getDate() - i); return dateKey(x);
    }).some(k => entries[k]);
    nudgeEl.hidden = hasRecent || !Object.keys(entries).length;
  }

  renameBtn.addEventListener('click', () => {
    const v = prompt('Name this month\u2019s constellation (leave empty to use the generated name):', loadNames()[monthKey()] || '');
    if (v === null) return;
    const names = loadNames(), name = v.trim().slice(0, 40);
    if (name) names[monthKey()] = name; else delete names[monthKey()];
    saveNames(names);
    renderSky();
  });

  function pickName(year, month, litDays, entries) {
    // dominant mood among this month's stars decides the noun bank offset
    const counts = {};
    litDays.forEach(k => {
      const m = entries[k].mood || 'radiant';
      counts[m] = (counts[m] || 0) + 1;
    });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const seed = `${year}-${month}-${dominant}-${litDays.length}`;
    const adj = ADJECTIVES[hashString(seed + 'a') % ADJECTIVES.length];
    const noun = NOUNS[hashString(seed + 'n') % NOUNS.length];
    return `${adj} ${noun}`;
  }

  // ---------- Entry form ----------
  moodButtons.forEach(btn => { btn.setAttribute('role', 'radio'); btn.setAttribute('aria-label', btn.title); });
  function setSelectedMood(mood) {
    selectedMood = mood;
    moodButtons.forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.mood === mood);
      btn.setAttribute('aria-checked', String(btn.dataset.mood === mood));
    });
  }

  function resetForm(dateStr) {
    state.selectedDate = dateStr;
    entryDateInput.value = dateStr;
    entryText.value = '';
    setSelectedMood('radiant');
    entryHeading.textContent = 'New entry';
    deleteBtn.hidden = true;
    newEntryBtn.hidden = true;
  }

  function loadEntryIntoForm(dateStr) {
    const entries = loadEntries();
    const entry = entries[dateStr];
    state.selectedDate = dateStr;
    entryDateInput.value = dateStr;

    // jump the chart view to that entry's month if needed
    const [y, m] = dateStr.split('-').map(Number);
    if (y !== state.viewYear || (m - 1) !== state.viewMonth) {
      state.viewYear = y;
      state.viewMonth = m - 1;
      renderSky();
    }

    if (entry) {
      entryText.value = entry.text || '';
      setSelectedMood(entry.mood || 'radiant');
      entryHeading.textContent = formatHeadingDate(dateStr);
      deleteBtn.hidden = false;
      newEntryBtn.hidden = false;
    } else {
      entryText.value = '';
      setSelectedMood('radiant');
      entryHeading.textContent = formatHeadingDate(dateStr);
      deleteBtn.hidden = true;
      newEntryBtn.hidden = false;
    }
  }

  function formatHeadingDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => setSelectedMood(btn.dataset.mood));
  });

  function isDirty() {
    const stored = loadEntries()[state.selectedDate], text = entryText.value.trim();
    return stored ? (text !== stored.text || selectedMood !== stored.mood) : text !== '';
  }
  const confirmDiscard = () => !isDirty() || confirm('Discard your unsaved changes?');
  function openStar(key) { if (confirmDiscard()) loadEntryIntoForm(key); }

  entryDateInput.addEventListener('change', () => {
    const v = entryDateInput.value;
    // a cleared or invalid date must not break the chart; put the old date back
    if (!DATE_RE.test(v) || !confirmDiscard()) { entryDateInput.value = state.selectedDate; return; }
    loadEntryIntoForm(v);
  });

  saveBtn.addEventListener('click', () => {
    const text = entryText.value.trim();
    if (!text) { entryText.focus(); return; }
    const entries = loadEntries();
    entries[state.selectedDate] = { text, mood: selectedMood };
    if (!saveEntries(entries)) { setStatus('Could not save: browser storage is unavailable or full.', true); return; }
    renderSky();
    loadEntryIntoForm(state.selectedDate);
    setStatus('Star saved ✨');
  });

  deleteBtn.addEventListener('click', () => {
    if (!confirm('Remove this star and its entry? This cannot be undone.')) return;
    const entries = loadEntries();
    delete entries[state.selectedDate];
    if (!saveEntries(entries)) { setStatus('Could not remove: browser storage is unavailable.', true); return; }
    renderSky();
    resetForm(state.selectedDate);
  });

  newEntryBtn.addEventListener('click', () => {
    if (confirmDiscard()) resetForm(dateKey(new Date()));
  });

  // ---------- Backup and keepsake ----------
  function download(name, type, content) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  document.getElementById('exportBtn').addEventListener('click', () => {
    download(`constellation-backup-${dateKey(new Date())}.json`, 'application/json',
      JSON.stringify({ version: 1, entries: loadEntries(), names: loadNames() }, null, 2));
  });

  // Keep only well-formed entries so a bad file can never corrupt the journal.
  function cleanEntries(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.entries(raw).forEach(([k, e]) => {
      if (DATE_RE.test(k) && e && typeof e.text === 'string' && e.text.trim()) {
        out[k] = { text: e.text.slice(0, 20000), mood: MOODS[e.mood] ? e.mood : 'radiant' };
      }
    });
    return out;
  }

  document.getElementById('importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = cleanEntries(data && data.entries ? data.entries : data);
      const count = Object.keys(incoming).length;
      if (!count) throw new Error('empty');
      if (!confirm(`Add ${count} entries from this backup? Entries on the same dates will be replaced.`)) return;
      if (!saveEntries({ ...loadEntries(), ...incoming })) throw new Error('save');
      if (data.names && typeof data.names === 'object') {
        const names = loadNames();
        Object.entries(data.names).forEach(([k, v]) => {
          if (/^\d{4}-\d{2}$/.test(k) && typeof v === 'string' && v.trim()) names[k] = v.trim().slice(0, 40);
        });
        saveNames(names);
      }
      renderSky();
      setStatus(`Imported ${count} entries.`);
    } catch {
      setStatus('That file does not look like a Constellation Journal backup.', true);
    } finally { e.target.value = ''; }
  });

  document.getElementById('keepsakeBtn').addEventListener('click', () => {
    if (!currentName) { setStatus('Write an entry this month first, then save its sky.', true); return; }
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('width', '1200'); clone.setAttribute('height', '760');
    clone.querySelectorAll('.star-hit').forEach(n => n.remove());
    const style = el('style', {});
    style.textContent = '.dust{fill:#C7CEE8;opacity:.22}.constellation-line{fill:none;stroke:#D4AF6A;stroke-width:1;stroke-opacity:.45;stroke-linecap:round}.star-glow{opacity:.35}';
    const bg = el('rect', { x: 0, y: 0, width: 600, height: 380, fill: '#12162B' });
    const caption = el('text', {
      x: 300, y: 368, 'text-anchor': 'middle', 'font-size': 14, 'font-style': 'italic',
      'font-family': 'Georgia, serif', fill: '#D4AF6A'
    });
    caption.textContent = `“${currentName}” · ${MONTH_NAMES[state.viewMonth]} ${state.viewYear}`;
    clone.prepend(style, bg); clone.append(caption);
    download(`constellation-${monthKey()}.svg`, 'image/svg+xml', new XMLSerializer().serializeToString(clone));
  });

  // ---------- Month navigation ----------
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.viewMonth -= 1;
    if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear -= 1; }
    renderSky();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    state.viewMonth += 1;
    if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear += 1; }
    renderSky();
  });

  // ---------- Init ----------
  resetForm(dateKey(new Date()));
  renderSky();
})();
