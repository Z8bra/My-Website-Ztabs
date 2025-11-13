// ========== Z TABS STORAGE ==========
function getTabs() {
  return JSON.parse(localStorage.getItem("ztabs_data") || "[]");
}

// One-time reset via URL param ?reset=1
function resetAllStateIfRequested() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('reset') !== '1') return;
    // Clear our app-localStorage keys
    ['ztabs_data','ztabs_playlists','ztabs_tab_meta','ztabs_sort_tabs','ztabs_sort_playlists'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    // Delete IndexedDB database used for courses
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      // Reload without the reset param
      params.delete('reset');
      const qs = params.toString();
      const url = location.pathname + (qs ? '?' + qs : '') + location.hash;
      location.replace(url);
    };
    try {
      const req = indexedDB.deleteDatabase('ztabs_db');
      req.onsuccess = finish;
      req.onerror = finish;
      req.onblocked = finish;
    } catch {
      finish();
    }
  } catch {}
}

// ========== GLOBAL SEARCH ==========
function setupGlobalSearch() {
  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) { results.innerHTML = ''; results.classList.add('hidden'); return; }
    timer = setTimeout(() => performSearch(q, results), 200);
  });

  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) {
      results.classList.add('hidden');
    }
  });
}

async function performSearch(query, mount) {
  const q = query.toLowerCase();
  const tabs = getTabs();
  const playlists = getPlaylists();
  let courses = [];
  try { courses = await getAllCourses(); } catch {}

  const tabHits = tabs.filter(t =>
    (t.title && t.title.toLowerCase().includes(q)) ||
    (t.lyrics && t.lyrics.toLowerCase().includes(q)) ||
    (t.chords && t.chords.toLowerCase().includes(q)) ||
    (t.tuning && t.tuning.toLowerCase().includes(q))
  ).slice(0, 5);

  const plHits = playlists.filter(p =>
    (p.name && p.name.toLowerCase().includes(q))
  ).slice(0, 5);

  const courseHits = courses.filter(c =>
    (c.authorName && c.authorName.toLowerCase().includes(q))
  ).slice(0, 5);

  mount.innerHTML = '';

  function addGroup(title, items, renderItem) {
    if (!items.length) return;
    const group = document.createElement('div');
    group.className = 'search-group';
    const h = document.createElement('h4');
    h.textContent = title;
    group.appendChild(h);
    items.forEach(it => {
      const a = renderItem(it);
      group.appendChild(a);
    });
    mount.appendChild(group);
  }

  addGroup('Tabs', tabHits, (t) => {
    const a = document.createElement('a');
    a.className = 'search-item';
    a.href = 'Tabs.html';
    a.textContent = t.title || 'Untitled Tab';
    return a;
  });

  addGroup('Playlists', plHits, (p) => {
    const a = document.createElement('a');
    a.className = 'search-item';
    a.href = 'Playlist.html';
    a.textContent = p.name || 'Playlist';
    return a;
  });

  addGroup('Courses', courseHits, (c) => {
    const a = document.createElement('a');
    a.className = 'search-item';
    a.href = 'Courses.html';
    a.textContent = (c.authorName || 'Creator') + ' course';
    return a;
  });

  mount.classList.toggle('hidden', mount.innerHTML.trim() === '');
}

// ========== HEADER SCROLL BEHAVIOR ==========
function setupHeaderScroll() {
  let lastY = window.scrollY;
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const body = document.body;
    if (y > lastY && y > 20) {
      body.classList.add('scroll-down');
      body.classList.remove('scroll-up');
    } else {
      body.classList.add('scroll-up');
      body.classList.remove('scroll-down');
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  // Initialize state
  if (window.scrollY <= 0) {
    document.body.classList.add('scroll-up');
  }
}

function saveTabs(tabs) {
  localStorage.setItem("ztabs_data", JSON.stringify(tabs));
}

// Ensure each tab has a stable id
function ensureTabIds() {
  const tabs = getTabs();
  let changed = false;
  tabs.forEach(t => {
    if (!t.id) {
      t.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      changed = true;
    }
  });
  if (changed) saveTabs(tabs);
}

// Per-tab meta (views, likes, liked flag)
function _getTabMetaStore() {
  try { return JSON.parse(localStorage.getItem('ztabs_tab_meta') || '{}'); } catch { return {}; }
}
function _saveTabMetaStore(store) {
  localStorage.setItem('ztabs_tab_meta', JSON.stringify(store));
}
function getTabMeta(id) {
  const s = _getTabMetaStore();
  return s[id] || { views: 0, likes: 0, liked: false };
}
function setTabMeta(id, meta) {
  const s = _getTabMetaStore();
  s[id] = meta;
  _saveTabMetaStore(s);
}
function incrementTabView(id) {
  if (!id) return;
  const m = getTabMeta(id);
  m.views = (m.views || 0) + 1;
  setTabMeta(id, m);
  return m.views;
}
function likeTabOnce(id) {
  if (!id) return { ok: false, meta: getTabMeta(id) };
  const m = getTabMeta(id);
  if (m.liked) return { ok: false, meta: m };
  m.liked = true;
  m.likes = (m.likes || 0) + 1;
  setTabMeta(id, m);
  return { ok: true, meta: m };
}

// Chord transpose helpers
const _CHORDS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const _FLATS = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };
function _normalizeRoot(r){ return _FLATS[r] || r; }
function _transposeRoot(root, steps){
  const R = _normalizeRoot(root);
  const i = _CHORDS.indexOf(R);
  if (i === -1) return root;
  const n = (_CHORDS.length + i + steps) % _CHORDS.length;
  return _CHORDS[n];
}
function transposeChordToken(token, steps){
  const m = token.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!m) return token;
  const nr = _transposeRoot(m[1], steps);
  return nr + (m[2] || '');
}
function transposeChordLine(line, steps){
  return line.split(/\s+/).map(t => transposeChordToken(t, steps)).join(' ');
}
function transposeChordText(text, steps){
  return (text || '').split('\n').map(l => transposeChordLine(l, steps)).join('\n');
}

