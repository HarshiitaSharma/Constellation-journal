(() => {
  const STORAGE_KEY = 'constellation-entries';

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

  let selectedMood = 'radiant';

  // ---------- Storage ----------
  function loadEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveEntries(entries) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* unavailable */ }
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

    // connecting line
    if (litDays.length > 1) {
      const points = litDays.map(k => {
        const p = starPosition(k);
        return `${p.x},${p.y}`;
      }).join(' ');
      svg.appendChild(el('polyline', { points, class: 'constellation-line' }));
    }

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

      core.addEventListener('click', () => loadEntryIntoForm(key));

      svg.appendChild(glow);
      svg.appendChild(core);
    });

    starCountEl.textContent = String(litDays.length);
    constellationNameEl.textContent = litDays.length
      ? `“The ${pickName(viewYear, viewMonth, litDays, entries)}”`
      : 'no stars yet this month';
  }

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
  function setSelectedMood(mood) {
    selectedMood = mood;
    moodButtons.forEach(btn => btn.classList.toggle('is-selected', btn.dataset.mood === mood));
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

  entryDateInput.addEventListener('change', () => {
    loadEntryIntoForm(entryDateInput.value);
  });

  saveBtn.addEventListener('click', () => {
    const text = entryText.value.trim();
    if (!text) { entryText.focus(); return; }
    const entries = loadEntries();
    entries[state.selectedDate] = { text, mood: selectedMood };
    saveEntries(entries);
    renderSky();
    loadEntryIntoForm(state.selectedDate);
  });

  deleteBtn.addEventListener('click', () => {
    const entries = loadEntries();
    delete entries[state.selectedDate];
    saveEntries(entries);
    renderSky();
    resetForm(state.selectedDate);
  });

  newEntryBtn.addEventListener('click', () => {
    resetForm(dateKey(new Date()));
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
