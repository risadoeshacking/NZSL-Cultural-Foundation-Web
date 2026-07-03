// ========================================
// NZSL Cultural Foundation — Premium Frontend
// ========================================

const API_BASE = '/api';

// --- Utility ---
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function easeOutCubic(t)    { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
function easeInOutQuart(t)  { t = clamp(t, 0, 1); return t < 0.5 ? 8*t*t*t*t : 1 - Math.pow(-2*t+2,4)/2; }

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getMonth(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-NZ', { month: 'short' });
}

function getDay(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).getDate();
}

function getCategoryColor(category) {
  const map = {
    festival: '#d4760a', exhibition: '#8b3a9f', performance: '#0f9b8e',
    workshop: '#d4760a', cultural: '#d4760a', general: '#8b3a9f',
    arts: '#8b3a9f', culture: '#d4760a', heritage: '#ffb300', community: '#ffb300',
  };
  return map[String(category).toLowerCase()] || '#d4760a';
}

// --- API ---
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('API fetch error:', err);
    return null;
  }
}

// ========================================
// SITE LOADER — Canvas Lotus Bloom
// ========================================
function initLoader() {
  const loader = document.getElementById('siteLoader');
  const canvas = document.getElementById('loaderCanvas');
  if (!loader || !canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const SIZE = 220;

  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width = SIZE + 'px';
  canvas.style.height = SIZE + 'px';
  ctx.scale(dpr, dpr);

  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const PETAL_L = 74;
  const PETAL_W = 15;
  const BLOOM_DUR = 2400;
  const HOLD_DUR  = 700;
  const FADE_DUR  = 680;
  const TOTAL     = BLOOM_DUR + HOLD_DUR;

  let startTime = null;
  let finished  = false;
  const particles = [];

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function spawnParticle() {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 6 + Math.random() * 38;
    particles.push({
      x:    CX + Math.cos(angle) * dist,
      y:    CY + Math.sin(angle) * dist,
      vx:   (Math.random() - 0.5) * 0.55,
      vy:   -0.55 - Math.random() * 1.1,
      life: 0.75 + Math.random() * 0.25,
      size: 0.8 + Math.random() * 1.8,
    });
  }

  function drawPetal(progress, angle) {
    if (progress <= 0) return;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);

    const L = PETAL_L * progress;
    const W = PETAL_W * progress;

    const g = ctx.createLinearGradient(0, 0, 0, -L);
    g.addColorStop(0,   `rgba(201,162,39,${0.88 * progress})`);
    g.addColorStop(0.4, `rgba(232,193,78,${0.72 * progress})`);
    g.addColorStop(1,   `rgba(180,130,20,${0.22 * progress})`);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-W, -L * 0.32, -W * 0.55, -L * 0.72, 0, -L);
    ctx.bezierCurveTo( W * 0.55, -L * 0.72,  W, -L * 0.32, 0, 0);
    ctx.fillStyle = g;
    ctx.fill();

    // Inner highlight vein
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.08);
    ctx.bezierCurveTo(-W * 0.15, -L * 0.38, -W * 0.08, -L * 0.72, 0, -L * 0.9);
    ctx.bezierCurveTo( W * 0.08, -L * 0.72,  W * 0.15, -L * 0.38, 0, -L * 0.08);
    ctx.fillStyle = `rgba(255,220,100,${0.16 * progress})`;
    ctx.fill();

    ctx.restore();
  }

  function drawFrame(elapsed) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    const bloomP = clamp(elapsed / BLOOM_DUR, 0, 1);

    // Ambient radial glow
    const glowG = ctx.createRadialGradient(CX, CY, 0, CX, CY, 96);
    glowG.addColorStop(0, `rgba(201,162,39,${0.07 * bloomP})`);
    glowG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // 8 petals, staggered
    for (let i = 0; i < 8; i++) {
      const start = (i / 8) * 0.62;
      const raw   = clamp((bloomP - start) / 0.38, 0, 1);
      drawPetal(easeInOut(raw), (i / 8) * Math.PI * 2 - Math.PI / 2);
    }

    // Second ring (inner petals, smaller, rotated 22.5°)
    for (let i = 0; i < 8; i++) {
      const start = 0.35 + (i / 8) * 0.45;
      const raw   = clamp((bloomP - start) / 0.3, 0, 1);
      if (raw <= 0) continue;
      const p = easeInOut(raw);
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate((i / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8);
      const L = PETAL_L * 0.52 * p;
      const W = PETAL_W * 0.45 * p;
      const g2 = ctx.createLinearGradient(0, 0, 0, -L);
      g2.addColorStop(0, `rgba(232,193,78,${0.65 * p})`);
      g2.addColorStop(1, `rgba(201,162,39,${0.12 * p})`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-W, -L * 0.35, -W * 0.5, -L * 0.75, 0, -L);
      ctx.bezierCurveTo( W * 0.5, -L * 0.75,  W, -L * 0.35, 0, 0);
      ctx.fillStyle = g2;
      ctx.fill();
      ctx.restore();
    }

    // Centre jewel
    if (bloomP > 0.52) {
      const cp = easeInOut(clamp((bloomP - 0.52) * 2.1, 0, 1));
      const cg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 13 * cp);
      cg.addColorStop(0,   `rgba(255,228,90,${cp})`);
      cg.addColorStop(0.5, `rgba(201,162,39,${cp * 0.9})`);
      cg.addColorStop(1,   `rgba(160,110,15,${cp * 0.45})`);
      ctx.beginPath();
      ctx.arc(CX, CY, 13 * cp, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();
    }

    // Particles
    if (bloomP > 0.58 && Math.random() < 0.38) spawnParticle();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.011;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,162,39,${p.life * 0.72})`;
      ctx.fill();
    }

    // Progress bar
    const barEl = document.getElementById('loaderBar');
    if (barEl) barEl.style.width = Math.min(100, bloomP * 100) + '%';

    // Brand reveal
    if (elapsed > BLOOM_DUR * 0.78) {
      const brand = document.getElementById('loaderBrand');
      if (brand) brand.classList.add('visible');
    }

    // Fade out
    if (elapsed >= TOTAL) {
      const fp = clamp((elapsed - TOTAL) / FADE_DUR, 0, 1);
      loader.style.opacity = String(1 - fp);
      if (fp >= 1) {
        loader.style.display = 'none';
        finished = true;
      }
    }
  }

  function tick(ts) {
    if (finished) return;
    if (!startTime) startTime = ts;
    drawFrame(ts - startTime);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ========================================
// BRIDGE CANVAS — Flowing Connection
// ========================================
function initBridgeCanvas() {
  const canvas = document.getElementById('bridgeCanvas');
  if (!canvas || prefersReducedMotion()) return;

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Particles: left=NZ side, right=SL side
  const pts = Array.from({ length: 70 }, (_, i) => {
    const side = i < 35 ? 'nz' : 'sl';
    return {
      x:     side === 'nz' ? Math.random() * 0.28 : 0.72 + Math.random() * 0.28,
      y:     Math.random(),
      vx:    side === 'nz' ? 0.0003 + Math.random() * 0.0004 : -(0.0003 + Math.random() * 0.0004),
      vy:    (Math.random() - 0.5) * 0.0002,
      a:     0.18 + Math.random() * 0.35,
      size:  0.8 + Math.random() * 1.8,
      side,
      phase: Math.random() * Math.PI * 2,
    };
  });

  function drawBridge(ts) {
    ctx.clearRect(0, 0, W, H);

    // Gradient wash
    const bg = ctx.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0,    'rgba(0,36,125,0.07)');
    bg.addColorStop(0.35, 'rgba(0,0,0,0)');
    bg.addColorStop(0.5,  'rgba(201,162,39,0.03)');
    bg.addColorStop(0.65, 'rgba(0,0,0,0)');
    bg.addColorStop(1,    'rgba(141,21,58,0.07)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Flowing curves
    const t = ts * 0.00028;
    for (let l = 0; l < 6; l++) {
      const yFrac = 0.15 + l * 0.14;
      const yBase = H * yFrac;
      const wave  = Math.sin(t + l * 0.7) * H * 0.04;

      ctx.beginPath();
      ctx.moveTo(0, yBase);
      ctx.bezierCurveTo(
        W * 0.28, yBase + wave * 0.8,
        W * 0.72, yBase - wave * 0.8,
        W,        yBase
      );

      const lg = ctx.createLinearGradient(0, 0, W, 0);
      const a  = 0.12 - l * 0.015;
      lg.addColorStop(0,   `rgba(0,36,125,${a})`);
      lg.addColorStop(0.3, `rgba(0,36,125,${a * 0.3})`);
      lg.addColorStop(0.5, `rgba(201,162,39,${a * 0.7})`);
      lg.addColorStop(0.7, `rgba(141,21,58,${a * 0.3})`);
      lg.addColorStop(1,   `rgba(141,21,58,${a})`);

      ctx.strokeStyle = lg;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Particles
    pts.forEach(p => {
      p.x += p.vx;
      p.y += p.vy + Math.sin(ts * 0.001 + p.phase) * 0.0001;

      // Wrap: NZ particles reset when they reach center-ish
      if (p.side === 'nz' && p.x > 0.65) { p.x = Math.random() * 0.12; p.y = Math.random(); }
      if (p.side === 'sl' && p.x < 0.35) { p.x = 0.88 + Math.random() * 0.12; p.y = Math.random(); }
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;

      const px = p.x * W;
      const py = p.y * H;

      // Blend to gold near center
      const centerDist = Math.abs(p.x - 0.5);
      const blend = clamp(1 - centerDist * 3.5, 0, 1);

      let fillColor;
      if (blend > 0.15) {
        fillColor = `rgba(201,162,39,${p.a * 0.55 * blend})`;
      } else if (p.side === 'nz') {
        fillColor = `rgba(0,36,125,${p.a * (1 - blend)})`;
      } else {
        fillColor = `rgba(141,21,58,${p.a * (1 - blend)})`;
      }

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
    });
  }

  let rafId;
  function loop(ts) { drawBridge(ts); rafId = requestAnimationFrame(loop); }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { loop(0); }
      else { cancelAnimationFrame(rafId); }
    });
  }, { threshold: 0.05 });

  obs.observe(canvas);
}

// ========================================
// NAVIGATION
// ========================================
function toggleMobileNav() {
  const nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('mobile-open');
}

function initNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ========================================
// HERO PARALLAX
// ========================================
function initHeroParallax() {
  const heroBg = document.getElementById('heroBg');
  if (!heroBg || prefersReducedMotion()) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const progress = clamp(window.scrollY / (window.innerHeight * 0.85), 0, 1);
        heroBg.style.transform = `translate3d(0,${progress * 40}px,0) scale(1.08)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ========================================