// Autoscroll wiring per view
function wireAutoscrollControls(rootEl, scrollTarget) {
  const startBtn = rootEl.querySelector('[data-role="auto-btn"]');
  const speedInput = rootEl.querySelector('[data-role="auto-speed"]');
  if (!startBtn || !speedInput) return;
  let timer = null;
  function stop(){ if (timer){ clearInterval(timer); timer = null; startBtn.textContent = 'Auto-Scroll'; startBtn.classList.remove('active'); } }
  function start(){
    stop();
    const pxPerSec = parseInt(speedInput.value, 10) || 0;
    if (pxPerSec <= 0) return;
    const interval = 16;
    const perTick = (pxPerSec/1000) * interval;
    startBtn.textContent = 'Pause';
    startBtn.classList.add('active');
    timer = setInterval(() => {
      try {
        if (scrollTarget === window) {
          window.scrollBy(0, perTick);
        } else if (scrollTarget && typeof scrollTarget.scrollBy === 'function') {
          scrollTarget.scrollBy(0, perTick);
        } else {
          window.scrollBy(0, perTick);
        }
      } catch {}
    }, interval);
  }
  startBtn.addEventListener('click', () => {
    if (timer) stop(); else start();
  });
  speedInput.addEventListener('input', () => {
    if (timer) start();
  });
  // Clean up on navigation from this view
  rootEl.addEventListener('removed', stop, { once: true });
}

// ========== SORTING (Tabs & Playlists) ==========
function getSortMode(key) {
  return localStorage.getItem(key) || 'default';
}
function setSortMode(key, mode) {
  localStorage.setItem(key, mode);
}
function cycleSortMode(key) {
  const cur = getSortMode(key);
  const next = cur === 'default' ? 'views' : cur === 'views' ? 'likes' : 'default';
  setSortMode(key, next);
  return next;
}

// ========== PLAYLIST STORAGE ==========
function getPlaylists() {
  return JSON.parse(localStorage.getItem("ztabs_playlists") || "[]");
}

function savePlaylists(playlists) {
  localStorage.setItem("ztabs_playlists", JSON.stringify(playlists));
}

// ========== COURSES STORAGE (IndexedDB) ==========
let _coursesDb;
function openCoursesDb() {
  return new Promise((resolve, reject) => {
    if (_coursesDb) return resolve(_coursesDb);
    const req = indexedDB.open('ztabs_db', 1);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('courses')) {
        const store = db.createObjectStore('courses', { keyPath: 'id' });
        store.createIndex('tabId', 'tabId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => { _coursesDb = req.result; resolve(_coursesDb); };
    req.onerror = () => reject(req.error);
  });
}

async function addCourse(course) {
  const db = await openCoursesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('courses', 'readwrite');
    tx.objectStore('courses').put(course);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCoursesByTabId(tabId) {
  const db = await openCoursesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('courses', 'readonly');
    const idx = tx.objectStore('courses').index('tabId');
    const req = idx.getAll(tabId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getAllCourses() {
  const db = await openCoursesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('courses', 'readonly');
    const req = tx.objectStore('courses').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getCourseById(id) {
  const db = await openCoursesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('courses', 'readonly');
    const req = tx.objectStore('courses').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function updateCourse(course) {
  const db = await openCoursesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('courses', 'readwrite');
    tx.objectStore('courses').put(course);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Helper: detect mobile devices (coarse pointer or small viewport)
function isMobileDevice() {
  try {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 768;
  } catch {
    return window.innerWidth <= 768;
  }
}

// ========== SHORTS OVERLAY VIEWER ==========
function openShortsViewer(courses, startId) {
  if (!Array.isArray(courses) || !courses.length) return;
  let index = Math.max(0, courses.findIndex(c => c && c.id === startId));
  let currentUrl = null; let countedId = null;

  const overlay = document.createElement('div');
  overlay.className = 'shorts-overlay';
  const frame = document.createElement('div');
  frame.className = 'shorts-frame';
  const video = document.createElement('video');
  video.className = 'shorts-player';
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'shorts-close';
  closeBtn.textContent = '×';
  frame.appendChild(video);
  frame.appendChild(closeBtn);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  async function countViewFor(course) {
    if (!course || countedId === course.id) return;
    countedId = course.id;
    const fresh = await getCourseById(course.id);
    if (fresh) {
      fresh.views = (fresh.views || 0) + 1;
      await updateCourse(fresh);
    }
  }

  function show(i) {
    if (i < 0 || i >= courses.length) return;
    index = i;
    const course = courses[index];
    if (!course) return;
    if (currentUrl) { try { URL.revokeObjectURL(currentUrl); } catch {}
    }
    currentUrl = URL.createObjectURL(course.videoBlob);
    video.src = currentUrl;
    countedId = null;
    // Autoplay attempt
    setTimeout(() => { video.play().catch(() => {}); }, 0);
  }

  function cleanup() {
    window.removeEventListener('keydown', onKey);
    overlay.removeEventListener('wheel', onWheel, { passive: true });
    overlay.removeEventListener('touchstart', onTouchStart, { passive: true });
    overlay.removeEventListener('touchmove', onTouchMove, { passive: true });
    overlay.removeEventListener('touchend', onTouchEnd);
    overlay.removeEventListener('pointerdown', onPointerDown);
    overlay.removeEventListener('pointermove', onPointerMove);
    overlay.removeEventListener('pointerup', onPointerUp);
    closeBtn.removeEventListener('click', onClose);
    overlay.removeEventListener('click', onBackdrop);
    if (currentUrl) { try { URL.revokeObjectURL(currentUrl); } catch {} }
    document.body.style.overflow = prevOverflow;
    overlay.remove();
  }

  function onClose() { cleanup(); }
  function onBackdrop(e) { if (e.target === overlay) cleanup(); }
  function next() { if (index < courses.length - 1) show(index + 1); }
  function prev() { if (index > 0) show(index - 1); }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); cleanup(); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); next(); return; }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); prev(); return; }
  }

  let lastScroll = 0;
  function onWheel(e) {
    const now = Date.now();
    if (now - lastScroll < 300) return;
    lastScroll = now;
    if (e.deltaY > 20) next();
    else if (e.deltaY < -20) prev();
  }

  // Touch swipe (mobile) up/down to navigate
  let touchStartY = null; let touchStartTime = 0;
  function onTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }
  function onTouchMove(e) {
    // passive; we don't prevent default to keep scrolling feel
  }
  function onTouchEnd(e) {
    if (touchStartY == null) return;
    const endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : touchStartY;
    const dy = endY - touchStartY; // positive = swipe down
    const dt = Date.now() - touchStartTime;
    // Thresholds similar to social apps
    if (Math.abs(dy) > 50 && dt < 800) {
      if (dy < 0) next(); else prev();
    }
    touchStartY = null; touchStartTime = 0;
  }

  // Pointer drag (mouse/touchpad) support
  let ptrActive = false; let ptrStartY = 0; let ptrLastY = 0; let ptrStartTime = 0;
  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.buttons !== 1) return;
    ptrActive = true; ptrStartY = e.clientY; ptrLastY = e.clientY; ptrStartTime = Date.now();
  }
  function onPointerMove(e) {
    if (!ptrActive) return;
    ptrLastY = e.clientY;
  }
  function onPointerUp(e) {
    if (!ptrActive) return;
    ptrActive = false;
    const dy = e.clientY - ptrStartY;
    const dt = Date.now() - ptrStartTime;
    if (Math.abs(dy) > 80 && dt < 800) {
      if (dy < 0) next(); else prev();
    }
  }

  video.addEventListener('play', () => {
    const course = courses[index];
    countViewFor(course);
  });

  window.addEventListener('keydown', onKey);
  overlay.addEventListener('wheel', onWheel, { passive: true });
  overlay.addEventListener('touchstart', onTouchStart, { passive: true });
  overlay.addEventListener('touchmove', onTouchMove, { passive: true });
  overlay.addEventListener('touchend', onTouchEnd);
  overlay.addEventListener('pointerdown', onPointerDown);
  overlay.addEventListener('pointermove', onPointerMove);
  overlay.addEventListener('pointerup', onPointerUp);
  closeBtn.addEventListener('click', onClose);
  overlay.addEventListener('click', onBackdrop);

  show(index);
}

