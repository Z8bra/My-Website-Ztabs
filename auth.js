// Admin credentials
const ADMIN_CREDENTIALS = {
    username: 'Z8bra',
    password: 'Ydji8K6B'
};

// Initialize users array in localStorage if it doesn't exist
function initUsers() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([]));
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

// Check if user is admin
function isAdmin() {
    return localStorage.getItem('isAdmin') === 'true';
}

// Sign up function
function signUp(username, email, password) {
    initUsers();
    const users = JSON.parse(localStorage.getItem('users'));
    
    // Check if username or email already exists
    const userExists = users.some(user => 
        user.username.toLowerCase() === username.toLowerCase() || 
        user.email.toLowerCase() === email.toLowerCase()
    );
    
    if (userExists) {
        return { success: false, message: 'Username or email already exists' };
    }
    
    // Add new user (in a real app, you would hash the password first!)
    users.push({
        id: Date.now().toString(),
        username,
        email,
        password, // Note: In a production app, never store plain text passwords!
        createdAt: new Date().toISOString()
    });
    
    localStorage.setItem('users', JSON.stringify(users));
    return { success: true };
}

// Sign in function
function signIn(identifier, password) {
    // Check admin login first
    if (identifier === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('currentUser', JSON.stringify({ 
            username: ADMIN_CREDENTIALS.username,
            isAdmin: true 
        }));
        return { success: true, isAdmin: true };
    }
    
    // Check regular users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => 
        (u.username.toLowerCase() === identifier.toLowerCase() || 
         u.email.toLowerCase() === identifier.toLowerCase()) && 
        u.password === password // In a real app, compare hashed passwords
    );
    
    if (user) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('isAdmin', 'false');
        localStorage.setItem('currentUser', JSON.stringify({ 
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: false
        }));
        return { success: true, isAdmin: false };
    }
    
    return { success: false, message: 'Invalid username/email or password' };
}

// Sign out function
function signOut(event) {
    if (event) {
        event.preventDefault();
    }
    
    // Clear authentication data
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('currentUser');
    
    // Update navigation before redirecting
    updateNavigation();
    
    // Redirect to home page
    window.location.href = 'index.html';
    
    return false;
}

// Protect admin routes
function protectAdminRoute() {
    if (!isAuthenticated() || !isAdmin()) {
        window.location.href = 'signin.html';
        return false;
    }
    return true;
}

// Update navigation based on authentication
function updateNavigation() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    
    const signinLinks = document.querySelectorAll('#signinLink');
    const signoutLinks = document.querySelectorAll('#signoutLink');
    const authLinks = nav.querySelectorAll('[data-auth]');
    const adminLinks = nav.querySelectorAll('[data-admin]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (isAuthenticated()) {
        // Show sign out and hide sign in
        signinLinks.forEach(link => link.style.display = 'none');
        signoutLinks.forEach(link => link.style.display = 'inline-block');
        
        // Show authenticated user links
        authLinks.forEach(link => {
            link.style.display = 'inline-block';
        });
        
        // Show admin links if admin
        if (isAdmin()) {
            adminLinks.forEach(link => {
                link.style.display = 'inline-block';
            });
        } else {
            adminLinks.forEach(link => {
                link.style.display = 'none';
            });
        }
        
        // Update user info in the UI if element exists
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.textContent = `Welcome, ${currentUser.username}`;
            userInfo.style.display = 'inline-block';
        }
    } else {
        // Show sign in and hide sign out
        signinLinks.forEach(link => link.style.display = 'inline-block');
        signoutLinks.forEach(link => link.style.display = 'none');
        
        // Hide authenticated and admin links
        authLinks.forEach(link => {
            link.style.display = 'none';
        });
        adminLinks.forEach(link => {
            link.style.display = 'none';
        });
        
        const userInfo = document.getElementById('userInfo');
        if (userInfo) userInfo.style.display = 'none';
    }
}

// Initialize auth functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize users storage
    initUsers();
    
    // Handle sign in form submission
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
        signinForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const identifier = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            const result = signIn(identifier, password);
            if (result.success) {
                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = result.message || 'Invalid username/email or password';
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 3000);
            }
        });
    }
    
    // Handle sign up form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            
            // Reset messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            // Validate passwords match
            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Attempt to create account
            const result = signUp(username, email, password);
            if (result.success) {
                successMessage.style.display = 'block';
                // Redirect to sign in after a short delay
                setTimeout(() => {
                    window.location.href = 'signin.html';
                }, 1500);
            } else {
                errorMessage.textContent = result.message || 'Error creating account';
                errorMessage.style.display = 'block';
            }
        });
    }
    
        // Add event listeners to all sign-out links
    document.addEventListener('click', function(event) {
        if (event.target.matches('#signoutLink') || event.target.closest('#signoutLink')) {
            signOut(event);
        }
    });
    
    // Update navigation based on auth status
    updateNavigation();
    
    // Redirect to home if already logged in
    if ((window.location.pathname.endsWith('signin.html') || 
         window.location.pathname.endsWith('signup.html')) &&
        isAuthenticated()) {
        window.location.href = 'index.html';
    }
});