// HERO PARTICLES — Lotus-petal inspired
// ========================================
function initHeroParticles() {
  const container = document.getElementById('heroParticles');
  if (!container || prefersReducedMotion()) return;

  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';

    const size     = 1.5 + Math.random() * 2.2;
    const x        = Math.random() * 100;
    const y        = 20 + Math.random() * 70;
    const dx       = (Math.random() - 0.5) * 55;
    const dy       = -28 - Math.random() * 52;
    const duration = 14 + Math.random() * 12;
    const delay    = Math.random() * duration;
    const isGold   = Math.random() > 0.45;
    const hue      = isGold ? '38, 85%, 62%' : '0, 0%, 95%';
    const opacity  = 0.1 + Math.random() * 0.22;

    p.style.cssText = `
      left:${x}%; top:${y}%;
      width:${size}px; height:${size}px;
      background:hsla(${hue},${opacity});
      box-shadow:0 0 ${size * 3}px hsla(${hue},${opacity * 0.5});
      --dx:${dx}px; --dy:${dy}px;
      animation:particleFloat ${duration}s ease-in-out ${delay}s infinite;
    `;
    container.appendChild(p);
  }
}

// ========================================
// PREMIUM 3D CARD TILT
// ========================================
function initPremiumCardTilt() {
  if (prefersReducedMotion()) return;

  const cards = document.querySelectorAll(
    '.event-card, .gallery-item, .story-card, .leader-card, .highlight-card'
  );

  const MAX_TILT = 3.5;

  cards.forEach(card => {
    let raf = null;

    card.addEventListener('pointerenter', () => {
      card.style.transition = 'transform 0.12s ease-out, box-shadow 0.3s ease, border-color 0.3s ease';
    });

    card.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      card.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease';
      card.style.transform = '';
    });

    card.addEventListener('pointermove', e => {
      const rect = card.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width  - 0.5;
      const dy = (e.clientY - rect.top)  / rect.height - 0.5;
      const rx = clamp(-dy * MAX_TILT * 2, -MAX_TILT, MAX_TILT);
      const ry = clamp( dx * MAX_TILT * 2, -MAX_TILT, MAX_TILT);

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
      });
    });
  });
}