// ========== TABS PAGE ==========
function renderTabs() {
  const tabList = document.getElementById("tabList");
  const tabContent = document.getElementById("tabContent");
  if (!tabList || !tabContent) return;

  tabList.innerHTML = "";
  ensureTabIds();
  let tabs = getTabs();
  // Apply ordering
  const mode = getSortMode('ztabs_sort_tabs');
  if (mode !== 'default') {
    tabs = [...tabs].sort((a, b) => {
      const ma = getTabMeta(a.id || '');
      const mb = getTabMeta(b.id || '');
      const va = mode === 'views' ? (ma.views || 0) : (ma.likes || 0);
      const vb = mode === 'views' ? (mb.views || 0) : (mb.likes || 0);
      if (vb !== va) return vb - va;
      return (a.title || '').localeCompare(b.title || '');
    });
  }

  if (tabs.length === 0) {
    tabContent.innerHTML = `<p>No tabs yet. Click the <strong>Create Tab</strong> button to add one.</p>`;
    return;
  }

  // Show placeholder until a tab is clicked
  tabContent.innerHTML = `<p>Select a tab to see its content.</p>`;

  tabs.forEach((tab, index) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = tab.title;
    btn.onclick = () => {
      const wasActive = btn.classList.contains("active");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      if (wasActive) {
        tabContent.innerHTML = "";
        return;
      }
      btn.classList.add("active");
      // Ensure the inline creator is closed when viewing a tab
      const creatorInline = document.getElementById("creatorInline");
      if (creatorInline) creatorInline.classList.add("hidden");
      const lyrics = tab.lyrics ?? tab.content ?? "";
      const capo = (tab.capo ?? tab.capoFret ?? "");
      const tuning = tab.tuning ?? "";
      const chords = tab.chords ?? "";
      const likeId = `like-${tab.id || 'x'}`;
      const viewsId = `views-${tab.id || 'x'}`;
      const newViews = incrementTabView(tab.id || '');
      const meta = getTabMeta(tab.id || '');
      // Build two-button toggle header and two views
      const tabViewId = `tabView-${tab.id || 'x'}`;
      const coursesViewId = `coursesView-${tab.id || 'x'}`;
      const showTabBtnId = `showTab-${tab.id || 'x'}`;
      const showCoursesBtnId = `showCourses-${tab.id || 'x'}`;
      const controlsId = `controls-${tab.id || 'x'}`;
      const chordsBlockId = `chords-${tab.id || 'x'}`;
      const adminControlsId = `admin-controls-${tab.id || 'x'}`;
      tabContent.innerHTML = `
        <div class="view-toggle">
          <button id="${showTabBtnId}" class="toggle-btn active">Tab</button>
          <button id="${showCoursesBtnId}" class="toggle-btn">Courses</button>
        </div>
        <div id="${tabViewId}">
          <div id="${controlsId}" class="tab-controls">
            <div class="controls-left">
              <button class="control-btn" data-role="auto-btn">Auto-Scroll</button>
              <input class="speed-slider" type="range" min="0" max="200" value="60" step="5" data-role="auto-speed"/>
            </div>
            <div class="controls-right">
              <button class="control-btn" data-role="transpose-dec">-</button>
              <span class="transpose-label" data-role="transpose-val">0</span>
              <button class="control-btn" data-role="transpose-inc">+</button>
            </div>
          </div>
          <h2>${tab.title}</h2>
          ${capo !== "" ? `<p><strong>Capo:</strong> ${capo}</p>` : ""}
          ${tuning ? `<p><strong>Tuning:</strong> ${tuning}</p>` : ""}
          ${chords ? `<p><strong>Chords:</strong> <span id="${chordsBlockId}">${chords.replace(/\n/g,'<br>')}</span></p>` : ""}
          ${lyrics ? `<h3>Lyrics</h3><p>${lyrics.replace(/\n/g, '<br>')}</p>` : ""}
          <div class="tab-meta" style="margin: 8px 0 12px; display:flex; gap:8px; align-items:center;">
            <span id="${viewsId}">${meta.views} views</span>
            <button id="${likeId}" ${meta.liked ? 'disabled' : ''}>❤ Like (${meta.likes || 0})</button>
          </div>
          <!-- Admin Controls -->
          <div id="${adminControlsId}" class="admin-controls" style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn-approve" data-tab-id="${tab.id}">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn-reject" data-tab-id="${tab.id}">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
        <div id="${coursesViewId}" class="hidden"></div>
      `;
      // Update views text after increment
      const viewsEl = document.getElementById(viewsId);
      if (viewsEl) viewsEl.textContent = `${getTabMeta(tab.id || '').views} views`;
      const likeEl = document.getElementById(likeId);
      if (likeEl) {
        likeEl.addEventListener('click', () => {
          const res = likeTabOnce(tab.id || '');
          const m = res.meta;
          likeEl.textContent = `❤ Like (${m.likes || 0})`;
          if (m.liked) likeEl.disabled = true;
        });
      }
      // Wire autoscroll + transpose for Tab view
      const controlsEl = document.getElementById(controlsId);
      if (controlsEl) {
        wireAutoscrollControls(controlsEl, window);
        let tSteps = 0;
        const valEl = controlsEl.querySelector('[data-role="transpose-val"]');
        const chordsEl = document.getElementById(chordsBlockId);
        function updateTranspose(){ if (valEl) valEl.textContent = String(tSteps); if (chordsEl) chordsEl.innerHTML = transposeChordText(chords, tSteps).replace(/\n/g,'<br>'); }
        const dec = controlsEl.querySelector('[data-role="transpose-dec"]');
        const inc = controlsEl.querySelector('[data-role="transpose-inc"]');
        dec && dec.addEventListener('click', () => { tSteps = (tSteps - 1 + 12) % 12; updateTranspose(); });
        inc && inc.addEventListener('click', () => { tSteps = (tSteps + 1) % 12; updateTranspose(); });
        updateTranspose();
      }
      // Wire toggle buttons
      const showTabBtn = document.getElementById(showTabBtnId);
      const showCoursesBtn = document.getElementById(showCoursesBtnId);
      const tabView = document.getElementById(tabViewId);
      const coursesView = document.getElementById(coursesViewId);
      async function loadCourses() {
        coursesView.innerHTML = '<p>Loading courses...</p>';
        const courses = await getCoursesByTabId(tab.id || '');
        if (!courses.length) { coursesView.innerHTML = '<p>No courses yet.</p>'; return; }
        coursesView.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'shorts-grid';
        coursesView.appendChild(grid);
        courses.forEach(c => {
          const url = URL.createObjectURL(c.videoBlob);
          const card = document.createElement('div');
          const meta = document.createElement('div');
          meta.style.margin = '6px 0';
          meta.textContent = `${c.authorName || 'Creator'} • ${c.views || 0} views`;
          const vid = document.createElement('video');
          vid.className = 'shorts-video';
          vid.controls = true;
          vid.src = url;
          vid.title = c.title || tab.title;
          vid.addEventListener('click', () => openShortsViewer(courses, c.id));
          let counted = false;
          vid.addEventListener('play', async () => {
            if (counted) return;
            counted = true;
            const fresh = await getCourseById(c.id);
            if (fresh) {
              fresh.views = (fresh.views || 0) + 1;
              await updateCourse(fresh);
              meta.textContent = `${fresh.authorName || 'Creator'} • ${fresh.views} views`;
            }
          });
          card.appendChild(vid);
          card.appendChild(meta);
          grid.appendChild(card);
        });
      }
      if (showTabBtn && showCoursesBtn && tabView && coursesView) {
        showTabBtn.addEventListener('click', () => {
          showTabBtn.classList.add('active');
          showCoursesBtn.classList.remove('active');
          tabView.classList.remove('hidden');
          coursesView.classList.add('hidden');
        });
        showCoursesBtn.addEventListener('click', async () => {
          // Check if user is authenticated
          const isAuth = localStorage.getItem('isAuthenticated') === 'true';
          if (!isAuth) {
            // Show sign-in prompt
            const signInPrompt = document.createElement('div');
            signInPrompt.className = 'signin-prompt';
            signInPrompt.innerHTML = `
              <div class="signin-prompt-content">
                <h3>Sign In Required</h3>
                <p>Please sign in to access the Courses section.</p>
                <div class="signin-prompt-actions">
                  <a href="signin.html" class="btn-signin">Sign In</a>
                  <a href="signup.html" class="btn-signup">Create Account</a>
                </div>
              </div>
            `;
            document.body.appendChild(signInPrompt);
            
            // Close prompt when clicking outside
            signInPrompt.addEventListener('click', (e) => {
              if (e.target === signInPrompt) {
                document.body.removeChild(signInPrompt);
              }
            });
            
            // Prevent default behavior
            return;
          }
          
          // User is authenticated, show courses
          showCoursesBtn.classList.add('active');
          showTabBtn.classList.remove('active');
          tabView.classList.add('hidden');
          coursesView.classList.remove('hidden');
          if (!coursesView.dataset.loaded) {
            await loadCourses();
            coursesView.dataset.loaded = '1';
          }
        });
      }
    };
    tabList.appendChild(btn);
  });

  // Keep list compact; do not auto-open
}

