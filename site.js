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
  const boxes = [...document.querySelectorAll('.v[data-v]')].filter((b) => !b.closest('[data-sync]'));
  const duets = [...document.querySelectorAll('[data-sync]')];
  if ((boxes.length || duets.length) && !still && 'IntersectionObserver' in window) {
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

    // ── duets: one story told across two phones. Both clips are the same length; the first keeps time and the other
    // follows it. A phone whose part hasn't started yet rests dimmed (its .v carries data-awake="from-to,...", seconds).
    const ranges = (el) => (el.dataset.awake || '').split(',').filter(Boolean).map((r) => r.split('-').map(Number));
    duets.forEach((d) => {
      const vs = [...d.querySelectorAll('.v[data-v]')];
      let clips = null;
      let raf = 0;
      const touches = [...d.querySelectorAll('.touch[data-at]')];
      let was = 0;
      const step = () => {
        const lead = clips[0];
        const t = lead.currentTime;
        // a finger lands when the clip's own clock passes its moment (and not again until the next play)
        touches.forEach((el) => {
          const at = Number(el.dataset.at);
          if (was < at && t >= at && t - at < 0.5) { el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
        });
        was = t;
        clips.forEach((c, i) => {
          if (i && !c.paused && Math.abs(c.currentTime - t) > 0.12) c.currentTime = t;
          const r = ranges(vs[i]);
          vs[i].classList.toggle('rest', r.length > 0 && !r.some(([a, b]) => t >= a && t < b));
        });
        raf = requestAnimationFrame(step);
      };
      const start = () => {
        clips.forEach((c) => { c.currentTime = 0; });
        Promise.all(clips.map((c) => c.play().catch(() => {}))).then(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(step); });
      };
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) {
          if (!clips) {
            clips = vs.map((el) => (el._v = make(el)));
            let ready = 0;
            clips.forEach((c) => c.addEventListener('canplay', () => { if (++ready === clips.length) start(); }, { once: true }));
          } else {
            clips.forEach((c) => c.play().catch(() => {}));
            cancelAnimationFrame(raf); raf = requestAnimationFrame(step);
          }
        } else if (clips) {
          clips.forEach((c) => c.pause());
          cancelAnimationFrame(raf);
        }
      }), { rootMargin: '200px 0px', threshold: 0.01 }).observe(d);
    });
  }

  // ── Done when: the words and their pill move together on a calm timer. Hover, focus or a tap holds it; a pill
  // shows its own example. With Reduce Motion nothing moves by itself, and the pills still work. ──
  const dw = document.querySelector('[data-cycle]');
  if (dw) {
    const words = [...dw.querySelectorAll('.rot span')];
    const pills = [...dw.querySelectorAll('.chips button')];
    const live = dw.querySelector('.rot');
    let at = 0, hover = false, focus = false, heldUntil = 0, seen = false;
    const show = (n) => {
      if (n === at) return;
      words[at].classList.remove('on'); words[at].classList.add('out');
      const was = words[at];
      setTimeout(() => was.classList.remove('out'), 450);
      at = n;
      words[at].classList.add('on');
      pills.forEach((p, k) => p.setAttribute('aria-pressed', String(k === at)));
    };
    pills.forEach((p, k) => p.addEventListener('click', () => {
      live.setAttribute('aria-live', 'polite');
      heldUntil = Date.now() + 9000;
      show(k);
    }));
    dw.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
    dw.addEventListener('pointerleave', () => { hover = false; });
    dw.addEventListener('focusin', () => { focus = true; });
    dw.addEventListener('focusout', () => { focus = dw.contains(document.activeElement); });
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(dw);
    else seen = true;
    if (!still) setInterval(() => {
      if (hover || focus || !seen || document.hidden || Date.now() < heldUntil) return;
      show((at + 1) % words.length);
    }, 3200);
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
