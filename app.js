/* ════════════════════════════════════════════════════════════════════
   Collared — landing page behavior
   All demo-panel state is plain in-memory JS. Nothing is persisted.
   ════════════════════════════════════════════════════════════════════ */

/* ── EXTERNAL LINKS — update everything in this one block ──────────── */
const DISCORD_INVITE_URL = "https://discord.gg/collared";   // real invite link
const STAFF_FORM_URL     = "https://docs.google.com/forms/d/e/1FAIpQLSeWlgs-YBYfgfQ5FaggQWl53DoCqNnbCs7KPmqSLheb6_qUSQ/viewform?pli=1";    // Google Form for staff applications
const APP_STORE_URL      = "";                                // fill at launch
const PLAY_STORE_URL     = "";                                // fill at launch
const SPOTIFY_URL        = "";                                // fill when the podcast ships
const APPLE_PODCASTS_URL = "";
const YOUTUBE_URL        = "";
const KIT_WAITLIST_FORM_ID = "9553709";  // Kit (ConvertKit) form — the app waitlist
const KIT_MERCH_FORM_ID    = "";         // optional: a second Kit form for merch interest (see note below)
/* ──────────────────────────────────────────────────────────────────── */

/* ── EVENTS — edit this array and the page updates itself ───────────
   Worked example (copy, un-comment, edit):
   {
     title: "Collared Community Meetup",
     date: "2026-09-12",                       // ISO date — decides Upcoming vs Past automatically
     location: "Philadelphia, PA",
     description: "An evening of conversation and community. 18+ only.",
     link: "https://example.com/tickets",      // optional — omit for no link
   },
*/
const events = [
  // (no events announced yet — add them here)
];

/* ════════════════ wire the link constants ════════════════ */
document.querySelectorAll('[data-link="discord"]').forEach((a) => {
  if (DISCORD_INVITE_URL && !DISCORD_INVITE_URL.includes("REPLACE_ME")) {
    a.href = DISCORD_INVITE_URL;
    a.target = "_blank";
    a.rel = "noopener";
  }
});
document.querySelectorAll('[data-link="staff"]').forEach((a) => {
  a.href = STAFF_FORM_URL.includes("REPLACE_ME") ? "#join" : STAFF_FORM_URL;
  if (!STAFF_FORM_URL.includes("REPLACE_ME")) { a.target = "_blank"; a.rel = "noopener"; }
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ════════════════ mobile nav ════════════════ */
const burger = document.querySelector(".nav-burger");
const mobileMenu = document.getElementById("mobile-menu");
burger.addEventListener("click", () => {
  const open = burger.getAttribute("aria-expanded") === "true";
  burger.setAttribute("aria-expanded", String(!open));
  burger.setAttribute("aria-label", open ? "Open menu" : "Close menu");
  mobileMenu.hidden = open;
});
mobileMenu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    burger.setAttribute("aria-expanded", "false");
    mobileMenu.hidden = true;
  })
);

/* ════════════════ scroll reveals (one-time) ════════════════ */
if (!reducedMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

/* ════════════════════════════════════════════════════════════════════
   TASK DEMO — shared engine for the hero phone and the §2 feature panel.
   Recreated from the app's Tasks screen (fictional data throughout).
   ════════════════════════════════════════════════════════════════════ */

const TASK_SEED = [
  { id: 1, title: "Clean the house", desc: "Vacuum, dust, and mop all rooms.", due: "2 days ago", overdue: true, freq: "weekly", pts: 150 },
  { id: 2, title: "Meditation session", desc: "15 minutes of guided meditation for mindfulness.", due: "2 days ago", overdue: true, freq: "daily", pts: 30 },
  { id: 3, title: "Complete daily journal entry", desc: "Write at least 200 words about your day and feelings.", due: "in 23 hours", overdue: false, freq: "daily", pts: 50 },
  { id: 4, title: "Morning workout routine", desc: "30 minutes of cardio followed by stretching.", due: "in 23 hours", overdue: false, freq: "daily", pts: 75 },
];

const ICONS = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3"/></svg>',
  medal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="M9.5 13.5 8 21l4-2.5 4 2.5-1.5-7.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.8-5.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/></svg>',
};