// ========== INDEX PAGE (combined create + view) ==========
function renderIndexTabs() {
  const tabList = document.getElementById("tabs");
  const tabContent = document.getElementById("content");
  if (!tabList || !tabContent) return;

  tabList.innerHTML = "";
  ensureTabIds();
  const tabs = getTabs();

  if (tabs.length === 0) {
    tabContent.innerHTML = `<p>Select a tab to see its content.</p>`;
    return;
  }

  tabs.forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = tab.title;
    btn.onclick = () => {
      const wasActive = btn.classList.contains("active");
      document.querySelectorAll("#tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      if (wasActive) {
        tabContent.innerHTML = "";
        return;
      }
      btn.classList.add("active");
      const lyrics = tab.lyrics ?? tab.content ?? "";
      const capo = (tab.capo ?? tab.capoFret ?? "");
      const tuning = tab.tuning ?? "";
      const chords = tab.chords ?? "";
      const likeId = `like-${tab.id || 'x'}`;
      const viewsId = `views-${tab.id || 'x'}`;
      incrementTabView(tab.id || '');
      const meta = getTabMeta(tab.id || '');
      const controlsId = `idx-controls-${tab.id || 'x'}`;
      const chordsBlockId = `idx-chords-${tab.id || 'x'}`;
      tabContent.innerHTML = `
        <div id="${controlsId}" class="tab-controls">
          <div class="controls-left">
            <button class="control-btn" data-role="auto-btn">Auto-Scroll</button>
            <input class="speed-slider" type="range" min="0" max="200" value="60" step="5" data-role="auto-speed"/>
          </div>
          <div class="controls-right">
            <button class="control-btn" data-role="transpose-dec">-</button>
            <span class="transpose-label" data-role="transpose-val">0</span>
            <button class="control-btn" data-role="transpose-inc">+</button>
          </div>
        </div>
        <h2>${tab.title}</h2>
        ${capo !== "" ? `<p><strong>Capo:</strong> ${capo}</p>` : ""}
        ${tuning ? `<p><strong>Tuning:</strong> ${tuning}</p>` : ""}
        ${chords ? `<p><strong>Chords:</strong> <span id="${chordsBlockId}">${chords.replace(/\n/g,'<br>')}</span></p>` : ""}
        ${lyrics ? `<h3>Lyrics</h3><p>${lyrics.replace(/\n/g, '<br>')}</p>` : ""}
        <div class="tab-meta" style="margin: 8px 0 12px; display:flex; gap:8px; align-items:center;">
          <span id="${viewsId}">${meta.views} views</span>
          <button id="${likeId}" ${meta.liked ? 'disabled' : ''}>❤ Like (${meta.likes || 0})</button>
        </div>
      `;
      const likeEl = document.getElementById(likeId);
      if (likeEl) {
        likeEl.addEventListener('click', () => {
          const res = likeTabOnce(tab.id || '');
          const m = res.meta;
          likeEl.textContent = `❤ Like (${m.likes || 0})`;
          if (m.liked) likeEl.disabled = true;
        });
      }
      const controlsEl = document.getElementById(controlsId);
      if (controlsEl) {
        wireAutoscrollControls(controlsEl, window);
        let tSteps = 0;
        const valEl = controlsEl.querySelector('[data-role="transpose-val"]');
        const chordsEl = document.getElementById(chordsBlockId);
        function updateTranspose(){ if (valEl) valEl.textContent = String(tSteps); if (chordsEl) chordsEl.innerHTML = transposeChordText(chords, tSteps).replace(/\n/g,'<br>'); }
        const dec = controlsEl.querySelector('[data-role="transpose-dec"]');
        const inc = controlsEl.querySelector('[data-role="transpose-inc"]');
        dec && dec.addEventListener('click', () => { tSteps = (tSteps - 1 + 12) % 12; updateTranspose(); });
        inc && inc.addEventListener('click', () => { tSteps = (tSteps + 1) % 12; updateTranspose(); });
        updateTranspose();
      }
    };
    tabList.appendChild(btn);
  });

  const first = tabList.querySelector(".tab-btn");
  if (first) first.click();
}

