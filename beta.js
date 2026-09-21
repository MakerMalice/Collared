/* ════════════════════════════════════════════════════════════════════
   Collared — Beta tester signup page behavior
   Loads after app.js (which supplies nav, reveals, and link wiring).
   Everything here is scoped to an IIFE so nothing collides with app.js.
   The form components are team.css's .tq-* system; this file mirrors
   team.js's state/validation/progress model for the beta questions.
   ════════════════════════════════════════════════════════════════════ */

/* ── SUBMISSION ENDPOINT — update this one block ───────────────────── */
const BETA_FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbwJUCLz9otpLnqS8O0PaaPCLbD5dWccCtKE4TaSHkp-k0-uBM26GDJkMtkFhL26q6Ki/exec"; // Google Apps Script web app
const BETA_FORM_KEY = "collared-team-2026";
/* ──────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EXPAND_MS = reduceMotion ? 0 : 450;
  const MIN_CHARS = 20;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const form = $("#b-form");
  const panel = $("#beta-panel");

  /* ════════════════════════════════════════════════════════════════
     1. PLATFORM CARDS — role="radiogroup" with roving tabindex
     ════════════════════════════════════════════════════════════════ */
  const cards = $$(".bp-card", $("#b-platform"));
  const platformBlocks = $$(".beta-platform-fields", form);
  let platform = "";
  let panelOpen = false;

  const blockFor = (name) => platformBlocks.find((b) => b.dataset.platform === name) || null;
  const activeBlock = () => (platform ? blockFor(platform) : null);
  const hiddenByPlatform = (el) => {
    const block = el.closest(".beta-platform-fields");
    return !!block && block.hidden;
  };

  function selectPlatform(name, { focus = false } = {}) {
    const card = cards.find((c) => c.dataset.value === name);
    if (!card) return;

    cards.forEach((c) => {
      const on = c === card;
      c.setAttribute("aria-checked", String(on));
      c.tabIndex = on ? 0 : -1;
    });
    if (focus) card.focus();

    const changed = platform !== name;
    platform = name;
    clearError("platform");

    // Swap the platform-specific fields, dropping any error state on the
    // block we're hiding so it can't be reported for an invisible field.
    platformBlocks.forEach((block) => {
      const show = block.dataset.platform === name;
      block.hidden = !show;
      if (!show) {
        $$(".tq-field", block).forEach((f) => {
          f.classList.remove("is-invalid");
          const err = $(".tq-error", f);
          if (err) err.hidden = true;
          const ctrl = controlEl(f);
          if (ctrl) ctrl.removeAttribute("aria-invalid");
        });
      }
    });

    if (!panelOpen) {
      expand(panel);
      panelOpen = true;
    } else if (changed && panel.classList.contains("is-open")) {
      panel.style.height = "auto";
    }
    updateProgress();
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => selectPlatform(card.dataset.value));
    card.addEventListener("keydown", (e) => {
      const i = cards.indexOf(card);
      let next = -1;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": next = (i + 1) % cards.length; break;
        case "ArrowLeft":
        case "ArrowUp": next = (i - 1 + cards.length) % cards.length; break;
        case "Home": next = 0; break;
        case "End": next = cards.length - 1; break;
        default: return;
      }
      e.preventDefault();
      selectPlatform(cards[next].dataset.value, { focus: true });
    });
  });

  /* ════════════════════════════════════════════════════════════════
     2. PANEL EXPAND (same 450ms curve as /team)
     ════════════════════════════════════════════════════════════════ */
  function expand(el) {
    if (!el) return;
    el.hidden = false;
    if (reduceMotion) {
      el.classList.add("is-open");
      el.style.height = "auto";
      return;
    }
    el.style.height = "0px";
    void el.offsetHeight;
    el.classList.add("is-open");
    el.style.height = el.scrollHeight + "px";
    setTimeout(() => {
      // let the panel grow with its content (auto-growing textareas, errors)
      if (el.classList.contains("is-open")) el.style.height = "auto";
    }, EXPAND_MS);
  }

  function relaxPanel() {
    if (panel && panel.classList.contains("is-open")) panel.style.height = "auto";
  }

  /* ════════════════════════════════════════════════════════════════
     3. ANSWERS — read straight from whichever controls are visible
     ════════════════════════════════════════════════════════════════ */
  const discordInput = $("#b-discord");
  const appsInput = $("#b-apps");
  const featuresInput = $("#b-features");
  const otherWrap = $("#b-device-other-wrap");
  const otherInput = $("#b-device-other");

  const QUESTION_ORDER = [
    "platform", "device", "storeEmail", "discord",
    "appsUsed", "features", "usage", "soda",
  ];

  function pillGroup(name) {
    return $$(`[data-pills="${name}"]`, form).find((g) => !hiddenByPlatform(g)) || null;
  }
  function pillValue(group) {
    if (!group) return "";
    const on = $(".tq-pill[aria-pressed='true']", group);
    return on ? on.dataset.value : "";
  }
  function storeEmailInput() {
    const block = activeBlock();
    return block ? $(".beta-store-email", block) : null;
  }

  const value = {
    platform: () => platform,
    device: () => pillValue(pillGroup("device")),
    storeEmail: () => (storeEmailInput() ? storeEmailInput().value.trim() : ""),
    discord: () => discordInput.value.trim(),
    appsUsed: () => appsInput.value.trim(),
    features: () => featuresInput.value.trim(),
    usage: () => pillValue(pillGroup("usage")),
    soda: () => pillValue(pillGroup("soda")),
  };

  const isAnswered = {
    platform: () => value.platform() !== "",
    device: () => value.device() !== "",
    storeEmail: () => EMAIL_RE.test(value.storeEmail()),
    discord: () => value.discord().length > 0,
    appsUsed: () => value.appsUsed().length >= MIN_CHARS,
    features: () => value.features().length >= MIN_CHARS,
    usage: () => value.usage() !== "",
    soda: () => value.soda() !== "",
  };

  const ERRORS = {
    platform: () => "Please choose iPhone or Android so we know which invite to send.",
    device: () => (platform === "Android"
      ? "Please pick the phone you'd be testing on."
      : "Please pick the iPhone you'd be testing on."),
    storeEmail: () => {
      if (value.storeEmail()) return "That doesn't look like an email address — please check it.";
      return platform === "Android"
        ? "Please add the Google Play email your invite should go to."
        : "Please add the Apple ID email your TestFlight invite should go to.";
    },
    discord: () => "Please add your Discord username so we know who to reply to.",
    appsUsed: () => `Please share a little more — ${MIN_CHARS} characters or so is plenty.`,
    features: () => `Please share a little more — ${MIN_CHARS} characters or so is plenty.`,
    usage: () => "Please let us know who you'd be using Collared for.",
    soda: () => "Please pick one — we don't make the rules.",
  };

  /* ── error plumbing ── */
  const controlEl = (field) =>
    $("input:not([type=hidden]), textarea, [role=group], [role=radiogroup]", field);

  function fieldEl(name) {
    return $$(`.tq-field[data-q="${name}"]`).find((f) => !hiddenByPlatform(f)) || null;
  }

  function showError(name) {
    const field = fieldEl(name);
    if (!field) return;
    const err = $(".tq-error", field);
    if (!err) return;
    field.classList.add("is-invalid");
    const ctrl = controlEl(field);
    if (ctrl) ctrl.setAttribute("aria-invalid", "true");
    err.textContent = ERRORS[name]();
    err.hidden = false;
    relaxPanel();
  }

  function clearError(name) {
    const field = fieldEl(name);
    if (!field) return;
    const err = $(".tq-error", field);
    if (!err) return;
    field.classList.remove("is-invalid");
    const ctrl = controlEl(field);
    if (ctrl) ctrl.removeAttribute("aria-invalid");
    err.hidden = true;
  }

  /* ── progress ── */
  const segs = $$(".tq-seg", $("#b-progress-bar"));
  const progressText = $("#b-progress-text");
  const progressBar = $("#b-progress-bar");

  function updateProgress() {
    const done = QUESTION_ORDER.filter((q) => isAnswered[q]()).length;
    segs.forEach((seg, i) => seg.classList.toggle("is-filled", i < done));
    progressText.textContent = `${done} of ${QUESTION_ORDER.length} answered`;
    progressBar.setAttribute("aria-label",
      `Beta request progress: ${done} of ${QUESTION_ORDER.length} answered`);
  }

  /* ════════════════════════════════════════════════════════════════
     4. FIELD WIRING
     ════════════════════════════════════════════════════════════════ */

  /* ── single-line text + email ── */
  $$(".beta-store-email", form).forEach((input) => {
    input.addEventListener("input", () => {
      if (isAnswered.storeEmail()) clearError("storeEmail");
      updateProgress();
    });
    input.addEventListener("blur", () => {
      if (!isAnswered.storeEmail()) showError("storeEmail");
    });
  });

  discordInput.addEventListener("input", () => {
    if (isAnswered.discord()) clearError("discord");
    updateProgress();
  });
  discordInput.addEventListener("blur", () => {
    if (!isAnswered.discord()) showError("discord");
  });

  otherInput.addEventListener("input", relaxPanel);

  /* ── pill groups ── */
  $$("[data-pills]", form).forEach((group) => {
    const name = group.dataset.pills;
    group.addEventListener("click", (e) => {
      const pill = e.target.closest(".tq-pill");
      if (!pill || !group.contains(pill)) return;
      $$(".tq-pill", group).forEach((p) => p.setAttribute("aria-pressed", String(p === pill)));

      if (name === "device" && group.closest('[data-platform="Android"]')) {
        const isOther = pill.dataset.value === "Other";
        otherWrap.hidden = !isOther;
        if (!isOther) otherInput.value = "";
        relaxPanel();
      }

      if (isAnswered[name]()) clearError(name);
      else showError(name);
      updateProgress();
    });
  });

  /* ── textareas: auto-grow + live count ── */
  function wireTextarea(input, countEl, key) {
    function autoGrow() {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      relaxPanel();
    }
    input.addEventListener("input", () => {
      const n = input.value.trim().length;
      const ok = n >= MIN_CHARS;
      countEl.textContent = ok ? `${n} characters` : `${n} characters — ${MIN_CHARS} minimum`;
      countEl.classList.toggle("is-ok", ok);
      if (ok) clearError(key);
      autoGrow();
      updateProgress();
    });
    input.addEventListener("blur", () => {
      if (!isAnswered[key]()) showError(key);
    });
  }
  wireTextarea(appsInput, $("#b-apps-count"), "appsUsed");
  wireTextarea(featuresInput, $("#b-features-count"), "features");

  /* ════════════════════════════════════════════════════════════════
     5. SUBMISSION
     ════════════════════════════════════════════════════════════════ */
  async function postPayload(payload) {
    if (!BETA_FORM_ENDPOINT) {
      console.info("[Collared] BETA_FORM_ENDPOINT is empty — simulating a successful submission.", payload);
      await new Promise((r) => setTimeout(r, 900));
      return true;
    }
    const body = JSON.stringify(payload);
    try {
      // No custom headers: keeps this a simple request, so no CORS preflight
      // (Apps Script web apps reject preflight).
      const res = await fetch(BETA_FORM_ENDPOINT, { method: "POST", body, redirect: "follow" });
      const data = await res.json();
      if (data && data.ok) return true;
      throw new Error("Endpoint did not return ok:true");
    } catch (err) {
      // Opaque/CORS quirk — retry blind and treat completion as success.
      await fetch(BETA_FORM_ENDPOINT, { method: "POST", body, mode: "no-cors" });
      return true;
    }
  }

  function setBusy(button, busy, busyText, idleText) {
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    button.textContent = busy ? busyText : idleText;
  }

  const submitBtn = $("#b-submit");
  const formError = $("#b-formerror");
  const successEl = $("#b-success");
  const successTitle = $("#b-success-title");
  const successText = $("#b-success-text");
  const progressEl = $("#b-progress");
  let sending = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;

    const invalid = QUESTION_ORDER.filter((q) => !isAnswered[q]());
    QUESTION_ORDER.forEach((q) => (isAnswered[q]() ? clearError(q) : showError(q)));

    if (invalid.length) {
      formError.textContent = invalid.length === 1
        ? "One answer still needs your attention."
        : `${invalid.length} answers still need your attention.`;
      formError.hidden = false;
      focusFirstInvalid(invalid[0]);
      return;
    }
    formError.hidden = true;

    sending = true;
    setBusy(submitBtn, true, "Sending…", "Request a beta invite");

    const storeEmail = value.storeEmail();
    const payload = {
      key: BETA_FORM_KEY,
      type: "beta",
      platform: platform,
      discord: value.discord(),
      device: value.device(),
      deviceOther: (platform === "Android" && value.device() === "Other")
        ? otherInput.value.trim() : "",
      storeEmail: storeEmail,
      appsUsed: value.appsUsed(),
      features: value.features(),
      usage: value.usage(),
      soda: value.soda(),
      website: $("#b-website").value,
    };

    try {
      await postPayload(payload);
      if (platform === "Android") {
        successTitle.textContent = "You're on the Android list.";
        successText.textContent =
          `Android invites start a few weeks after iPhone. We'll reach you at ${storeEmail} and on Discord when it's your turn.`;
      } else {
        successTitle.textContent = "You're on the list.";
        successText.textContent =
          `TestFlight invites go out in waves — keep an eye on ${storeEmail} and Discord.`;
      }
      form.hidden = true;
      progressEl.hidden = true;
      successEl.hidden = false;
      relaxPanel();
      successEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    } catch (err) {
      formError.textContent =
        "That didn't go through. Your answers are still here — please try again, or email tox@collared.app.";
      formError.hidden = false;
      formError.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    } finally {
      sending = false;
      setBusy(submitBtn, false, "Sending…", "Request a beta invite");
    }
  });

  function focusFirstInvalid(name) {
    const field = fieldEl(name);
    if (!field) return;
    const target = $(".bp-card, input:not([type=hidden]), textarea, .tq-pill", field);
    field.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    setTimeout(() => target && target.focus({ preventScroll: true }), reduceMotion ? 0 : 320);
  }

  /* initial paint */
  updateProgress();
})();