// ========================================
// SCROLL REVEAL
// ========================================
function initScrollReveal() {
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.07, rootMargin: '0px 0px -36px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ========================================
// IMPACT COUNTERS
// ========================================
function initImpactCounters() {
  const counters = document.querySelectorAll('.impact-number[data-count]');
  if (!counters.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.count);
      let current  = 0;
      const step   = Math.ceil(target / 42);

      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current + '+';
      }, 28);

      obs.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => obs.observe(c));
}

// ========================================
// EVENTS
// ========================================
async function loadEvents() {
  const grid    = document.getElementById('eventsGrid');
  const loading = document.getElementById('eventsLoading');
  if (!grid) return;

  const data = await apiFetch('/events?limit=6');
  if (!data || !data.events) {
    if (loading) loading.innerHTML = '<span>No events available</span>';
    return;
  }
  if (loading) loading.remove();

  grid.innerHTML = data.events.map((event, i) => `
    <div class="event-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="event-card-image">
        <div class="placeholder-img" style="height:200px;background:linear-gradient(135deg,${getCategoryColor(event.category)}18 0%,${getCategoryColor(event.category)}06 100%);"></div>
        <div class="event-card-image-overlay"></div>
        <div class="event-card-badge">${event.category}</div>
        <div class="event-card-date">
          <div class="event-card-date-day">${getDay(event.date)}</div>
          <div class="event-card-date-month">${getMonth(event.date)}</div>
        </div>
      </div>
      <div class="event-card-body">
        <div class="event-card-category">${event.category}</div>
        <h3 class="event-card-title">${event.title}</h3>
        <p class="event-card-desc">${event.description || ''}</p>
        <div class="event-card-meta">
          <span>${event.location || 'TBA'}</span>
          <span>${event.time_start || ''}${event.time_end ? ' – ' + event.time_end : ''}</span>
        </div>
      </div>
    </div>
  `).join('');

  initScrollReveal();
  initPremiumCardTilt();
}

// ========================================
// GALLERY
// ========================================
let galleryImages = [];
let currentLightboxIndex = 0;

async function loadGallery(category = 'all') {
  const masonry = document.getElementById('galleryMasonry');
  const loading = document.getElementById('galleryLoading');
  if (!masonry) return;

  const endpoint = category === 'all' ? '/gallery?limit=50' : `/gallery?category=${category}&limit=50`;
  const data = await apiFetch(endpoint);
  if (!data || !data.images) {
    if (loading) loading.innerHTML = '<span>No gallery items available</span>';
    return;
  }
  if (loading) loading.remove();

  galleryImages = data.images;

  masonry.innerHTML = data.images.map((img, i) => `
    <div class="gallery-item reveal reveal-delay-${(i % 4) + 1}" onclick="openLightbox(${i})">
      <div class="placeholder-img" style="height:${150 + Math.random() * 180}px;background:linear-gradient(135deg,${getCategoryColor(img.category)}18 0%,${getCategoryColor(img.category)}06 100%);"></div>
      <div class="gallery-item-overlay">
        <div class="gallery-item-title">${img.title || 'Untitled'}</div>
        <div class="gallery-item-photographer">${img.photographer || ''}</div>
      </div>
    </div>
  `).join('');

  initScrollReveal();
  initPremiumCardTilt();
}

function initGalleryFilters() {
  const filters = document.getElementById('galleryFilters');
  if (!filters) return;
  filters.addEventListener('click', e => {
    const btn = e.target.closest('.gallery-filter');
    if (!btn) return;
    filters.querySelectorAll('.gallery-filter').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    loadGallery(btn.dataset.category);
  });
}