function setupIndexPage() {
  const addBtn = document.getElementById("addTabBtn");
  const titleEl = document.getElementById("songTitle");
  const contentEl = document.getElementById("songContent");
  if (!addBtn || !titleEl || !contentEl) return;

  addBtn.addEventListener("click", () => {
    const title = titleEl.value.trim();
    const content = contentEl.value.trim();
    if (!title || !content) {
      alert("Please fill in both fields.");
      return;
    }
    ensureTabIds();
    const tabs = getTabs();
    tabs.push({ id: Date.now().toString(36), title, lyrics: content });
    saveTabs(tabs);
    titleEl.value = "";
    contentEl.value = "";
    renderIndexTabs();
  });
}

// ========== CREATOR PAGE ==========
function setupCreator() {
  const form = document.getElementById("tabForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const capo = document.getElementById("capo")?.value.trim() ?? "";
    const tuning = document.getElementById("tuning")?.value.trim() ?? "";
    const chords = document.getElementById("chords")?.value.trim() ?? "";
    const lyrics = document.getElementById("lyrics")?.value.trim() ?? "";

    if (!title) {
      alert("Please add a song title.");
      return;
    }

    ensureTabIds();
    const tabs = getTabs();
    tabs.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), title, capo, tuning, chords, lyrics });
    saveTabs(tabs);
    alert("Tab saved successfully!");
    form.reset();
    // If we're on the Tabs page, refresh the visible list
    renderTabs();
    // Hide the creator form after save if toggle exists
    const creatorInline = document.getElementById("creatorInline");
    if (creatorInline) creatorInline.classList.add("hidden");
  });
}

// ========== TABS PAGE: CREATE TOGGLE ==========
function setupTabsToggle() {
  const toggle = document.getElementById("createTabToggle");
  const creatorInline = document.getElementById("creatorInline");
  if (!toggle || !creatorInline) return;

  toggle.addEventListener("click", () => {
    const nowHidden = creatorInline.classList.toggle("hidden");
    // If creator opened, close any open tab content and deactivate buttons
    if (!nowHidden) {
      const tabContent = document.getElementById("tabContent");
      if (tabContent) tabContent.innerHTML = "";
      const tabList = document.getElementById("tabList");
      if (tabList) tabList.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    }
  });
}

