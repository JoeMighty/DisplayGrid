// ─── Active nav link ─────────────────────────────────────────────────────────
(function () {
  const path = window.location.pathname.replace(/\/$/, '');
  document.querySelectorAll('.nav__links a').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '');
    if (href === path || (href !== '' && path.endsWith(href))) {
      a.classList.add('active');
    }
  });
})();

// ─── TOC active highlight on scroll ─────────────────────────────────────────
(function () {
  const tocLinks = document.querySelectorAll('.guide-toc__links a');
  if (!tocLinks.length) return;

  const headings = Array.from(document.querySelectorAll('.guide-body h2, .guide-body h3'));

  function updateActive() {
    const scrollY = window.scrollY + 100;
    let active = headings[0];
    for (const h of headings) {
      if (h.offsetTop <= scrollY) active = h;
    }
    tocLinks.forEach(a => {
      a.classList.toggle('active', active && a.getAttribute('href') === '#' + active.id);
    });
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
})();

// ─── Smooth-scroll anchor links ───────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
