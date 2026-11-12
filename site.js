/* Collared · Stage. The site's one script (not loaded on /account, which runs its own).
   The mobile menu everywhere; on Home, the clips and the ring that closes as you read. */
(() => {
  // ── the mobile menu ──
  const burger = document.querySelector('.nav-burger');
  const menu = document.getElementById('mobile-menu');
  if (burger && menu) {
    const set = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.hidden = !open;
    };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); burger.focus(); } });
  }

  // ── clips: every .v[data-v] holds its poster <img>; near the screen it becomes a muted, looping, inline clip ──
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const boxes = [...document.querySelectorAll('.v[data-v]')];
  if (boxes.length && !still && 'IntersectionObserver' in window) {
    const make = (el) => {
      const img = el.querySelector('img');
      const base = el.dataset.v;
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
      v.setAttribute('aria-label', img ? img.alt : '');
      v.poster = base + '.jpg';
      if (img) { v.width = img.width || img.naturalWidth; }
      v.innerHTML = `<source src="${base}.webm" type="video/webm"><source src="${base}.mp4" type="video/mp4">`;
      v.addEventListener('playing', () => { if (img && img.parentNode === el) el.replaceChild(v, img); }, { once: true });
      // play before it's in the DOM: Safari wants it attached, so keep it hidden behind the poster until it plays
      v.style.cssText = 'position:absolute;inset:0;opacity:0';
      el.appendChild(v);
      v.addEventListener('playing', () => { v.style.cssText = ''; }, { once: true });
      return v;
    };
    const play = new IntersectionObserver((es) => es.forEach((e) => {
      const el = e.target;
      if (e.isIntersecting) {
        if (!el._v) el._v = make(el);
        el._v.play().catch(() => {});
      } else if (el._v) {
        el._v.pause();
      }
    }), { rootMargin: '200px 0px', threshold: 0.01 });
    boxes.forEach((b) => play.observe(b));
  }

  // ── the broken ring closes as you read down Home: one step per section ──
  const pr = document.getElementById('pr');
  if (pr) {
    const steps = [...document.querySelectorAll('[data-step]')];
    const len = 113.1;
    let queued = false;
    const tick = () => {
      queued = false;
      const mid = scrollY + innerHeight * 0.5;
      let done = 0;
      for (const s of steps) if (s.offsetTop < mid) done++;
      pr.style.strokeDashoffset = String(len * (1 - done / steps.length));
      document.body.classList.toggle('scrolled', scrollY > innerHeight * 0.8);
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
    addEventListener('resize', tick);
    tick();
  }
})();
