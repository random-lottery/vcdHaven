// Dashboard functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated
    if (!window.auth || !window.auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    await loadUserProfile();
    setupEventListeners();
});

// Load user profile data
async function loadUserProfile() {
    const token = window.auth.getToken();
    
    try {
        const response = await fetch('/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const user = await response.json();
            displayUserInfo(user);
            populateForms(user);
        } else {
            if (response.status === 401) {
                // Token expired or invalid
                window.auth.signout();
                window.location.href = 'index.html';
            } else {
                showError('加载用户信息失败');
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('网络错误，请稍后重试');
    }
}

// Display user information
function displayUserInfo(user) {
    document.getElementById('display-username').textContent = user.username || '-';
    document.getElementById('display-email').textContent = user.email || '-';
    document.getElementById('display-phone').textContent = user.phone_number || '-';
    document.getElementById('display-status').textContent = user.status === 'active' ? '活跃' : '未激活';
    document.getElementById('display-roles').textContent = user.roles ? user.roles.join(', ') : '-';
    
    if (user.last_login_at) {
        const date = new Date(user.last_login_at);
        document.getElementById('display-last-login').textContent = date.toLocaleString('zh-CN');
    } else {
        document.getElementById('display-last-login').textContent = '从未登录';
    }
}

// Populate forms with user data
function populateForms(user) {
    // Profile form
    if (user.profile) {
        document.getElementById('profile-first-name').value = user.profile.first_name || '';
        document.getElementById('profile-last-name').value = user.profile.last_name || '';
        document.getElementById('profile-phone').value = user.phone_number || '';
        document.getElementById('profile-language').value = user.profile.language || 'en-US';
        document.getElementById('profile-avatar').value = user.profile.avatar_url || '';
    }

    // Address form
    if (user.profile && user.profile.contact_address) {
        const addr = user.profile.contact_address;
        document.getElementById('address-street').value = addr.street || '';
        document.getElementById('address-city').value = addr.city || '';
        document.getElementById('address-state').value = addr.state || '';
        document.getElementById('address-zip').value = addr.zip_code || '';
        document.getElementById('address-country').value = addr.country || '';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Profile form
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });

    // Address form
    const addressForm = document.getElementById('address-form');
    addressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateAddress();
    });

    // Password form
    const passwordForm = document.getElementById('password-form');
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await changePassword();
    });

    // Sign out button
    const signoutBtn = document.getElementById('signout-btn');
    signoutBtn.addEventListener('click', async () => {
        await signOut();
    });
}

// Update profile
async function updateProfile() {
    const token = window.auth.getToken();
    const errorDiv = document.getElementById('profile-error');
    const successDiv = document.getElementById('profile-success');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const profileData = {
        profile: {
            first_name: document.getElementById('profile-first-name').value,
            last_name: document.getElementById('profile-last-name').value,
            language: document.getElementById('profile-language').value,
            avatar_url: document.getElementById('profile-avatar').value
        },
        phone_number: document.getElementById('profile-phone').value || null
    };

    try {
        const response = await fetch('/user/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.textContent = '个人资料更新成功！';
            successDiv.classList.remove('hidden');
            await loadUserProfile(); // Reload to show updated data
        } else {
            errorDiv.textContent = data.error || '更新失败，请重试';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = '网络错误，请稍后重试';
        errorDiv.classList.remove('hidden');
    }
}

// Update address
async function updateAddress() {
    const token = window.auth.getToken();
    const errorDiv = document.getElementById('address-error');
    const successDiv = document.getElementById('address-success');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const addressData = {
        profile: {
            contact_address: {
                street: document.getElementById('address-street').value || null,
                city: document.getElementById('address-city').value || null,
                state: document.getElementById('address-state').value || null,
                zip_code: document.getElementById('address-zip').value || null,
                country: document.getElementById('address-country').value || null
            }
        }
    };

    try {
        const response = await fetch('/user/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.textContent = '地址更新成功！';
            successDiv.classList.remove('hidden');
        } else {
            errorDiv.textContent = data.error || '更新失败，请重试';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = '网络错误，请稍后重试';
        errorDiv.classList.remove('hidden');
    }
}

// Change password
async function changePassword() {
    const token = window.auth.getToken();
    const errorDiv = document.getElementById('password-error');
    const successDiv = document.getElementById('password-success');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validation
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = '新密码和确认密码不匹配';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (newPassword.length < 6) {
        errorDiv.textContent = '密码至少需要6个字符';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/user/change-password', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.textContent = '密码修改成功！';
            successDiv.classList.remove('hidden');
            document.getElementById('password-form').reset();
        } else {
            errorDiv.textContent = data.error || '密码修改失败，请检查当前密码';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = '网络错误，请稍后重试';
        errorDiv.classList.remove('hidden');
    }
}

// Sign out
async function signOut() {
    const token = window.auth.getToken();
    
    try {
        await fetch('/signout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Sign out error:', error);
    }

    // Clear local storage and redirect
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Show error message
function showError(message) {
    alert(message);
}

