// Authentication state management
let currentUser = null;
let authToken = null;

// Pages that require login (video management)
const PROTECTED_PAGES = [
    'management.html',
    'move_video.html',
    'add_videogroup.html'
];

function isProtectedPage() {
    const path = window.location.pathname;
    return PROTECTED_PAGES.some(page => path.endsWith(page));
}

function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

function requireAuth() {
    if (!authToken || !currentUser) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `index.html?redirect=${redirect}`;
        return false;
    }
    return true;
}

// Cookie helpers for dual storage (cookie + localStorage)
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function setAuth(token, user) {
    authToken = token;
    currentUser = user;
    // Persist to localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    // Persist to cookie (7 days)
    //document.cookie = `authToken=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    //document.cookie = `currentUser=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`;
}

function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'currentUser=; path=/; max-age=0; SameSite=Lax';
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved token from localStorage first, then fallback to cookie
    authToken = localStorage.getItem('authToken') || getCookie('authToken');
    const storedUser = localStorage.getItem('currentUser') || getCookie('currentUser');
    try {
        currentUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (_) {
        currentUser = null;
    }

    if (isProtectedPage() && !requireAuth()) {
        return;
    }
    
    updateUI();
    setupEventListeners();
    setupMobileMenu();
});

// Setup event listeners for modals and forms
function setupEventListeners() {
    // Sign In Modal
    const signinBtn = document.getElementById('signin-btn');
    const signinModal = document.getElementById('signin-modal');
    const closeSignin = document.getElementById('close-signin');
    const signinForm = document.getElementById('signin-form');

    if (signinBtn) {
        signinBtn.addEventListener('click', () => {
            signinModal.classList.remove('hidden');
        });
    }

    if (closeSignin) {
        closeSignin.addEventListener('click', () => {
            signinModal.classList.add('hidden');
        });
    }

    // Close modal when clicking outside
    if (signinModal) {
        signinModal.addEventListener('click', (e) => {
            if (e.target === signinModal) {
                signinModal.classList.add('hidden');
            }
        });
    }

    // Sign Up Modal
    const signupBtn = document.getElementById('signup-btn');
    const signupModal = document.getElementById('signup-modal');
    const closeSignup = document.getElementById('close-signup');
    const signupForm = document.getElementById('signup-form');

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            signupModal.classList.remove('hidden');
        });
    }

    if (closeSignup) {
        closeSignup.addEventListener('click', () => {
            signupModal.classList.add('hidden');
        });
    }

    if (signupModal) {
        signupModal.addEventListener('click', (e) => {
            if (e.target === signupModal) {
                signupModal.classList.add('hidden');
            }
        });
    }

    // Sign In Form Submission
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signin-username').value;
            const password = document.getElementById('signin-password').value;
            const errorDiv = document.getElementById('signin-error');

            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';

            try {
                const response = await fetch('/signin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    setAuth(data.token, data.user);
                    
                    signinModal.classList.add('hidden');
                    signinForm.reset();
                    updateUI();
                    
                    showNotification('登录成功！', 'success');

                    const params = new URLSearchParams(window.location.search);
                    const redirect = params.get('redirect');
                    if (redirect) {
                        window.location.href = redirect;
                        return;
                    }
                } else {
                    errorDiv.textContent = data.error || '登录失败，请检查用户名和密码';
                    errorDiv.classList.remove('hidden');
                }
            } catch (error) {
                errorDiv.textContent = '网络错误，请稍后重试';
                errorDiv.classList.remove('hidden');
            }
        });
    }

    // Sign Up Form Submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const phone = document.getElementById('signup-phone').value;
            const errorDiv = document.getElementById('signup-error');

            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password,
                        phone_number: phone || null
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    signupModal.classList.add('hidden');
                    signupForm.reset();
                    showNotification('注册成功！请登录', 'success');
                    
                    // Auto open sign in modal
                    setTimeout(() => {
                        signinModal.classList.remove('hidden');
                    }, 500);
                } else {
                    errorDiv.textContent = data.error || '注册失败，请检查输入信息';
                    errorDiv.classList.remove('hidden');
                }
            } catch (error) {
                errorDiv.textContent = '网络错误，请稍后重试';
                errorDiv.classList.remove('hidden');
            }
        });
    }

    // Sign Out Button
    const signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', async () => {
            await signOut();
        });
    }
    
    // Mobile Sign Out Button
    const mobileSignoutBtn = document.getElementById('mobile-signout-btn');
    if (mobileSignoutBtn) {
        mobileSignoutBtn.addEventListener('click', async () => {
            await signOut();
        });
    }
    
    // Mobile Sign In Button
    const mobileSigninBtn = document.getElementById('mobile-signin-btn');
    if (mobileSigninBtn) {
        mobileSigninBtn.addEventListener('click', () => {
            signinModal.classList.remove('hidden');
            // Close mobile menu
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) mobileMenu.classList.add('hidden');
        });
    }
    
    // Mobile Sign Up Button
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');
    if (mobileSignupBtn) {
        mobileSignupBtn.addEventListener('click', () => {
            signupModal.classList.remove('hidden');
            // Close mobile menu
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) mobileMenu.classList.add('hidden');
        });
    }
}

