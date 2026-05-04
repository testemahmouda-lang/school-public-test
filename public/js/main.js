/* main.js — UI interactions for all pages */

// ── Sticky header ─────────────────────────────────────
const topbar = document.getElementById('topbar');
if (topbar) {
  window.addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── Theme mode ────────────────────────────────────────
const rootBody    = document.body;
const themeToggle = document.querySelector('.theme-toggle');
const storedTheme = localStorage.getItem('school-theme');
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

function applyTheme(theme) {
  rootBody.setAttribute('data-theme', theme);
  localStorage.setItem('school-theme', theme);
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    const label = themeToggle.querySelector('.theme-toggle-label');
    if (label) label.textContent = theme === 'dark' ? 'فاتح' : 'داكن';
  }
}
applyTheme(storedTheme || (prefersDark ? 'dark' : 'light'));
themeToggle?.addEventListener('click', () => {
  applyTheme(rootBody.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ── Mobile menu toggle ────────────────────────────────
const menuToggle = document.querySelector('.menu-toggle');
const menu       = document.getElementById('main-menu');
if (menuToggle && menu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Close menu on any nav link click ──────────────────
document.querySelectorAll('.menu a').forEach(link => {
  link.addEventListener('click', () => {
    menu?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

// ── Current page highlighting ─────────────────────────
(function () {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.menu a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) link.classList.add('active');
  });
})();

// ── Reveal on scroll (IntersectionObserver) ───────────
const reveals = document.querySelectorAll('.reveal');
if (reveals.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01 });
  reveals.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight + 200) el.classList.add('is-visible');
    else revealObserver.observe(el);
  });
}

// ── Animated counters ─────────────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-card strong').forEach(el => {
    const text  = el.textContent;
    const match = text.match(/\d+/);
    if (!match) return;
    const target = parseInt(match[0], 10);
    const prefix = text.slice(0, match.index);
    const suffix = text.slice(match.index + match[0].length);
    let start = 0;
    const step  = Math.max(1, target / 50);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = prefix + Math.floor(start) + suffix;
      if (start >= target) clearInterval(timer);
    }, 30);
  });
}
const statsSection = document.querySelector('.stats-section, .stats-grid');
if (statsSection) {
  const statsObserver = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting) { animateCounters(); statsObserver.disconnect(); } },
    { threshold: 0.3 }
  );
  statsObserver.observe(statsSection);
}

// ── Smooth scroll for anchor links ────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      menu?.classList.remove('open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    }
  });
});

// ── Page scroll progress ──────────────────────────────
const progressBar = document.querySelector('.page-progress-bar');
function updateProgress() {
  if (!progressBar) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = scrollable > 0
    ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) + '%'
    : '0%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

// ── Back to top ───────────────────────────────────────
const backToTop = document.querySelector('.back-to-top');
if (backToTop) {
  window.addEventListener('scroll', () => backToTop.classList.toggle('is-visible', window.scrollY > 420), { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── News filter ───────────────────────────────────────
const filterButtons = document.querySelectorAll('.filter-btn');
const filterItems   = document.querySelectorAll('[data-cat]');
if (filterButtons.length && filterItems.length) {
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filterItems.forEach(item => {
        item.style.display = (filter === 'all' || item.dataset.cat === filter) ? '' : 'none';
      });
    });
  });
}

// ── Hero parallax ─────────────────────────────────────
const heroSection = document.querySelector('.hero-school');
if (heroSection) {
  window.addEventListener('scroll', () => {
    if (window.innerWidth > 991) {
      heroSection.style.backgroundPositionY = `${30 + Math.min(window.scrollY, 500) * 0.08}%`;
    }
  }, { passive: true });
}

// ── Resize: close menu on desktop ────────────────────
window.addEventListener('resize', () => {
  if (window.innerWidth > 1080) {
    menu?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }
});
