document.addEventListener('DOMContentLoaded', () => {
    // Ambient Mouse Light Tracking Effect
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    });

    // Dynamic Salutation based on current time
    const hour = new Date().getHours();
    let salutation = 'Good morning';
    if (hour >= 12 && hour < 17) salutation = 'Good afternoon';
    else if (hour >= 17) salutation = 'Good evening';
    
    const salutationEl = document.getElementById('salutation');
    if (salutationEl) {
        salutationEl.textContent = salutation;
    }

    // Remember Username functionality
    const savedEmail = localStorage.getItem('crainee_saved_email');
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('remember');
    if (savedEmail && emailInput && rememberCheckbox) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }

    // Password Visibility Toggles
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePasswordBtn.textContent = type === 'password' ? 'Show' : 'Hide';
        });
    }

    const toggleRegPasswordBtn = document.getElementById('toggleRegPassword');
    const regPasswordInput = document.getElementById('regPassword');
    if (toggleRegPasswordBtn && regPasswordInput) {
        toggleRegPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = regPasswordInput.type === 'password' ? 'text' : 'password';
            regPasswordInput.type = type;
            toggleRegPasswordBtn.textContent = type === 'password' ? 'Show' : 'Hide';
        });
    }

    // Form Toggle Switching (Login <-> Register)
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const formSubtitle = document.getElementById('formSubtitle');

    const switchModeRegister = document.getElementById('switchModeRegister');
    if (switchModeRegister) {
        switchModeRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';
            if (formSubtitle) formSubtitle.textContent = 'Register to create your secure trading profile';
        });
    }

    const switchModeLogin = document.getElementById('switchModeLogin');
    if (switchModeLogin) {
        switchModeLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
            if (formSubtitle) formSubtitle.textContent = 'Sign on to access your secure trading dashboard';
        });
    }

    // Toast Notifications System
    function showToast(message) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Login Form Submission Handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const remember = rememberCheckbox ? rememberCheckbox.checked : false;
            const errorEl = document.getElementById('password-error');

            if (errorEl) errorEl.textContent = '';
            if (!email) {
                const emailErr = document.getElementById('email-error');
                if (emailErr) emailErr.textContent = 'Email is required.';
                return;
            }
            if (!password) {
                if (errorEl) errorEl.textContent = 'Password is required.';
                return;
            }

            if (remember) {
                localStorage.setItem('crainee_saved_email', email);
            } else {
                localStorage.removeItem('crainee_saved_email');
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('crainee_token', data.token);
                    showToast('Authentication successful. Redirecting...');
                    setTimeout(() => {
                        window.location.href = data.redirect || '/dashboard';
                    }, 800);
                } else {
                    if (errorEl) errorEl.textContent = data.error || 'Invalid login credentials.';
                }
            } catch (err) {
                console.error('Login error:', err);
                if (errorEl) errorEl.textContent = 'A network error occurred. Please try again.';
            }
        });
    }

    // Register Form Submission Handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('regFullName')?.value.trim() || '';
            const email = document.getElementById('regEmail')?.value.trim() || '';
            const password = document.getElementById('regPassword')?.value || '';
            const errorEl = document.getElementById('reg-password-error');

            if (!fullName) {
                const nameErr = document.getElementById('reg-name-error');
                if (nameErr) nameErr.textContent = 'Name required.';
                return;
            }
            if (!email) {
                const emailErr = document.getElementById('reg-email-error');
                if (emailErr) emailErr.textContent = 'Email required.';
                return;
            }
            if (!password) {
                if (errorEl) errorEl.textContent = 'Password required.';
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, password })
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('crainee_token', data.token);
                    showToast('Account created successfully. Redirecting...');
                    setTimeout(() => {
                        window.location.href = data.redirect || '/dashboard';
                    }, 800);
                } else {
                    if (errorEl) errorEl.textContent = data.error || 'Registration failed.';
                }
            } catch (err) {
                console.error('Registration error:', err);
                if (errorEl) errorEl.textContent = 'A network error occurred. Please try again.';
            }
        });
    }

    // Logout Handler (if present on dashboard page)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('crainee_token');
            showToast('Signed out successfully.');
            setTimeout(() => {
                window.location.href = '/';
            }, 600);
        });
    }

    // Mobile Sidebar Drawer Controls (for Dashboard view)
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const backdrop = document.getElementById('sidebarBackdrop');

    function toggleSidebar() {
        if (sidebar) sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('show');
    }

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', toggleSidebar);
    if (backdrop) backdrop.addEventListener('click', toggleSidebar);
});
