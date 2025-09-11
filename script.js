// --- Utility ---
function getTabs() {
  return JSON.parse(localStorage.getItem('ztabs_tabs') || '[]');
}

function saveTabs(tabs) {
  localStorage.setItem('ztabs_tabs', JSON.stringify(tabs));
}

// --- Tabs Page ---
function renderTabsPage() {
  const tabsContainer = document.getElementById('tabs');
  const contentContainer = document.getElementById('content');
  if (!tabsContainer || !contentContainer) return;

  tabsContainer.innerHTML = '';
  const tabs = getTabs();

  tabs.forEach((tab, index) => {
    const btn = document.createElement('button');
    btn.textContent = tab.title;
    btn.className = 'tab-btn';
    btn.onclick = () => {
      contentContainer.innerHTML = tab.content;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    tabsContainer.appendChild(btn);
  });

  // Open first tab by default
  if (tabs.length) {
    contentContainer.innerHTML = tabs[0].content;
    tabsContainer.querySelector('.tab-btn').classList.add('active');
  } else {
    contentContainer.innerHTML = '<p>No tabs available. Add one!</p>';
  }
}

// --- Tabs Creator Page ---
function setupCreatorPage() {
  const addBtn = document.getElementById('addTabBtn');
  const titleInput = document.getElementById('songTitle');
  const contentInput = document.getElementById('songContent');

  addBtn.onclick = () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title || !content) return alert('Please fill in both fields.');

    const tabs = getTabs();
    tabs.push({ title, content });
    saveTabs(tabs);

    alert('Tab added successfully!');
    titleInput.value = '';
    contentInput.value = '';
  };
}

// --- Playlists Page ---
function renderPlaylistsPage() {
  const playlistContainer = document.getElementById('playlistContainer');
  if (!playlistContainer) return;

  const tabs = getTabs();
  if (!tabs.length) {
    playlistContainer.innerHTML = '<p>No tabs yet.</p>';
    return;
  }

  playlistContainer.innerHTML = '';
  tabs.forEach((tab, index) => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${tab.title}</strong>: ${tab.content}`;
    div.style.background = '#fff';
    div.style.padding = '10px';
    div.style.borderRadius = '6px';
    div.style.marginBottom = '8px';
    playlistContainer.appendChild(div);
  });
}

// --- Initialize pages based on ID ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tabs')) renderTabsPage();
  if (document.getElementById('addTabBtn')) setupCreatorPage();
  if (document.getElementById('playlistContainer')) renderPlaylistsPage();
});
