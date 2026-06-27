// ============================================================
//  AUTH.JS — Smart Login Flow + User Header Dropdown
// ============================================================

// ── Redirect if already logged in (on login/register pages) ──
if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
    const user = localStorage.getItem('anon_user');
    if (user) window.location.href = '/index.html';
}

// ── Initialize header user button on every page ──
document.addEventListener('DOMContentLoaded', () => {

    // ---------- Header User Dropdown ----------
    initUserDropdown();

    // ---------- Login Page Logic ----------
    initLoginPage();

    // ---------- Register Page Logic ----------
    initRegisterPage();
});

// =============================================================
//  HEADER USER DROPDOWN
// =============================================================
function initUserDropdown() {
    const userBtn = document.getElementById('user-action-btn');
    if (!userBtn) return;

    const user = getLoggedInUser();

    if (user) {
        // Show avatar/name on button
        userBtn.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;">
                <div style="
                    width:32px;height:32px;border-radius:50%;
                    background:linear-gradient(135deg,#e83e8c,#fd7e14);
                    display:flex;align-items:center;justify-content:center;
                    color:#fff;font-weight:700;font-size:13px;
                    flex-shrink:0;
                ">${getInitials(user.fullname || user.email)}</div>
            </div>`;
        userBtn.title = user.fullname || user.email;
    } else {
        userBtn.title = 'Login';
    }

    // Dropdown container
    const dropdown = document.getElementById('user-dropdown');
    if (!dropdown) return;

    if (user) {
        dropdown.innerHTML = `
            <div style="padding:14px 16px;border-bottom:1px solid #f0f0f0;">
                <p style="font-weight:600;font-size:14px;color:#1a1a1a;margin:0;">${user.fullname || 'User'}</p>
                <p style="font-size:12px;color:#888;margin:4px 0 0;">${user.email}</p>
            </div>
            <a href="/account.html" class="user-dropdown-link">
                <ion-icon name="person-outline"></ion-icon> My Account
            </a>
            <a href="/account.html" class="user-dropdown-link">
                <ion-icon name="bag-handle-outline"></ion-icon> My Orders
            </a>
            <div style="border-top:1px solid #f0f0f0;margin-top:4px;padding-top:4px;">
                <button onclick="logout()" class="user-dropdown-link" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;color:#e83e8c;">
                    <ion-icon name="log-out-outline"></ion-icon> Logout
                </button>
            </div>`;
    } else {
        dropdown.innerHTML = `
            <div style="padding:14px 16px;border-bottom:1px solid #f0f0f0;">
                <p style="font-weight:600;font-size:14px;color:#1a1a1a;margin:0;">Hello, Guest</p>
                <p style="font-size:12px;color:#888;margin:4px 0 0;">Login to access your account</p>
            </div>
            <a href="/login.html" class="user-dropdown-link">
                <ion-icon name="log-in-outline"></ion-icon> Login
            </a>
            <a href="/register.html" class="user-dropdown-link">
                <ion-icon name="person-add-outline"></ion-icon> Register
            </a>
            <a href="/track-order.html" class="user-dropdown-link" style="border-top:1px solid #f0f0f0;margin-top:4px;padding-top:4px;">
                <ion-icon name="locate-outline"></ion-icon> Track Order
            </a>`;
    }

    // Toggle show/hide
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => dropdown.classList.remove('show'));
    dropdown.addEventListener('click', e => e.stopPropagation());
}

// =============================================================
//  LOGIN PAGE
// =============================================================
function initLoginPage() {
    const checkEmailBtn = document.getElementById('check-email-btn');
    if (!checkEmailBtn) return;

    let currentEmail = '';

    // Add Enter key listeners for easy submission
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkEmailBtn.click();
            }
        });
    }

    const otpInput = document.getElementById('otp');
    if (otpInput) {
        otpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const verifyBtn = document.getElementById('verify-otp-btn');
                if (verifyBtn) verifyBtn.click();
            }
        });
    }

    const adminPasswordInput = document.getElementById('admin-password');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const verifyBtn = document.getElementById('verify-otp-btn');
                if (verifyBtn) verifyBtn.click();
            }
        });
    }

    // Step 1 → Check Email
    checkEmailBtn.addEventListener('click', async () => {
        const emailInput = document.getElementById('email');
        if (!emailInput || !emailInput.value.trim()) {
            showToast('Please enter a valid email address.');
            return;
        }

        currentEmail = emailInput.value.trim();

        checkEmailBtn.innerText = 'Checking...';
        checkEmailBtn.disabled = true;

        try {
            const res = await fetch('/api/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail })
            });
            const data = await res.json();

            if (data.isAdmin) {
                window.isStaffLogin = true;
                window.staffUsername = data.username;
                document.getElementById('page-title').innerText = 'Admin Portal';
                document.getElementById('page-subtitle').innerText = 'Enter your admin password';
                
                const otpLabel = document.getElementById('step3-label');
                if (otpLabel) otpLabel.innerText = 'Enter Admin Password';
                
                const otpInput = document.getElementById('otp');
                if (otpInput) otpInput.classList.add('hidden');
                
                const adminPasswordInput = document.getElementById('admin-password');
                if (adminPasswordInput) {
                    adminPasswordInput.classList.remove('hidden');
                    adminPasswordInput.value = '';
                    setTimeout(() => adminPasswordInput.focus(), 100);
                }
                
                const verifyBtn = document.getElementById('verify-otp-btn');
                if (verifyBtn) verifyBtn.innerText = 'Verify & Open Admin';
                
                showStep('step-3');
            } else if (data.exists) {
                // Registered user → Send OTP directly!
                showToast('Account found! Sending OTP...');
                
                try {
                    const otpRes = await fetch('/api/send-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: currentEmail })
                    });
                    const otpData = await otpRes.json();
                    if (otpRes.ok) {
                        showToast('OTP sent successfully!');
                        document.getElementById('email-sent-to').innerText = `OTP sent to ${currentEmail}`;
                        
                        // Setup resend text timer
                        const r = document.getElementById('resend-text');
                        if (r) r.classList.add('hidden');
                        setTimeout(() => {
                            const r = document.getElementById('resend-text');
                            if (r) r.classList.remove('hidden');
                        }, 30000);
                        
                        showStep('step-3');
                        
                        // Focus on OTP input
                        const otpInput = document.getElementById('otp');
                        if (otpInput) {
                            otpInput.value = '';
                            setTimeout(() => otpInput.focus(), 150);
                        }
                    } else {
                        showToast(otpData.error || 'Failed to send OTP.');
                    }
                } catch (err) {
                    showToast('Failed to send OTP. Please try again.');
                }
            } else {
                // Not registered → redirect to register page with email pre-filled
                showToast('No account found. Redirecting to register...');
                setTimeout(() => {
                    window.location.href = `/register.html?email=${encodeURIComponent(currentEmail)}`;
                }, 1400);
            }
        } finally {
            checkEmailBtn.disabled = false;
            checkEmailBtn.innerText = 'Continue';
        }
    });

    // Step 2 → Send OTP
    const sendOtpBtn = document.getElementById('send-otp-btn');
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async () => {
            const email = document.getElementById('email').value.trim();
            sendOtpBtn.innerText = 'Sending...';
            sendOtpBtn.disabled = true;

            try {
                const res = await fetch('/api/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast('OTP sent to ' + email);
                    document.getElementById('email-sent-to').innerText = `OTP sent to ${email}`;
                    showStep('step-3');
                    // Show resend after 30s
                    setTimeout(() => {
                        const r = document.getElementById('resend-text');
                        if (r) r.classList.remove('hidden');
                    }, 30000);
                } else {
                    showToast(data.error || 'Failed to send OTP.');
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerText = 'Send OTP';
                }
            } catch {
                showToast('Network error.');
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerText = 'Send OTP';
            }
        });
    }

    // Step 3 → Verify OTP / Password
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const email = document.getElementById('email').value.trim();

            if (window.isStaffLogin) {
                const passwordVal = document.getElementById('admin-password').value.trim();
                if (!passwordVal) {
                    showToast('Please enter your admin password.');
                    return;
                }
                verifyOtpBtn.innerText = 'Verifying...';
                verifyOtpBtn.disabled = true;

                try {
                    const res = await fetch('/api/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: window.staffUsername, password: passwordVal })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        showToast('Admin Login Successful! Redirecting...');
                        setTimeout(() => { window.location.href = '/admin/index.html'; }, 1400);
                    } else {
                        showToast(data.error || 'Invalid admin credentials.');
                        verifyOtpBtn.disabled = false;
                        verifyOtpBtn.innerText = 'Verify & Open Admin';
                    }
                } catch {
                    showToast('Network error.');
                    verifyOtpBtn.disabled = false;
                    verifyOtpBtn.innerText = 'Verify & Open Admin';
                }
                return;
            }

            const otp = document.getElementById('otp').value.trim();
            if (!otp || otp.length !== 6) {
                showToast('Please enter the 6-digit OTP.');
                return;
            }

            verifyOtpBtn.innerText = 'Verifying...';
            verifyOtpBtn.disabled = true;

            try {
                const res = await fetch('/api/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp })
                });
                const data = await res.json();
                if (res.ok && data.user) {
                    localStorage.setItem('anon_user', JSON.stringify(data.user));
                    showToast('Login Successful! Redirecting...');
                    setTimeout(() => { window.location.href = '/index.html'; }, 1400);
                } else {
                    showToast(data.error || 'Invalid OTP.');
                    verifyOtpBtn.disabled = false;
                    verifyOtpBtn.innerText = 'Verify & Login';
                }
            } catch {
                showToast('Network error.');
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.innerText = 'Verify & Login';
            }
        });
    }

    // Back buttons
    const backBtn1 = document.getElementById('back-btn-1');
    if (backBtn1) backBtn1.addEventListener('click', () => showStep('step-1'));

    const backBtn2 = document.getElementById('back-btn-2');
    if (backBtn2) {
        backBtn2.addEventListener('click', () => {
            if (window.isStaffLogin) {
                // Restore original elements
                document.getElementById('page-title').innerText = 'Welcome Back';
                document.getElementById('page-subtitle').innerText = 'Enter your email to continue';
                
                const otpLabel = document.getElementById('step3-label');
                if (otpLabel) otpLabel.innerText = 'Enter 6-Digit OTP';
                
                const otpInput = document.getElementById('otp');
                if (otpInput) {
                    otpInput.classList.remove('hidden');
                    otpInput.value = '';
                }

                const adminPasswordInput = document.getElementById('admin-password');
                if (adminPasswordInput) {
                    adminPasswordInput.classList.add('hidden');
                    adminPasswordInput.value = '';
                }
                
                const verifyBtn = document.getElementById('verify-otp-btn');
                if (verifyBtn) verifyBtn.innerText = 'Verify & Login';
                
                window.isStaffLogin = false;
                window.staffUsername = null;
                showStep('step-1');
            } else {
                showStep('step-2');
            }
        });
    }
}

function showStep(stepId) {
    ['step-1', 'step-2', 'step-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(stepId);
    if (target) target.classList.remove('hidden');
}

async function resendOtp() {
    const email = document.getElementById('email')?.value.trim();
    if (!email) return;

    try {
        const res = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            showToast('OTP resent to ' + email);
            document.getElementById('resend-text')?.classList.add('hidden');
        }
    } catch {
        showToast('Failed to resend OTP.');
    }
}

// =============================================================
//  REGISTER PAGE
// =============================================================
function initRegisterPage() {
    const sendOtpBtn = document.getElementById('send-otp-btn');
    if (!sendOtpBtn || !document.getElementById('fullname')) return; // not on register page

    // Pre-fill email from URL param
    const params = new URLSearchParams(window.location.search);
    const preEmail = params.get('email');
    if (preEmail) {
        const emailEl = document.getElementById('email');
        if (emailEl) emailEl.value = preEmail;
    }

    sendOtpBtn.addEventListener('click', async () => {
        const email = document.getElementById('email')?.value.trim();
        const fullname = document.getElementById('fullname')?.value.trim();

        if (!fullname) { showToast('Please enter your full name.'); return; }
        if (!email) { showToast('Please enter a valid email.'); return; }

        sendOtpBtn.innerText = 'Sending...';
        sendOtpBtn.disabled = true;

        try {
            const res = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('OTP sent to ' + email);
                document.getElementById('step-1').classList.add('hidden');
                document.getElementById('step-2').classList.remove('hidden');
                document.getElementById('email-sent-to').innerText = `OTP sent to ${email}`;
            } else {
                showToast(data.error || 'Failed to send OTP.');
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerText = 'Send Verification OTP';
            }
        } catch {
            showToast('Network error.');
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerText = 'Send Verification OTP';
        }
    });

    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const email = document.getElementById('email')?.value.trim();
            const otp = document.getElementById('otp')?.value.trim();
            const fullname = document.getElementById('fullname')?.value.trim();

            if (!otp || otp.length !== 6) { showToast('Enter the 6-digit OTP.'); return; }

            verifyOtpBtn.innerText = 'Verifying...';
            verifyOtpBtn.disabled = true;

            try {
                const res = await fetch('/api/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp, fullname })
                });
                const data = await res.json();
                if (res.ok && data.user) {
                    localStorage.setItem('anon_user', JSON.stringify(data.user));
                    showToast('Registration Successful! Redirecting...');
                    setTimeout(() => { window.location.href = '/index.html'; }, 1400);
                } else {
                    showToast(data.error || 'Invalid OTP.');
                    verifyOtpBtn.disabled = false;
                    verifyOtpBtn.innerText = 'Verify & Register';
                }
            } catch {
                showToast('Network error.');
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.innerText = 'Verify & Register';
            }
        });
    }
}

// =============================================================
//  HELPERS
// =============================================================
function getLoggedInUser() {
    try { return JSON.parse(localStorage.getItem('anon_user')); } catch { return null; }
}

function logout() {
    localStorage.removeItem('anon_user');
    window.location.href = '/index.html';
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if (!toast) return alert(message);
    toastMsg.innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 4000);
}
