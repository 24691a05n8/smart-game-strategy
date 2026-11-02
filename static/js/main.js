/**
 * main.js - Shared utilities for all pages
 * Smart Game Strategy System
 */

// ── Mobile Navigation ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        hamburger.classList.toggle('open');
    });
}

// ── Navbar scroll effect ──
const navbar = document.getElementById('main-nav');
window.addEventListener('scroll', () => {
    if (navbar) {
        if (window.scrollY > 20) {
            navbar.style.background = 'rgba(5,11,26,0.97)';
        } else {
            navbar.style.background = 'rgba(5,11,26,0.85)';
        }
    }
});

// ── Animated Counter (for hero stats) ──
function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const step = duration / target;
    let current = 0;

    const timer = setInterval(() => {
        current += Math.ceil(target / 60);
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = current + suffix;
    }, step);
}

// Run counters when they come into view
const statValues = document.querySelectorAll('.stat-value');
if (statValues.length > 0) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                animateCounter(e.target);
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.5 });
    statValues.forEach(el => observer.observe(el));
}

// ── Animate cards on scroll ──
const animatedEls = document.querySelectorAll(
    '.module-card, .algo-info-card, .obj-card, .app-card, .doc-section, .complexity-card'
);
if (animatedEls.length > 0) {
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, i * 60);
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animatedEls.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        cardObserver.observe(el);
    });
}

// ── Speed slider display ──
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', () => {
        speedValue.textContent = speedSlider.value + 'ms';
    });
}

// ── Toast notification ──
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem;
        background: ${type === 'error' ? 'rgba(239,68,68,0.9)' : type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(59,130,246,0.9)'};
        color: white; padding: 0.85rem 1.5rem;
        border-radius: 12px; font-size: 0.9rem; font-weight: 500;
        z-index: 9999; backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.5s;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    `;
    toast.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateY(20px); opacity:0; } to { transform:none; opacity:1; } }
        @keyframes fadeOut { to { opacity:0; transform: translateY(-10px); } }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ── Utility: sleep ──
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
