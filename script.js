// ========== Z TABS STORAGE ==========
function getTabs() {
  return JSON.parse(localStorage.getItem("ztabs_data") || "[]");
}

// ========== SHORTS FULLSCREEN VIEWER ==========
function openShortsViewer(courses, startIndex) {
  if (!courses || courses.length === 0) return;
  let index = Math.max(0, Math.min(startIndex || 0, courses.length - 1));

  const overlay = document.createElement('div');
  overlay.className = 'shorts-overlay';
  const viewer = document.createElement('div');
  viewer.className = 'shorts-viewer';
  const wrapper = document.createElement('div');
  wrapper.className = 'shorts-video-wrapper';
  const video = document.createElement('video');
  video.className = 'shorts-video';
  video.controls = true;
  video.playsInline = true;
  const bottom = document.createElement('div');
  bottom.className = 'shorts-bottom';
  wrapper.appendChild(video);
  wrapper.appendChild(bottom);
  const meta = document.createElement('div');
  meta.className = 'shorts-meta';
  viewer.appendChild(wrapper);
  viewer.appendChild(meta);
  overlay.appendChild(viewer);
  document.body.appendChild(overlay);

  function updateSlide() {
    const c = courses[index];
    if (!c) return;
    const url = URL.createObjectURL(c.videoBlob);
    video.src = url;
    const text = `${c.authorName || 'Creator'} • ${c.views || 0} views`;
    meta.textContent = text;
    bottom.textContent = text;
    video.play().catch(()=>{});
  }

  async function countViewOnce() {
    const c = courses[index];
    if (!c) return;
    const fresh = await getCourseById(c.id);
    if (fresh) {
      fresh.views = (fresh.views || 0) + 1;
      await updateCourse(fresh);
      const text = `${fresh.authorName || 'Creator'} • ${fresh.views} views`;
      meta.textContent = text;
      bottom.textContent = text;
    }
    video.removeEventListener('play', countViewOnce);
  }

  function next() { if (index < courses.length - 1) { index++; updateSlide(); video.addEventListener('play', countViewOnce); } }
  function prev() { if (index > 0) { index--; updateSlide(); video.addEventListener('play', countViewOnce); } }

  function onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    if (e.key === 'Escape') { cleanup(); }
  }
  function onWheel(e) { if (e.deltaY > 0) next(); else if (e.deltaY < 0) prev(); }
  function cleanup() {
    document.removeEventListener('keydown', onKey);
    overlay.removeEventListener('wheel', onWheel);
    overlay.remove();
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('wheel', onWheel, { passive: true });

  updateSlide();
  video.addEventListener('play', countViewOnce);
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

// ========== AUTH ========== 
function getUsers() {
  return JSON.parse(localStorage.getItem('ztabs_users') || '{}');
}
function saveUsers(map) {
  localStorage.setItem('ztabs_users', JSON.stringify(map));
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('ztabs_current_user') || 'null');
}
function setCurrentUser(user) {
  if (user) localStorage.setItem('ztabs_current_user', JSON.stringify(user));
  else localStorage.removeItem('ztabs_current_user');
}
function isAuthenticated() {
  return !!getCurrentUser();
}
function ensureAuthOrRedirect() {
  const path = (location.pathname || '').toLowerCase();
  const publicPages = ['index.html', '/', 'signin.html'];
  const isPublic = publicPages.some(p => path.endsWith(p));
  if (!isAuthenticated() && !isPublic) {
    location.replace('signin.html');
  }
}
function hydrateLoginLink() {
  const link = document.getElementById('loginLink');
  if (!link) return;
  const user = getCurrentUser();
  if (user) {
    link.textContent = `Log out (${user.username})`;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setCurrentUser(null);
      location.replace('index.html');
    }, { once: true });
  } else {
    link.textContent = 'Log in';
  }
}

function setupSigninPage() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const signupTitle = document.getElementById('signupTitle');
  const showSignup = document.getElementById('showSignup');
  const showLogin = document.getElementById('showLogin');
  const loginGoogle = document.getElementById('loginGoogle');
  const signupGoogle = document.getElementById('signupGoogle');
  if (!loginForm && !signupForm) return;

  function toSignup() {
    signupTitle?.classList.remove('hidden');
    signupForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');
  }
  function toLogin() {
    signupTitle?.classList.add('hidden');
    signupForm?.classList.add('hidden');
    loginForm?.classList.remove('hidden');
  }
  showSignup?.addEventListener('click', (e) => { e.preventDefault(); toSignup(); });
  showLogin?.addEventListener('click', (e) => { e.preventDefault(); toLogin(); });

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const users = getUsers();
    if (!users[username] || users[username] !== password) { alert('Invalid credentials'); return; }
    setCurrentUser({ username });
    location.replace('index.html');
  });

  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (!username || !password) { alert('Fill all fields'); return; }
    const users = getUsers();
    if (users[username]) { alert('Username is taken'); return; }
    users[username] = password;
    saveUsers(users);
    setCurrentUser({ username });
    location.replace('index.html');
  });

  loginGoogle?.addEventListener('click', () => {
    const username = 'GoogleUser';
    const users = getUsers();
    users[username] = users[username] || '';
    saveUsers(users);
    setCurrentUser({ username });
    location.replace('index.html');
  });
  signupGoogle?.addEventListener('click', () => {
    const username = 'GoogleUser';
    const users = getUsers();
    users[username] = users[username] || '';
    saveUsers(users);
    setCurrentUser({ username });
    location.replace('index.html');
  });
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

