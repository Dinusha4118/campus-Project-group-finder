document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    
    // Dashboard sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Create group modal
    const createGroupBtn = document.getElementById('createGroupBtn');
    const createGroupModal = document.getElementById('createGroupModal');
    const cancelGroupBtn = document.getElementById('cancelGroupBtn');
    const modalClose = document.querySelector('.modal-close');
    
    if (createGroupBtn && createGroupModal) {
        createGroupBtn.addEventListener('click', function() {
            createGroupModal.classList.add('active');
        });
    }
    
    if (cancelGroupBtn && createGroupModal) {
        cancelGroupBtn.addEventListener('click', function() {
            createGroupModal.classList.remove('active');
        });
    }
    
    if (modalClose && createGroupModal) {
        modalClose.addEventListener('click', function() {
            createGroupModal.classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === createGroupModal) {
            createGroupModal.classList.remove('active');
        }
    });
    
    // Group filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            // Here you would filter groups based on the selected tab
        });
    });
    
    // FAQ accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            faqItem.classList.toggle('active');
        });
    });
    
    // Password strength indicator
    const passwordInput = document.getElementById('registerPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput && strengthBar && strengthText) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            // Check for length
            if (password.length >= 8) strength += 1;
            if (password.length >= 12) strength += 1;
            
            // Check for uppercase letters
            if (/[A-Z]/.test(password)) strength += 1;
            
            // Check for numbers
            if (/[0-9]/.test(password)) strength += 1;
            
            // Check for special characters
            if (/[^A-Za-z0-9]/.test(password)) strength += 1;
            
            // Update strength bar and text
            let width = 0;
            let text = '';
            let color = '';
            
            if (strength <= 1) {
                width = 25;
                text = 'Weak';
                color = 'var(--danger-color)';
            } else if (strength <= 3) {
                width = 50;
                text = 'Medium';
                color = 'var(--warning-color)';
            } else if (strength <= 4) {
                width = 75;
                text = 'Strong';
                color = 'var(--success-color)';
            } else {
                width = 100;
                text = 'Very Strong';
                color = 'var(--primary-color)';
            }
            
            strengthBar.style.width = `${width}%`;
            strengthBar.style.backgroundColor = color;
            strengthText.textContent = text;
            strengthText.style.color = color;
        });
    }

    
    // Toggle password visibility
    const passwordToggles = document.querySelectorAll('.password-toggle');
    
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Auth tabs
    const authTabs = document.querySelectorAll('.auth-tab');
    const authContents = document.querySelectorAll('.auth-content');
    
    if (authTabs.length && authContents.length) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                authTabs.forEach(t => t.classList.remove('active'));
                authContents.forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(tabName).classList.add('active');
            });
        });
    }
    
    // Preview group avatar
    const groupAvatarInput = document.getElementById('groupAvatar');
    const groupAvatarPreview = document.getElementById('groupAvatarPreview');
    
    if (groupAvatarInput && groupAvatarPreview) {
        groupAvatarInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    groupAvatarPreview.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }
});