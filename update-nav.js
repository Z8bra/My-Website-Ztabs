const fs = require('fs');
const path = require('path');

// List of HTML files to update
const htmlFiles = [
  'index.html',
  'Tabs.html',
  'Playlist.html',
  'Courses.html',
  'Tabs-creator.html'
];

// The new admin link to add to the menu
const adminLink = '\n          <a href="admin.html" class="admin-link" style="display: none;">Admin</a>';

// Update each HTML file
htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the dropdown menu and insert the admin link before the closing div
    const updatedContent = content.replace(
      /(<div class="dropdown-menu">[\s\S]*?)(<\/div>\s*<\/div>\s*<\/div>\s*<\/header>)/,
      (match, p1, p2) => {
        // Insert the admin link before the closing div of the dropdown menu
        return `${p1}${adminLink}${p2}`;
      }
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated ${file} successfully`);
  } catch (error) {
    console.error(`Error updating ${file}:`, error);
  }
});

// Add a small script to show the admin link only on the admin page
const adminScript = `
  <script>
    // Show admin link in menu when on admin page
    if (window.location.pathname.endsWith('admin.html')) {
      document.querySelectorAll('.admin-link').forEach(link => {
        link.style.display = 'block';
      });
    }
  </script>
`;

// Add the script to the admin page
const adminFilePath = path.join(__dirname, 'admin.html');
let adminContent = fs.readFileSync(adminFilePath, 'utf8');

// Insert the script before the closing body tag
if (!adminContent.includes('admin-link')) {
  adminContent = adminContent.replace('</body>', `${adminScript}\n</body>`);
  fs.writeFileSync(adminFilePath, adminContent, 'utf8');
  console.log('Updated admin.html with admin link visibility script');
}

console.log('Navigation update complete!');