function renderPlaylistListFiltered(query) {
  const q = (query || "").toLowerCase();
  const mount = document.getElementById("playlistList");
  if (!mount) return;
  const allTabs = getTabs();
  const playlists = getPlaylists().filter(pl => (pl.name || "").toLowerCase().includes(q));
  mount.innerHTML = "";
  if (playlists.length === 0) { mount.innerHTML = "<p>No results.</p>"; return; }
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
      const coursesBtn = document.getElementById(`coursesBtn-${tab.id || 'x'}`);
      if (coursesBtn && tab.id) {
        coursesBtn.addEventListener('click', async () => {
          const listEl = document.getElementById(`coursesList-${tab.id || 'x'}`);
          if (!listEl) return;
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
            vid.addEventListener('click', () => openShortsViewer(courses, courses.findIndex(x => x.id === c.id)));
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

function renderTabsFiltered(query) {
  const q = (query || "").toLowerCase();
  const all = getTabs();
  const filtered = all.filter(t => {
    const lyrics = (t.lyrics || t.content || "").toLowerCase();
    const chords = (t.chords || "").toLowerCase();
    const title = (t.title || "").toLowerCase();
    return title.includes(q) || lyrics.includes(q) || chords.includes(q);
  });
  const tabList = document.getElementById("tabList");
  const tabContent = document.getElementById("tabContent");
  if (!tabList || !tabContent) return;
  tabList.innerHTML = "";
  if (filtered.length === 0) {
    tabContent.innerHTML = `<p>No results.</p>`;
    return;
  }
  filtered.forEach(tab => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = tab.title;
    btn.onclick = () => {
      document.querySelectorAll("#tabList .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const lyrics = tab.lyrics ?? tab.content ?? "";
      const capo = (tab.capo ?? tab.capoFret ?? "");
      const tuning = tab.tuning ?? "";
      const chords = tab.chords ?? "";
      document.getElementById("tabContent").innerHTML = `
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
  ensureAuthOrRedirect();
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
  setupSigninPage();
  hydrateLoginLink();
  // Searches
  const tabSearch = document.getElementById('tabSearch');
  if (tabSearch) {
    tabSearch.addEventListener('input', (e) => {
      const val = e.target.value;
      if (!val) { renderTabs(); } else { renderTabsFiltered(val); }
    });
  }
  const playlistSearch = document.getElementById('playlistSearch');
  if (playlistSearch) {
    playlistSearch.addEventListener('input', (e) => {
      const val = e.target.value;
      if (!val) { renderPlaylistList(); } else { renderPlaylistListFiltered(val); }
    });
  }
});

// ========== COURSES PAGE ==========
function setupCoursesPage() {
  const toggle = document.getElementById('createCourseToggle');
  const creator = document.getElementById('courseCreator');
  const form = document.getElementById('courseForm');
  const select = document.getElementById('courseTabSelect');
  const preview = document.getElementById('coursePreview');
  const recordBtn = document.getElementById('recordBtn');
  const saveBtn = document.getElementById('saveCourse');
  const gallery = document.getElementById('coursesGallery');
  if (!toggle || !creator || !form || !select || !preview || !recordBtn || !saveBtn || !gallery) return;

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
  recordBtn.addEventListener('click', async () => {
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
        recordBtn.classList.add('recording');
      } catch (err) {
        alert('Could not start recording: ' + err.message);
      }
    } else {
      try {
        mediaRecorder && mediaRecorder.stop();
        mediaStream && mediaStream.getTracks().forEach(t => t.stop());
      } catch {}
      isRecording = false;
      recordBtn.classList.remove('recording');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!chunks.length) { alert('No recording to save.'); return; }
    const videoBlob = new Blob(chunks, { type: 'video/webm' });
    const user = getCurrentUser();
    const authorName = user?.username || 'Creator';
    const tabId = select.value;
    const course = { id: Date.now().toString(36), tabId, authorName, views: 0, videoBlob, createdAt: Date.now() };
    await addCourse(course);
    alert('Course saved!');
    chunks = [];
    form.reset();
    creator.classList.add('hidden');
    renderCoursesGallery();
  });

  async function renderCoursesGallery(query = '') {
    const courses = await getAllCourses();
    gallery.innerHTML = '';
    const q = (query || '').toLowerCase();
    const tabs = getTabs();
    const filtered = courses.filter(c => {
      const author = (c.authorName || '').toLowerCase();
      const title = (tabs.find(t => t.id === c.tabId)?.title || '').toLowerCase();
      return author.includes(q) || title.includes(q);
    });
    if (!filtered.length) { gallery.innerHTML = '<p>No courses yet.</p>'; return; }
    filtered.sort((a,b) => b.createdAt - a.createdAt);
    filtered.forEach(c => {
      const url = URL.createObjectURL(c.videoBlob);
      const card = document.createElement('div');
      const caption = document.createElement('div');
      caption.textContent = `${c.authorName || 'Creator'} • ${c.views || 0} views`;
      const vid = document.createElement('video');
      vid.className = 'shorts-video';
      vid.controls = true;
      vid.src = url;
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
      vid.addEventListener('click', () => openShortsViewer(filtered, filtered.findIndex(x => x.id === c.id)));
      card.appendChild(vid);
      card.appendChild(caption);
      gallery.appendChild(card);
    });
  }

  const coursesSearch = document.getElementById('coursesSearch');
  if (coursesSearch) {
    coursesSearch.addEventListener('input', (e) => {
      renderCoursesGallery(e.target.value || '');
    });
  }
  renderCoursesGallery('');
}