// ========================================
// LIGHTBOX
// ========================================
function openLightbox(index) {
  currentLightboxIndex = index;
  const lightbox  = document.getElementById('lightbox');
  const img       = document.getElementById('lightboxImage');
  const title     = document.getElementById('lightboxTitle');
  const photo     = document.getElementById('lightboxPhotographer');
  if (!lightbox || !img) return;

  const item = galleryImages[index];
  img.src   = item?.image_url || '';
  title.textContent = item?.title || '';
  photo.textContent = item?.photographer || '';

  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
  lightbox.querySelector('.lightbox-close')?.focus();
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateLightbox(dir) {
  if (!galleryImages.length) return;
  let next = currentLightboxIndex + dir;
  if (next < 0) next = galleryImages.length - 1;
  else if (next >= galleryImages.length) next = 0;
  openLightbox(next);
}

function initLightboxKeyboard() {
  document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (!lb?.classList.contains('active')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

// ========================================
// LEADERSHIP
// ========================================
async function loadLeadership() {
  const grid    = document.getElementById('leadershipGrid');
  const loading = document.getElementById('leadershipLoading');
  if (!grid) return;

  const data = await apiFetch('/leadership');
  if (!data || !data.leaders) {
    if (loading) loading.innerHTML = '<span>No leadership data available</span>';
    return;
  }
  if (loading) loading.remove();

  grid.innerHTML = data.leaders.slice(0, 4).map((leader, i) => `
    <div class="leader-card reveal reveal-delay-${(i % 4) + 1}">
      <div class="leader-portrait">
        <div class="leader-portrait-placeholder">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="18" r="9" stroke="rgba(245,240,235,0.2)" stroke-width="1.5"/>
            <path d="M8 42C8 33 15 27 24 27C33 27 40 33 40 42" stroke="rgba(245,240,235,0.2)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div class="leader-info">
        <div class="leader-role">${leader.role}</div>
        <h3 class="leader-name">${leader.name}</h3>
        <p class="leader-bio">${leader.bio || ''}</p>
      </div>
    </div>
  `).join('');

  initScrollReveal();
  initPremiumCardTilt();
}

// ========================================
// STORIES
// ========================================
async function loadStories() {
  const grid    = document.getElementById('storiesGrid');
  const loading = document.getElementById('storiesLoading');
  if (!grid) return;

  const data = await apiFetch('/stories?limit=6');
  if (!data || !data.stories) {
    if (loading) loading.remove();
    return;
  }
  if (loading) loading.remove();

  grid.innerHTML = data.stories.map((story, i) => `
    <div class="story-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="story-card-image">
        <div class="placeholder-img" style="height:200px;background:linear-gradient(135deg,${getCategoryColor(story.category)}18 0%,${getCategoryColor(story.category)}06 100%);"></div>
      </div>
      <div class="story-card-body">
        <div class="story-card-category">${story.category || 'Story'}</div>
        <h3 class="story-card-title">${story.title}</h3>
        <p class="story-card-excerpt">${story.subtitle || story.content?.substring(0, 150) || ''}</p>
      </div>
    </div>
  `).join('');

  initScrollReveal();
  initPremiumCardTilt();
}

// ========================================
// FLAG DRAWING — NZ & SL
// ========================================

function drawStar5(ctx, cx, cy, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * Math.PI / 180;
    const rad = i % 2 === 0 ? R : r;
    const px = cx + rad * Math.cos(angle);
    const py = cy + rad * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawUnionJack(ctx, x, y, W, H) {
  const cx = x + W / 2, cy = y + H / 2;
  const len = Math.sqrt(W * W + H * H);
  const dW  = Math.min(W, H) / 3.2;
  const rW  = dW * 0.44;
  const cW  = W / 4.5;

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, W, H); ctx.clip();

  // Blue background
  ctx.fillStyle = '#00247D';
  ctx.fillRect(x, y, W, H);

  // St Andrew's white diagonals
  ctx.save();
  ctx.strokeStyle = 'white'; ctx.lineWidth = dW; ctx.lineCap = 'square';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + W, y + H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + W, y); ctx.lineTo(x, y + H); ctx.stroke();
  ctx.restore();

  // St Patrick's red — counterchanged by quadrant
  const off = rW * 0.62;
  // Perpendicular to TL-BR: north=(H,-W)/len, south=(-H,W)/len
  const pN1x =  H / len * off, pN1y = -W / len * off;
  const pS1x = -H / len * off, pS1y =  W / len * off;
  // Perpendicular to TR-BL: upper-left=(-H,-W)/len, lower-right=(H,W)/len
  const pNWx = -H / len * off, pNWy = -W / len * off;
  const pSEx =  H / len * off, pSEy =  W / len * off;

  ctx.save();
  ctx.strokeStyle = '#CC142B'; ctx.lineWidth = rW; ctx.lineCap = 'square';

  // TL-BR in TR quadrant (north side)
  ctx.save(); ctx.beginPath(); ctx.rect(cx, y, W / 2, H / 2); ctx.clip();
  ctx.beginPath(); ctx.moveTo(x + pN1x, y + pN1y); ctx.lineTo(x + W + pN1x, y + H + pN1y); ctx.stroke();
  ctx.restore();
  // TL-BR in BL quadrant (south side)
  ctx.save(); ctx.beginPath(); ctx.rect(x, cy, W / 2, H / 2); ctx.clip();
  ctx.beginPath(); ctx.moveTo(x + pS1x, y + pS1y); ctx.lineTo(x + W + pS1x, y + H + pS1y); ctx.stroke();
  ctx.restore();
  // TR-BL in TL quadrant (upper-left)
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, W / 2, H / 2); ctx.clip();
  ctx.beginPath(); ctx.moveTo(x + W + pNWx, y + pNWy); ctx.lineTo(x + pNWx, y + H + pNWy); ctx.stroke();
  ctx.restore();
  // TR-BL in BR quadrant (lower-right)
  ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, W / 2, H / 2); ctx.clip();
  ctx.beginPath(); ctx.moveTo(x + W + pSEx, y + pSEy); ctx.lineTo(x + pSEx, y + H + pSEy); ctx.stroke();
  ctx.restore();

  ctx.restore();

  // St George's white fimbriation
  ctx.fillStyle = 'white';
  ctx.fillRect(cx - cW / 2, y, cW, H);
  ctx.fillRect(x, cy - cW / 2, W, cW);
  // St George's red cross
  const rcW = cW * 0.58;
  ctx.fillStyle = '#CC142B';
  ctx.fillRect(cx - rcW / 2, y, rcW, H);
  ctx.fillRect(x, cy - rcW / 2, W, rcW);

  ctx.restore();
}