// ========== PLAYLIST PAGE ==========
function setupPlaylistToggle() {
  const toggle = document.getElementById("createPlaylistToggle");
  const creator = document.getElementById("playlistCreator");
  if (!toggle || !creator) return;
  
  // Add click handler for the toggle button
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    creator.classList.toggle("hidden");
    if (!creator.classList.contains('hidden')) {
      populateTabChoices();
      // When opening creator, clear right pane and deactivate left buttons
      const rightPane = document.getElementById('playlistContent');
      if (rightPane) rightPane.innerHTML = '';
      const mount = document.getElementById('playlistList');
      if (mount) mount.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      
      // Focus on the playlist name input when opening the form
      const nameInput = document.getElementById('playlistName');
      if (nameInput) nameInput.focus();
    }
  });
  
  // Setup form submission
  const form = document.getElementById('playlistForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('playlistName');
      const name = nameInput ? nameInput.value.trim() : '';
      
      if (!name) {
        alert('Please enter a playlist name');
        return;
      }
      
      // Get selected tabs
      const selectedTabs = [];
      const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
      checkboxes.forEach(checkbox => {
        selectedTabs.push(checkbox.value);
      });
      
      if (selectedTabs.length === 0) {
        alert('Please select at least one tab for the playlist');
        return;
      }
      
      // Create playlist
      const playlists = getPlaylists();
      playlists.push({
        id: 'pl_' + Date.now(),
        name: name,
        tabIds: selectedTabs,
        createdAt: new Date().toISOString()
      });
      
      savePlaylists(playlists);
      
      // Reset form and update UI
      form.reset();
      creator.classList.add('hidden');
      renderPlaylistList();
      
      // Show success message
      alert(`Playlist "${name}" created successfully!`);
    });
  }
}

function populateTabChoices() {
  const container = document.getElementById("tabChoices");
  if (!container) return;
  ensureTabIds();
  const tabs = getTabs();
  if (tabs.length === 0) {
    container.innerHTML = '<p>No tabs yet. Create some in the Tabs page.</p>';
    return;
  }
  container.innerHTML = "";
  tabs.forEach(t => {
    const id = `tab-choice-${t.id}`;
    const label = document.createElement("label");
    label.style.display = "block";
    label.innerHTML = `<input type="checkbox" value="${t.id}" id="${id}"> ${t.title}`;
    container.appendChild(label);
  });
}

function setupPlaylistCreator() {
  const form = document.getElementById("playlistForm");
  if (!form) return;
  populateTabChoices();
  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("playlistName").value.trim();
    if (!name) { alert("Please enter a playlist name."); return; }
    const selected = Array.from(document.querySelectorAll('#tabChoices input[type="checkbox"]:checked')).map(cb => cb.value);
    if (selected.length === 0) { alert("Select at least one tab."); return; }
    const playlists = getPlaylists();
    playlists.push({ id: Date.now().toString(36), name, tabIds: selected });
    savePlaylists(playlists);
    alert("Playlist saved!");
    form.reset();
    const creator = document.getElementById("playlistCreator");
    if (creator) creator.classList.add("hidden");
    renderPlaylistList();
  });
}

function renderTabsInto(listEl, contentEl, tabs) {
  listEl.innerHTML = "";
  if (tabs.length === 0) {
    contentEl.innerHTML = "<p>No tabs in this playlist.</p>";
    return;
  }
  tabs.forEach(tab => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = tab.title;
    btn.onclick = () => {
      const wasActive = btn.classList.contains("active");
      listEl.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      if (wasActive) {
        contentEl.innerHTML = "";
        return;
      }
      btn.classList.add("active");
      const lyrics = tab.lyrics ?? tab.content ?? "";
      const capo = (tab.capo ?? tab.capoFret ?? "");
      const tuning = tab.tuning ?? "";
      const chords = tab.chords ?? "";
      const likeId = `like-${tab.id || 'x'}`;
      const viewsId = `views-${tab.id || 'x'}`;
      incrementTabView(tab.id || '');
      const meta = getTabMeta(tab.id || '');
      const controlsId = `pl-controls-${tab.id || 'x'}`;
      const chordsBlockId = `pl-chords-${tab.id || 'x'}`;
      contentEl.innerHTML = `
        <div id="${controlsId}" class="tab-controls">
          <div class="controls-left">
            <button class="control-btn" data-role="auto-btn">Auto-Scroll</button>
            <input class="speed-slider" type="range" min="0" max="200" value="60" step="5" data-role="auto-speed"/>
          </div>
          <div class="controls-right">
            <button class="control-btn" data-role="transpose-dec">-</button>
            <span class="transpose-label" data-role="transpose-val">0</span>
            <button class="control-btn" data-role="transpose-inc">+</button>
          </div>
        </div>
        <h2>${tab.title}</h2>
        ${capo !== "" ? `<p><strong>Capo:</strong> ${capo}</p>` : ""}
        ${tuning ? `<p><strong>Tuning:</strong> ${tuning}</p>` : ""}
        ${chords ? `<p><strong>Chords:</strong> <span id="${chordsBlockId}">${chords.replace(/\n/g,'<br>')}</span></p>` : ""}
        ${lyrics ? `<h3>Lyrics</h3><p>${lyrics.replace(/\n/g, '<br>')}</p>` : ""}
        <div class="tab-meta" style="margin: 8px 0 12px; display:flex; gap:8px; align-items:center;">
          <span id="${viewsId}">${meta.views} views</span>
          <button id="${likeId}" ${meta.liked ? 'disabled' : ''}>❤ Like (${meta.likes || 0})</button>
        </div>
      `;
      const likeEl = document.getElementById(likeId);
      if (likeEl) {
        likeEl.addEventListener('click', () => {
          const res = likeTabOnce(tab.id || '');
          const m = res.meta;
          likeEl.textContent = `❤ Like (${m.likes || 0})`;
          if (m.liked) likeEl.disabled = true;
        });
      }
      const controlsEl = document.getElementById(controlsId);
      if (controlsEl) {
        wireAutoscrollControls(controlsEl, window);
        let tSteps = 0;
        const valEl = controlsEl.querySelector('[data-role="transpose-val"]');
        const chordsEl = document.getElementById(chordsBlockId);
        function updateTranspose(){ if (valEl) valEl.textContent = String(tSteps); if (chordsEl) chordsEl.innerHTML = transposeChordText(chords, tSteps).replace(/\n/g,'<br>'); }
        const dec = controlsEl.querySelector('[data-role="transpose-dec"]');
        const inc = controlsEl.querySelector('[data-role="transpose-inc"]');
        dec && dec.addEventListener('click', () => { tSteps = (tSteps - 1 + 12) % 12; updateTranspose(); });
        inc && inc.addEventListener('click', () => { tSteps = (tSteps + 1) % 12; updateTranspose(); });
        updateTranspose();
      }
    };
    listEl.appendChild(btn);
  });
  // Keep list compact; do not auto-open
}

