// Authentication Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // Tab switching functionality
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and forms
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding form
            this.classList.add('active');
            document.getElementById(`${targetTab}-form`).classList.add('active');
            
            // Clear any error messages
            const errorDiv = document.querySelector('.auth-error');
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
            
            // Clear form fields
            const activeForm = document.getElementById(`${targetTab}-form`);
            if (activeForm) {
                activeForm.reset();
            }
            
            // Update URL without page reload
            const newUrl = targetTab === 'login' ? '/login' : '/signup';
            history.pushState(null, '', newUrl);
        });
    });
    
    
    // Form validation
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
                return false;
            }
            
            // Add loading state to submit button
            const submitBtn = this.querySelector('.auth-submit');
            if (submitBtn) {
                addLoadingState(submitBtn);
            }
        });
    });
    
    function validateForm(form) {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                showInputError(input, 'This field is required');
                isValid = false;
            } else if (input.type === 'email' && !isValidEmail(input.value)) {
                showInputError(input, 'Please enter a valid email address');
                isValid = false;
            } else if (input.name === 'password' && input.value.length < 6) {
                showInputError(input, 'Password must be at least 6 characters long');
                isValid = false;
            } else {
                clearInputError(input);
            }
        });
        
        
        return isValid;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showInputError(input, message) {
        clearInputError(input);
        
        input.style.borderColor = '#ef4444';
        input.style.background = 'rgba(239, 68, 68, 0.05)';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.cssText = `
            color: #ef4444;
            font-size: 0.8rem;
            margin-top: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        `;
        
        input.parentElement.appendChild(errorDiv);
        
        // Clear error on focus
        input.addEventListener('focus', () => clearInputError(input), { once: true });
    }
    
    function clearInputError(input) {
        input.style.borderColor = '';
        input.style.background = '';
        
        const existingError = input.parentElement.querySelector('.input-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    function showFormError(message) {
        let errorDiv = document.querySelector('.auth-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'auth-error';
            
            const formContainer = document.querySelector('.auth-form.active');
            formContainer.insertBefore(errorDiv, formContainer.firstChild);
        }
        
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        errorDiv.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 5000);
    }
    
    function addLoadingState(button) {
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...';
        button.disabled = true;
        
        // Reset after 10 seconds (in case of no response)
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.disabled = false;
        }, 10000);
    }
    
    // Social authentication handlers (placeholder)
    const socialButtons = document.querySelectorAll('.social-btn');
    socialButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const provider = this.classList.contains('google') ? 'Google' : 'GitHub';
            showNotification(`${provider} authentication coming soon!`, 'info');
        });
    });
    
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'info'}-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'success' ? 'var(--primary-gradient)' : 'rgba(59, 130, 246, 0.9)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            box-shadow: var(--shadow-medium);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Auto-fill demo credentials function (global)
    window.fillDemoCredentials = function() {
        // Switch to login tab if not already active
        const loginTab = document.querySelector('[data-tab="login"]');
        if (!loginTab.classList.contains('active')) {
            loginTab.click();
        }
        
        // Wait for tab switch animation
        setTimeout(() => {
            document.getElementById('login-email').value = 'demo@genforge.com';
            document.getElementById('login-password').value = 'secret';
            
            // Add visual feedback
            const demoBtn = document.querySelector('.btn-demo');
            if (demoBtn) {
                demoBtn.innerHTML = '<i class="fas fa-check"></i> Filled!';
                demoBtn.style.background = 'rgba(34, 197, 94, 0.2)';
                demoBtn.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                demoBtn.style.color = '#22c55e';
                
                setTimeout(() => {
                    demoBtn.innerHTML = 'Fill Demo Data';
                    demoBtn.style.background = 'rgba(59, 130, 246, 0.2)';
                    demoBtn.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    demoBtn.style.color = '#60a5fa';
                }, 2000);
            }
        }, 300);
    };
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', function() {
        const path = window.location.pathname;
        const targetTab = path === '/signup' ? 'signup' : 'login';
        const targetTabButton = document.querySelector(`[data-tab="${targetTab}"]`);
        
        if (targetTabButton && !targetTabButton.classList.contains('active')) {
            targetTabButton.click();
        }
    });
    
    // Add notification styles dynamically
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(notificationStyles);
    
    // Console message for developers
    console.log(`
    🔐 GenForge Authentication System
    
    Demo Credentials:
    Email: demo@genforge.com
    Password: secret
    
    Click the "Fill Demo Data" button for quick testing!
    `);
});