function addFlagFinish(ctx, W, H) {
  // Subtle woven-fabric texture
  ctx.save();
  ctx.globalAlpha = 0.032;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.6;
  for (let y = 0; y < H; y += 2.5) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
  // Top/bottom edge shadow
  const gTB = ctx.createLinearGradient(0, 0, 0, H);
  gTB.addColorStop(0, 'rgba(0,0,0,0.15)'); gTB.addColorStop(0.06, 'rgba(0,0,0,0)');
  gTB.addColorStop(0.94, 'rgba(0,0,0,0)'); gTB.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = gTB; ctx.fillRect(0, 0, W, H);
  // Left pole-side shadow
  const gL = ctx.createLinearGradient(0, 0, W * 0.07, 0);
  gL.addColorStop(0, 'rgba(0,0,0,0.28)'); gL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gL; ctx.fillRect(0, 0, W * 0.07, H);
  // Right trailing-edge fade
  const gR = ctx.createLinearGradient(W, 0, W * 0.95, 0);
  gR.addColorStop(0, 'rgba(0,0,0,0.08)'); gR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gR; ctx.fillRect(W * 0.95, 0, W * 0.05, H);
}

function drawNZFlag(ctx, W, H) {
  ctx.fillStyle = '#012169';
  ctx.fillRect(0, 0, W, H);
  drawUnionJack(ctx, 0, 0, W * 0.5, H * 0.5);
  // Southern Cross — 4 red 5-pointed stars, white-outlined
  const stars = [
    { fx: 0.723, fy: 0.183, r: H * 0.11  }, // Gamma (top)
    { fx: 0.609, fy: 0.483, r: H * 0.11  }, // Beta (left)
    { fx: 0.750, fy: 0.700, r: H * 0.11  }, // Alpha (bottom)
    { fx: 0.882, fy: 0.367, r: H * 0.085 }, // Delta (right, smaller)
  ];
  for (const s of stars) {
    const cx = s.fx * W, cy = s.fy * H, R = s.r, r = R * 0.38;
    ctx.fillStyle = 'white';   drawStar5(ctx, cx, cy, R * 1.28, r * 1.28); ctx.fill();
    ctx.fillStyle = '#CC0001'; drawStar5(ctx, cx, cy, R, r);                ctx.fill();
  }
  addFlagFinish(ctx, W, H);
}

function drawBoLeaf(ctx, cx, cy, size, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#F5C400';
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo( size * 0.55, -size * 0.5,  size * 0.55, size * 0.25, 0, size * 0.4);
  ctx.bezierCurveTo(-size * 0.55,  size * 0.25, -size * 0.55, -size * 0.5, 0, -size);
  ctx.fill();
  ctx.restore();
}