function renderPlaylistList() {
  const mount = document.getElementById("playlistList");
  const rightPane = document.getElementById("playlistContent");
  if (!mount) return;
  let playlists = getPlaylists();
  const allTabs = getTabs();
  mount.innerHTML = "";
  if (playlists.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = "No playlists yet. Create one above.";
    mount.appendChild(empty);
    if (rightPane) rightPane.innerHTML = '';
    return;
  }
  // Apply ordering for playlists based on aggregate tab meta
  const pMode = getSortMode('ztabs_sort_playlists');
  if (pMode !== 'default') {
    playlists = [...playlists].sort((pa, pb) => {
      const sum = (pl, field) => (pl.tabIds || []).reduce((acc, id) => {
        const m = getTabMeta(id || '');
        return acc + (m[field] || 0);
      }, 0);
      const va = pMode === 'views' ? sum(pa, 'views') : sum(pa, 'likes');
      const vb = pMode === 'views' ? sum(pb, 'views') : sum(pb, 'likes');
      if (vb !== va) return vb - va;
      return (pa.name || '').localeCompare(pb.name || '');
    });
  }
  playlists.forEach(pl => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = pl.name;
    btn.addEventListener('click', () => {
      // Hide playlist creator when a playlist is opened
      const creator = document.getElementById('playlistCreator');
      if (creator) creator.classList.add('hidden');
      // highlight active in left list
      mount.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!rightPane) return;
      rightPane.innerHTML = '';
      const listEl = document.createElement('div');
      listEl.className = 'tabs';
      const contentEl = document.createElement('div');
      contentEl.className = 'playlist-tab-content';
      rightPane.appendChild(listEl);
      rightPane.appendChild(contentEl);
      contentEl.innerHTML = `<p>Select a tab in this playlist.</p>`;
      const subset = pl.tabIds.map(id => allTabs.find(t => t.id === id)).filter(Boolean);
      renderTabsInto(listEl, contentEl, subset);
    });
    mount.appendChild(btn);
  });
}

// ========== AUTHENTICATION HELPERS ==========
function checkAuth() {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  // Update UI based on auth state
  const signinLinks = document.querySelectorAll('#signinLink');
  const signoutLinks = document.querySelectorAll('#signoutLink');
  const authElements = document.querySelectorAll('[data-auth]');
  const adminElements = document.querySelectorAll('[data-admin]');
  
  signinLinks.forEach(link => {
    link.style.display = isAuth ? 'none' : 'inline-block';
  });
  
  signoutLinks.forEach(link => {
    link.style.display = isAuth ? 'inline-block' : 'none';
  });
  
  authElements.forEach(el => {
    el.style.display = isAuth ? 'inline-block' : 'none';
  });
  
  adminElements.forEach(el => {
    el.style.display = (isAuth && isAdmin) ? 'inline-block' : 'none';
  });
  
  return { isAuth, isAdmin };
}

// Protect admin routes
function protectAdminRoute() {
  const { isAuth, isAdmin } = checkAuth();
  if (!isAuth || !isAdmin) {
    window.location.href = 'signin.html';
    return false;
  }
  return true;
}

// ========== PAGE ROUTING ==========
document.addEventListener("DOMContentLoaded", () => {
  // Run one-time reset if requested before any rendering
  resetAllStateIfRequested();
  
  // Check authentication state on page load
  checkAuth();
  renderTabs();
  renderIndexTabs();
  setupCreator();
  setupTabsToggle();
  setupIndexPage();
  setupPlaylistToggle();
  setupPlaylistCreator();
  renderPlaylistList();
  // COURSES PAGE setup
  setupCoursesPage();
  // Sticky header hide/show
  setupHeaderScroll();
  // Global search (if present on this page)
  setupGlobalSearch();
  // Contact form (home page)
  setupContactForm();
  // Ordering controls via dropdowns
  const orderTabsSelect = document.getElementById('orderTabsSelect');
  if (orderTabsSelect) {
    // initialize current mode
    orderTabsSelect.value = getSortMode('ztabs_sort_tabs');
    orderTabsSelect.addEventListener('change', () => {
      setSortMode('ztabs_sort_tabs', orderTabsSelect.value);
      renderTabs();
    });
  }
  const orderPlaylistsSelect = document.getElementById('orderPlaylistsSelect');
  if (orderPlaylistsSelect) {
    orderPlaylistsSelect.value = getSortMode('ztabs_sort_playlists');
    orderPlaylistsSelect.addEventListener('change', () => {
      setSortMode('ztabs_sort_playlists', orderPlaylistsSelect.value);
      renderPlaylistList();
    });
  }
});

// ========== CONTACT (HOME) ==========
function setupContactForm() {
  const form = document.getElementById('contactForm');
  const email = document.getElementById('contactEmail');
  const message = document.getElementById('contactMessage');
  if (!form || !email || !message) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const em = (email.value || '').trim();
    const msg = (message.value || '').trim();
    if (!em || !msg) {
      alert('Please enter your email and a message.');
      return;
    }
    // Basic email shape check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      alert('Please enter a valid email address.');
      return;
    }
    alert('Thanks! Your message has been noted.');
    form.reset();
  });
}

