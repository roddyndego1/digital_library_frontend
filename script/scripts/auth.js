
window.BACKEND_URL = 'https://ibooks-backend-server.onrender.com';


let authModal;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function () {
    authModal = document.getElementById('authModal');
    setupAuthListeners();
    checkAuthStatus();
    testBackendConnection();
});

async function testBackendConnection() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/test-db`);
        const data = await response.json();
        console.log('Backend connection test:', data);
    } catch (error) {
        console.error('Backend connection failed:', error);
        // Show a warning if backend is not reachable
        const loginMessage = document.getElementById('loginMessage');
        const registerMessage = document.getElementById('registerMessage');
        if (loginMessage && !loginMessage.textContent) {
            loginMessage.textContent = 'Warning: Cannot reach backend server. Please check your connection.';
            loginMessage.style.color = 'orange';
        }
    }
}

function setupAuthListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    const closeButton = document.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', handleModalClose);
    }

    window.addEventListener('click', handleModalClick);

    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

function handleModalClose() {
    const token = localStorage.getItem('token');
    if (!token && isIndexPage()) {
        return;
    }
    if (authModal) {
        authModal.style.display = 'none';
    }
}

function handleModalClick(event) {
    const token = localStorage.getItem('token');
    if (!token && isIndexPage()) {
        return;
    }
    if (authModal && event.target === authModal) {
        authModal.style.display = 'none';
    }
}

function isIndexPage() {
    const path = window.location.pathname;
    return path.includes('index.html') || path === '/' || path.endsWith('/');
}

function switchAuthTab(tabName) {
    const tabs = document.querySelectorAll('.auth-tab');
    const sections = document.querySelectorAll('.auth-section');
    
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    sections.forEach(section => {
        if (section.id === `${tabName}Section`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
}

function showAuthModal(tab = 'login') {
    if (!authModal) return;
    
    authModal.style.display = 'block';
    switchAuthTab(tab);
    
    const loginMessage = document.getElementById('loginMessage');
    const registerMessage = document.getElementById('registerMessage');
    if (loginMessage) loginMessage.textContent = '';
    if (registerMessage) registerMessage.textContent = '';
}

async function handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const messageElement = document.getElementById('loginMessage');
    
    if (!emailInput || !passwordInput || !messageElement) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        messageElement.textContent = 'Please fill in all fields';
        return;
    }

    try {
        const response = await fetch(`${window.BACKEND_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            // If response is not JSON, try to get text
            const text = await response.text();
            messageElement.textContent = `Server error: ${response.status} ${response.statusText}. ${text || 'Please try again.'}`;
            messageElement.style.color = 'red';
            console.error('Login error:', response.status, text);
            return;
        }

        if (response.ok) {
            if (!data.token) {
                messageElement.textContent = 'Login failed: No token received';
                messageElement.style.color = 'red';
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                email: email,
                name: data.name || email.split('@')[0],
                role: data.role,
                userId: data.userId
            }));

            updateAuthUI(data.role);
            
            if (authModal) authModal.style.display = 'none';
            emailInput.value = '';
            passwordInput.value = '';
            messageElement.textContent = '';
            
            showNavbar();
        } else {
            messageElement.textContent = data.message || 'Login failed';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageElement.textContent = `Error connecting to server: ${error.message}. Please check your connection and try again.`;
        messageElement.style.color = 'red';
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('regPassword');
    const messageElement = document.getElementById('registerMessage');
    
    if (!nameInput || !emailInput || !passwordInput || !messageElement) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!name || !email || !password) {
        messageElement.textContent = 'Please fill in all fields';
        messageElement.style.color = 'red';
        return;
    }

    try {
        const response = await fetch(`${window.BACKEND_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            // If response is not JSON, try to get text
            const text = await response.text();
            messageElement.textContent = `Server error: ${response.status} ${response.statusText}. ${text || 'Please try again.'}`;
            messageElement.style.color = 'red';
            console.error('Registration error:', response.status, text);
            return;
        }

        if (response.ok) {
            await autoLoginAfterRegistration(email, password, messageElement);
        } else {
            messageElement.textContent = data.message || 'Registration failed';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Registration error:', error);
        messageElement.textContent = `Error connecting to server: ${error.message}. Please check your connection and try again.`;
        messageElement.style.color = 'red';
    }
}

async function autoLoginAfterRegistration(email, password, messageElement) {
    try {
        const loginResponse = await fetch(`${window.BACKEND_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        let loginData;
        try {
            loginData = await loginResponse.json();
        } catch (jsonError) {
            messageElement.textContent = 'Registration successful! Please login.';
            messageElement.style.color = 'green';
            switchAuthTab('login');
            return;
        }

        if (loginResponse.ok && loginData.token) {
            localStorage.setItem('token', loginData.token);
            localStorage.setItem('user', JSON.stringify({
                email: email,
                name: loginData.name || email.split('@')[0],
                role: loginData.role,
                userId: loginData.userId
            }));

            updateAuthUI(loginData.role);
            
            if (authModal) authModal.style.display = 'none';
            const registerForm = document.getElementById('registerForm');
            if (registerForm) registerForm.reset();
            messageElement.textContent = '';
            
            showNavbar();
        } else {
            messageElement.textContent = 'Registration successful! Please login.';
            messageElement.style.color = 'green';
            switchAuthTab('login');
        }
    } catch (error) {
        console.error('Auto-login error:', error);
        messageElement.textContent = 'Registration successful! Please login.';
        messageElement.style.color = 'green';
        switchAuthTab('login');
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            updateAuthUI(currentUser.role);
            showNavbar();
        } catch (error) {
            logout();
        }
    } else {
        updateAuthUI(null);
        if (isIndexPage()) {
            showAuthModal('login');
        } else {
            window.location.href = 'index.html';
        }
    }
}

function showNavbar() {
    const navbar = document.getElementById('mainNavbar');
    if (navbar) {
        navbar.style.display = 'block';
    }
}

function updateAuthUI(role) {
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const userWelcome = document.getElementById('userWelcome');
    const adminWelcome = document.getElementById('adminWelcome');

    if (role) {
        if (logoutBtn) logoutBtn.style.display = 'block';

        if (adminLink && role === 'admin') {
            adminLink.style.display = 'block';
        }

        if (userProfile) {
            userProfile.style.display = 'flex';
        }

        const user = getUserData();
        const displayName = getUserDisplayName(user);

        if (userName && user) {
            userName.textContent = displayName;
        }

        if (userWelcome) {
            userWelcome.textContent = `Welcome, ${displayName}`;
        }

        if (adminWelcome && role === 'admin') {
            adminWelcome.textContent = `Welcome, Admin ${displayName}`;
        }
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';

        if (userWelcome) {
            userWelcome.textContent = 'Please login to view your borrows';
        }
        if (adminWelcome) {
            adminWelcome.textContent = '';
        }
    }
}

function getUserData() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function getUserDisplayName(user) {
    if (!user) return 'User';
    return user.name || user.email.split('@')[0];
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateAuthUI(null);

    if (window.location.pathname.includes('admin.html') ||
        window.location.pathname.includes('user.html')) {
        window.location.href = 'index.html';
    } else {
        window.location.reload();
    }
}

window.auth = {
    getToken: () => localStorage.getItem('token'),
    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    isAdmin: () => {
        const user = localStorage.getItem('user');
        if (!user) return false;
        try {
            return JSON.parse(user).role === 'admin';
        } catch {
            return false;
        }
    },
    logout: logout
};
