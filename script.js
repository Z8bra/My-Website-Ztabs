// ========== Z TABS STORAGE ==========
function getTabs() {
  return JSON.parse(localStorage.getItem("ztabs_data") || "[]");
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
      `;
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
});