function drawSLLion(ctx, cx, cy, size) {
  const s = size;
  ctx.save();
  ctx.translate(cx, cy);
  const gold = '#FFC500', dk = '#A07000';

  // Tail (curled behind body)
  ctx.strokeStyle = gold; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.25, 0);
  ctx.bezierCurveTo(-s * 0.5, s * 0.05, -s * 0.52, -s * 0.28, -s * 0.32, -s * 0.38);
  ctx.bezierCurveTo(-s * 0.14, -s * 0.48, -s * 0.05, -s * 0.34, -s * 0.08, -s * 0.22);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.22, s * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = gold; ctx.fill();

  // Body
  ctx.beginPath(); ctx.ellipse(-s * 0.02, s * 0.05, s * 0.28, s * 0.17, 0, 0, Math.PI * 2);
  ctx.fillStyle = gold; ctx.fill();
  ctx.strokeStyle = dk; ctx.lineWidth = s * 0.02; ctx.stroke();

  // Hind legs
  ctx.fillStyle = gold; ctx.strokeStyle = dk; ctx.lineWidth = s * 0.018;
  ctx.beginPath(); ctx.ellipse(-s * 0.1,  s * 0.19, s * 0.07, s * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse( s * 0.08, s * 0.21, s * 0.06, s * 0.08, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-s * 0.1, s * 0.29, s * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc( s * 0.08, s * 0.3,  s * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Mane (dark ring behind head)
  ctx.beginPath(); ctx.arc(s * 0.22, -s * 0.14, s * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = dk; ctx.fill();

  // Head
  ctx.beginPath(); ctx.ellipse(s * 0.23, -s * 0.15, s * 0.14, s * 0.13, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = gold; ctx.fill();
  ctx.strokeStyle = dk; ctx.lineWidth = s * 0.018; ctx.stroke();

  // Ear
  ctx.beginPath();
  ctx.moveTo(s * 0.14, -s * 0.27); ctx.lineTo(s * 0.08, -s * 0.4); ctx.lineTo(s * 0.24, -s * 0.29); ctx.closePath();
  ctx.fillStyle = gold; ctx.fill(); ctx.strokeStyle = dk; ctx.lineWidth = s * 0.015; ctx.stroke();

  // Eye & nose
  ctx.beginPath(); ctx.arc(s * 0.32, -s * 0.18, s * 0.025, 0, Math.PI * 2); ctx.fillStyle = '#1A0800'; ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.38, -s * 0.12, s * 0.018, 0, Math.PI * 2); ctx.fillStyle = dk; ctx.fill();

  // Raised front arm
  ctx.strokeStyle = gold; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.2, -s * 0.02);
  ctx.bezierCurveTo(s * 0.4, 0, s * 0.48, -s * 0.15, s * 0.44, -s * 0.3);
  ctx.stroke();
  ctx.strokeStyle = dk; ctx.lineWidth = s * 0.018; ctx.stroke();
  // Paw
  ctx.beginPath(); ctx.arc(s * 0.44, -s * 0.31, s * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = gold; ctx.fill(); ctx.strokeStyle = dk; ctx.lineWidth = s * 0.018; ctx.stroke();

  // Sword blade
  ctx.beginPath(); ctx.moveTo(s * 0.44, -s * 0.37); ctx.lineTo(s * 0.40, -s * 0.74);
  ctx.strokeStyle = '#DDDDDD'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'butt'; ctx.stroke();
  // Crossguard
  ctx.beginPath(); ctx.moveTo(s * 0.33, -s * 0.41); ctx.lineTo(s * 0.54, -s * 0.45);
  ctx.strokeStyle = '#CCA800'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round'; ctx.stroke();
  // Hilt
  ctx.beginPath(); ctx.moveTo(s * 0.44, -s * 0.37); ctx.lineTo(s * 0.43, -s * 0.44);
  ctx.strokeStyle = '#8B6000'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round'; ctx.stroke();

  ctx.restore();
}

function drawSLFlag(ctx, W, H) {
  // Gold border
  ctx.fillStyle = '#F5B800';
  ctx.fillRect(0, 0, W, H);

  const bw = W * 0.038;
  const ih = H - bw * 2;
  const stripeW = (W - bw * 2) * 0.13;
  const divW = bw * 0.5;

  // Saffron stripe
  ctx.fillStyle = '#FF7000';
  ctx.fillRect(bw, bw, stripeW, ih);
  // Green stripe
  ctx.fillStyle = '#006338';
  ctx.fillRect(bw + stripeW, bw, stripeW, ih);
  // Gold divider
  ctx.fillStyle = '#F5B800';
  ctx.fillRect(bw + stripeW * 2, bw, divW, ih);

  // Crimson main panel
  const cX = bw + stripeW * 2 + divW;
  const cW2 = W - bw - cX;
  ctx.fillStyle = '#8D153A';
  ctx.fillRect(cX, bw, cW2, ih);

  // Bo leaves in corners of crimson panel
  const PI4 = Math.PI / 4;
  const leafSz = ih * 0.09;
  const leafPad = leafSz * 1.4;
  drawBoLeaf(ctx, cX + leafPad,        bw + leafPad,        leafSz,  PI4);
  drawBoLeaf(ctx, cX + cW2 - leafPad,  bw + leafPad,        leafSz, -PI4);
  drawBoLeaf(ctx, cX + leafPad,        bw + ih - leafPad,   leafSz,  Math.PI - PI4);
  drawBoLeaf(ctx, cX + cW2 - leafPad,  bw + ih - leafPad,   leafSz,  Math.PI + PI4);

  // Lion
  drawSLLion(ctx, cX + cW2 * 0.5, bw + ih * 0.5, ih * 0.38);
  addFlagFinish(ctx, W, H);
}

// ========================================
// BRIDGE FLAGS — Real images, waving cloth
// ========================================
function loadFlagImage(src, w, h, onReady) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const img = new Image();
  img.onload = () => { off.getContext('2d').drawImage(img, 0, 0, w, h); onReady(off); };
  img.src = src;
}

function initBridgeFlags() {
  // Bridge flags are real <img> elements animated entirely via CSS (flag-gentle-drift + fc-flag-sheen)
}

// ========================================
// CINEMATIC FLAG REVEAL — SL traditional arts
// ========================================

function drawLotusDecor(ctx, cx, cy, outerR, t, alpha) {
  if (alpha <= 0.004) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const petals = 8;
  for (let pass = 0; pass < 2; pass++) {
    const r   = pass === 0 ? outerR : outerR * 0.62;
    const col = pass === 0 ? 'rgba(185,95,8,1)' : 'rgba(240,175,30,1)';
    const rot = pass === 0 ? t * 0.06 : t * 0.09 + Math.PI / petals;
    ctx.fillStyle = col;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + rot;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-r * 0.22, -r * 0.30, -r * 0.18, -r * 0.86, 0, -r);
      ctx.bezierCurveTo( r * 0.18, -r * 0.86,  r * 0.22, -r * 0.30, 0,  0);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,230,100,1)'; ctx.fill();
  ctx.restore();
}

function drawKandyanRing(ctx, cx, cy, r, count, t, alpha) {
  if (alpha <= 0.004) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(195,105,12,1)';
  for (let i = 0; i < count; i++) {
    const a  = (i / count) * Math.PI * 2 + t * 0.04;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI * 0.5);
    const fs = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, -fs);
    ctx.bezierCurveTo( fs * 0.3, -fs * 0.55,  fs * 0.28,  fs * 0.28, 0,  fs * 0.3);
    ctx.bezierCurveTo(-fs * 0.28,  fs * 0.28, -fs * 0.3, -fs * 0.55, 0, -fs);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function initCinematicFlags() {
  const section  = document.getElementById('flagsCinema');
  if (!section) return;

  const artCanvas = document.getElementById('fcArtCanvas');
  const elNZ      = document.getElementById('fcFlagNZ');
  const elSL      = document.getElementById('fcFlagSL');
  const elCenter  = document.getElementById('fcCenter');
  const frameNZ   = document.getElementById('fcNZFrame');
  const frameSL   = document.getElementById('fcSLFrame');
  if (!artCanvas || !elNZ || !elSL || !elCenter) return;

  // Art canvas — full viewport
  function resizeArt() { artCanvas.width = window.innerWidth; artCanvas.height = window.innerHeight; }
  resizeArt();
  window.addEventListener('resize', resizeArt, { passive: true });
  const artCtx = artCanvas.getContext('2d');

  // Scroll progress (updated by onScroll, consumed by tick)
  let progEnter = 0, progHold = 0, progExit = 0;
  // Mouse-driven tilt — normalised -0.5 to 0.5
  let mx = 0, my = 0;

  function onScroll() {
    const rect  = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    const prog  = clamp(-rect.top / total, 0, 1);
    progEnter = easeOutCubic(prog / 0.30);
    progHold  = clamp((prog - 0.30) / 0.40, 0, 1);
    progExit  = easeInOutQuart(clamp((prog - 0.70) / 0.30, 0, 1));
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Premium mouse-tilt (same technique as card hover across the whole sticky view)
  const sticky = section.querySelector('.flags-cinema-sticky');
  if (sticky) {
    sticky.addEventListener('mousemove', e => {
      const r = sticky.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width  - 0.5;
      my = (e.clientY - r.top)  / r.height - 0.5;
    }, { passive: true });
    sticky.addEventListener('mouseleave', () => { mx = 0; my = 0; });
  }

  // Traditional Sri Lankan art background (canvas layer, unchanged)
  function drawBgArt(ts) {
    const W = artCanvas.width, H = artCanvas.height;
    artCtx.clearRect(0, 0, W, H);
    const at  = ts * 0.00028;
    const vis = clamp(progEnter * 1.6, 0, 1) * clamp(1 - progExit * 1.6, 0, 1);
    if (vis <= 0.005) return;

    const cR = Math.min(W, H) * 0.31;
    drawLotusDecor(artCtx, W * 0.5, H * 0.5, cR, at, vis * 0.13);
    drawKandyanRing(artCtx, W * 0.5, H * 0.5, cR * 1.38, 18,  at,         vis * 0.11);
    drawKandyanRing(artCtx, W * 0.5, H * 0.5, cR * 1.72, 24, -at * 0.8,  vis * 0.07);

    const cl = Math.min(W, H) * 0.09;
    [[0.09,0.12],[0.91,0.12],[0.09,0.88],[0.91,0.88]].forEach(([fx,fy]) =>
      drawLotusDecor(artCtx, W*fx, H*fy, cl, at * 1.25, vis * 0.09));

    artCtx.save();
    artCtx.globalAlpha = vis * 0.055;
    artCtx.fillStyle = 'rgba(210,150,18,1)';
    const dr = Math.min(W, H) * 0.47;
    for (let i = 0; i < 64; i++) {
      const a  = (i / 64) * Math.PI * 2 + at * 0.02;
      const sz = i % 4 === 0 ? 3.5 : 1.6;
      artCtx.beginPath();
      artCtx.arc(W * 0.5 + Math.cos(a) * dr, H * 0.5 + Math.sin(a) * dr, sz, 0, Math.PI * 2);
      artCtx.fill();
    }
    artCtx.restore();

    artCtx.save();
    artCtx.globalAlpha = vis * 0.065;
    artCtx.strokeStyle = 'rgba(165,95,10,1)';
    artCtx.lineWidth = 1.4;
    for (let side = 0; side < 2; side++) {
      const bx  = side === 0 ? W * 0.14 : W * 0.86;
      const dir = side === 0 ? 1 : -1;
      artCtx.beginPath();
      for (let y = 0; y <= H; y += 4) {
        const x = bx + dir * (Math.sin(y * 0.024 + at) * 18 + Math.sin(y * 0.054 + at * 1.4) * 9);
        y === 0 ? artCtx.moveTo(x, y) : artCtx.lineTo(x, y);
      }
      artCtx.stroke();
      artCtx.fillStyle = 'rgba(165,95,10,1)';
      for (let y = 50; y < H; y += 80) {
        const x = bx + dir * (Math.sin(y * 0.024 + at) * 18 + Math.sin(y * 0.054 + at * 1.4) * 9);
        artCtx.beginPath(); artCtx.arc(x, y, 4, 0, Math.PI * 2); artCtx.fill();
      }
    }
    artCtx.restore();
  }

  // Main tick — all flag transforms live here so float and tilt are always in sync
  function tick(ts) {
    // Gentle floating oscillation that grows in during hold and fades on exit
    const hold = progHold * (1 - progExit);
    const floatY = Math.sin(ts * 0.00085)          *  9 * hold;
    const floatR = Math.sin(ts * 0.00068 + 1.1)    *  2.5 * hold;
    const breathX = Math.sin(ts * 0.00045)          *  1.2 * hold;

    // Outer wrapper: translation only
    const nxX = (1 - progEnter) * -58 + progExit * 14;
    const sxX = (1 - progEnter) *  58 - progExit * 14;
    const shY = (1 - progEnter) * 8;
    const opa = clamp(clamp(progEnter * 1.6, 0, 1) * (1 - progExit * 1.3), 0, 1);

    elNZ.style.transform = `translateX(${nxX}vw) translateY(${shY}vh)`;
    elNZ.style.opacity   = String(opa);
    elSL.style.transform = `translateX(${sxX}vw) translateY(${shY}vh)`;
    elSL.style.opacity   = String(opa);

    // Flag frame: 3D perspective tilt — pivots at left (pole) edge
    // NZ starts angled 28° toward viewer's right, levels to 0° at full enter
    if (frameNZ) {
      const rotY = (1 - progEnter) * 28 + floatR + mx * 15;
      const rotX = my * 10 + breathX;
      const sc   = clamp(0.88 + progEnter * 0.12 - progExit * 0.1, 0.05, 1.1);
      frameNZ.style.transform =
        `perspective(1000px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${sc}) translateY(${floatY}px)`;
    }
    // SL starts angled -28° (mirror), levels to 0°
    if (frameSL) {
      const rotY = (1 - progEnter) * -28 - floatR + mx * 15;
      const rotX = my * 10 + Math.sin(ts * 0.00045 + 0.6) * 1.2 * hold;
      const sc   = clamp(0.88 + progEnter * 0.12 - progExit * 0.1, 0.05, 1.1);
      frameSL.style.transform =
        `perspective(1000px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${sc}) translateY(${floatY}px)`;
    }

    // Center lotus panel
    const cOp = progHold * (1 - progExit);
    const cSc = 0.86 + progHold * 0.14;
    elCenter.style.opacity   = String(clamp(cOp, 0, 1));
    elCenter.style.transform = `translate(-50%,-50%) scale(${cSc})`;

    drawBgArt(ts);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ========================================
// CULTURAL MARQUEE
// ========================================
function initCulturalMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;

  const items = [
    { text: 'Kandyan Dance',    cls: '' },
    { text: 'ශ්‍රී ලංකාව',       cls: 'sinhala' },
    { text: 'Vesak',            cls: '' },
    { text: 'Avurudu',          cls: '' },
    { text: 'ආයුබෝවන්',         cls: 'sinhala' },
    { text: 'Batik Art',        cls: '' },
    { text: 'Bharatanatyam',    cls: '' },
    { text: 'Poson Poya',       cls: '' },
    { text: 'Deepavali',        cls: '' },
    { text: 'Rabana',           cls: '' },
    { text: 'Colombo • Wellington', cls: '' },
    { text: 'ලෝකය සිරා',        cls: 'sinhala' },
    { text: 'Ceylon Spices',    cls: '' },
    { text: 'Aotearoa',         cls: '' },
    { text: 'Two Nations · One Heart', cls: '' },
    { text: 'ශ්‍රී ලංකා',        cls: 'sinhala' },
    { text: 'Heritage',         cls: '' },
    { text: 'Community',        cls: '' },
    { text: 'Kottu · Hoppers · Lamprais', cls: '' },
    { text: 'Sinhala New Year', cls: '' },
    { text: 'Tamil Heritage',   cls: '' },
    { text: 'සංස්කෘතිය',        cls: 'sinhala' },
  ];

  function buildItems() {
    return items.map(item =>
      `<span class="marquee-item ${item.cls}">${item.text}</span><span class="marquee-sep" aria-hidden="true"></span>`
    ).join('');
  }

  // Duplicate for seamless loop
  track.innerHTML = buildItems() + buildItems();
}

// ========================================
// FLOATING LOTUS PETALS
// ========================================
function initFloatingPetals() {
  const field = document.getElementById('petalField');
  if (!field || prefersReducedMotion()) return;

  const COUNT   = 18;
  const colours = ['', '', '', 'purple', 'gold', '', 'purple'];

  for (let i = 0; i < COUNT; i++) {
    const petal = document.createElement('div');
    petal.className = 'petal ' + (colours[i % colours.length]);

    const size  = 5 + Math.random() * 9;
    const left  = Math.random() * 100;
    const dur   = 12 + Math.random() * 16;
    const delay = -(Math.random() * dur); // negative delay = already mid-air at load
    const drift = (Math.random() - 0.5) * 160;
    const spin  = (Math.random() > 0.5 ? '' : '-') + (180 + Math.random() * 360) + 'deg';

    petal.style.cssText = [
      `--pw: ${size}px`,
      `--dur: ${dur}s`,
      `--delay: ${delay}s`,
      `--petal-drift: ${drift}px`,
      `--petal-spin: ${spin}`,
      `left: ${left}%`,
    ].join(';');

    field.appendChild(petal);
  }
}

// ========================================
// COMMUNITY FEED (Recent News from DB)
// ========================================
async function loadCommunityFeed() {
  const grid    = document.getElementById('communityFeedGrid');
  const loading = document.getElementById('communityLoading');
  if (!grid) return;

  const data = await apiFetch('/news?limit=6');

  if (loading) loading.remove();

  if (!data || !data.news || data.news.length === 0) {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column:1/-1;opacity:.5">
        <span>No updates yet — check back soon.</span>
      </div>`;
    return;
  }

  const tagColour = cat => {
    const map = { news: '', community: 'purple', culture: 'teal', heritage: 'teal', general: '' };
    return map[String(cat).toLowerCase()] || '';
  };

  grid.innerHTML = data.news.map((post, i) => {
    const date  = post.created_at ? formatDate(post.created_at) : '';
    const title = post.title || 'Community Update';
    const excerpt = post.summary || (post.content || '').substring(0, 160) + '…';
    const cat   = post.category || 'news';
    const img   = post.thumbnail;

    const imageHtml = img
      ? `<img class="fb-post-image" src="${img}" alt="${title}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\'fb-post-image-placeholder\'><svg viewBox=\'0 0 48 48\' fill=\'none\'><circle cx=\'24\' cy=\'18\' r=\'7\' stroke=\'currentColor\' stroke-width=\'1.5\'/><path d=\'M8 40c0-8.8 7.2-16 16-16s16 7.2 16 16\' stroke=\'currentColor\' stroke-width=\'1.5\' stroke-linecap=\'round\'/></svg></div>'">`
      : `<div class="fb-post-image-placeholder"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M6 36L16 24l8 10 6-8 12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" stroke-width="1.3" opacity=".3"/>
         </svg></div>`;

    return `
      <article class="fb-post-card reveal" style="animation-delay:${i * 0.1}s">
        ${imageHtml}
        <div>
          <span class="fb-post-date">${date}</span>
        </div>
        <p class="fb-post-title">${title}</p>
        <p class="fb-post-excerpt">${excerpt}</p>
        <span class="fb-post-tag ${tagColour(cat)}">${cat}</span>
      </article>`;
  }).join('');

  // Trigger reveal on new cards
  initScrollReveal();
}

// ========================================
// SECTION GLOW LINES — inject into headings
// ========================================
function initSectionGlowLines() {
  document.querySelectorAll('.section-header .section-label').forEach(label => {
    if (label.previousElementSibling?.classList.contains('section-glow-line')) return;
    const line = document.createElement('div');
    line.className = 'section-glow-line';
    label.parentNode.insertBefore(line, label);
  });
}

// ========================================
// BOOT
// ========================================
function initApp() {
  initLoader();
  initNavScroll();
  initHeroParallax();
  initHeroParticles();
  initScrollReveal();
  initPremiumCardTilt();
  initGalleryFilters();
  initLightboxKeyboard();
  initImpactCounters();
  initBridgeCanvas();
  initBridgeFlags();
  initCinematicFlags();

  // New cultural enhancements
  initCulturalMarquee();
  initFloatingPetals();
  initSectionGlowLines();

  loadEvents();
  loadGallery();
  loadCommunityFeed();

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  }
}

window.addEventListener('DOMContentLoaded', initApp);
