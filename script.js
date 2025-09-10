// ----- Section Toggle -----
function showSection(sectionId) {
  document.getElementById('tabs').classList.add('hidden-section');
  document.getElementById('playlists').classList.add('hidden-section');
  document.getElementById(sectionId).classList.remove('hidden-section');
}

// ----- Tabs Functionality -----
function addTab() {
  const input = document.getElementById('newTabInput');
  const name = input.value.trim();
  if(name === "") return alert("Enter a tab name!");
  
  const ul = document.getElementById('tabList');
  const li = document.createElement('li');
  li.textContent = name;
  ul.appendChild(li);
  input.value = "";
}

function searchTabs() {
  const filter = document.getElementById('searchTabs').value.toLowerCase();
  const items = document.getElementById('tabList').getElementsByTagName('li');
  for(let i=0; i<items.length; i++){
    const txt = items[i].textContent.toLowerCase();
    items[i].style.display = txt.includes(filter) ? "" : "none";
  }
}

// ----- Playlists Functionality -----
function addPlaylist() {
  const input = document.getElementById('newPlaylistInput');
  const name = input.value.trim();
  if(name === "") return alert("Enter a playlist name!");
  
  const ul = document.getElementById('playlistList');
  const li = document.createElement('li');
  li.textContent = name;
  ul.appendChild(li);
  input.value = "";
}

function searchPlaylists() {
  const filter = document.getElementById('searchPlaylists').value.toLowerCase();
  const items = document.getElementById('playlistList').getElementsByTagName('li');
  for(let i=0; i<items.length; i++){
    const txt = items[i].textContent.toLowerCase();
    items[i].style.display = txt.includes(filter) ? "" : "none";
  }
}

