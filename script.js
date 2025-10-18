// ========== Z TABS STORAGE ==========
function getTabs() {
  return JSON.parse(localStorage.getItem("ztabs_data") || "[]");
}

function saveTabs(tabs) {
  localStorage.setItem("ztabs_data", JSON.stringify(tabs));
}

// ========== TABS PAGE ==========
function renderTabs() {
  const tabList = document.getElementById("tabList");
  const tabContent = document.getElementById("tabContent");
  if (!tabList || !tabContent) return;

  tabList.innerHTML = "";
  const tabs = getTabs();

  if (tabs.length === 0) {
    tabContent.innerHTML = `<p>No tabs yet! Go to <a href="Tabs-creator.html">Tab Creator</a> to add one.</p>`;
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
    const tabs = getTabs();
    tabs.push({ title, content });
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

    const tabs = getTabs();
    tabs.push({ title, capo, tuning, chords, lyrics });
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
function renderPlaylist() {
  const list = document.getElementById("playlistList");
  if (!list) return;

  const tabs = getTabs();
  if (tabs.length === 0) {
    list.innerHTML = "<p>No songs or tabs saved yet.</p>";
    return;
  }

  list.innerHTML = "";
  tabs.forEach(tab => {
    const div = document.createElement("div");
    div.className = "playlist";
    const lyrics = tab.lyrics ?? tab.content ?? "";
    const preview = lyrics.length > 140 ? lyrics.slice(0, 140) + "..." : lyrics;
    div.innerHTML = `<strong>${tab.title}</strong>${preview ? `<p>${preview}</p>` : ""}`;
    list.appendChild(div);
  });
}

// ========== PAGE ROUTING ==========
document.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  renderIndexTabs();
  setupCreator();
  setupTabsToggle();
  setupIndexPage();
  renderPlaylist();
});