// Sign out function
async function signOut() {
    try {
        if (authToken) {
            await fetch('/signout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Sign out error:', error);
    }

    clearAuth();
    
    updateUI();
    showNotification('已退出登录', 'info');
    
    // Redirect if on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
}

// Toggle mobile nav menu (shared across pages with #mobile-menu-button)
function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// Show/hide management nav links based on login state
function setNavLinkVisibility(selector, visible) {
    document.querySelectorAll(selector).forEach(el => {
        if (visible) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

// Update UI based on authentication state
function updateUI() {
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    const signoutBtn = document.getElementById('signout-btn');
    const userName = document.getElementById('user-name');
    const dashboardLink = document.getElementById('dashboard-link');
    
    // Mobile menu elements
    const mobileSigninBtn = document.getElementById('mobile-signin-btn');
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');
    const mobileSignoutBtn = document.getElementById('mobile-signout-btn');
    const mobileDashboardLink = document.getElementById('mobile-dashboard-link');

    const managementNavSelectors = [
        'a[href="management.html"]',
        'a[href="add_videogroup.html"]',
        'a[href="move_video.html"]'
    ];

    if (currentUser && authToken) {
        managementNavSelectors.forEach(sel => setNavLinkVisibility(sel, true));
        // User is logged in
        if (signinBtn) signinBtn.classList.add('hidden');
        if (signupBtn) signupBtn.classList.add('hidden');
        if (signoutBtn) signoutBtn.classList.remove('hidden');
        if (userName) {
            userName.textContent = currentUser.username;
            userName.classList.remove('hidden');
        }
        if (dashboardLink) dashboardLink.classList.remove('hidden');
        
        // Mobile menu
        if (mobileSigninBtn) mobileSigninBtn.classList.add('hidden');
        if (mobileSignupBtn) mobileSignupBtn.classList.add('hidden');
        if (mobileSignoutBtn) mobileSignoutBtn.classList.remove('hidden');
        if (mobileDashboardLink) mobileDashboardLink.classList.remove('hidden');
    } else {
        managementNavSelectors.forEach(sel => setNavLinkVisibility(sel, false));
        // User is not logged in
        if (signinBtn) signinBtn.classList.remove('hidden');
        if (signupBtn) signupBtn.classList.remove('hidden');
        if (signoutBtn) signoutBtn.classList.add('hidden');
        if (userName) userName.classList.add('hidden');
        if (dashboardLink) dashboardLink.classList.add('hidden');
        
        // Mobile menu
        if (mobileSigninBtn) mobileSigninBtn.classList.remove('hidden');
        if (mobileSignupBtn) mobileSignupBtn.classList.remove('hidden');
        if (mobileSignoutBtn) mobileSignoutBtn.classList.add('hidden');
        if (mobileDashboardLink) mobileDashboardLink.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s';
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Export functions for use in other scripts
window.auth = {
    getToken: () => authToken,
    getUser: () => currentUser,
    isAuthenticated: () => !!authToken && !!currentUser,
    getAuthHeaders: getAuthHeaders,
    requireAuth: requireAuth,
    getPrivateVideosUrl: () => currentUser ? `/plain/${encodeURIComponent(currentUser.username)}` : null,
    updateUI: updateUI,
    signout: signOut
};

