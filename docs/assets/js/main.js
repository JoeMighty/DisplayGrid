// ─── Hero canvas animation ────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const CELL = 48;           // grid spacing
  const DOT_R = 1.5;         // base dot radius
  const GLOW_R = 6;          // glow radius for active dots
  const PULSE_COUNT = 6;     // number of simultaneously pulsing nodes
  const BEAM_COUNT  = 3;     // travelling beams along grid lines
  const FPS_CAP = 50;

  let W, H, cols, rows, dots, beams;
  let raf, lastT = 0;

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    init();
  }

  function init() {
    cols = Math.ceil(W / CELL) + 1;
    rows = Math.ceil(H / CELL) + 1;

    // Offset grid so it's centered
    const offX = (W - (cols - 1) * CELL) / 2;
    const offY = (H - (rows - 1) * CELL) / 2;

    // Build dot grid
    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          x: offX + c * CELL,
          y: offY + r * CELL,
          pulse: 0,      // 0..1 animation progress
          speed: 0,
          active: false,
        });
      }
    }

    // Seed initial pulsing dots
    for (let i = 0; i < PULSE_COUNT; i++) activateDot();

    // Beams travelling along rows
    beams = [];
    for (let i = 0; i < BEAM_COUNT; i++) {
      const row = Math.floor(Math.random() * rows);
      beams.push({
        row,
        x: Math.random() * W,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 60 + Math.random() * 80,   // px/s
        len: 60 + Math.random() * 80,
        alpha: 0.3 + Math.random() * 0.3,
      });
    }
  }

  function activateDot() {
    const idle = dots.filter(d => !d.active);
    if (!idle.length) return;
    const d = idle[Math.floor(Math.random() * idle.length)];
    d.active = true;
    d.pulse  = 0;
    d.speed  = 0.4 + Math.random() * 0.6;   // pulses per second
  }

  function draw(ts) {
    raf = requestAnimationFrame(draw);
    if (ts - lastT < 1000 / FPS_CAP) return;
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    ctx.clearRect(0, 0, W, H);

    // ── Grid lines ──────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(30,41,59,0.7)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    for (let d of dots) {
      if (d.x + CELL <= W) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + CELL, d.y); }
      if (d.y + CELL <= H) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, d.y + CELL); }
    }
    ctx.stroke();

    // ── Travelling beams ────────────────────────────────────────────────────
    for (const b of beams) {
      const y = dots.find(d => d.y === dots[b.row * cols]?.y)?.y ?? b.row * CELL;
      b.x += b.dir * b.speed * dt;
      if (b.x > W + b.len) b.x = -b.len;
      if (b.x < -b.len)    b.x = W + b.len;

      const x0 = b.dir > 0 ? b.x - b.len : b.x;
      const x1 = b.dir > 0 ? b.x         : b.x + b.len;
      const grad = ctx.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0,   'rgba(59,130,246,0)');
      grad.addColorStop(0.5, `rgba(59,130,246,${b.alpha})`);
      grad.addColorStop(1,   'rgba(59,130,246,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }

    // ── Dots ────────────────────────────────────────────────────────────────
    let reactivate = 0;
    for (const d of dots) {
      if (d.active) {
        d.pulse += d.speed * dt;
        if (d.pulse >= 1) { d.active = false; d.pulse = 0; reactivate++; continue; }

        const t    = d.pulse;
        const glow = Math.sin(t * Math.PI);          // 0→1→0

        // Glow halo
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, GLOW_R * 3 * glow);
        grad.addColorStop(0,   `rgba(59,130,246,${0.35 * glow})`);
        grad.addColorStop(0.5, `rgba(99,102,241,${0.12 * glow})`);
        grad.addColorStop(1,   'rgba(59,130,246,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, GLOW_R * 3 * glow, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.fillStyle = `rgba(99,179,246,${0.9 * glow + 0.1})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, DOT_R + GLOW_R * 0.4 * glow, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dim resting dot
        ctx.fillStyle = 'rgba(51,65,85,0.6)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Re-activate finished dots
    for (let i = 0; i < reactivate; i++) activateDot();
  }

  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  resize();
  new ResizeObserver(resize).observe(canvas.parentElement);
  raf = requestAnimationFrame(draw);
})();

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
