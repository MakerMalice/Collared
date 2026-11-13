/* Collared · Stage. The site's one script (not loaded on /account, which runs its own).
   The mobile menu everywhere; on Home, the clips, the arrivals, the depth, the things to try, and the ring in the nav
   that closes as you read. */
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)');
  const IO = 'IntersectionObserver' in window;

  // ── drawn screens share one small helper: is it on screen, and a list of timers to clear ──
  const watch = (el, cb) => { if (IO) new IntersectionObserver(([e]) => cb(e.isIntersecting), { threshold: 0.35 }).observe(el); else cb(true); };

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
    // load from two screens away (so nothing is still fetching when you arrive); play only when near the screen
    const FAR = { rootMargin: '1800px 0px', threshold: 0 };
    const warm = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const el = e.target; if (!el._v) el._v = make(el); warm.unobserve(el); } }), FAR);
    const play = new IntersectionObserver((es) => es.forEach((e) => {
      const el = e.target;
      if (e.isIntersecting) {
        if (!el._v) el._v = make(el);
        el._v.play().catch(() => {});
      } else if (el._v) {
        el._v.pause();
      }
    }), { rootMargin: '200px 0px', threshold: 0.01 });
    boxes.forEach((b) => { warm.observe(b); play.observe(b); });

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
      let ready = false, begun = false, near = false;
      const load = () => {
        if (clips) return;
        clips = vs.map((el) => (el._v = make(el)));
        let n = 0;
        const ok = () => { if (++n === clips.length) { ready = true; if (near) { begun = true; start(); } } };
        clips.forEach((c) => { if (c.readyState >= 3) ok(); else c.addEventListener('canplay', ok, { once: true }); });
      };
      new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { load(); o.disconnect(); } }), FAR).observe(d);
      new IntersectionObserver((es) => es.forEach((e) => {
        near = e.isIntersecting;
        if (near) {
          load();
          if (ready && !begun) { begun = true; start(); }
          else if (begun) { clips.forEach((c) => c.play().catch(() => {})); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); }
        } else if (clips) {
          clips.forEach((c) => c.pause());
          cancelAnimationFrame(raf);
        }
      }), { rootMargin: '200px 0px', threshold: 0.01 }).observe(d);
    });
  }

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

  // ── a task, drawn: the Done when pills are on the task itself. Each shows its own check filling, then "Counted."
  // It moves through them by itself; a tap shows that one and holds it. ──
  const task = document.querySelector('[data-task]');
  if (task) {
    const q = (k) => task.querySelector('[data-k="' + k + '"]');
    const pills = [...task.querySelectorAll('.pill')];
    const marks = [...task.querySelectorAll('[data-pill]')];
    const kinds = [
      ['Run 5 km before dinner.', (k) => (3.2 + 1.8 * k).toFixed(1) + ' km', 'of 5 km'],
      ['Be home by 6:00 pm.', (k) => (k < 1 ? Math.ceil(9 * (1 - k)) + ' min' : 'Home'), 'from the door'],
      ['Tap the tag by the door.', (k) => (k < 1 ? 'Hold near' : 'Tapped'), 'the tag by the door'],
      ['8,000 steps by 9:00 pm.', (k) => Math.round(6400 + 1600 * k).toLocaleString('en-US'), 'of 8,000 steps'],
      ['Make the bed. A photo when it is done.', (k) => (k < 1 ? 'Photo' : 'Sent'), 'taken right now'],
      ['Stretch for ten minutes.', (k) => (k < 1 ? 'Waiting' : 'Done'), "on Luna's word"],
    ];
    let at = -1, t0 = 0, raf = 0, on = false, holdUntil = 0, next = 0;
    const frame = (now) => {
      raf = 0;
      const k = Math.min(1, (now - t0) / 2400);
      q('prog').style.strokeDasharray = (100 * (0.18 + 0.82 * k)).toFixed(1) + ' 100';
      q('val').textContent = kinds[at][1](k);
      if (k < 1) { if (on) raf = requestAnimationFrame(frame); return; }
      task.classList.add('done');
      q('say').textContent = 'Counted. He sees it now.';
      clearTimeout(next);
      next = setTimeout(() => { if (on && !still) show((at + 1) % kinds.length); }, Math.max(2600, holdUntil - Date.now()));
    };
    const show = (n) => {
      at = n; clearTimeout(next); cancelAnimationFrame(raf); raf = 0;
      task.classList.remove('done');
      q('line').textContent = kinds[n][0]; q('sub').textContent = kinds[n][2]; q('say').textContent = '';
      pills.forEach((p, i) => p.setAttribute('aria-pressed', String(i === n)));
      marks.forEach((m, i) => m.classList.toggle('on', i === n));
      t0 = performance.now() + 500;
      if (still) { q('prog').style.strokeDasharray = '100 100'; q('val').textContent = kinds[n][1](1); task.classList.add('done'); return; }
      q('prog').style.strokeDasharray = '18 100'; q('val').textContent = kinds[n][1](0);
      if (on) raf = requestAnimationFrame(frame);
    };
    pills.forEach((p, i) => p.addEventListener('click', () => { holdUntil = Date.now() + 9000; show(i); }));
    watch(task, (v) => { on = v; if (v) show(at < 0 ? 0 : at); else { clearTimeout(next); cancelAnimationFrame(raf); raf = 0; } });
    marks[0].classList.add('on');
  }

  // ── the shop, drawn: Redeem puts the points on hold and the balance drops. Left alone, thirty points arrive and
  // two rewards are redeemed, then it starts again. ──
  const shop = document.querySelector('[data-shop]');
  if (shop) {
    const q = (k) => shop.querySelector('[data-k="' + k + '"]');
    const btns = [...shop.querySelectorAll('.rdm')];
    const rows = [...shop.querySelectorAll('[data-row]')];
    const START = 590;
    let bal = START, shownBal = START, raf = 0, ts = [], on = false, mine = 0;
    const clear = () => { ts.forEach(clearTimeout); ts = []; };
    const later = (f, ms) => ts.push(setTimeout(f, ms));
    const paint = () => {
      q('bal').textContent = String(Math.round(shownBal));
      q('unit').setAttribute('dx', String(8 + String(Math.round(shownBal)).length * 22));
      rows.forEach((r, i) => { if (!r.classList.contains('held')) r.classList.toggle('short', Number(btns[i].dataset.p) > bal); });
    };
    const count = () => {
      raf = 0;
      const d = bal - shownBal;
      if (Math.abs(d) < 1 || still) { shownBal = bal; paint(); return; }
      shownBal += d * 0.16; paint();
      raf = requestAnimationFrame(count);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(count); };
    const redeem = (i) => {
      const r = rows[i], p = Number(btns[i].dataset.p);
      if (r.classList.contains('held')) return;
      if (p > bal) { r.classList.remove('no'); void r.getBoundingClientRect(); r.classList.add('no'); q('say').textContent = 'Not enough points yet.'; return; }
      bal -= p; r.classList.add('held'); r.querySelector('.rt').textContent = 'On hold';
      btns[i].setAttribute('aria-label', 'On hold'); q('say').textContent = p + ' points on hold. Balance ' + bal + '.';
      go();
    };
    const reset = () => {
      bal = START; shownBal = START; q('earn').classList.remove('on');
      rows.forEach((r, i) => { r.classList.remove('held', 'no'); r.querySelector('.rt').textContent = 'Redeem for ' + btns[i].dataset.p; });
      paint();
    };
    const demo = () => {
      clear(); reset();
      if (!on || still) return;
      later(() => { q('earn').classList.add('on'); bal += 30; go(); }, 1400);
      later(() => q('earn').classList.remove('on'), 3400);
      later(() => { if (Date.now() > mine) redeem(0); }, 4200);
      later(() => { if (Date.now() > mine) redeem(2); }, 6400);
      later(demo, 10500);
    };
    btns.forEach((b, i) => b.addEventListener('click', () => { mine = Date.now() + 12000; clear(); redeem(i); later(demo, 12000); }));
    watch(shop, (v) => { on = v; if (v) demo(); else clear(); });
    reset();
  }

  // ── the water, drawn: pick a drink, add it, and it pours in and settles at the bottom as its own band while the
  // page fills. Left alone it adds one now and then; at the day's amount it rests, then starts the day again. ──
  const water = document.querySelector('[data-water]');
  if (water) {
    const NS = 'http://www.w3.org/2000/svg';
    const q = (k) => water.querySelector('[data-k="' + k + '"]');
    const chips = [...water.querySelectorAll('.chip')];
    const marks = [...water.querySelectorAll('[data-chip]')];
    const drinks = [['Water', 'water', '#3E86E0'], ['Coffee', 'coffee', '#8A5A3C'], ['Tea', 'tea', '#C99A3A'], ['Juice', 'juice', '#F0A04B']];
    const GOAL = 68, PX = 3.1;
    let pick = 1, total = 0, list = [], ts = [], on = false, mine = 0;
    const clear = () => { ts.forEach(clearTimeout); ts = []; };
    const later = (f, ms) => ts.push(setTimeout(f, ms));
    const lay = () => {
      const top = 400 - (total - 34) * 3.4; // the surface rises as the day fills
      q('sea').style.translate = '0 ' + top + 'px';
      const ny = (top - 400) + 'px';
      q('num').style.translate = '0 ' + ny; q('oz').style.translate = (String(total).length > 1 ? 0 : -22) + 'px ' + ny;
      q('num').textContent = String(total);
      let y = 874;
      list.forEach((b) => {
        const hgt = b.oz * PX; y -= hgt;
        b.rect.setAttribute('height', String(hgt + 1)); b.rect.style.translate = '0 ' + y + 'px';
        b.text.style.translate = '0 ' + (y + hgt / 2 + 4) + 'px'; b.text.style.opacity = hgt >= 20 ? '1' : '0';
      });
    };
    const add = (d, oz, quiet) => {
      if (total + oz > GOAL) return false;
      const rect = document.createElementNS(NS, 'rect'), text = document.createElementNS(NS, 'text');
      rect.setAttribute('class', 'band'); rect.setAttribute('x', '0'); rect.setAttribute('width', '402'); rect.setAttribute('fill', drinks[d][2]); rect.setAttribute('fill-opacity', d ? '.92' : '.55');
      rect.style.translate = '0 874px';
      text.setAttribute('class', 'bl'); text.setAttribute('x', '22'); text.textContent = drinks[d][0] + ' · ' + oz + ' oz'; text.style.translate = '0 890px';
      q('bands').append(rect, text);
      list.push({ oz, rect, text }); total += oz;
      if (!quiet && !still) {
        const st = q('stream'); st.setAttribute('fill', drinks[d][2]); st.classList.add('go'); st.setAttribute('height', '880');
        later(() => { st.classList.remove('go'); later(() => st.setAttribute('height', '0'), 300); }, 560);
        later(lay, 420);
      } else { void rect.getBoundingClientRect(); lay(); }
      q('say').textContent = total + ' of ' + GOAL + ' ounces.';
      return true;
    };
    const choose = (d) => {
      pick = d;
      marks.forEach((m, i) => m.classList.toggle('on', i === d));
      chips.forEach((c, i) => c.setAttribute('aria-pressed', String(i === d)));
      q('add').textContent = '+ Add 8 oz ' + drinks[d][1];
      water.querySelector('.addb').setAttribute('aria-label', 'Add 8 ounces of ' + drinks[d][1]);
    };
    const reset = () => { q('bands').textContent = ''; list = []; total = 0; add(0, 9, true); add(0, 17, true); add(0, 8, true); choose(1); };
    const demo = () => {
      clear();
      if (!on || still) return;
      const order = [1, 0, 2, 0];
      const stepIn = (n) => later(() => {
        if (Date.now() < mine) return stepIn(n);
        if (total + 8 > GOAL) { later(() => { reset(); demo(); }, 3800); return; }
        choose(order[n % order.length]); later(() => add(pick, 8), 500); stepIn(n + 1);
      }, 3200);
      stepIn(0);
    };
    chips.forEach((c, i) => c.addEventListener('click', () => { mine = Date.now() + 9000; choose(i); }));
    water.querySelector('.addb').addEventListener('click', () => { mine = Date.now() + 9000; if (!add(pick, 8)) { reset(); } });
    watch(water, (v) => { on = v; if (v) demo(); else clear(); });
    reset();
  }

  // ── the road home, drawn: the minutes and miles run down, the posts pass, and the porch light comes up ──
  const road = document.querySelector('[data-road]');
  if (road) {
    const q = (k) => road.querySelector('[data-k="' + k + '"]');
    const posts = [...road.querySelectorAll('.post')];
    const LOOP = 12000, HOLD = 2200;
    let t0 = 0, raf = 0, on = false;
    const draw = (ms) => {
      const k = Math.min(1, ms / LOOP);
      const e = k * k * (3 - 2 * k);
      const min = Math.max(0, Math.ceil(15 * (1 - k)));
      q('min').textContent = k >= 1 ? 'Home' : min + ' min';
      q('mi').textContent = (3.4 * (1 - k)).toFixed(1) + ' mi';
      q('me').setAttribute('transform', 'translate(201 ' + (700 - 190 * e).toFixed(1) + ') scale(' + (1 - 0.3 * e).toFixed(3) + ')');
      q('porch').setAttribute('r', String(30 + 150 * Math.pow(k, 3)));
      q('porch').style.opacity = String(0.15 + 0.85 * Math.pow(k, 2));
      q('win').style.opacity = String(0.15 + 0.85 * Math.pow(k, 4));
      posts.forEach((p, i) => {
        const side = i % 2 ? 1 : -1;
        const u = ((Math.floor(i / 2) / 6) + (ms / 2600)) % 1;
        const d = u * u;
        const y = 438 + 436 * d;
        p.setAttribute('transform', 'translate(' + (201 + side * (207 * d + 16 * d + 6)).toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (0.3 + 1.5 * d).toFixed(2) + ')');
        p.style.opacity = String(Math.min(1, 0.2 + 2 * d));
      });
    };
    const frame = (now) => {
      raf = 0; if (!on) return;
      let ms = now - t0;
      if (ms > LOOP + HOLD) { t0 = now; ms = 0; }
      draw(ms);
      raf = requestAnimationFrame(frame);
    };
    draw(LOOP * 0.45);
    if (!still) watch(road, (v) => { on = v; if (v && !raf) { t0 = performance.now(); raf = requestAnimationFrame(frame); } });
  }

  // ── the watch on a run, drawn: the numbers tick, Theo's cheer lands, then it rides along as a pill ──
  const cheer = document.querySelector('[data-cheer]');
  if (cheer) {
    const q = (k) => cheer.querySelector('[data-k="' + k + '"]');
    let sec = 18, iv = 0;
    const draw = () => {
      q('t').textContent = '0:' + String(sec).padStart(2, '0');
      q('d').textContent = (sec * 0.0018).toFixed(2);
      q('p').textContent = sec % 4 < 2 ? '8:58' : '8:57';
      q('h').textContent = String(148 + (sec % 3 === 0 ? 1 : 0));
      const n = sec - 18;
      cheer.dataset.s = n < 3 ? '0' : n < 6 ? '1' : '2';
    };
    draw();
    if (!still) watch(cheer, (v) => {
      clearInterval(iv);
      if (v) iv = setInterval(() => { sec = sec >= 30 ? 18 : sec + 1; draw(); }, 1000);
    });
    else { sec = 24; draw(); cheer.dataset.s = '2'; }
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
