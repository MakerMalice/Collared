/* Collared · /between. Testers rate the app, list wishes, say what they don't like. Posts once, to the app's own function
   (`tester-note`), which hands it to the owner's Discord. No cookies, no analytics, nothing about who. The unsent draft stays
   in this browser and goes when it sends. Pictures are redrawn here first, so their location and camera details never leave. */
(() => {
  const ENDPOINT = 'https://msuqgzmyzmfonfexzfyu.supabase.co/functions/v1/tester-note';
  const KEY = 'collared-between-draft';
  const BITS = 14;
  const MAX = { wishes: 20, wish: 300, bad: 4000, name: 40, pic: 700000, batch: 10, bytes: 4000000 };
  const MAIN = [['look', 'Look and feel'], ['easy', 'Easy to use'], ['steady', 'Fast and steady']];
  const MORE = [['tasks', 'Tasks'], ['rewards', 'Rewards'], ['held', 'Held'], ['location', 'Location'], ['glimpses', 'Glimpses'], ['messages', 'Messages'], ['journal', 'Journal'], ['reading', 'Read Together'], ['movement', 'Movement'], ['care', 'Care'], ['studio', 'Sub Studio'], ['social', 'Social']];
  const WORDS = ['', 'Not for me', 'Rough', 'It’s fine', 'Good', 'Love it'];

  const $ = (id) => document.getElementById(id);
  const form = $('bt-form'), who = form.querySelector('.bt-who'), send = $('bt-send'), bad = $('bt-bad'), nameBox = $('bt-name'), anon = $('bt-anon');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const len = (s) => [...s].length;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uuid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join('-');
  };

  let scores = {}, used = [], pictures = [], ids = [], id = uuid(), tried = '', sending = false;

  // ── the ring ──
  const rings = [$('bt-ring'), $('bt-ring2')];
  const mini = document.querySelector('.nav-ring');
  if (mini) { mini.className = 'nav-ring bt-mini'; mini.innerHTML = $('bt-ring').innerHTML; rings.push(mini); }
  const light = (done) => rings.forEach((r) => done.forEach((on, i) => r.querySelector('.t' + (i + 1)).classList.toggle('on', !!on)));
  if (mini) {
    mini.style.opacity = '0';
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { mini.style.opacity = e.isIntersecting || form.hidden ? '0' : '1'; }, { rootMargin: '-60px 0px 0px' }).observe($('bt-ring'));
  }

  // ── ratings ──
  function rate(key, label) {
    const f = el('div', 'bt-rate'); f.dataset.key = key; f.setAttribute('role', 'radiogroup');
    const lab = el('span', 'lab', label); lab.id = 'l-' + key; f.setAttribute('aria-labelledby', lab.id);
    const w = el('span', 'bt-word'); w.setAttribute('aria-hidden', 'true');
    const dots = el('div', 'bt-dots');
    for (let n = 1; n <= 5; n++) {
      const l = el('label'); const i = el('input'); i.type = 'radio'; i.name = 'r-' + key; i.value = n; i.setAttribute('aria-label', WORDS[n] + ', ' + n + ' of 5');
      l.append(i);
      l.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="a" cx="22" cy="22" r="18"/><circle class="b s' + n + '" cx="22" cy="22" r="18" pathLength="100"/></svg><span aria-hidden="true">' + n + '</span>');
      // A second tap on the same ring takes it back.
      let was = false;
      l.addEventListener('pointerdown', () => { was = i.checked; });
      i.addEventListener('click', () => { if (was && scores[key] === n) { i.checked = false; delete scores[key]; show(); changed(); } was = false; });
      i.addEventListener('change', () => { scores[key] = n; show(); changed(); });
      i.addEventListener('keydown', (e) => { if (e.key === 'Backspace' || e.key === 'Delete') { i.checked = false; delete scores[key]; show(); changed(); } });
      dots.append(l);
    }
    const show = () => { const v = scores[key] || 0; w.textContent = v ? WORDS[v] : 'Tap to rate'; f.dataset.score = v; f.querySelectorAll('input').forEach((x) => { x.checked = Number(x.value) === scores[key]; }); };
    f.append(lab, w, dots); show();
    return f;
  }
  MAIN.forEach(([k, t]) => $('bt-main').append(rate(k, t)));
  MORE.forEach(([k, t]) => {
    const b = el('button', '', t); b.type = 'button'; b.dataset.key = k; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { use(k, !used.includes(k)); changed(); });
    $('bt-chips').append(b);
  });
  function use(k, on) {
    $('bt-chips').querySelector('[data-key="' + k + '"]').setAttribute('aria-pressed', String(on));
    const row = $('bt-more').querySelector('[data-key="' + k + '"]');
    if (on && !row) { used.push(k); $('bt-more').append(rate(k, MORE.find((m) => m[0] === k)[1])); }
    if (!on) { used = used.filter((x) => x !== k); delete scores[k]; if (row) row.remove(); }
  }

  // ── wishes ──
  const list = $('bt-wishes');
  const areas = () => [...list.querySelectorAll('textarea')];
  // Not laid out yet (a hidden tab, a page still opening): leave it to the CSS, and measure when it is.
  const grow = (t) => { t.style.height = ''; if (t.offsetWidth && t.scrollHeight > t.offsetHeight) t.style.height = t.scrollHeight + 2 + 'px'; };
  function number() { areas().forEach((t, i) => { t.setAttribute('aria-label', 'Wish ' + (i + 1)); t.nextSibling.setAttribute('aria-label', 'Remove wish ' + (i + 1)); t.nextSibling.hidden = areas().length === 1 && !t.value; }); $('bt-add').hidden = areas().length >= MAX.wishes; }
  function wish(text, after) {
    const li = el('li'), t = el('textarea'); t.rows = 1; t.value = text || ''; t.setAttribute('enterkeyhint', 'next'); t.setAttribute('aria-describedby', 'e-wish'); t.placeholder = list.children.length ? 'And another' : 'I wish the app could';
    const x = el('button'); x.type = 'button'; x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
    x.addEventListener('click', () => { const i = areas().indexOf(t); if (areas().length === 1) { t.value = ''; } else li.remove(); number(); check(); changed(); (areas()[Math.max(0, i - 1)] || t).focus(); });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); next(t); }
      if (e.key === 'Backspace' && !t.value && areas().length > 1) { e.preventDefault(); const i = areas().indexOf(t); li.remove(); number(); areas()[Math.max(0, i - 1)].focus(); changed(); }
    });
    t.addEventListener('input', () => {
      if (t.value.includes('\n')) {
        // A pasted list becomes one wish a line. Past twenty, the rest stays in the last one so nothing is thrown away.
        const lines = t.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean); const room = MAX.wishes - areas().length + 1;
        const fit = lines.length > room ? [...lines.slice(0, room - 1), lines.slice(room - 1).join(' ')] : lines;
        t.value = fit[0] || ''; let at = li;
        fit.slice(1).forEach((s) => { at = wish(s, at); });
        (at.querySelector('textarea')).focus();
      }
      grow(t); number(); check(); changed();
    });
    li.append(t, x); if (after) after.after(li); else list.append(li);
    grow(t); number(); return li;
  }
  function next(t) {
    const i = areas().indexOf(t), n = areas()[i + 1];
    if (!t.value.trim()) return;
    if (n) return n.focus();
    if (areas().length < MAX.wishes) wish('', t.parentNode).querySelector('textarea').focus();
  }
  $('bt-add').addEventListener('click', () => { const e = areas().find((t) => !t.value.trim()); (e || wish('').querySelector('textarea')).focus(); });

  // ── words ──
  bad.addEventListener('input', () => { grow(bad); check(); changed(); });
  nameBox.addEventListener('input', () => { if (nameBox.value.trim()) { anon.checked = false; who.classList.remove('anon'); } who.classList.remove('need'); check(); changed(); });
  anon.addEventListener('change', () => { who.classList.toggle('anon', anon.checked); who.classList.remove('need'); check(); changed(); });

  const say = (n, text) => { const e = $(n); e.hidden = !text; e.textContent = text || ''; };
  /** What is too long, said as it happens. Answers the first thing to go to. */
  function check() {
    let first = null;
    const b = len(bad.value.trim()), over = b - MAX.bad, c = $('n-bad');
    c.hidden = b < MAX.bad * 0.8; c.classList.toggle('over', over > 0);
    c.textContent = b.toLocaleString() + ' of ' + MAX.bad.toLocaleString();
    say('e-bad', over > 0 ? 'That is ' + over.toLocaleString() + ' letters too long. Split it in two and send the rest after.' : '');
    bad.setAttribute('aria-invalid', String(over > 0));
    let msg = '';
    areas().forEach((t, i) => { const o = len(t.value.trim()) - MAX.wish; t.parentNode.classList.toggle('bad', o > 0); t.setAttribute('aria-invalid', String(o > 0)); if (o > 0 && !msg) { msg = 'Wish ' + (i + 1) + ' is ' + o.toLocaleString() + ' letters too long.'; first = t; } });
    say('e-wish', msg);
    if (over > 0 && !first) first = bad;
    const n = len(nameBox.value.trim()) - MAX.name;
    say('e-who', !anon.checked && n > 0 ? 'That name is too long.' : '');
    nameBox.setAttribute('aria-invalid', String(!anon.checked && n > 0));
    if (!anon.checked && n > 0 && !first) first = nameBox;
    return first;
  }

  // ── the pictures: each one redrawn here, so only its pixels leave. One at a time, so a phone isn't flooded ──
  const file = $('bt-file'), pics = $('bt-pics'), addText = $('bt-addpic').lastChild;
  $('bt-addpic').addEventListener('click', () => file.click());
  function dropPics() { pictures.forEach((p) => URL.revokeObjectURL(p.url)); pictures = []; pics.replaceChildren(); pics.hidden = true; file.value = ''; say('e-pic', ''); }
  const load = (f) => new Promise((res, rej) => { const u = URL.createObjectURL(f), i = new Image(); i.onload = () => { res(i); URL.revokeObjectURL(u); }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('picture')); }; i.src = u; });
  const label = () => pics.querySelectorAll('li').forEach((li, i) => { li.firstChild.alt = 'Picture ' + (i + 1); li.lastChild.setAttribute('aria-label', 'Remove picture ' + (i + 1)); });
  async function redraw(f) {
    const img = await load(f);
    let side = 1600, q = 0.82, blob = null;
    for (let k = 0; k < 8; k++) {
      const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      c.width = c.height = 0;
      if (blob && blob.type === 'image/jpeg' && blob.size <= MAX.pic) return blob;
      side *= 0.85; q = Math.max(0.55, q - 0.05);
    }
    throw new Error('picture');
  }
  function showPic(blob) {
    const p = { blob, url: URL.createObjectURL(blob) };
    const li = el('li'), im = el('img'), x = el('button'); im.src = p.url; x.type = 'button';
    x.innerHTML = '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></span>';
    x.addEventListener('click', () => {
      const i = pictures.indexOf(p); pictures.splice(i, 1); URL.revokeObjectURL(p.url); li.remove(); pics.hidden = !pictures.length; label(); changed();
      $('bt-live').textContent = 'Picture removed.'; (pics.querySelectorAll('button')[Math.min(i, pictures.length - 1)] || $('bt-addpic')).focus();
    });
    li.append(im, x); pictures.push(p); pics.append(li); pics.hidden = false; label();
  }
  let turn = 0, queue = Promise.resolve(), waiting = 0;
  file.addEventListener('change', () => {
    const fs = [...file.files]; file.value = ''; if (!fs.length) return;
    const mine = turn; let bad = 0; waiting += fs.length; say('e-pic', '');
    const tell = () => { addText.textContent = waiting ? 'Getting ' + waiting + ' ready' : pictures.length ? 'Add more' : 'Add pictures'; };
    tell();
    fs.forEach((f) => { queue = queue.then(async () => {
      if (mine !== turn) return;
      try { const b = await redraw(f); if (mine === turn) { showPic(b); changed(); } } catch { bad++; }
      if (mine === turn) { waiting--; tell(); }
    }); });
    queue = queue.then(() => {
      if (mine !== turn) return;
      $('bt-live').textContent = pictures.length + (pictures.length === 1 ? ' picture added.' : ' pictures added.');
      if (bad) say('e-pic', (bad === 1 ? 'One picture' : bad + ' pictures') + ' couldn’t be opened here. A screenshot or a JPEG will work.');
    });
  });
  const base64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

  // ── the draft, on this device only ──
  const wishes = () => areas().map((t) => t.value.trim()).filter(Boolean);
  const words = () => ({ scores, used, wishes: wishes(), bad: bad.value, name: nameBox.value, anon: anon.checked });
  let later = 0;
  function changed() {
    const w = words(), some = Object.keys(scores).length || w.wishes.length || w.bad.trim() || pictures.length;
    light([Object.keys(scores).length > 0, w.wishes.length > 0, !!w.bad.trim()]);
    $('bt-clear').hidden = !(some || used.length || w.name || w.anon);
    say('bt-error', '');
    // Changed since the last try: it is a new note, so an answer about the old one can't swallow it.
    if (tried && tried !== sig()) { id = uuid(); ids = []; tried = ''; }
    clearTimeout(later); later = setTimeout(save, 250);
    work();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ ...words(), id, tried })); } catch { /* private window */ } }
  const forget = () => { clearTimeout(later); try { localStorage.removeItem(KEY); } catch { /* private window */ } };
  const sig = () => JSON.stringify([words(), pictures.map((p) => p.blob.size)]);
  addEventListener('pagehide', () => { if (!form.hidden && !$('bt-clear').hidden) save(); });

  // ── the small piece of work that makes floods slow, done while they write ──
  let job = null;
  function work(want = id) {
    if (job && job.id === want) return job.p;
    const j = { id: want, p: null }; job = j;
    j.p = (async () => {
      const enc = new TextEncoder();
      for (let n = 0; ; n += 64) {
        if (job !== j) throw new Error('old');
        const hs = await Promise.all(Array.from({ length: 64 }, (_, k) => crypto.subtle.digest('SHA-256', enc.encode(j.id + ':' + (n + k)))));
        for (let k = 0; k < 64; k++) { const h = new Uint8Array(hs[k]); if (h[0] === 0 && Math.clz32(h[1]) - 24 >= BITS - 8) return n + k; }
        if (n % 1024 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    })();
    j.p.catch(() => {});
    return j.p;
  }

  // ── sending ──
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function busy(on) { sending = on; send.disabled = on; send.setAttribute('aria-busy', String(on)); send.textContent = on ? 'Sending' : 'Send it'; form.inert = on; }
  function go(to) { to.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' }); to.focus({ preventScroll: true }); }
  function stop(text) { say('bt-error', text); $('bt-error').scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' }); }
  const KEPT = ' Your words are safe on this device. Press Send again in a bit.';

  async function post(text) {
    let error = 'later';
    for (let k = 0; k < 4; k++) {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 90000);
      try {
        const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: ctl.signal });
        const d = await r.json().catch(() => ({}));
        error = r.ok && d.ok ? '' : d.error || 'later';
      } finally { clearTimeout(t); }
      if (error !== 'busy') break;
      await wait(4000);
    }
    return error;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    say('bt-error', '');
    const w = words();
    if (!Object.keys(scores).length && !w.wishes.length && !w.bad.trim() && !pictures.length && !waiting) { stop('Nothing here yet. One rating, one wish or one sentence is enough.'); return; }
    const first = check();
    if (first) return go(first);
    if (!w.anon && !w.name.trim()) { who.classList.add('need'); say('e-who', 'Type your Discord name, or tick Stay anonymous.'); return go(nameBox); }
    if (navigator.onLine === false) return stop('You’re offline.' + KEPT);
    busy(true);
    while (waiting) { await queue; }
    // Discord takes ten pictures a message: a big set goes as several, each with its own id, so a second press never repeats one.
    const sets = [[]]; let bytes = 0;
    pictures.forEach((p) => { if (sets[sets.length - 1].length >= MAX.batch || (bytes && bytes + p.blob.size > MAX.bytes)) { sets.push([]); bytes = 0; } sets[sets.length - 1].push(p); bytes += p.blob.size; });
    while (ids.length < sets.length) ids.push(ids.length ? uuid() : id);
    tried = sig(); save();
    let error = 'later';
    try {
      for (let s = 0; s < sets.length; s++) {
        if (sets.length > 1) send.textContent = 'Sending ' + (s + 1) + ' of ' + sets.length;
        const note = { id: ids[s], website: $('bt-website').value };
        if (s === 0) Object.assign(note, { scores: { ...scores }, wishes: w.wishes, dislike: w.bad.trim() });
        if (w.anon) note.anonymous = true; else note.name = w.name.trim();
        if (sets.length > 1) Object.assign(note, { note: id.slice(0, 4), part: s + 1, of: sets.length });
        if (sets[s].length) note.pictures = await Promise.all(sets[s].map((p) => base64(p.blob)));
        note.work = await work(ids[s]);
        error = await post(JSON.stringify(note));
        if (error) break;
      }
    } catch { error = navigator.onLine === false ? 'offline' : 'later'; }
    busy(false);
    if (!error) return done();
    if (error === 'bad_picture' || error === 'too_large') { say('e-pic', 'One of those pictures couldn’t be sent. Remove it and press Send again.'); return go($('bt-addpic')); }
    const why = { offline: 'You’re offline.', full: 'A lot of notes came in at once.', off: 'This page is resting right now.', busy: 'It’s still on its way.' }[error] || 'It didn’t go through.';
    stop(why + KEPT);
    send.focus({ preventScroll: true });
  });

  function done() {
    reset();
    form.hidden = true; $('bt-done').hidden = false; document.querySelector('.bt-grid').classList.add('sent');
    if (mini) mini.style.opacity = '0';
    scrollTo({ top: 0, behavior: 'auto' });
    requestAnimationFrame(() => requestAnimationFrame(() => $('bt-ring2').toggleAttribute('data-closed', true)));
    $('bt-doneh').focus({ preventScroll: true });
    $('bt-live').textContent = 'Sent.';
  }
  function reset() {
    scores = {}; used.slice().forEach((k) => use(k, false)); used = [];
    $('bt-main').replaceChildren(); MAIN.forEach(([k, t]) => $('bt-main').append(rate(k, t)));
    list.replaceChildren(); wish('');
    bad.value = ''; bad.style.height = ''; nameBox.value = ''; anon.checked = false; who.classList.remove('anon', 'need');
    turn++; waiting = 0; dropPics(); addText.textContent = 'Add pictures'; id = uuid(); ids = []; tried = ''; job = null; say('bt-error', ''); check(); light([0, 0, 0]); $('bt-clear').hidden = true;
    forget();
  }
  $('bt-again').addEventListener('click', () => {
    $('bt-done').hidden = true; form.hidden = false; $('bt-ring2').removeAttribute('data-closed'); document.querySelector('.bt-grid').classList.remove('sent');
    scrollTo({ top: 0 }); $('main').focus({ preventScroll: true });
  });
  let sure = 0;
  $('bt-clear').addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (!sure) { b.textContent = 'Tap again to clear it all'; sure = setTimeout(() => { sure = 0; b.textContent = 'Start over'; }, 4000); return; }
    clearTimeout(sure); sure = 0; b.textContent = 'Start over'; reset(); scrollTo({ top: 0 }); $('main').focus({ preventScroll: true });
  });

  // Any change of width (a Duo opening, a turn, the first layout) measures every box again.
  let wide = 0;
  const regrow = () => { if (form.offsetWidth) { wide = form.offsetWidth; areas().forEach(grow); grow(bad); } };
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (form.offsetWidth !== wide) requestAnimationFrame(regrow); }).observe(form);
  else addEventListener('resize', regrow);
  addEventListener('pageshow', regrow);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) regrow(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(regrow);

  // ── what was left here last time ──
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* private window */ }
  wish('');
  if (d && typeof d === 'object') {
    const ok = (k) => [...MAIN, ...MORE].some((m) => m[0] === k);
    (Array.isArray(d.used) ? d.used : []).forEach((k) => { if (MORE.some((m) => m[0] === k)) use(k, true); });
    Object.entries(d.scores || {}).forEach(([k, v]) => { if (ok(k) && v >= 1 && v <= 5) { scores[k] = v; const r = form.querySelector('.bt-rate[data-key="' + k + '"]'); if (r) r.replaceWith(rate(k, [...MAIN, ...MORE].find((m) => m[0] === k)[1])); } });
    const ws = (Array.isArray(d.wishes) ? d.wishes : []).map(String).slice(0, MAX.wishes);
    if (ws.length) { list.replaceChildren(); ws.forEach((t) => wish(t)); }
    bad.value = String(d.bad || ''); nameBox.value = String(d.name || ''); anon.checked = d.anon === true; who.classList.toggle('anon', anon.checked);
    if (/^[0-9a-f-]{36}$/.test(d.id || '')) { id = d.id; tried = String(d.tried || ''); }
    grow(bad); check(); changed();
  } else light([0, 0, 0]);
})();
