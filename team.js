/* ════════════════════════════════════════════════════════════════════
   Collared — Join the Team page behavior
   Loads after app.js (which supplies nav, reveals, and link wiring).
   Everything here is scoped to an IIFE so nothing collides with app.js.
   ════════════════════════════════════════════════════════════════════ */

/* ── SUBMISSION ENDPOINT — update this one block ───────────────────── */
const TEAM_FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbwJUCLz9otpLnqS8O0PaaPCLbD5dWccCtKE4TaSHkp-k0-uBM26GDJkMtkFhL26q6Ki/exec"; // Google Apps Script web app (Sheet "Collared Team Applications")
const TEAM_FORM_KEY = "collared-team-2026";
/* ──────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EXPAND_MS = reduceMotion ? 0 : 450;

  /* ════════════════════════════════════════════════════════════════
     1. CUSTOM SELECT — button + listbox, full keyboard support
     ════════════════════════════════════════════════════════════════ */
  const selButton = $("#tsel-button");
  const selList = $("#tsel-list");
  const selValue = $("#tsel-value");
  const options = $$(".tsel-option", selList);

  let activeIndex = -1;     // highlighted option while open
  let selectedIndex = -1;   // committed selection
  let typeBuffer = "";
  let typeTimer = null;

  const optionLabel = (li) => $(".tsel-option-name", li).textContent.trim();

  function setActive(index, { scroll = true } = {}) {
    if (index < 0 || index >= options.length) return;
    activeIndex = index;
    options.forEach((li, i) => li.classList.toggle("is-active", i === index));
    selList.setAttribute("aria-activedescendant", options[index].id);
    if (scroll) options[index].scrollIntoView({ block: "nearest" });
  }

  function openList() {
    if (selButton.getAttribute("aria-expanded") === "true") return;
    selList.hidden = false;
    selButton.setAttribute("aria-expanded", "true");
    selList.focus();
    setActive(selectedIndex >= 0 ? selectedIndex : 0, { scroll: false });
  }

  function closeList({ focusButton = true } = {}) {
    if (selButton.getAttribute("aria-expanded") !== "true") return;
    selList.hidden = true;
    selButton.setAttribute("aria-expanded", "false");
    selList.removeAttribute("aria-activedescendant");
    options.forEach((li) => li.classList.remove("is-active"));
    if (focusButton) selButton.focus();
  }

  function commit(index) {
    if (index < 0 || index >= options.length) return;
    selectedIndex = index;
    const li = options[index];
    options.forEach((o, i) => o.setAttribute("aria-selected", String(i === index)));
    selValue.textContent = optionLabel(li);
    selValue.classList.remove("is-placeholder");
    closeList();
    showPanelFor(li);
  }

  selButton.addEventListener("click", () => {
    if (selButton.getAttribute("aria-expanded") === "true") closeList();
    else openList();
  });

  selButton.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      openList();
    }
  });

  selList.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        closeList();
        break;
      case "Tab":
        closeList({ focusButton: false });
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          typeAhead(e.key);
        }
    }
  });

  function typeAhead(char) {
    typeBuffer += char.toLowerCase();
    clearTimeout(typeTimer);
    typeTimer = setTimeout(() => { typeBuffer = ""; }, 600);
    const current = activeIndex < 0 ? 0 : activeIndex;
    // A single keystroke moves to the NEXT match (so the same letter cycles);
    // a longer buffer refines the search from where we already are.
    const single = typeBuffer.length === 1;
    const start = single ? current + 1 : current;
    for (let step = 0; step < options.length; step++) {
      const i = (start + step) % options.length;
      if (optionLabel(options[i]).toLowerCase().startsWith(typeBuffer)) {
        setActive(i);
        return;
      }
    }
  }

  options.forEach((li, i) => {
    li.addEventListener("click", () => commit(i));
    li.addEventListener("mousemove", () => setActive(i, { scroll: false }));
  });

  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#team-select")) closeList({ focusButton: false });
  });

  /* ════════════════════════════════════════════════════════════════
     2. PANEL EXPAND / COLLAPSE
     ════════════════════════════════════════════════════════════════ */
  const panels = {
    questionnaire: $("#questionnaire-panel"),
    interest: $("#interest-panel"),
  };
  let openPanelName = null;

  function collapse(panel) {
    if (!panel || panel.hidden) return;
    if (reduceMotion) {
      panel.hidden = true;
      panel.classList.remove("is-open");
      panel.style.height = "";
      return;
    }
    panel.style.height = panel.scrollHeight + "px";
    void panel.offsetHeight;
    panel.classList.remove("is-open");
    panel.style.height = "0px";
    setTimeout(() => {
      panel.hidden = true;
      panel.style.height = "";
    }, EXPAND_MS);
  }

  function expand(panel) {
    if (!panel) return;
    panel.hidden = false;
    if (reduceMotion) {
      panel.classList.add("is-open");
      panel.style.height = "auto";
      return;
    }
    panel.style.height = "0px";
    void panel.offsetHeight;
    panel.classList.add("is-open");
    panel.style.height = panel.scrollHeight + "px";
    setTimeout(() => {
      // let the panel grow with its content (auto-growing textarea, errors)
      if (panel.classList.contains("is-open")) panel.style.height = "auto";
    }, EXPAND_MS);
  }

  function showPanelFor(li) {
    const which = li.dataset.panel;          // "questionnaire" | "interest"
    const team = optionLabel(li);
    const other = which === "questionnaire" ? panels.interest : panels.questionnaire;

    if (which === "interest") {
      $("#interest-lede").textContent =
        `${team} applications aren't open yet. Leave your email and we'll reach out the moment they are.`;
      interestState.team = team;
      resetInterest();
    }

    if (openPanelName === which) return;     // same panel, just re-labelled
    collapse(other);
    expand(panels[which]);
    openPanelName = which;
  }

  /* ════════════════════════════════════════════════════════════════
     3. QUESTIONNAIRE STATE
     ════════════════════════════════════════════════════════════════ */
  const form = $("#tq-form");
  const answers = {
    discord: "",
    timezone: "",
    hours: "",
    availability: [],
    moderated: "",
    familiarity: "",
    improvements: "",
    volunteer: "",
  };

  const MIN_IMPROVEMENTS = 20;
  const QUESTION_ORDER = [
    "discord", "timezone", "hours", "availability",
    "moderated", "familiarity", "improvements", "volunteer",
  ];

  const isAnswered = {
    discord: () => answers.discord.trim().length > 0,
    timezone: () => answers.timezone.trim().length > 0,
    hours: () => answers.hours !== "",
    availability: () => answers.availability.length > 0,
    moderated: () => answers.moderated !== "",
    familiarity: () => answers.familiarity !== "",
    improvements: () => answers.improvements.trim().length >= MIN_IMPROVEMENTS,
    volunteer: () => answers.volunteer !== "",
  };

  const ERRORS = {
    discord: "Please add your Discord username so we know who to reply to.",
    timezone: "Please tell us your timezone — the detect button fills it in for you.",
    hours: "Please choose roughly how many hours you can give each week.",
    availability: "Please select at least one time of day.",
    moderated: "Please let us know either way — no experience is fine.",
    familiarity: "Please pick a number from 1 to 5.",
    improvements: `Please share a little more — ${MIN_IMPROVEMENTS} characters or so is plenty.`,
    volunteer: "Please let us know whether a volunteer role works for you.",
  };

  const fieldEl = (name) => $(`.tq-field[data-q="${name}"]`, form);
  const errorEl = (name) => $(`#q-${name}-error`);

  const controlEl = (field) => $("input:not([type=hidden]), textarea, [role=group]", field);

  function showError(name) {
    const field = fieldEl(name);
    const err = errorEl(name);
    if (!field || !err) return;
    field.classList.add("is-invalid");
    controlEl(field)?.setAttribute("aria-invalid", "true");
    err.textContent = ERRORS[name];
    err.hidden = false;
  }

  function clearError(name) {
    const field = fieldEl(name);
    const err = errorEl(name);
    if (!field || !err) return;
    field.classList.remove("is-invalid");
    controlEl(field)?.removeAttribute("aria-invalid");
    err.hidden = true;
  }

  /* ── progress ── */
  const segs = $$(".tq-seg", $("#tq-progress-bar"));
  const progressText = $("#tq-progress-text");
  const progressBar = $("#tq-progress-bar");

  function updateProgress() {
    const done = QUESTION_ORDER.filter((q) => isAnswered[q]()).length;
    segs.forEach((seg, i) => seg.classList.toggle("is-filled", i < done));
    progressText.textContent = `${done} of ${QUESTION_ORDER.length} answered`;
    progressBar.setAttribute("aria-label", `Application progress: ${done} of ${QUESTION_ORDER.length} answered`);
  }

  /* ── text inputs ── */
  const discordInput = $("#q-discord");
  const timezoneInput = $("#q-timezone");

  [["discord", discordInput], ["timezone", timezoneInput]].forEach(([name, input]) => {
    input.addEventListener("input", () => {
      answers[name] = input.value;
      if (isAnswered[name]()) clearError(name);
      updateProgress();
    });
    input.addEventListener("blur", () => {
      if (!isAnswered[name]()) showError(name);
    });
  });

  /* ── timezone detect ── */
  const tzButton = $("#tz-detect");
  tzButton.addEventListener("click", () => {
    let zone = "";
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (err) {
      zone = "";
    }
    if (!zone) {
      tzButton.textContent = "Couldn't detect — type it instead";
      timezoneInput.focus();
      return;
    }
    timezoneInput.value = zone;
    answers.timezone = zone;
    clearError("timezone");
    updateProgress();
    tzButton.textContent = "Filled in";
    tzButton.classList.add("is-done");
    setTimeout(() => {
      tzButton.textContent = "Use my device's timezone";
      tzButton.classList.remove("is-done");
    }, 2200);
  });

  /* ── pill groups ── */
  $$("[data-pills]", form).forEach((group) => {
    const name = group.dataset.pills;
    const multi = group.dataset.mode === "multi";
    group.addEventListener("click", (e) => {
      const pill = e.target.closest(".tq-pill");
      if (!pill) return;
      const value = pill.dataset.value;
      if (multi) {
        const on = pill.getAttribute("aria-pressed") === "true";
        pill.setAttribute("aria-pressed", String(!on));
        answers[name] = $$(".tq-pill", group)
          .filter((p) => p.getAttribute("aria-pressed") === "true")
          .map((p) => p.dataset.value);
      } else {
        $$(".tq-pill", group).forEach((p) => p.setAttribute("aria-pressed", String(p === pill)));
        answers[name] = value;
      }
      if (isAnswered[name]()) clearError(name);
      else showError(name);
      updateProgress();
    });
  });

  /* ── textarea: auto-grow + live count ── */
  const improvements = $("#q-improvements");
  const improvementsCount = $("#q-improvements-count");

  function autoGrow() {
    improvements.style.height = "auto";
    improvements.style.height = improvements.scrollHeight + "px";
    // the open panel may be pinned to a pixel height mid-animation
    const panel = panels.questionnaire;
    if (panel && panel.classList.contains("is-open")) panel.style.height = "auto";
  }

  improvements.addEventListener("input", () => {
    answers.improvements = improvements.value;
    const n = improvements.value.trim().length;
    const ok = n >= MIN_IMPROVEMENTS;
    improvementsCount.textContent = ok
      ? `${n} characters`
      : `${n} characters — ${MIN_IMPROVEMENTS} minimum`;
    improvementsCount.classList.toggle("is-ok", ok);
    if (ok) clearError("improvements");
    autoGrow();
    updateProgress();
  });
  improvements.addEventListener("blur", () => {
    if (!isAnswered.improvements()) showError("improvements");
  });

  /* ════════════════════════════════════════════════════════════════
     4. SUBMISSION
     ════════════════════════════════════════════════════════════════ */
  async function postPayload(payload) {
    if (!TEAM_FORM_ENDPOINT) {
      console.info("[Collared] TEAM_FORM_ENDPOINT is empty — simulating a successful submission.", payload);
      await new Promise((r) => setTimeout(r, 900));
      return true;
    }
    const body = JSON.stringify(payload);
    try {
      // No custom headers: keeps this a simple request, so no CORS preflight
      // (Apps Script web apps reject preflight).
      const res = await fetch(TEAM_FORM_ENDPOINT, { method: "POST", body, redirect: "follow" });
      const data = await res.json();
      if (data && data.ok) return true;
      throw new Error("Endpoint did not return ok:true");
    } catch (err) {
      // Opaque/CORS quirk — retry blind and treat completion as success.
      await fetch(TEAM_FORM_ENDPOINT, { method: "POST", body, mode: "no-cors" });
      return true;
    }
  }

  function setBusy(button, busy, busyText, idleText) {
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    button.textContent = busy ? busyText : idleText;
  }

  /* ── application submit ── */
  const submitBtn = $("#tq-submit");
  const formError = $("#tq-formerror");
  const successEl = $("#tq-success");
  const progressEl = $("#tq-progress");
  let sending = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;

    const invalid = QUESTION_ORDER.filter((q) => !isAnswered[q]());
    QUESTION_ORDER.forEach((q) => (isAnswered[q]() ? clearError(q) : showError(q)));

    if (invalid.length) {
      formError.textContent =
        invalid.length === 1
          ? "One answer still needs your attention."
          : `${invalid.length} answers still need your attention.`;
      formError.hidden = false;
      focusFirstInvalid(invalid[0]);
      return;
    }
    formError.hidden = true;

    sending = true;
    setBusy(submitBtn, true, "Sending…", "Submit application");

    const payload = {
      key: TEAM_FORM_KEY,
      type: "application",
      team: "Discord & Community Team",
      discord: answers.discord.trim(),
      timezone: answers.timezone.trim(),
      hours: answers.hours,
      availability: answers.availability.slice(),
      moderated: answers.moderated,
      familiarity: Number(answers.familiarity),
      improvements: answers.improvements.trim(),
      volunteer: answers.volunteer,
      website: $("#q-website").value,
    };

    try {
      await postPayload(payload);
      form.hidden = true;
      progressEl.hidden = true;
      successEl.hidden = false;
      const panel = panels.questionnaire;
      if (panel) panel.style.height = "auto";
      successEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    } catch (err) {
      formError.textContent =
        "That didn't go through. Your answers are still here — please try again, or email tox@collared.app.";
      formError.hidden = false;
      formError.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    } finally {
      sending = false;
      setBusy(submitBtn, false, "Sending…", "Submit application");
    }
  });

  function focusFirstInvalid(name) {
    const field = fieldEl(name);
    if (!field) return;
    const target = $("input, textarea, .tq-pill", field);
    field.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    setTimeout(() => target && target.focus({ preventScroll: true }), reduceMotion ? 0 : 320);
  }

  /* ════════════════════════════════════════════════════════════════
     5. INTEREST FORM (coming-soon teams)
     ════════════════════════════════════════════════════════════════ */
  const interestForm = $("#interest-form");
  const interestEmail = $("#interest-email");
  const interestEmailError = $("#interest-email-error");
  const interestBtn = $("#interest-submit");
  const interestFormError = $("#interest-formerror");
  const interestSuccess = $("#interest-success");
  const interestSuccessText = $("#interest-success-text");
  const interestState = { team: "", sending: false };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function resetInterest() {
    interestForm.hidden = false;
    interestSuccess.hidden = true;
    interestFormError.hidden = true;
    interestEmailError.hidden = true;
    interestEmail.closest(".tq-field").classList.remove("is-invalid");
  }

  function validateInterestEmail(show) {
    const ok = EMAIL_RE.test(interestEmail.value.trim());
    const field = interestEmail.closest(".tq-field");
    if (ok || !show) {
      field.classList.remove("is-invalid");
      interestEmail.removeAttribute("aria-invalid");
      interestEmailError.hidden = true;
    } else {
      field.classList.add("is-invalid");
      interestEmail.setAttribute("aria-invalid", "true");
      interestEmailError.textContent = interestEmail.value.trim()
        ? "That doesn't look like an email address — please check it."
        : "Please add an email address so we can reach you.";
      interestEmailError.hidden = false;
    }
    return ok;
  }

  interestEmail.addEventListener("blur", () => validateInterestEmail(true));
  interestEmail.addEventListener("input", () => validateInterestEmail(false));

  interestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (interestState.sending) return;
    if (!validateInterestEmail(true)) {
      interestEmail.focus();
      return;
    }
    interestFormError.hidden = true;
    interestState.sending = true;
    setBusy(interestBtn, true, "Sending…", "Notify me");

    const payload = {
      key: TEAM_FORM_KEY,
      type: "interest",
      team: interestState.team,
      email: interestEmail.value.trim(),
      discord: $("#interest-discord").value.trim(),
      website: $("#interest-website").value,
    };

    try {
      await postPayload(payload);
      interestSuccessText.textContent =
        `We'll email you the moment ${interestState.team} applications open.`;
      interestForm.hidden = true;
      interestSuccess.hidden = false;
      const panel = panels.interest;
      if (panel) panel.style.height = "auto";
    } catch (err) {
      interestFormError.textContent =
        "That didn't go through. Please try again, or email tox@collared.app.";
      interestFormError.hidden = false;
    } finally {
      interestState.sending = false;
      setBusy(interestBtn, false, "Sending…", "Notify me");
    }
  });

  /* initial paint */
  updateProgress();
})();
