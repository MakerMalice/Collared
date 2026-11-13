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
      const parts = [...d.querySelectorAll('.v')];
      const vs = parts.filter((p) => p.dataset.v);
      const rs = parts.map(ranges);
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
        clips.forEach((c, i) => { if (i && !c.paused && Math.abs(c.currentTime - t) > 0.12) c.currentTime = t; });
        parts.forEach((p, i) => {
          const on = rs[i].find(([a, b]) => t >= a && t < b);
          p.classList.toggle('rest', rs[i].length > 0 && !on);
          if (on && on[0] >= since) { since = on[0]; latest = i; }
          if (p._tick) p._tick(t);
        });
        if (latest !== showing && latest >= 0) {
          showing = latest;
          if (small.matches && Date.now() > handsOff && d.scrollWidth > d.clientWidth + 4) {
            const ph = parts[latest].closest('.phone');
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

  // ── drawn screens share one small helper: is it on screen, and a list of timers to clear ──
  const watch = (el, cb) => { if (IO) new IntersectionObserver(([e]) => cb(e.isIntersecting), { threshold: 0.35 }).observe(el); else cb(true); };

  // ── Home, drawn: Mark it done really marks it. Left alone it plays itself, the way the day would go. ──
  const home = document.querySelector('[data-home]');
  if (home) {
    const mark = home.querySelector('.mark');
    const tap = home.querySelector('.touch');
    let ts = [], on = false;
    const clear = () => { ts.forEach(clearTimeout); ts = []; };
    const later = (f, ms) => ts.push(setTimeout(f, ms));
    const set = (n) => { home.dataset.s = String(n); };
    const finish = () => { clear(); set(1); later(() => set(2), 1900); later(() => { set(0); idle(); }, 1900 + 3600); };
    const idle = () => { clear(); if (!on || still) return; later(() => { tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go'); }, 2300); later(finish, 2600); };
    mark.addEventListener('click', () => { if (home.dataset.s === '0') finish(); });
    watch(home, (v) => { on = v; if (v && home.dataset.s === '0') idle(); else if (!v) { clear(); set(0); } });
  }

  // ── Held, drawn: press and hold the circle on the screen until the ring closes. Letting go early lets it empty.
  // Sir is told, then Theo arrives and the two breathe together; "I'm okay" ends it. Left alone it shows itself. ──
  const held = document.querySelector('[data-held]');
  if (held) {
    const hold = held.querySelector('.hold');
    const okay = held.querySelector('.okay.hit');
    const breath = held.querySelector('[data-k="breath"]');
    const say = held.querySelector('[data-k="say"]');
    let ts = [], on = false, down = false, fillT = 0, br = 0;
    const clear = () => { ts.forEach(clearTimeout); ts = []; };
    const later = (f, ms) => ts.push(setTimeout(f, ms));
    const set = (n) => {
      held.dataset.s = String(n);
      okay.tabIndex = n === 2 ? 0 : -1; hold.tabIndex = n === 0 ? 0 : -1;
      clearInterval(br);
      breath.textContent = 'Breathe in, gently';
      if (n === 2 && !still) { let out = false; br = setInterval(() => { out = !out; breath.textContent = out ? 'And out, like a candle' : 'Breathe in, gently'; }, 3000); }
      say.textContent = n === 1 ? 'Sir has been told. Breathe here while you wait for Sir.' : n === 2 ? 'Sir is here.' : '';
    };
    const rest = () => { clear(); set(0); idle(); };
    const told = () => { held.classList.remove('holding'); clear(); set(1); later(() => set(2), 3000); later(rest, 3000 + 14000); };
    const fill = () => { clear(); held.classList.add('holding'); fillT = setTimeout(told, still ? 500 : 1400); };
    const idle = () => { if (!on || still) return; later(fill, 3200); };
    const press = () => { if (down || held.dataset.s !== '0') return; down = true; clearTimeout(fillT); fill(); };
    const release = () => {
      if (!down) return;
      down = false;
      if (held.dataset.s === '0') { clearTimeout(fillT); held.classList.remove('holding'); idle(); }
    };
    hold.addEventListener('pointerdown', (e) => { if (e.button === 0) { try { hold.setPointerCapture(e.pointerId); } catch (_) {} press(); } });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach((ev) => hold.addEventListener(ev, release));
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
    hold.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } });
    hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
    okay.addEventListener('click', rest);
    watch(held, (v) => { on = v; if (v && held.dataset.s === '0') { clear(); idle(); } else if (!v) { clear(); clearTimeout(fillT); held.classList.remove('holding'); down = false; set(0); } });
    set(0);
  }

  // ── the Glimpse thread, drawn: it follows the camera clip beside it (the Glimpse lands at 2.4 s) and opens by
  // itself at 4 s unless you tapped it first; a tap blurs or clears it at any time. ──
  const thread = document.querySelector('[data-thread]');
  if (thread) {
    const tile = thread.querySelector('[data-glimpse]');
    let mine = false, last = 0;
    const open = (o) => {
      tile.setAttribute('aria-pressed', String(o));
      tile.setAttribute('aria-label', o ? 'A Glimpse from Luna: a sunset through a window, Almost home. Tap to blur it again.' : 'A Private Glimpse from Luna. Tap to see it.');
    };
    tile.addEventListener('click', () => { mine = true; open(tile.getAttribute('aria-pressed') !== 'true'); });
    thread._tick = (t) => {
      if (t < last - 1) { mine = false; open(false); }
      last = t;
      const s = t < 2.4 ? 0 : 1;
      if (thread.dataset.s !== String(s)) thread.dataset.s = String(s);
      if (!mine && s === 1) { const want = t >= 4; if ((tile.getAttribute('aria-pressed') === 'true') !== want) open(want); }
    };
  }

  // ── the day told back: Luna's afternoon, drawn. It plays on its own while it's on screen; the scrubber and the
  // pause button are real. Travelling takes longer on screen than waiting, so the line is what you watch. ──
  const day = document.querySelector('[data-day]');
  if (day) {
    const q = (k) => day.querySelector('[data-k="' + k + '"]');
    const paths = [...day.querySelectorAll('.route:not(.ghost)')];
    const total = paths[0].getTotalLength();
    const me = day.querySelector('.me');
    const stops = [...day.querySelectorAll('.stops circle')];
    const scrub = day.querySelector('.scrub');
    const pp = day.querySelector('.pp');
    const done = day.querySelector('.done');
    const knob = day.querySelector('.knob');
    const END = 215; // minutes from 3:16 pm to 6:51 pm
    // [from, to, route length at from, at to, place index or -1 while on the way]
    const legs = [[0, 22, 0, 220, -1], [22, 77, 220, 220, 1], [77, 91, 220, 480, -1], [91, 136, 480, 480, 2], [136, 146, 480, 555, -1], [146, 181, 555, 555, 3], [181, 185, 555, 710, -1], [185, 215, 710, 710, 4]];
    const places = [['Washington Square Park', 'Until 3:16 pm · Greenwich Village', ''], ['The High Line', '3:38 pm to 4:33 pm · Chelsea', '55 min'], ['Bryant Park', '4:47 pm to 5:32 pm · Midtown', '45 min'], ['Times Square', '5:42 pm to 6:17 pm · Midtown', '35 min'], ['Central Park', '6:21 pm to now · Manhattan', '30 min']];
    const clock = (m) => { const t = 196 + Math.round(m); const h = Math.floor(t / 60); return ((h + 11) % 12 + 1) + ':' + String(t % 60).padStart(2, '0') + ' pm'; };
    const scale = total / 710;
    let shown = -1;
    const draw = (m) => {
      const leg = legs.find((l) => m <= l[1]) || legs[legs.length - 1];
      const k = leg[1] === leg[0] ? 1 : (m - leg[0]) / (leg[1] - leg[0]);
      const len = (leg[2] + (leg[3] - leg[2]) * k) * scale;
      paths.forEach((p) => { p.style.strokeDasharray = len + ' ' + (total + 40); });
      const pt = paths[0].getPointAtLength(len);
      me.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      const last = legs.filter((l) => l[4] > 0 && l[0] <= m).pop();
      const at = last ? last[4] : 0;
      stops.forEach((c, i) => c.classList.toggle('seen', i <= at));
      q('time').textContent = clock(m);
      q('stat').textContent = leg[4] < 0 ? 'On the way · ' + Math.max(1, Math.round(m - leg[0])) + ' min' : 'At ' + places[leg[4]][0];
      if (at !== shown) {
        shown = at;
        q('name').textContent = places[at][0]; q('sub').textContent = places[at][1]; q('chip').textContent = places[at][2];
        q('chipg').style.display = places[at][2] ? '' : 'none';
      }
      const x = 40 + 322 * (m / END);
      knob.setAttribute('cx', x.toFixed(1));
      done.style.strokeDasharray = (100 * m / END).toFixed(2) + ' 100';
      scrub.value = String(Math.round(m));
      scrub.setAttribute('aria-valuetext', clock(m) + ', ' + q('stat').textContent);
    };
    // screen time: 2.2 s for each stretch on the way, 0.9 s for each stay, then a rest on the last frame
    const dur = legs.map((l) => (l[4] < 0 ? 2200 : 900));
    const span = dur.reduce((a, b) => a + b, 0);
    const REST = 1800;
    const toMin = (ms) => { let t = ms; for (let i = 0; i < legs.length; i++) { if (t <= dur[i]) return legs[i][0] + (legs[i][1] - legs[i][0]) * (t / dur[i]); t -= dur[i]; } return END; };
    const toMs = (m) => { let ms = 0; for (let i = 0; i < legs.length; i++) { if (m <= legs[i][1]) return ms + dur[i] * ((m - legs[i][0]) / (legs[i][1] - legs[i][0])); ms += dur[i]; } return span; };
    let playing = !still, onScreen = false, at = toMs(139), prev = 0, raf = 0;
    const setPlaying = (on) => {
      playing = on;
      q('pause').setAttribute('display', on ? '' : 'none'); q('play').setAttribute('display', on ? 'none' : '');
      pp.setAttribute('aria-label', on ? 'Pause the playback' : 'Play the afternoon back'); pp.setAttribute('aria-pressed', String(!on));
      loop();
    };
    const frame = (now) => {
      raf = 0;
      if (!playing || !onScreen) return;
      at += Math.min(80, now - prev); prev = now;
      if (at > span + REST) at = 0;
      draw(toMin(Math.min(at, span)));
      raf = requestAnimationFrame(frame);
    };
    const loop = () => { if (playing && onScreen && !raf) { prev = performance.now(); raf = requestAnimationFrame(frame); } };
    scrub.addEventListener('input', () => { if (playing) setPlaying(false); const m = Number(scrub.value); at = toMs(m); draw(m); });
    pp.addEventListener('click', () => { if (!playing && at >= span) at = 0; setPlaying(!playing); });
    if (IO) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; loop(); }, { threshold: 0.2 }).observe(day);
    else onScreen = true;
    draw(139);
    setPlaying(playing);
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
