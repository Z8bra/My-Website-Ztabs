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
    tabContent.innerHTML = `<p>No tabs yet! Go to <a href="tabs-creator.html">Tab Creator</a> to add one.</p>`;
    return;
  }

  tabs.forEach((tab, index) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = tab.title;
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tabContent.innerHTML = `<h2>${tab.title}</h2><p>${tab.content}</p>`;
    };
    tabList.appendChild(btn);
  });

  // Open the first tab automatically
  const first = tabList.querySelector(".tab-btn");
  if (first) first.click();
}

// ========== CREATOR PAGE ==========
function setupCreator() {
  const form = document.getElementById("tabForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();

    if (!title || !content) {
      alert("Please fill in both fields.");
      return;
    }

    const tabs = getTabs();
    tabs.push({ title, content });
    saveTabs(tabs);
    alert("Tab saved successfully!");
    form.reset();
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
    div.innerHTML = `<strong>${tab.title}</strong><p>${tab.content}</p>`;
    list.appendChild(div);
  });
}

// ========== PAGE ROUTING ==========
document.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  setupCreator();
  renderPlaylist();
});
