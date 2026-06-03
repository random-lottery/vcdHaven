// Authentication state management
let currentUser = null;
let authToken = null;

// Pages that require login (video management)
const PROTECTED_PAGES = [
    'management.html',
    'move_video.html',
    'add_videogroup.html'
];

const MOBILE_AUTH_BTN =
    'text-gray-300 hover:text-white block w-full text-left px-3 py-3 rounded-md text-base font-medium min-h-[44px]';

function isProtectedPage() {
    const path = window.location.pathname;
    return PROTECTED_PAGES.some(page => path.endsWith(page));
}

function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
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

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function setAuth(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'currentUser=; path=/; max-age=0; SameSite=Lax';
}

/** Inject sign-in / sign-up modals when page has nav but no modals (e.g. management on mobile). */
function injectAuthModals() {
    if (document.getElementById('signin-modal')) return;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div id="signin-modal" class="fixed inset-0 z-[100] hidden items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 overscroll-contain" aria-hidden="true" role="dialog" aria-labelledby="signin-modal-title">
        <div class="auth-modal-panel bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto mx-0 sm:mx-4 pb-[env(safe-area-inset-bottom)]">
            <div class="p-5 sm:p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 id="signin-modal-title" class="text-xl sm:text-2xl font-bold text-gray-800">登录</h2>
                    <button type="button" id="close-signin" class="text-gray-500 hover:text-gray-700 p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="关闭">
                        <i class="fa fa-times text-xl"></i>
                    </button>
                </div>
                <form id="signin-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">用户名或邮箱</label>
                        <input type="text" id="signin-username" autocomplete="username" class="auth-input w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
                        <input type="password" id="signin-password" autocomplete="current-password" class="auth-input w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div id="signin-error" class="text-red-500 text-sm hidden"></div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 sm:py-2 px-4 rounded-md min-h-[44px]">登录</button>
                </form>
            </div>
        </div>
    </div>
    <div id="signup-modal" class="fixed inset-0 z-[100] hidden items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 overscroll-contain" aria-hidden="true" role="dialog" aria-labelledby="signup-modal-title">
        <div class="auth-modal-panel bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto mx-0 sm:mx-4 pb-[env(safe-area-inset-bottom)]">
            <div class="p-5 sm:p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 id="signup-modal-title" class="text-xl sm:text-2xl font-bold text-gray-800">注册</h2>
                    <button type="button" id="close-signup" class="text-gray-500 hover:text-gray-700 p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="关闭">
                        <i class="fa fa-times text-xl"></i>
                    </button>
                </div>
                <form id="signup-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                        <input type="text" id="signup-username" autocomplete="username" class="auth-input w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                        <input type="email" id="signup-email" autocomplete="email" class="auth-input w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
                        <input type="password" id="signup-password" autocomplete="new-password" class="auth-input w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500" required minlength="6">
                        <p class="text-xs text-gray-500 mt-1">密码至少6个字符</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">手机号 (可选)</label>
                        <input type="tel" id="signup-phone" autocomplete="tel" class="auth-input w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div id="signup-error" class="text-red-500 text-sm hidden"></div>
                    <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 sm:py-2 px-4 rounded-md min-h-[44px]">注册</button>
                </form>
            </div>
        </div>
    </div>`;
    document.body.appendChild(wrap);
    document.querySelectorAll('#signin-modal, #signup-modal').forEach(el => {
        el.classList.add('flex');
    });
}

/** Add mobile nav auth controls when shell exists but buttons are missing. */
function injectMobileAuthControls() {
    const container = document.getElementById('mobile-user-auth');
    if (!container) return;

    const pieces = [];
    if (!document.getElementById('mobile-user-name')) {
        pieces.push(`<p id="mobile-user-name" class="text-gray-400 text-sm px-3 py-2 hidden"></p>`);
    }
    if (!document.getElementById('mobile-dashboard-link')) {
        pieces.push(`<a href="dashboard.html" id="mobile-dashboard-link" class="${MOBILE_AUTH_BTN} hidden"><i class="fa fa-user-circle mr-2"></i>仪表板</a>`);
    }
    if (!document.getElementById('mobile-signin-btn')) {
        pieces.push(`<button type="button" id="mobile-signin-btn" class="${MOBILE_AUTH_BTN}"><i class="fa fa-sign-in-alt mr-2"></i>登录</button>`);
    }
    if (!document.getElementById('mobile-signup-btn')) {
        pieces.push(`<button type="button" id="mobile-signup-btn" class="${MOBILE_AUTH_BTN}"><i class="fa fa-user-plus mr-2"></i>注册</button>`);
    }
    if (!document.getElementById('mobile-signout-btn')) {
        pieces.push(`<button type="button" id="mobile-signout-btn" class="${MOBILE_AUTH_BTN} hidden"><i class="fa fa-sign-out-alt mr-2"></i>退出</button>`);
    }
    if (!pieces.length) return;

    const fragment = document.createElement('div');
    fragment.innerHTML = pieces.join('');
    while (fragment.firstChild) {
        container.insertBefore(fragment.firstChild, container.firstChild);
    }
}

function lockBodyScroll(lock) {
    if (lock) {
        document.body.dataset.authScrollLock = '1';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
    } else if (document.body.dataset.authScrollLock === '1') {
        delete document.body.dataset.authScrollLock;
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
    }
}

function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    lockBodyScroll(true);
    closeMobileMenu();
    const firstInput = modal.querySelector('input:not([type="hidden"])');
    if (firstInput) {
        requestAnimationFrame(() => firstInput.focus());
    }
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    const signinOpen = document.getElementById('signin-modal') && !document.getElementById('signin-modal').classList.contains('hidden');
    const signupOpen = document.getElementById('signup-modal') && !document.getElementById('signup-modal').classList.contains('hidden');
    if (!signinOpen && !signupOpen) {
        lockBodyScroll(false);
    }
}

function openSigninModal() {
    openModal(document.getElementById('signin-modal'));
}

function openSignupModal() {
    openModal(document.getElementById('signup-modal'));
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    if (mobileMenu) {
        mobileMenu.classList.add('hidden');
    }
    if (mobileMenuButton) {
        mobileMenuButton.setAttribute('aria-expanded', 'false');
        const icon = mobileMenuButton.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    if (!mobileMenu || !mobileMenuButton) return;

    const willOpen = mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden');
    mobileMenuButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    const icon = mobileMenuButton.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-bars', !willOpen);
        icon.classList.toggle('fa-times', willOpen);
    }
    if (willOpen) {
        lockBodyScroll(true);
    } else if (!isAnyModalOpen()) {
        lockBodyScroll(false);
    }
}

function isAnyModalOpen() {
    const signin = document.getElementById('signin-modal');
    const signup = document.getElementById('signup-modal');
    return (signin && !signin.classList.contains('hidden')) ||
           (signup && !signup.classList.contains('hidden'));
}

function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenuButton || !mobileMenu) return;

    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenuButton.setAttribute('aria-controls', 'mobile-menu');
    mobileMenuButton.setAttribute('aria-label', '打开菜单');

    mobileMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMobileMenu();
    });

    mobileMenu.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', () => closeMobileMenu());
    });

    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('hidden')) return;
        if (!mobileMenu.contains(e.target) && !mobileMenuButton.contains(e.target)) {
            closeMobileMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
            closeModal(document.getElementById('signin-modal'));
            closeModal(document.getElementById('signup-modal'));
        }
    });

    window.addEventListener('resize', () => {
        if (!isMobileViewport() && !mobileMenu.classList.contains('hidden')) {
            closeMobileMenu();
        }
    });
}

function upgradeExistingModalsForMobile() {
    ['signin-modal', 'signup-modal'].forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('flex', 'items-end', 'sm:items-center', 'justify-center', 'p-0', 'sm:p-4', 'overscroll-contain', 'z-[100]');
        modal.classList.remove('items-center');
        const panel = modal.querySelector('.bg-white');
        if (panel && !panel.classList.contains('auth-modal-panel')) {
            panel.classList.add('auth-modal-panel', 'rounded-t-2xl', 'sm:rounded-lg', 'w-full', 'sm:max-w-md', 'max-h-[92vh]', 'overflow-y-auto', 'pb-[env(safe-area-inset-bottom)]');
            panel.classList.remove('max-w-md');
        }
        modal.querySelectorAll('input.auth-input, input#signin-username, input#signin-password, input#signup-username, input#signup-email, input#signup-password, input#signup-phone').forEach(inp => {
            inp.classList.add('text-base', 'py-3', 'sm:py-2');
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    authToken = localStorage.getItem('authToken') || getCookie('authToken');
    const storedUser = localStorage.getItem('currentUser') || getCookie('currentUser');
    try {
        currentUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (_) {
        currentUser = null;
    }

    injectAuthModals();
    injectMobileAuthControls();
    upgradeExistingModalsForMobile();

    if (isProtectedPage() && !requireAuth()) {
        return;
    }

    updateUI();
    setupEventListeners();
    setupMobileMenu();

    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect') && !authToken) {
        openSigninModal();
    }
});

function setupEventListeners() {
    const signinBtn = document.getElementById('signin-btn');
    const signinModal = document.getElementById('signin-modal');
    const closeSignin = document.getElementById('close-signin');
    const signinForm = document.getElementById('signin-form');

    if (signinBtn) {
        signinBtn.addEventListener('click', () => openSigninModal());
    }

    if (closeSignin) {
        closeSignin.addEventListener('click', () => closeModal(signinModal));
    }

    if (signinModal) {
        signinModal.addEventListener('click', (e) => {
            if (e.target === signinModal) closeModal(signinModal);
        });
    }

    const signupBtn = document.getElementById('signup-btn');
    const signupModal = document.getElementById('signup-modal');
    const closeSignup = document.getElementById('close-signup');
    const signupForm = document.getElementById('signup-form');

    if (signupBtn) {
        signupBtn.addEventListener('click', () => openSignupModal());
    }

    if (closeSignup) {
        closeSignup.addEventListener('click', () => closeModal(signupModal));
    }

    if (signupModal) {
        signupModal.addEventListener('click', (e) => {
            if (e.target === signupModal) closeModal(signupModal);
        });
    }

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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    setAuth(data.token, data.user);
                    closeModal(signinModal);
                    signinForm.reset();
                    updateUI();
                    showNotification('登录成功！', 'success');

                    const redirect = new URLSearchParams(window.location.search).get('redirect');
                    if (redirect) {
                        window.location.href = redirect;
                        return;
                    }
                } else {
                    errorDiv.textContent = data.error || '登录失败，请检查用户名和密码';
                    errorDiv.classList.remove('hidden');
                }
            } catch (_) {
                errorDiv.textContent = '网络错误，请稍后重试';
                errorDiv.classList.remove('hidden');
            }
        });
    }

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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        phone_number: phone || null
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    closeModal(signupModal);
                    signupForm.reset();
                    showNotification('注册成功！请登录', 'success');
                    setTimeout(() => openSigninModal(), 500);
                } else {
                    errorDiv.textContent = data.error || '注册失败，请检查输入信息';
                    errorDiv.classList.remove('hidden');
                }
            } catch (_) {
                errorDiv.textContent = '网络错误，请稍后重试';
                errorDiv.classList.remove('hidden');
            }
        });
    }

    const signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => signOut());
    }

    const mobileSignoutBtn = document.getElementById('mobile-signout-btn');
    if (mobileSignoutBtn) {
        mobileSignoutBtn.addEventListener('click', () => signOut());
    }

    const mobileSigninBtn = document.getElementById('mobile-signin-btn');
    if (mobileSigninBtn) {
        mobileSigninBtn.addEventListener('click', () => openSigninModal());
    }

    const mobileSignupBtn = document.getElementById('mobile-signup-btn');
    if (mobileSignupBtn) {
        mobileSignupBtn.addEventListener('click', () => openSignupModal());
    }
}

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

    if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
}

function setNavLinkVisibility(selector, visible) {
    document.querySelectorAll(selector).forEach(el => {
        if (visible) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

function updateUI() {
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    const signoutBtn = document.getElementById('signout-btn');
    const userName = document.getElementById('user-name');
    const dashboardLink = document.getElementById('dashboard-link');

    const mobileSigninBtn = document.getElementById('mobile-signin-btn');
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');
    const mobileSignoutBtn = document.getElementById('mobile-signout-btn');
    const mobileDashboardLink = document.getElementById('mobile-dashboard-link');
    const mobileUserName = document.getElementById('mobile-user-name');

    const managementNavSelectors = [
        'a[href="management.html"]',
        'a[href="add_videogroup.html"]',
        'a[href="move_video.html"]'
    ];

    if (currentUser && authToken) {
        managementNavSelectors.forEach(sel => setNavLinkVisibility(sel, true));
        if (signinBtn) signinBtn.classList.add('hidden');
        if (signupBtn) signupBtn.classList.add('hidden');
        if (signoutBtn) signoutBtn.classList.remove('hidden');
        if (userName) {
            userName.textContent = currentUser.username;
            userName.classList.remove('hidden');
        }
        if (dashboardLink) dashboardLink.classList.remove('hidden');
        if (mobileSigninBtn) mobileSigninBtn.classList.add('hidden');
        if (mobileSignupBtn) mobileSignupBtn.classList.add('hidden');
        if (mobileSignoutBtn) mobileSignoutBtn.classList.remove('hidden');
        if (mobileDashboardLink) mobileDashboardLink.classList.remove('hidden');
        if (mobileUserName) {
            mobileUserName.textContent = `已登录: ${currentUser.username}`;
            mobileUserName.classList.remove('hidden');
        }
    } else {
        managementNavSelectors.forEach(sel => setNavLinkVisibility(sel, false));
        if (signinBtn) signinBtn.classList.remove('hidden');
        if (signupBtn) signupBtn.classList.remove('hidden');
        if (signoutBtn) signoutBtn.classList.add('hidden');
        if (userName) userName.classList.add('hidden');
        if (dashboardLink) dashboardLink.classList.add('hidden');
        if (mobileSigninBtn) mobileSigninBtn.classList.remove('hidden');
        if (mobileSignupBtn) mobileSignupBtn.classList.remove('hidden');
        if (mobileSignoutBtn) mobileSignoutBtn.classList.add('hidden');
        if (mobileDashboardLink) mobileDashboardLink.classList.add('hidden');
        if (mobileUserName) mobileUserName.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed z-[110] px-4 py-3 rounded-lg shadow-lg text-white text-sm sm:text-base max-w-[calc(100vw-2rem)] left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm top-4 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    }`;
    notification.setAttribute('role', 'status');
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

window.auth = {
    getToken: () => authToken,
    getUser: () => currentUser,
    isAuthenticated: () => !!authToken && !!currentUser,
    getAuthHeaders: getAuthHeaders,
    requireAuth: requireAuth,
    getPrivateVideosUrl: () => currentUser ? `/plain/${encodeURIComponent(currentUser.username)}` : null,
    updateUI: updateUI,
    signout: signOut,
    openSigninModal,
    openSignupModal,
    closeMobileMenu
};