// ========== COURSES PAGE ==========
function setupCoursesPage() {
  const toggle = document.getElementById('createCourseToggle');
  const creator = document.getElementById('courseCreator');
  const form = document.getElementById('courseForm');
  const select = document.getElementById('courseTabSelect');
  const preview = document.getElementById('coursePreview');
  const recToggle = document.getElementById('recToggle');
  const saveBtn = document.getElementById('saveCourse');
  const gallery = document.getElementById('coursesGallery');
  if (!toggle || !creator || !form || !select || !preview || !recToggle || !saveBtn || !gallery) return;

  toggle.addEventListener('click', async () => {
    creator.classList.toggle('hidden');
    if (!creator.classList.contains('hidden')) populateCourseTabsSelect();
  });

  function populateCourseTabsSelect() {
    ensureTabIds();
    const tabs = getTabs();
    select.innerHTML = '';
    tabs.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      select.appendChild(opt);
    });
  }

  let mediaStream; let mediaRecorder; let chunks = []; let isRecording = false;
  recToggle.addEventListener('click', async () => {
    if (!isRecording) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 9/16 }, audio: true });
        preview.srcObject = mediaStream;
        chunks = [];
        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
        mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
        mediaRecorder.onstop = () => { saveBtn.disabled = chunks.length === 0; };
        mediaRecorder.start();
        isRecording = true;
        recToggle.classList.add('recording');
        recToggle.setAttribute('aria-label', 'Stop');
        saveBtn.disabled = true;
      } catch (err) {
        alert('Could not start recording: ' + err.message);
      }
    } else {
      try {
        mediaRecorder && mediaRecorder.stop();
        mediaStream && mediaStream.getTracks().forEach(t => t.stop());
      } catch {}
      isRecording = false;
      recToggle.classList.remove('recording');
      recToggle.setAttribute('aria-label', 'Record');
      saveBtn.disabled = chunks.length === 0;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!chunks.length) { alert('No recording to save.'); return; }
    const videoBlob = new Blob(chunks, { type: 'video/webm' });
    const authorName = document.getElementById('courseAuthor').value.trim();
    const tabId = select.value;
    const course = { id: Date.now().toString(36), tabId, authorName, views: 0, videoBlob, createdAt: Date.now() };
    await addCourse(course);
    alert('Course saved!');
    chunks = [];
    form.reset();
    creator.classList.add('hidden');
    renderCoursesGallery();
  });

  async function renderCoursesGallery() {
    const courses = await getAllCourses();
    gallery.innerHTML = '';
    if (!courses.length) { gallery.innerHTML = '<p>No courses yet.</p>'; return; }
    courses.sort((a,b) => b.createdAt - a.createdAt);
    courses.forEach(c => {
      const url = URL.createObjectURL(c.videoBlob);
      const card = document.createElement('div');
      card.className = 'course-card';
      
      // Create admin controls
      const adminControls = document.createElement('div');
      adminControls.className = 'admin-controls';
      adminControls.style.display = 'flex';
      adminControls.style.gap = '10px';
      adminControls.style.marginTop = '10px';
      adminControls.style.justifyContent = 'center';
      
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn-approve';
      approveBtn.textContent = 'Approve';
      approveBtn.dataset.courseId = c.id;
      
      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn-reject';
      rejectBtn.textContent = 'Reject';
      rejectBtn.dataset.courseId = c.id;
      
      adminControls.appendChild(approveBtn);
      adminControls.appendChild(rejectBtn);
      
      const caption = document.createElement('div');
      caption.textContent = `${c.authorName || 'Creator'} • ${c.views || 0} views`;
      
      const vid = document.createElement('video');
      vid.className = 'shorts-video';
      vid.controls = true;
      vid.src = url;
      vid.addEventListener('click', () => openShortsViewer(courses, c.id));
      let counted = false;
      vid.addEventListener('play', async () => {
        if (counted) return;
        counted = true;
        const fresh = await getCourseById(c.id);
        if (fresh) {
          fresh.views = (fresh.views || 0) + 1;
          await updateCourse(fresh);
          caption.textContent = `${fresh.authorName || 'Creator'} • ${fresh.views} views`;
        }
      });
      card.appendChild(vid);
      card.appendChild(caption);
      card.appendChild(adminControls);
      gallery.appendChild(card);
    });
  }

// Handle approval/rejection for both tabs and courses
document.addEventListener('click', async (e) => {
  const approveBtn = e.target.closest('.btn-approve');
  const rejectBtn = e.target.closest('.btn-reject');
  
  if (!approveBtn && !rejectBtn) return;
  
  e.preventDefault();
  
  // Handle course approval/rejection
  if ((approveBtn && approveBtn.dataset.courseId) || (rejectBtn && rejectBtn.dataset.courseId)) {
    const courseId = (approveBtn || rejectBtn).dataset.courseId;
    
    if (approveBtn) {
      // For approval, hide the controls
      const card = approveBtn.closest('.course-card');
      if (card) {
        const controls = card.querySelector('.admin-controls');
        if (controls) controls.style.display = 'none';
      }
      alert('Course approved!');
    } else if (rejectBtn) {
      // For rejection, remove the course from IndexedDB
      try {
        const db = await openCoursesDb();
        const tx = db.transaction('courses', 'readwrite');
        const store = tx.objectStore('courses');
        await store.delete(courseId);
        
        // Remove from UI
        const card = rejectBtn.closest('.course-card');
        if (card) card.remove();
        
        alert('Course permanently removed.');
      } catch (error) {
        console.error('Error removing course:', error);
        alert('Error removing course. Please try again.');
      }
    }
    return;
  }
  
  // Handle tab approval/rejection
  if ((approveBtn && approveBtn.dataset.tabId) || (rejectBtn && rejectBtn.dataset.tabId)) {
    const tabId = (approveBtn || rejectBtn).dataset.tabId;
    const tabs = getTabs();
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    
    if (tabIndex === -1) return;
    
    if (approveBtn) {
      // For approval, hide the controls
      const controls = approveBtn.closest('.admin-controls');
      if (controls) controls.style.display = 'none';
      alert('Tab approved!');
    } else if (rejectBtn) {
      // For rejection, remove the tab permanently
      tabs.splice(tabIndex, 1);
      saveTabs(tabs);
      
      // Update UI
      const tabContent = document.getElementById('tabContent');
      if (tabContent) {
        tabContent.innerHTML = '<p>Select a tab to see its content.</p>';
      }
      
          // Re-render the tab list
      renderTabs();
      alert('Tab permanently removed.');
    }
  }
});

renderCoursesGallery();
}