function createTaskDemo(container, opts = {}) {
  const state = {
    tasks: TASK_SEED.map((t) => ({ ...t, done: false })),
    filter: "All",
    points: opts.startPoints ?? 180,
  };

  container.innerHTML = `
    <div class="task-header">
      <span class="task-title">Tasks</span>
      <span class="task-points-pill">${ICONS.medal}<span data-points>${state.points}</span>&nbsp;pts</span>
    </div>
    <div class="task-filters" role="group" aria-label="Filter tasks">
      ${["All", "Pending", "Completed"].map((f) => `<button class="task-filter" type="button" aria-pressed="${f === "All"}" data-filter="${f}">${f}</button>`).join("")}
    </div>
    <div data-overdue-slot></div>
    <div class="task-list" data-list></div>
  `;

  const listEl = container.querySelector("[data-list]");
  const pointsEl = container.querySelector("[data-points]");
  const pillEl = container.querySelector(".task-points-pill");
  const overdueSlot = container.querySelector("[data-overdue-slot]");

  function visibleTasks() {
    if (state.filter === "Pending") return state.tasks.filter((t) => !t.done);
    if (state.filter === "Completed") return state.tasks.filter((t) => t.done);
    return state.tasks;
  }

  function render() {
    const overdueCount = state.tasks.filter((t) => t.overdue && !t.done).length;
    overdueSlot.innerHTML = overdueCount
      ? `<div class="task-overdue">${ICONS.warn}${overdueCount} task${overdueCount > 1 ? "s are" : " is"} overdue</div>`
      : "";

    const tasks = visibleTasks();
    if (!tasks.length) {
      listEl.innerHTML = `<p class="task-empty">You don't have any ${state.filter.toLowerCase()} tasks</p>`;
      return;
    }
    listEl.innerHTML = tasks
      .map((t) => {
        const overdueNow = t.overdue && !t.done;
        return `
        <article class="task-card ${t.done ? "is-done" : overdueNow ? "is-overdue" : ""}" data-task="${t.id}">
          <h4>${t.title}</h4>
          <p class="task-desc">${t.desc}</p>
          <div class="task-meta">
            <span class="${overdueNow ? "meta-due-overdue" : ""}">${ICONS.clock}${t.done ? "Completed just now" : t.due}</span>
            <span>${ICONS.repeat}${t.freq}</span>
          </div>
          <div class="task-footer">
            <span class="task-pts">${ICONS.medal}${t.pts} pts</span>
            ${t.done
              ? `<span class="badge-done">${ICONS.check}Completed</span>`
              : `<button class="btn-complete" type="button" data-complete="${t.id}">${ICONS.check}Complete</button>`}
          </div>
        </article>`;
      })
      .join("");
  }

  function completeTask(id, { animate = true } = {}) {
    const task = state.tasks.find((t) => t.id === id && !t.done);
    if (!task) return false;
    const btn = listEl.querySelector(`[data-complete="${id}"]`);
    const finish = () => {
      task.done = true;
      state.points += task.pts;
      render();
      pointsEl.textContent = state.points;
      pillEl.classList.add("tick");
      setTimeout(() => pillEl.classList.remove("tick"), 250);
    };
    if (animate && btn && !reducedMotion) {
      btn.classList.add("pressing");
      setTimeout(finish, 180);
    } else {
      finish();
    }
    return true;
  }

  function reset() {
    state.tasks = TASK_SEED.map((t) => ({ ...t, done: false }));
    state.points = opts.startPoints ?? 180;
    pointsEl.textContent = state.points;
    render();
  }

  container.addEventListener("click", (e) => {
    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) {
      state.filter = filterBtn.dataset.filter;
      container.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === filterBtn)));
      render();
      opts.onInteract?.();
      return;
    }
    const completeBtn = e.target.closest("[data-complete]");
    if (completeBtn) {
      completeTask(Number(completeBtn.dataset.complete));
      opts.onInteract?.();
    }
  });

  render();
  return { state, completeTask, reset };
}

/* ── hero phone: interactive + gentle auto-loop ── */
const heroEl = document.getElementById("hero-task-demo");
let heroLoopStopped = false;
const heroDemo = createTaskDemo(heroEl, {
  startPoints: 180,
  onInteract: () => { heroLoopStopped = true; }, // pause auto-loop on first interaction
});

if (!reducedMotion) {
  let loopTimer = setInterval(() => {
    if (heroLoopStopped) { clearInterval(loopTimer); return; }
    const next = heroDemo.state.tasks.find((t) => !t.done);
    if (next) {
      heroDemo.completeTask(next.id);
    } else {
      setTimeout(() => { if (!heroLoopStopped) heroDemo.reset(); }, 1800);
    }
  }, 3400);
}

/* ── §2 feature panel: same engine, fully manual ── */
createTaskDemo(document.getElementById("feature-task-demo"), { startPoints: 180 });

/* ════════════════ rewards demo ════════════════ */
const balanceEl = document.getElementById("rewards-balance-num");
const redeemAffordable = document.getElementById("redeem-affordable");
let rewardsBalance = 180;

redeemAffordable.addEventListener("click", () => {
  if (redeemAffordable.classList.contains("is-redeemed")) return;
  rewardsBalance -= 150;
  balanceEl.textContent = rewardsBalance;
  redeemAffordable.classList.add("is-redeemed");
  redeemAffordable.innerHTML = "✓ Redeemed";
  redeemAffordable.setAttribute("aria-disabled", "true");
});

