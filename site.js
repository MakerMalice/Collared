/* Collared · Stage. The site's one script (not loaded on /account, which runs its own).
   The mobile menu everywhere; on Home, the clips, the arrivals, the depth, the things to try, and the ring in the nav
   that closes as you read. */
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)');
  const IO = 'IntersectionObserver' in window;

  // ── the mobile menu: it opens and closes with a short ease, and the burger becomes a close mark ──
  const burger = document.querySelector('.nav-burger');
  const menu = document.getElementById('mobile-menu');
  if (burger && menu) {
    let t = 0;
    const set = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      clearTimeout(t);
      if (open) {
        menu.hidden = false;
        void menu.offsetHeight;
        menu.classList.add('open');
      } else {
        menu.classList.remove('open');
        t = setTimeout(() => { menu.hidden = true; }, still ? 0 : 400);
      }
    };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); burger.focus(); } });
  }

  // ── clips: every .v[data-v] holds its poster <img>; near the screen it becomes a muted, looping, inline clip ──
  const boxes = [...document.querySelectorAll('.v[data-v]')].filter((b) => !b.closest('[data-sync]'));
  const duets = [...document.querySelectorAll('[data-sync]')];
  if ((boxes.length || duets.length) && !still && IO) {
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
    // On a small screen the pair is a swipe, and it follows the story to whichever phone has just woken.
    const ranges = (el) => (el.dataset.awake || '').split(',').filter(Boolean).map((r) => r.split('-').map(Number));
    duets.forEach((d) => {
      const vs = [...d.querySelectorAll('.v[data-v]')];
      const rs = vs.map(ranges);
      let clips = null;
      let raf = 0;
      const touches = [...d.querySelectorAll('.touch[data-at]')];
      let was = 0;
      let showing = -1;
      let handsOff = 0;
      ['touchstart', 'pointerdown', 'wheel'].forEach((ev) => d.addEventListener(ev, () => { handsOff = Date.now() + 6000; }, { passive: true }));
      const step = () => {
        const lead = clips[0];
        const t = lead.currentTime;
        // a finger lands when the clip's own clock passes its moment (and not again until the next play)
        touches.forEach((el) => {
          const at = Number(el.dataset.at);
          if (was < at && t >= at && t - at < 0.5) { el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
        });
        was = t;
        let latest = -1, since = -1;
        clips.forEach((c, i) => {
          if (i && !c.paused && Math.abs(c.currentTime - t) > 0.12) c.currentTime = t;
          const on = rs[i].find(([a, b]) => t >= a && t < b);
          vs[i].classList.toggle('rest', rs[i].length > 0 && !on);
          if (on && on[0] >= since) { since = on[0]; latest = i; }
        });
        if (latest !== showing && latest >= 0) {
          showing = latest;
          if (small.matches && Date.now() > handsOff && d.scrollWidth > d.clientWidth + 4) {
            const ph = vs[latest].closest('.phone');
            d.scrollTo({ left: ph.offsetLeft - (d.clientWidth - ph.offsetWidth) / 2, behavior: 'smooth' });
          }
        }
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
    if (IO) new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(dw);
    else seen = true;
    if (!still) setInterval(() => {
      if (hover || focus || !seen || document.hidden || Date.now() < heldUntil) return;
      show((at + 1) % words.length);
    }, 3200);
  }

  // ── Held, to try: press and hold until the ring fills. Letting go early lets it empty; a full ring tells them. ──
  const hold = document.querySelector('[data-hold]');
  if (hold) {
    const btn = hold.querySelector('.holdbtn');
    const say = hold.querySelector('.say');
    const idle = say.textContent;
    let t = 0, back = 0, down = false;
    const reset = () => { hold.classList.remove('holding', 'held'); say.textContent = idle; };
    const press = () => {
      if (down || hold.classList.contains('held')) return;
      down = true;
      clearTimeout(back);
      hold.classList.add('holding');
      say.textContent = 'Keep holding';
      t = setTimeout(() => {
        down = false;
        hold.classList.remove('holding'); hold.classList.add('held');
        say.textContent = 'Theo has been told. Breathe in, gently.';
        back = setTimeout(reset, 9000);
      }, still ? 600 : 1400);
    };
    const release = () => {
      if (!down) return;
      down = false;
      clearTimeout(t);
      hold.classList.remove('holding');
      say.textContent = 'A little longer. Press and hold.';
      back = setTimeout(reset, 2600);
    };
    btn.addEventListener('pointerdown', (e) => { if (e.button === 0) { try { btn.setPointerCapture(e.pointerId); } catch (_) {} press(); } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, release));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } else if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
    btn.addEventListener('blur', release);
  }

  // ── a Private Glimpse, to try: blurred until it's tapped; a second tap blurs it again ──
  const gl = document.querySelector('[data-glimpse]');
  if (gl) {
    const gsay = document.querySelector('[data-gsay]');
    gl.addEventListener('click', () => {
      const open = gl.getAttribute('aria-pressed') !== 'true';
      gl.setAttribute('aria-pressed', String(open));
      gl.setAttribute('aria-label', open ? 'A Glimpse from Luna: a sunset through a window, Almost home. Tap to blur it again.' : 'A Private Glimpse from Luna. Tap to see it.');
      if (gsay) gsay.textContent = open ? 'Only you see it. Tap to blur it again.' : 'From Luna, blurred until you tap.';
    });
  }

  // ── arriving: each chapter's words rise once, a beat apart, and its devices settle in after them ──
  const groups = [...document.querySelectorAll('.act .in, .ch .copy, .ch.show .facts, .switch .head, .switch .cmp, .private .in, .more2 .in, .split2, .endcard .in')];
  const devs = [...document.querySelectorAll('.ch .shots > *, .c-duo .phone.open, .watches > *')];
  const end = document.querySelector('.endcard');
  if (!still && IO) {
    groups.forEach((g) => [...g.children].forEach((c, i) => { c.classList.add('rv'); c.style.setProperty('--d', (i * 0.07).toFixed(2) + 's'); }));
    devs.forEach((el, i) => { if (!el.classList.contains('rv')) { el.classList.add('rvd'); el.style.setProperty('--d', (0.12 + (i % 3) * 0.1).toFixed(2) + 's'); } });
    const seen = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el === end) el.classList.add('closed');
      else if (el.classList.contains('rvd')) el.classList.add('on');
      else [...el.children].forEach((c) => c.classList.add('on'));
      seen.unobserve(el);
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    groups.forEach((g) => seen.observe(g));
    devs.forEach((el) => { if (el.classList.contains('rvd')) seen.observe(el); });
    if (end) seen.observe(end);
    // once a thing has arrived its delay is spent: hover and press must answer at once
    document.addEventListener('transitionend', (e) => { const c = e.target.classList; if (c && (c.contains('rv') || c.contains('rvd')) && c.contains('on') && e.propertyName === 'opacity') e.target.style.removeProperty('--d'); });
  } else if (end) {
    end.classList.add('closed');
  }

  // ── reading down Home: the ring in the nav closes one step per section, the nav takes a light chapter's tone, and
  // the devices drift a little against the scroll ──
  const pr = document.getElementById('pr');
  const steps = [...document.querySelectorAll('[data-step]')];
  const nav = document.querySelector('.nav');
  const depth = still ? [] : [...document.querySelectorAll('[data-depth]')];
  if (pr && steps.length) {
    document.body.classList.add('has-steps');
    const len = 113.1;
    let queued = false;
    const tick = () => {
      queued = false;
      const vh = innerHeight;
      const mid = scrollY + vh * 0.5;
      let done = 0, tone = '';
      for (const s of steps) {
        if (s.offsetTop < mid) done++;
        const r = s.getBoundingClientRect();
        if (r.top <= 34 && r.bottom > 34) tone = s.dataset.tone || '';
      }
      pr.style.strokeDashoffset = String(len * (1 - done / steps.length));
      document.body.classList.toggle('scrolled', scrollY > vh * 0.6);
      if (nav) nav.classList.toggle('on-light', tone === 'light');
      if (!small.matches) {
        for (const el of depth) {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) continue;
          const off = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.depth);
          el.style.setProperty('--py', Math.max(-46, Math.min(46, off)).toFixed(1) + 'px');
        }
      }
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
    addEventListener('resize', tick);
    tick();
  }
})();
