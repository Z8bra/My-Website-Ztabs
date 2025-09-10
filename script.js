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