/* ════════════════ profile pill selectors ════════════════ */
function wirePillGroup(groupEl) {
  groupEl.addEventListener("click", (e) => {
    const pill = e.target.closest(".app-pill");
    if (!pill) return;
    groupEl.querySelectorAll(".app-pill").forEach((p) => p.setAttribute("aria-pressed", String(p === pill)));
  });
}
wirePillGroup(document.getElementById("role-pills"));
wirePillGroup(document.getElementById("status-pills"));

/* ════════════════ theme micro-demo (flips the DEMOS, not the site) ════════════════ */
const themePills = document.getElementById("theme-pills");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function applyDemoTheme(mode) {
  const dark = mode === "dark" || (mode === "system" && systemDark.matches);
  document.body.classList.toggle("demos-dark", dark);
}
themePills.addEventListener("click", (e) => {
  const card = e.target.closest(".theme-card");
  if (!card) return;
  themePills.querySelectorAll(".theme-card").forEach((c) => c.setAttribute("aria-pressed", String(c === card)));
  applyDemoTheme(card.dataset.theme);
});
systemDark.addEventListener("change", () => {
  const current = themePills.querySelector('[aria-pressed="true"]');
  if (current?.dataset.theme === "system") applyDemoTheme("system");
});

/* ════════════════ waitlist form (Kit) ════════════════
   Subscribes via a background fetch to Kit's public form endpoint so the
   visitor stays on the page and sees our styled confirmation. If the fetch
   fails (network hiccup, blocker), we fall back to a native POST, which
   lands on Kit's hosted thank-you page — the signup still goes through.

   Merch interest is sent as a Kit custom field (fields[merch_interest]).
   If you also create a dedicated "merch" form in Kit and put its ID in
   KIT_MERCH_FORM_ID above, merch-curious folks get subscribed to that
   form too, which makes segmenting in Kit one click. */
const waitlistForm = document.getElementById("waitlist-form");
waitlistForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("waitlist-email").value.trim();
  const wantsMerch = document.getElementById("merch-checkbox").checked;
  const submitBtn = waitlistForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding you…";

  const subscribe = async (formId, fields = {}) => {
    const fd = new FormData();
    fd.append("email_address", email);
    for (const [key, value] of Object.entries(fields)) fd.append(`fields[${key}]`, value);
    const res = await fetch(`https://app.kit.com/forms/${formId}/subscriptions`, {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Kit responded ${res.status}`);
    return res.json();
  };

  try {
    await subscribe(KIT_WAITLIST_FORM_ID, { merch_interest: wantsMerch ? "yes" : "no" });
    if (wantsMerch && KIT_MERCH_FORM_ID) {
      await subscribe(KIT_MERCH_FORM_ID).catch(() => {}); // best-effort; main signup already succeeded
    }
    waitlistForm.querySelector(".waitlist-success").hidden = false;
    waitlistForm.querySelector(".waitlist-row").style.display = "none";
    waitlistForm.querySelector(".waitlist-merch").style.display = "none";
  } catch (err) {
    waitlistForm.submit(); // native POST fallback — Kit's hosted thank-you page
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Notify me";
  }
});

/* merch band → waitlist, pre-ticking the merch checkbox */
document.getElementById("merch-link").addEventListener("click", () => {
  document.getElementById("merch-checkbox").checked = true;
});

/* ════════════════ events ════════════════ */
function renderEvents() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((ev) => ev.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((ev) => ev.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const upEl = document.getElementById("events-upcoming");
  const pastEl = document.getElementById("events-past");

  const card = (ev) => {
    const d = new Date(ev.date + "T12:00:00");
    const day = d.getDate();
    const mon = d.toLocaleString("en-US", { month: "short" });
    const yr = d.getFullYear();
    return `
      <article class="event-card">
        <div class="event-date"><strong>${day}</strong><span>${mon} ${yr}</span></div>
        <div class="event-info">
          <h3>${ev.title}</h3>
          <p>${ev.description}</p>
          <p class="event-loc">${ev.location}</p>
        </div>
        ${ev.link ? `<a class="btn btn-pill" href="${ev.link}" target="_blank" rel="noopener">Details</a>` : ""}
      </article>`;
  };

  upEl.innerHTML = upcoming.length
    ? upcoming.map(card).join("")
    : `<div class="events-empty">
         <svg aria-hidden="true"><use href="#collar-mark"/></svg>
         <p>No upcoming events yet — announcements land in the Discord first.
         <a data-link="discord" href="#community">Join us there</a>.</p>
       </div>`;

  pastEl.innerHTML = past.length
    ? `<details>
         <summary>Past events (${past.length})</summary>
         ${past.map(card).join("")}
       </details>`
    : "";

  // newly injected discord links need wiring too
  upEl.querySelectorAll('[data-link="discord"]').forEach((a) => {
    if (DISCORD_INVITE_URL && !DISCORD_INVITE_URL.includes("REPLACE_ME")) {
      a.href = DISCORD_INVITE_URL; a.target = "_blank"; a.rel = "noopener";
    }
  });
}
renderEvents();
