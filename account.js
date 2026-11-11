/* ════════════════════════════════════════════════════════════════════
   collared.app/account (D2085)
   Sign in with the same account as the app, and look after it: All the
   way (while its switch is out of the dark), your devices, sign out
   everywhere, delete with thirty days to change your mind.

   - Nobody makes an account here. The email code never makes one; a new
     account made by Apple, Google or Discord is removed by the server at
     once and the page says where to go instead.
   - This tab only: the sign-in lives in sessionStorage, gone when the tab
     closes, and is ended after 30 minutes with nothing touched.
   - Every change goes through the account-web function, which checks the
     origin, counts tries, and wants a sign-in from the last ten minutes for
     the switches that matter. The page can't skip those checks.
   - Nothing about what you change goes in the address or the tab title.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // A page drawn inside another site's frame could be tapped through by it. This one refuses to draw there.
  if (window.top !== window.self) {
    document.documentElement.textContent = "";
    return;
  }

  var CFG = window.COLLARED_ACCOUNT;
  var FN = CFG.url + "/functions/v1/account-web";
  var IDLE_MS = 30 * 60 * 1000;
  var LAST = "collared.account.last";
  var NOTE = "collared.account.note";

  var sb = window.supabase.createClient(CFG.url, CFG.key, {
    auth: {
      storage: window.sessionStorage,
      storageKey: "collared.account.session",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });

  // ── words ──────────────────────────────────────────────────────────────
  var HEAT = ["Sweet", "Warm", "Hot", "All the way"];
  var WAYS = { apple: "Apple", google: "Google", discord: "Discord" };
  var EVENTS = {
    signed_in_phone: "Signed in with your phone",
    all_the_way_on: "All the way turned on",
    all_the_way_off: "All the way turned off",
    signed_out_everywhere: "Signed out everywhere",
    closed: "Account closed",
    restored: "Account kept",
  };
  var ERR = {
    rate_limited: "Too many tries. Give it ten minutes.",
    not_fresh: "Sign in again first. Changes like this need a sign-in from the last ten minutes.",
    age_unconfirmed: "Your account hasn’t confirmed you’re 18 or over, so this stays off.",
    not_approved: "This opens once you’re in the beta.",
    closed: "Your account is closing. Keep it first.",
    off: "This isn’t open yet.",
    username: "That isn’t your username. Type it exactly as it shows above.",
    origin: "This page can’t reach Collared from here.",
    failed: "That didn’t go through. Try again.",
    network: "Collared can’t be reached right now. Check your connection and try again.",
  };
  var errText = function (code) { return ERR[code] || ERR.failed; };

  // ── tiny helpers ───────────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var I = function (id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var day = function (iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long" });
  };
  var when = function (iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + ", " +
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  var seen = function (dateOnly) {
    if (!dateOnly) return "";
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var d = new Date(dateOnly + "T00:00:00");
    var days = Math.round((today - d) / 86400000);
    if (days <= 0) return "Seen today";
    if (days === 1) return "Seen yesterday";
    return "Seen " + d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };
  var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var clock = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  function thisBrowser() {
    var u = navigator.userAgent;
    var b = /Edg\//.test(u) ? "Edge" : /Firefox\//.test(u) ? "Firefox" : /Chrome\/|CriOS\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "A browser";
    var o = /iPhone/.test(u) ? "an iPhone" : /iPad/.test(u) ? "an iPad" : /Android/.test(u) ? "Android" : /Mac OS X/.test(u) ? "a Mac" : /Windows/.test(u) ? "Windows" : /Linux/.test(u) ? "Linux" : "";
    return o ? b + " on " + o : b;
  }

  // ── state ──────────────────────────────────────────────────────────────
  var S = {
    view: "loading",
    account: null,
    fresh: false,
    email: "",
    note: null,       // a line above the sign-in: why you were signed out
    toast: null,      // a line above the account: what just happened
    error: null,
    busy: false,
    provider: null,   // the way in a refused new account used
    qr: null,         // { id, waiter, qr, expires, state }
    resendAt: 0,
  };
  var qrTimer = null;
  var tick = null;

  // ── the function ───────────────────────────────────────────────────────
  async function call(action, extra, signedIn) {
    var headers = { "Content-Type": "application/json", apikey: CFG.key };
    if (signedIn) {
      var s = (await sb.auth.getSession()).data.session;
      if (!s) return { status: 401, body: { error: "signed_out" } };
      headers.Authorization = "Bearer " + s.access_token;
    }
    try {
      var res = await fetch(FN, { method: "POST", headers: headers, body: JSON.stringify(Object.assign({ action: action }, extra || {})), credentials: "omit", cache: "no-store" });
      var body = await res.json().catch(function () { return {}; });
      return { status: res.status, body: body || {} };
    } catch (e) {
      return { status: 0, body: { error: "network" } };
    }
  }

  // ── idle: 30 minutes with nothing touched ends the sign-in ─────────────
  function touch() { try { sessionStorage.setItem(LAST, String(Date.now())); } catch (e) { /* private mode */ } }
  function idleFor() {
    var at = Number(sessionStorage.getItem(LAST) || 0);
    return at ? Date.now() - at : 0;
  }
  async function checkIdle() {
    var s = (await sb.auth.getSession()).data.session;
    if (s && idleFor() > IDLE_MS) await signOutHere("idle");
  }
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { if (idleFor() <= IDLE_MS) touch(); }, { passive: true });
  });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) checkIdle(); });
  window.addEventListener("focus", checkIdle);
  setInterval(checkIdle, 20000);

  // ── signing out ────────────────────────────────────────────────────────
  var NOTES = {
    idle: "You were signed out after 30 minutes away.",
    everywhere: "You’re signed out everywhere. Every phone and browser signed in as you has to sign in again.",
    out: "You’re signed out.",
    expired: "Your sign-in ran out. Sign in again.",
  };
  async function signOutHere(why) {
    stopQr();
    await sb.auth.signOut({ scope: "local" }).catch(function () {});
    try { sessionStorage.removeItem(LAST); } catch (e) { /* */ }
    S.account = null; S.fresh = false; S.toast = null; S.email = "";
    S.note = why ? NOTES[why] : null;
    go("out");
  }

  // ── after any sign-in: who is this? ────────────────────────────────────
  async function hello(toast) {
    S.view = "loading"; render();
    var r = await call("hello", null, true);
    if (r.body && r.body.error === "no_account") {
      // The server already removed the empty account this sign-in made. Nothing of it is kept.
      await sb.auth.signOut({ scope: "local" }).catch(function () {});
      S.provider = r.body.provider || null;
      return go("new");
    }
    if (r.status === 401) return signOutHere("expired");
    if (r.body && r.body.error === "not_approved") {
      // An account the beta hasn't let in yet: nothing here opens for it. It signs out and says so.
      await sb.auth.signOut({ scope: "local" }).catch(function () {});
      return go("waiting");
    }
    if (r.status !== 200 || !r.body.account) {
      S.error = errText(r.body && r.body.error);
      await sb.auth.signOut({ scope: "local" }).catch(function () {});
      return go("out");
    }
    touch();
    S.account = r.body.account;
    S.fresh = !!r.body.fresh;
    S.toast = toast || null;
    go(S.account.closed_at ? "closed" : "home");
  }

  // ── views ──────────────────────────────────────────────────────────────
  function go(view) {
    if (view !== "qr") stopQr();
    S.view = view;
    S.busy = false;
    render();
    window.scrollTo(0, 0);
  }

  function ways() {
    return '<button class="b b-apple" type="button" data-act="oauth" data-p="apple">' + I("i-apple") + "Continue with Apple</button>" +
      '<button class="b b-google" type="button" data-act="oauth" data-p="google">' + I("i-google") + "Continue with Google</button>" +
      '<button class="b b-discord" type="button" data-act="oauth" data-p="discord">' + I("i-discord") + "Continue with Discord</button>";
  }
  // While signing in again for a change that matters, back means back to the account, not the signed-out page.
  function backLink() {
    return S.account ? '<button class="back" type="button" data-go="home">' + I("i-back") + "Account</button>"
      : '<button class="back" type="button" data-go="out">' + I("i-back") + "Other ways in</button>";
  }
  function errLine() { return S.error ? '<p class="err" role="alert">' + esc(S.error) + "</p>" : ""; }

  var V = {
    loading: function () {
      return ['Your account.', '', '<div class="acct-card"><p class="mu center">One moment…</p></div>'];
    },

    out: function () {
      var html = (S.note ? '<div class="note">' + esc(S.note) + "</div>" : "") +
        '<div class="acct-card">' + ways() +
        (QR_ON ? '<button class="b b-soft" type="button" data-act="qr">' + I("i-scan") + "Sign in with your phone</button>" : "") +
        '<div class="or">or</div>' +
        '<form id="f-email" novalidate><label class="f" for="em">Email</label>' +
        '<input class="field" id="em" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="you@example.com" value="' + esc(S.email) + '">' +
        '<button class="b b-violet gap" type="submit"' + (S.busy ? " disabled" : "") + ">Email me a code</button></form>" +
        errLine() +
        '<p class="center gap"><button class="linkbtn" type="button" data-go="password">Use my password</button></p>' +
        "</div>" +
        '<p class="foot">New to Collared? Accounts are made in the app.</p>';
      return ["Sign in to Collared.", "Use the same way you sign in on your phone.", html];
    },

    code: function () {
      var wait = Math.max(0, Math.ceil((S.resendAt - Date.now()) / 1000));
      var html = '<div class="acct-card"><form id="f-code" novalidate>' +
        '<label class="f" for="code">Your code</label>' +
        '<input class="field code" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="······">' +
        '<button class="b b-violet gap" type="submit"' + (S.busy ? " disabled" : "") + ">Sign in</button></form>" + errLine() +
        '<p class="center mu small gap">' + (wait > 0 ? "You can ask for a new code in " + clock(wait) + "." :
          '<button class="linkbtn" type="button" data-act="resend">Send a new code</button>') + "</p>" +
        (S.account ? "" : '<p class="center"><button class="linkbtn" type="button" data-go="out">Use a different email</button></p>') + "</div>" +
        '<p class="foot">No code after a minute? Check your spam, or try the way you first signed up. New accounts start in the app.</p>';
      if (S.account) html = backLink() + html;
      return ["Check your email.", "If there’s a Collared account for " + S.email + ", a six digit code is on its way.", html];
    },

    password: function () {
      var html = backLink() +
        '<div class="acct-card"><form id="f-pass" novalidate>' +
        '<label class="f" for="pem">Email</label><input class="field" id="pem" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" value="' + esc(S.email) + '">' +
        '<label class="f" for="pw">Password</label><input class="field" id="pw" type="password" autocomplete="current-password">' +
        '<button class="b b-violet gap" type="submit"' + (S.busy ? " disabled" : "") + ">Sign in</button></form>" + errLine() +
        (S.account ? "" : '<p class="center gap"><button class="linkbtn" type="button" data-go="out">Email me a code instead</button></p>') + "</div>";
      return [S.account ? "Sign in again." : "Sign in with your password.", "The one you use in the app.", html];
    },

    qr: function () {
      var q = S.qr || {};
      var state = q.state || "starting";
      var left = q.expires ? (q.expires - Date.now()) / 1000 : 120;
      var line = {
        starting: "Making a code…",
        waiting: "This code runs out in " + clock(left) + ".",
        approved: "Your phone said yes. Signing you in…",
        expired: "This code ran out.",
        declined: "Your phone said no, so nothing was signed in.",
        used: "This code was already used.",
        gone: "This code ran out.",
        failed: ERR.failed,
        no_email: "Your account has no email, so this way in can’t work for it. Sign in with Apple, Google or Discord instead.",
        off: ERR.off,
        limited: ERR.rate_limited,
      }[state] || ERR.failed;
      var done = state !== "waiting" && state !== "starting" && state !== "approved";
      var html = backLink() +
        '<div class="acct-card"><div class="qr-wrap">' +
        '<div class="qr' + (done ? " dim" : "") + '" role="img" aria-label="A code for your phone to scan">' + (q.svg || "") + "</div>" +
        '<p class="qr-clock" role="status">' + esc(line) + "</p></div>" +
        (done ? '<button class="b b-violet" type="button" data-act="qr">Get a new code</button>' :
          '<ol class="steps"><li>Open Collared on your phone.</li><li>Go to <b>Settings</b>, <b>Your devices</b>, <b>Sign in on the web</b>.</li>' +
          "<li>Point your phone at this code and check it names this browser.</li></ol>") +
        "</div>" +
        '<p class="foot">Your phone needs to be one you’ve already let into your account.</p>';
      return ["Sign in with your phone.", "Nothing to type. Your phone says yes for you.", html];
    },

    new: function () {
      var via = WAYS[S.provider] ? "that " + WAYS[S.provider] + " sign-in" : "that sign-in";
      var html = '<div class="acct-card"><h3>Accounts are made in the app.</h3>' +
        '<p class="mu">Collared is in a small beta for now. Come and say hello in the Collared Discord, and apply for early access on the beta page. Nothing was kept from this try.</p>' +
        '<a class="b b-discord" href="' + esc(CFG.discord) + '" target="_blank" rel="noopener">' + I("i-discord") + "Join the Collared Discord</a>" +
        '<a class="b b-violet" href="' + esc(CFG.beta) + '">Apply for early access</a></div>' +
        '<div class="acct-card"><h3>Already in the app?</h3><p class="mu">You may have joined another way. Sign in here the way you do on your phone.</p>' +
        '<button class="b b-soft" type="button" data-go="out">Try another way</button></div>';
      return ["No account here yet.", "There’s no Collared account for " + via + ".", html];
    },

    waiting: function () {
      var html = '<div class="acct-card"><h3>Your account opens here once you’re in.</h3>' +
        '<p class="mu">Collared is in a small beta. We’ll open the door as soon as we can, and the app tells you when we do. Until then, you can look after your account in the app.</p>' +
        '<a class="b b-discord" href="' + esc(CFG.discord) + '" target="_blank" rel="noopener">' + I("i-discord") + "Join the Collared Discord</a>" +
        '<button class="b b-soft" type="button" data-go="out">Back to sign in</button></div>' +
        '<p class="foot">Want your account deleted? Write to hello@collared.app.</p>';
      return ["You’re on the list.", "Thanks for waiting.", html];
    },

    home: function () {
      var a = S.account;
      var html = (S.toast ? '<div class="toast" role="status">' + esc(S.toast) + "</div>" : "") + errLine();
      html += storyCard(a) + accountCard(a) + devicesShort(a) + recordCard(a) +
        '<div class="acct-card"><h2>Leaving</h2>' +
        '<button class="b b-soft" type="button" data-act="ask-everywhere">Sign out everywhere</button>' +
        '<button class="b b-redsoft" type="button" data-go="delete">Delete my account</button></div>';
      return ["Hi, " + (a.name || "@" + a.username) + ".", "@" + a.username, html];
    },

    devices: function () {
      var a = S.account;
      var phones = (a.devices || []).map(function (d) {
        return '<div class="acct-row"><span class="ic">' + I("i-phone") + '</span><div class="acct-grow"><div class="k">' + esc(d.noun) + "</div>" +
          '<div class="v">' + esc(seen(d.seen)) + "</div>" +
          '<span class="tag' + (d.trusted ? "" : " a") + '">' + (d.trusted ? "Opens your messages" : "Waiting for a yes") + "</span></div></div>";
      }).join("");
      if (a.watches) {
        phones += '<div class="acct-row"><span class="ic">' + I("i-watch") + '</span><div class="acct-grow"><div class="k">Apple Watch</div>' +
          '<div class="v">With your iPhone' + (a.watches > 1 ? ", " + a.watches + " in all" : "") + "</div></div></div>";
      }
      var html = '<button class="back" type="button" data-go="home">' + I("i-back") + "Account</button>" +
        '<div class="acct-card"><h2>Phones</h2>' + (phones || '<p class="mu">No phones yet. Sign in to the app and it shows here.</p>') +
        '<p class="mu small gap">To remove a phone, open Your devices in the app on a phone you have.</p></div>' +
        '<div class="acct-card"><h2>On the web</h2><div class="acct-row"><span class="ic">' + I("i-laptop") + '</span><div class="acct-grow">' +
        '<div class="k">This browser</div><div class="v">' + esc(thisBrowser()) + ", now</div></div></div></div>" +
        '<div class="acct-card"><h3>Sign out everywhere</h3><p class="mu">Every phone and browser signed in as you signs out now, this one too, and stops getting notifications, widgets and watch updates. Your phones stay yours: sign in again and your messages open as before.</p>' +
        '<button class="b b-violet" type="button" data-act="ask-everywhere">Sign out everywhere</button></div>';
      return ["Your devices.", "Where you’re signed in as @" + a.username + ".", html];
    },

    delete: function () {
      var a = S.account;
      var purge = new Date(Date.now() + 30 * 86400000).toISOString();
      var html = '<button class="back" type="button" data-go="home">' + I("i-back") + "Account</button>" +
        '<div class="acct-card"><h3>Your Collared account closes now.</h3>' +
        '<p class="mu">Your dynamics pause, you disappear from the app, and nobody can find you. Nothing is deleted for thirty days: sign in here or in the app before ' + esc(day(purge)) + " and you can have all of it back exactly as you left it.</p>" +
        '<p class="mu">After that, every photo, message, glimpse, recording and everything you wrote is deleted for good, and can’t be recovered by you or by us. Your partners keep the points history they could already see, shown as “Deleted user”.</p>' +
        '<p class="mu">A subscription from the App Store or Google Play keeps going until you cancel it there.</p>' +
        (S.fresh ? "" : '<p class="note">You’ll be asked to sign in again first.</p>') +
        '<form id="f-delete" novalidate><label class="f" for="un">Type <b>' + esc(a.username) + "</b> to confirm</label>" +
        '<input class="field" id="un" autocomplete="off" autocapitalize="none" spellcheck="false">' +
        '<button class="b b-red gap" type="submit"' + (S.busy ? " disabled" : "") + ">Delete my account</button></form>" + errLine() +
        '<button class="b b-soft" type="button" data-go="home">Keep my account</button></div>' +
        '<p class="foot">Questions first? Write to hello@collared.app.</p>';
      return ["Delete your account.", "@" + a.username, html];
    },

    closed: function () {
      var a = S.account;
      var html = (S.toast ? '<div class="toast" role="status">' + esc(S.toast) + "</div>" : "") + errLine() +
        '<div class="acct-card"><h3>Changed your mind?</h3><p class="mu">Keep it, and everything is as you left it. Your dynamics pick up where they paused.</p>' +
        '<button class="b b-violet" type="button" data-act="restore"' + (S.busy ? " disabled" : "") + ">Keep my account</button>" +
        '<button class="b b-soft" type="button" data-act="signout">Sign out</button></div>' +
        '<p class="foot">Every phone was signed out. Nothing is deleted until ' + esc(day(a.purge_at)) + ".</p>";
      var n = a.days_left;
      return ["Your account is closing.", "Everything goes on " + day(a.purge_at) + (n != null ? ", in " + n + (n === 1 ? " day." : " days.") : "."), html];
    },
  };

  function storyCard(a) {
    var t = a.all_the_way;
    if (!t || !a.approved) return "";
    var heat = Math.max(1, Math.min(4, t.heat || 3));
    var lamps = HEAT.slice(0, t.on ? 4 : 3).map(function (n, i) {
      return '<span class="lamp' + (i < heat ? " lit" : "") + '">' + n + "</span>";
    }).join("");
    return '<div class="acct-card"><h2>Story time</h2>' +
      '<div class="acct-row"><div class="acct-grow"><div class="k" id="atw-label">All the way</div>' +
      '<div class="v">Your own words in Story time, with no limit we set. Off until you turn it on.</div>' +
      (t.on ? '<span class="tag g">On since ' + esc(day(t.at)) + "</span>" : "") + "</div>" +
      '<button class="sw" type="button" role="switch" aria-checked="' + (t.on ? "true" : "false") + '" aria-labelledby="atw-label" data-act="atw"' + (S.busy ? " disabled" : "") + "></button></div>" +
      '<div class="acct-row"><div class="acct-grow"><div class="k">Your limit</div><div class="lamps">' + lamps + "</div>" +
      '<div class="v">Change it in the app, in Settings, Story time.</div></div></div></div>';
  }

  function accountCard(a) {
    var w = (a.ways || []).map(function (x) { return WAYS[x]; }).filter(Boolean);
    if (a.email) w.push(a.password ? "a code or your password to " + a.email : "a code to " + a.email);
    return '<div class="acct-card"><h2>Account</h2>' +
      (a.name ? '<div class="acct-row"><div class="acct-grow"><div class="k">Name</div><div class="v">' + esc(a.name) + "</div></div></div>" : "") +
      '<div class="acct-row"><div class="acct-grow"><div class="k">Username</div><div class="v">@' + esc(a.username) + "</div></div></div>" +
      (a.email ? '<div class="acct-row"><div class="acct-grow"><div class="k">Email</div><div class="v">' + esc(a.email) + "</div></div></div>" : "") +
      '<div class="acct-row"><div class="acct-grow"><div class="k">Signs in with</div><div class="v">' + esc(cap(w.join(", or "))) + "</div></div></div>" +
      '<div class="acct-row"><div class="acct-grow"><div class="k">Your record</div><div class="v">Take a copy on your phone, in Settings.</div></div></div>' +
      (a.approved ? "" : '<div class="acct-row"><div class="acct-grow"><div class="k">The beta</div><div class="v">You’re on the list. We’ll open the door as soon as we can.</div></div></div>') +
      "</div>";
  }

  function devicesShort(a) {
    var rows = (a.devices || []).slice(0, 2).map(function (d) {
      return '<div class="acct-row"><span class="ic">' + I("i-phone") + '</span><div class="acct-grow"><div class="k">' + esc(d.noun) + '</div><div class="v">' + esc(seen(d.seen)) + "</div>" +
        (d.trusted ? "" : '<span class="tag a">Waiting for a yes</span>') + "</div></div>";
    }).join("");
    rows += '<div class="acct-row"><span class="ic">' + I("i-laptop") + '</span><div class="acct-grow"><div class="k">This browser</div><div class="v">' + esc(thisBrowser()) + ", now</div></div></div>";
    return '<div class="acct-card"><h2>Devices</h2>' + rows + '<button class="b b-soft gap" type="button" data-go="devices">See all devices</button></div>';
  }

  function recordCard(a) {
    var ev = a.events || [];
    if (!ev.length) return "";
    return '<div class="acct-card"><h2>Changed on the web</h2>' + ev.slice(0, 6).map(function (e) {
      return '<div class="acct-row"><div class="acct-grow"><div class="k">' + esc(EVENTS[e.kind] || e.kind) + '</div><div class="v">' +
        esc(when(e.at)) + (e.browser ? ", " + esc(e.browser) : "") + "</div></div></div>";
    }).join("") + "</div>";
  }

  // ── sheets ─────────────────────────────────────────────────────────────
  var SHEETS = {
    atwOn: function () {
      return '<div class="grab"></div><h3 id="sheet-title">Turn on All the way?</h3>' +
        "<p class=\"mu\">Your own words in Story time, with no limit we set. Books past Hot stay Private and blur until tapped.</p>" +
        '<p class="mu">A book only goes as far as the lower of your two limits. You can turn it off here any time, at once.</p>' + errLine() +
        '<button class="b b-violet" type="button" data-act="atw-yes"' + (S.busy ? " disabled" : "") + ">I’m 18 or over and I want this</button>" +
        '<button class="b b-soft" type="button" data-act="close">Not now</button>';
    },
    fresh: function () {
      var a = S.account || {};
      var ws = (a.ways || []).filter(function (x) { return WAYS[x]; });
      var btns = ws.map(function (x) {
        return '<button class="b b-' + x + '" type="button" data-act="oauth" data-p="' + x + '">' + I("i-" + x) + "Continue with " + WAYS[x] + "</button>";
      }).join("");
      if (a.email) btns += '<button class="b b-violet" type="button" data-act="fresh-code">Email me a code</button>';
      if (a.password && a.email) btns += '<button class="b b-soft" type="button" data-act="fresh-password">Use my password</button>';
      if (QR_ON) btns += '<button class="b b-soft" type="button" data-act="fresh-qr">' + I("i-scan") + "Sign in with your phone</button>";
      return '<div class="grab"></div><h3 id="sheet-title">Sign in again first.</h3>' +
        '<p class="mu">This needs a sign-in from the last ten minutes, so nobody can do it on a screen you left open.</p>' + btns +
        '<p class="center gap"><button class="linkbtn" type="button" data-act="close">Not now</button></p>';
    },
    everywhere: function () {
      return '<div class="grab"></div><h3 id="sheet-title">Sign out everywhere?</h3>' +
        '<p class="mu">Every phone and browser signed in as you signs out now, this one too, and stops getting notifications.</p>' + errLine() +
        '<button class="b b-violet" type="button" data-act="everywhere"' + (S.busy ? " disabled" : "") + ">Sign out everywhere</button>" +
        '<button class="b b-soft" type="button" data-act="close">Not now</button>';
    },
  };
  var sheetName = null;
  function sheet(name) {
    sheetName = name;
    S.error = null;
    drawSheet();
  }
  function drawSheet() {
    var scrim = $("scrim");
    if (!sheetName) { scrim.hidden = true; $("sheet").innerHTML = ""; return; }
    $("sheet").innerHTML = SHEETS[sheetName]();
    scrim.hidden = false;
    var first = $("sheet").querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }
  function closeSheet() { sheetName = null; S.error = null; drawSheet(); }

  // ── render ─────────────────────────────────────────────────────────────
  var QR_ON = false;
  function render() {
    var v = (V[S.view] || V.out)();
    $("title").textContent = v[0];
    $("sub").textContent = v[1];
    $("sub").hidden = !v[1];
    $("view").innerHTML = v[2];
    var signedIn = !!S.account && S.view !== "out" && S.view !== "new";
    $("who").hidden = !signedIn;
    if (signedIn) {
      var nm = S.account.name || S.account.username;
      $("who-disc").textContent = (nm || "?").trim().charAt(0).toUpperCase();
      $("who-name").textContent = nm;
    }
    if (sheetName) drawSheet();
    // The field she types in next, ready for her (never on the first sign-in page, where it would pull up a phone's keyboard).
    var next = S.view === "code" ? $("code") : S.view === "password" ? ($("pem").value ? $("pw") : $("pem")) : null;
    if (next && !S.busy && document.activeElement !== next) next.focus({ preventScroll: true });
  }

  // ── signing in ─────────────────────────────────────────────────────────
  async function oauth(provider) {
    S.busy = true;
    var r = await sb.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: location.origin + "/account", scopes: provider === "discord" ? "identify email" : undefined },
    });
    if (r.error) { S.busy = false; S.error = ERR.failed; render(); }
  }

  async function sendCode(email) {
    S.busy = true; S.error = null; render();
    // shouldCreateUser: false. An address with no account gets nothing, and the page says the same either way.
    var r = await sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false } });
    S.busy = false;
    if (r.error && (r.error.status === 429 || /rate/i.test(r.error.message || ""))) { S.error = ERR.rate_limited; return render(); }
    if (r.error && r.error.status !== 422 && r.error.status !== 400) { S.error = ERR.network; return render(); }
    S.email = email;
    S.resendAt = Date.now() + 60000;
    go("code");
    startTick();
  }

  async function startQr() {
    stopQr();
    S.qr = { state: "starting" };
    go("qr");
    var r = await call("qr_start");
    if (r.status !== 200) { S.qr = { state: r.body.error === "off" ? "off" : r.body.error === "rate_limited" ? "limited" : "failed" }; return render(); }
    S.qr = { id: r.body.id, waiter: r.body.waiter, expires: Date.parse(r.body.expires_at), state: "waiting", svg: qrSvg(r.body.qr) };
    render();
    qrTimer = setInterval(pollQr, 2000);
  }
  async function pollQr() {
    var q = S.qr;
    if (!q || q.state !== "waiting" || S.view !== "qr") return stopQr();
    var r = await call("qr_poll", { id: q.id, waiter: q.waiter });
    if (S.qr !== q) return;
    var st = r.body && r.body.state;
    if (!st) return; // a network blip: ask again in two seconds
    if (st === "waiting") { if (Date.now() > q.expires) { q.state = "expired"; stopQr(); render(); } else render(); return; }
    stopQr();
    q.state = st;
    render();
    if (st === "approved") {
      var v = await sb.auth.verifyOtp({ token_hash: r.body.token_hash, type: "magiclink" });
      if (v.error) { q.state = "failed"; return render(); }
      hello("You’re signed in with your phone.");
    }
  }
  function stopQr() { if (qrTimer) { clearInterval(qrTimer); qrTimer = null; } }
  function qrSvg(text) {
    var m = window.CollaredQR.create(text, { errorCorrectionLevel: "M" }).modules;
    var n = m.size, quiet = 2, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m.get(y, x)) d += "M" + (x + quiet) + " " + (y + quiet) + "h1v1h-1z";
    var size = n + quiet * 2;
    return '<svg viewBox="0 0 ' + size + " " + size + '" shape-rendering="crispEdges" aria-hidden="true"><path fill="#1E1E24" d="' + d + '"/></svg>';
  }
  function startTick() {
    if (tick) clearInterval(tick);
    tick = setInterval(function () {
      if (S.view === "code") {
        var el = $("view").querySelector(".mu.small");
        var wait = Math.max(0, Math.ceil((S.resendAt - Date.now()) / 1000));
        if (el && wait > 0) el.textContent = "You can ask for a new code in " + clock(wait) + ".";
        // Only the line changes, so a code she is halfway through typing stays where it is.
        else if (el && wait === 0 && !el.querySelector("button")) el.innerHTML = '<button class="linkbtn" type="button" data-act="resend">Send a new code</button>';
      } else if (S.view === "qr" && S.qr && S.qr.state === "waiting") {
        var c = $("view").querySelector(".qr-clock");
        if (c) c.textContent = "This code runs out in " + clock((S.qr.expires - Date.now()) / 1000) + ".";
      }
    }, 1000);
  }

  // ── changes that matter ────────────────────────────────────────────────
  async function change(action, extra, onOk) {
    S.busy = true; S.error = null; render();
    var r = await call(action, extra, true);
    S.busy = false;
    if (r.status === 401) return signOutHere("expired");
    if (r.body && r.body.error === "not_fresh") { S.fresh = false; render(); return sheet("fresh"); }
    if (r.status !== 200) { S.error = errText(r.body && r.body.error); render(); if (sheetName) drawSheet(); return; }
    onOk(r.body);
  }

  // ── events ─────────────────────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go],[data-act]");
    if (!t) return;
    var go_ = t.getAttribute("data-go");
    var act = t.getAttribute("data-act");
    if (go_) { S.error = null; if (sheetName) closeSheet(); return go(go_); }
    if (act === "close") return closeSheet();
    if (act === "oauth") return oauth(t.getAttribute("data-p"));
    if (act === "qr" || act === "fresh-qr") { closeSheet(); return startQr(); }
    if (act === "resend") return sendCode(S.email);
    if (act === "signout") return signOutHere("out");
    if (act === "fresh-code") { closeSheet(); S.email = S.account.email; return sendCode(S.account.email); }
    if (act === "fresh-password") { closeSheet(); S.email = S.account.email; return go("password"); }
    if (act === "ask-everywhere") return S.fresh ? sheet("everywhere") : sheet("fresh");
    if (act === "everywhere") {
      return change("sign_out_all", null, function () { closeSheet(); signOutHere("everywhere"); });
    }
    if (act === "atw") {
      var on = S.account.all_the_way && S.account.all_the_way.on;
      if (on) {
        // Off is one tap, at once, and needs no fresh sign-in.
        return change("all_the_way", { on: false }, function (b) {
          S.account.all_the_way = b.all_the_way; S.toast = "All the way is off."; render();
        });
      }
      return S.fresh ? sheet("atwOn") : sheet("fresh");
    }
    if (act === "atw-yes") {
      return change("all_the_way", { on: true, adult: true }, function (b) {
        closeSheet();
        S.account.all_the_way = b.all_the_way;
        S.toast = "All the way is on. Story time shows it the next time you open it.";
        render();
      });
    }
    if (act === "restore") {
      if (!S.fresh) return sheet("fresh");
      return change("restore", null, function () { hello("Your account is yours again. Everything is as you left it."); });
    }
  });

  document.addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.id === "f-email") {
      var email = ($("em").value || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { S.error = "That doesn’t look like an email address."; return render(); }
      return sendCode(email);
    }
    if (f.id === "f-code") {
      var code = ($("code").value || "").replace(/\D/g, "");
      if (code.length !== 6) { S.error = "The code is six digits."; return render(); }
      S.busy = true; S.error = null; render();
      var v = await sb.auth.verifyOtp({ email: S.email, token: code, type: "email" });
      S.busy = false;
      if (v.error) { S.error = /expired/i.test(v.error.message || "") ? "That code ran out. Send a new one." : "That code doesn’t match. Check it and try again."; return render(); }
      return hello(S.account ? "Signed in again. You have ten minutes for changes that matter." : null);
    }
    if (f.id === "f-pass") {
      var pem = ($("pem").value || "").trim(), pw = $("pw").value || "";
      S.email = pem;
      S.busy = true; S.error = null; render();
      var p = await sb.auth.signInWithPassword({ email: pem, password: pw });
      S.busy = false;
      if (p.error) { S.error = p.error.status === 429 ? ERR.rate_limited : "That email and password don’t match."; return render(); }
      return hello(S.account ? "Signed in again. You have ten minutes for changes that matter." : null);
    }
    if (f.id === "f-delete") {
      if (!S.fresh) return sheet("fresh");
      var un = ($("un").value || "").trim();
      return change("close", { username: un }, function () { hello("Your account is closed."); });
    }
  });

  $("scrim").addEventListener("click", function (e) { if (e.target === $("scrim")) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheetName) closeSheet(); });

  // The site's mobile menu, without app.js (nothing else from the site runs here).
  var burger = document.querySelector(".nav-burger"), menu = $("mobile-menu");
  burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open));
    burger.setAttribute("aria-label", open ? "Open menu" : "Close menu");
    menu.hidden = open;
  });

  // ── start ──────────────────────────────────────────────────────────────
  (async function start() {
    render();
    var cfgCall = call("config");
    // An OAuth return lands here with ?code= (or ?error=). supabase-js takes the code; the address is cleaned at once.
    var params = new URLSearchParams(location.search);
    var oauthError = params.get("error_description") || params.get("error");
    var s = (await sb.auth.getSession()).data.session;
    if (location.search || location.hash) history.replaceState(null, "", location.pathname);
    var c = await cfgCall;
    QR_ON = !!(c.body && c.body.qr);
    startTick();
    if (s && idleFor() > IDLE_MS) return signOutHere("idle");
    if (s) return hello(null);
    if (oauthError) S.error = /signup|sign up|not allowed/i.test(oauthError) ? null : ERR.failed;
    go("out");
  })();
})();
