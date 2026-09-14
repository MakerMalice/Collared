# Collared — Marketing Site

Single-page marketing website for **Collared**, live at **[collared.app](https://collared.app)**.

Collared is a lifestyle brand serving the BDSM / power-exchange community, with three pillars:
an iOS + Android app for managing dynamics (tasks, journaling, rewards), a Discord community of
5,000+ members, and a podcast. The site's job is to convey the calm, structured world of Collared
and convert visitors into Discord members and app-waitlist signups.

> The **app itself** is a separate project with its own repository — see
> `~/Documents/APPS/CollaredApp` (rebuild in progress). This repo is the website only.

## Stack

Vanilla HTML/CSS/JS — no framework, no build step. Three files plus assets:

| File | Purpose |
|---|---|
| `index.html` | The entire page: nav, hero, pillars, app features, community, podcast, merch, events, join, footer |
| `styles.css` | All styling. Two deliberate palettes (see below) |
| `app.js` | Demo-panel logic, waitlist submission, events rendering, nav/reveal behavior |
| `assets/` | Brand marks only (transparent logo PNGs, broken-circle icon, OG tile) |
| `CNAME` | Custom-domain binding for GitHub Pages (`collared.app`) |

## The two palettes (intentional)

1. **Site chrome** — soft brand lavender from the logo tiles:
   `--lavender #A9A4C9`, `--lavender-deep #8B85B0`, `--lavender-mist #E6E3F2`,
   `--porcelain #FAFAFC`, `--ink #1E1E24`, `--stone #8A8A93`
2. **App demo panels** (`.app-ui`) — the *real app's* palette so the recreated UI reads as
   authentic product: bg `#F6F0FF`, accent violet `#7444FF`, with a full dark-mode variable set
   under `body.demos-dark`.

Typography: **Jost** (display) + **Inter** (body) via Google Fonts, system fallbacks.
The broken-circle icon (a collar in two strokes) is the only motif — used as an inline SVG
symbol (`#collar-mark`) for section glyphs, hero geometry, podcast cover, and empty states.

## Interactive demo panels

All demo state is plain in-memory JS (nothing persisted). The recreated app UI is hand-built
HTML/CSS/JS based on a screen recording of the original app — **no screenshots or video are
shipped**, and all data shown is fictional (see `docs/DEVLOG.md` for provenance and privacy rules).

- **Hero phone** — working Tasks screen: auto-loop completes tasks (strikethrough → green badge →
  points tick) and pauses on first user interaction; filters and Complete buttons are real.
- **Feature panels** — tasks (same engine), journal cards (static), rewards shop (working redeem
  with balance), profile (toggleable Role / Relationship Status pills).
- **"Make it yours"** — Light/Dark/System selector that flips every demo panel (not the site)
  between the app's light and dark themes.

## Editing the site

**All external links** live in one constants block at the top of `app.js`:
`DISCORD_INVITE_URL`, `STAFF_FORM_URL`, store URLs, podcast URLs.

**Events** are one `events` array at the top of `app.js` — add an object with
`title / date (ISO) / location / description / link` and the page automatically sorts it into
Upcoming or Past (collapsed accordion). A commented worked example sits above the array.

**Waitlist** is wired to Kit (ConvertKit), form ID `9553709` (`KIT_WAITLIST_FORM_ID` in `app.js`).
Submission happens via background fetch (visitor stays on-page, styled confirmation), with a
native-POST fallback to Kit's hosted thank-you page. The "tell me about merch too" checkbox is
sent as the Kit custom field `merch_interest`; an optional `KIT_MERCH_FORM_ID` slot exists for a
dedicated merch form.

## Deploying

GitHub Pages, deploy-from-branch: **push to `main` and the site redeploys** (1–2 min).
Repo must stay **public** for free-plan Pages — note that the served site is public regardless;
static HTML/CSS/JS is always viewable by visitors.

Custom domain `collared.app` is bound via the `CNAME` file — **don't delete it**, and if the
repo's visibility is ever toggled, re-check Settings → Pages (visibility changes unpublish Pages).

## Accessibility & performance

Semantic HTML, visible `:focus-visible` styles, keyboard-reachable demo controls,
`prefers-reduced-motion` honored (reveals and auto-loop disabled), WCAG AA contrast pass
(text on lavender uses ink/deep tones). No video files, no stock photography, ~356 KB of assets.

---

Collared is intended for adults 18+. All content relates to consensual adult dynamics.
