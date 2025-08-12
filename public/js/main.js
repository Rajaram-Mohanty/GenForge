// GenForge Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(15, 23, 42, 0.98)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
        }
    });
    
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);
    
    // Observe feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach(item => {
        item.style.animationPlayState = 'paused';
        observer.observe(item);
    });
    
    // Template card interaction
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all cards
            templateCards.forEach(c => c.classList.remove('active'));
            // Add active class to clicked card
            this.classList.add('active');
            
            // Update preview content based on selection
            const templateType = this.querySelector('span').textContent;
            updateTemplatePreview(templateType);
        });
    });
    
    function updateTemplatePreview(templateType) {
        const previewHeader = document.querySelector('.preview-header');
        const previewLines = document.querySelectorAll('.preview-line');
        
        if (previewHeader) {
            previewHeader.textContent = `${templateType} Template`;
        }
        
        // Animate the preview lines
        previewLines.forEach((line, index) => {
            line.style.opacity = '0';
            setTimeout(() => {
                line.style.opacity = '1';
            }, index * 100);
        });
    }
    
    // Code typing animation restart
    function restartCodeAnimation() {
        const codeLines = document.querySelectorAll('.code-line');
        codeLines.forEach((line, index) => {
            line.style.animation = 'none';
            setTimeout(() => {
                line.style.animation = `typewriter 0.5s ease forwards`;
                line.style.animationDelay = `${index * 0.5}s`;
            }, 100);
        });
    }
    
    // Restart code animation every 10 seconds
    setInterval(restartCodeAnimation, 10000);
    
    // Button hover effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            if (!this.classList.contains('btn-outline')) {
                this.style.transform = 'translateY(0)';
            }
        });
    });
    
    // Deploy option hover effects
    const deployOptions = document.querySelectorAll('.deploy-option');
    deployOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'translateY(-2px)';
            }, 150);
            
            // Show deployment feedback (placeholder)
            const platformName = this.querySelector('span').textContent;
            showDeploymentFeedback(platformName);
        });
    });
    
    function showDeploymentFeedback(platform) {
        // Create and show a temporary notification
        const notification = document.createElement('div');
        notification.className = 'deployment-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-rocket"></i>
                <span>Deploying to ${platform}...</span>
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Progress bar animation restart
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        setInterval(() => {
            progressFill.style.animation = 'none';
            setTimeout(() => {
                progressFill.style.animation = 'progress 3s ease-in-out infinite';
            }, 100);
        }, 3000);
    }
    
    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual) {
            const rate = scrolled * -0.5;
            heroVisual.style.transform = `translateY(${rate}px)`;
        }
    });
    
    // Add CSS for animations that need to be added dynamically
    const style = document.createElement('style');
    style.textContent = `
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
        
        .deployment-notification {
            font-weight: 600;
        }
        
        .deployment-notification .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .deployment-notification i {
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Console welcome message
    console.log(`
    ╔═══════════════════════════════════════╗
    ║              🚀 GenForge              ║
    ║        AI-Powered Development         ║
    ║                                       ║
    ║  Ready to transform your ideas into   ║
    ║  fully functional applications!       ║
    ╚═══════════════════════════════════════╝
    `);
});