const BACKEND_URL = 'https://digital-library-backend-render.onrender.com';

let loginModal, registerModal;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function () {
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');

    setupAuthListeners();

    checkAuthStatus();
});

function setupAuthListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', showRegisterModal);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function () {
            this.parentElement.parentElement.style.display = 'none';
        });
    });

    window.addEventListener('click', function (event) {
        if (loginModal && event.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (registerModal && event.target === registerModal) {
            registerModal.style.display = 'none';
        }
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

function showLoginModal() {
    if (loginModal) {
        loginModal.style.display = 'block';
        document.getElementById('loginMessage').textContent = '';
    }
}

function showRegisterModal() {
    if (registerModal) {
        registerModal.style.display = 'block';
        document.getElementById('registerMessage').textContent = '';
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${BACKEND_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                email: email,
                role: data.role,
                userId: data.userId
            }));

            updateAuthUI(data.role);

            if (loginModal) loginModal.style.display = 'none';
            document.getElementById('loginForm').reset();
            document.getElementById('loginMessage').textContent = '';

            alert('Login successful!');

            window.location.reload();
        } else {
            document.getElementById('loginMessage').textContent = data.message || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginMessage').textContent = 'Error connecting to server';
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch(`${BACKEND_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('registerMessage').textContent = 'Registration successful! Please login.';
            document.getElementById('registerMessage').style.color = 'green';

            setTimeout(() => {
                if (registerModal) registerModal.style.display = 'none';
                if (loginModal) loginModal.style.display = 'block';
                document.getElementById('registerForm').reset();
            }, 2000);
        } else {
            document.getElementById('registerMessage').textContent = data.message || 'Registration failed';
            document.getElementById('registerMessage').style.color = 'red';
        }
    } catch (error) {
        console.error('Registration error:', error);
        document.getElementById('registerMessage').textContent = 'Error connecting to server';
        document.getElementById('registerMessage').style.color = 'red';
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            updateAuthUI(currentUser.role);
        } catch (e) {
            console.error('Error parsing user data:', e);
            logout();
        }
    } else {
        updateAuthUI(null);
    }
}

function updateAuthUI(role) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');
    const userWelcome = document.getElementById('userWelcome');
    const adminWelcome = document.getElementById('adminWelcome');

    if (role) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';

        if (adminLink && role === 'admin') {
            adminLink.style.display = 'block';
        }

        if (userWelcome) {
            const user = JSON.parse(localStorage.getItem('user'));
            userWelcome.textContent = `Welcome, ${user.email}`;
        }

        if (adminWelcome && role === 'admin') {
            const user = JSON.parse(localStorage.getItem('user'));
            adminWelcome.textContent = `Welcome, Admin ${user.email}`;
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';

        if (userWelcome) userWelcome.textContent = 'Please login to view your borrows';
        if (adminWelcome) adminWelcome.textContent = '';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateAuthUI(null);

    if (window.location.pathname.includes('admin.html') ||
        window.location.pathname.includes('borrow.html')) {
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
        return JSON.parse(user).role === 'admin';
    },
    logout: logout
};
