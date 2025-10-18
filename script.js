// ========== Z TABS STORAGE ==========
function getTabs() {
  return JSON.parse(localStorage.getItem("ztabs_data") || "[]");
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

  video.addEventListener('play', () => {
    const course = courses[index];
    countViewFor(course);
  });

  window.addEventListener('keydown', onKey);
  overlay.addEventListener('wheel', onWheel, { passive: true });
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
  const tabs = getTabs();

  if (tabs.length === 0) {
    tabContent.innerHTML = `<p>No tabs yet. Click the <strong>Create Tab</strong> button to add one.</p>`;
    return;
  }

  tabs.forEach((tab, index) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = tab.title;
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const lyrics = tab.lyrics ?? tab.content ?? "";
      const capo = (tab.capo ?? tab.capoFret ?? "");
      const tuning = tab.tuning ?? "";
      const chords = tab.chords ?? "";
      tabContent.innerHTML = `
        <h2>${tab.title}</h2>
        ${capo !== "" ? `<p><strong>Capo:</strong> ${capo}</p>` : ""}
        ${tuning ? `<p><strong>Tuning:</strong> ${tuning}</p>` : ""}
        ${chords ? `<p><strong>Chords:</strong> ${chords}</p>` : ""}
        ${lyrics ? `<h3>Lyrics</h3><p>${lyrics.replace(/\n/g, '<br>')}</p>` : ""}
        <button class="create-tab-btn" data-tab-id="${tab.id || ''}" id="coursesBtn-${tab.id || 'x'}">Courses</button>
        <div id="coursesList-${tab.id || 'x'}"></div>
      `;
      const btn = document.getElementById(`coursesBtn-${tab.id || 'x'}`);
      if (btn && tab.id) {
        btn.addEventListener('click', async () => {
          const listEl = document.getElementById(`coursesList-${tab.id}`);
          listEl.innerHTML = '<p>Loading courses...</p>';
          const courses = await getCoursesByTabId(tab.id);
          if (!courses.length) { listEl.innerHTML = '<p>No courses yet.</p>'; return; }
          listEl.innerHTML = '';
          const grid = document.createElement('div');
          grid.className = 'shorts-grid';
          listEl.appendChild(grid);
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
            // Increment views on first play per page load
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
        });
      }
    };
    tabList.appendChild(btn);
  });

  // Open the first tab automatically
  const first = tabList.querySelector(".tab-btn");
  if (first) first.click();
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
      document.querySelectorAll("#tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const lyrics = tab.lyrics ?? tab.content ?? "";
      const capo = (tab.capo ?? tab.capoFret ?? "");
      const tuning = tab.tuning ?? "";
      const chords = tab.chords ?? "";
      tabContent.innerHTML = `
        <h2>${tab.title}</h2>
        ${capo !== "" ? `<p><strong>Capo:</strong> ${capo}</p>` : ""}
        ${tuning ? `<p><strong>Tuning:</strong> ${tuning}</p>` : ""}
        ${chords ? `<p><strong>Chords:</strong> ${chords}</p>` : ""}
        ${lyrics ? `<h3>Lyrics</h3><p>${lyrics.replace(/\n/g, '<br>')}</p>` : ""}
      `;
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
    creatorInline.classList.toggle("hidden");
  });
}

// ========== PLAYLIST PAGE ==========
function setupPlaylistToggle() {
  const toggle = document.getElementById("createPlaylistToggle");
  const creator = document.getElementById("playlistCreator");
  if (!toggle || !creator) return;
  toggle.addEventListener("click", () => {
    const willShow = creator.classList.toggle("hidden");
    if (!willShow) {
      // It was hidden and now shown; refresh choices
      populateTabChoices();
    }
  });
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
      listEl.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const lyrics = tab.lyrics ?? tab.content ?? "";
      const capo = (tab.capo ?? tab.capoFret ?? "");
      const tuning = tab.tuning ?? "";
      const chords = tab.chords ?? "";
      contentEl.innerHTML = `
        <h2>${tab.title}</h2>
        ${capo !== "" ? `<p><strong>Capo:</strong> ${capo}</p>` : ""}
        ${tuning ? `<p><strong>Tuning:</strong> ${tuning}</p>` : ""}
        ${chords ? `<p><strong>Chords:</strong> ${chords}</p>` : ""}
        ${lyrics ? `<h3>Lyrics</h3><p>${lyrics.replace(/\n/g, '<br>')}</p>` : ""}
      `;
    };
    listEl.appendChild(btn);
  });
  const first = listEl.querySelector(".tab-btn");
  if (first) first.click();
}

function renderPlaylistList() {
  const mount = document.getElementById("playlistList");
  if (!mount) return;
  const playlists = getPlaylists();
  const allTabs = getTabs();
  if (playlists.length === 0) {
    mount.innerHTML = "<p>No playlists yet. Create one above.</p>";
    return;
  }
  mount.innerHTML = "";
  playlists.forEach(pl => {
    const container = document.createElement("div");
    container.className = "playlist";
    const headerBtn = document.createElement("button");
    headerBtn.className = "tab-btn";
    headerBtn.textContent = pl.name;
    const inner = document.createElement("div");
    inner.style.marginTop = "10px";
    container.appendChild(headerBtn);
    container.appendChild(inner);
    headerBtn.addEventListener("click", () => {
      inner.innerHTML = "";
      const listEl = document.createElement("div");
      listEl.className = "tabs";
      const contentEl = document.createElement("div");
      contentEl.className = "tab-content";
      inner.appendChild(listEl);
      inner.appendChild(contentEl);
      const subset = pl.tabIds.map(id => allTabs.find(t => t.id === id)).filter(Boolean);
      renderTabsInto(listEl, contentEl, subset);
    });
    mount.appendChild(container);
  });
}

// ========== PAGE ROUTING ==========
document.addEventListener("DOMContentLoaded", () => {
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
});

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
      gallery.appendChild(card);
    });
  }

  renderCoursesGallery();
}
