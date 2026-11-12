# Collared — Marketing Site

Single-page marketing website for **Collared**, live at **[collared.app](https://collared.app)**.

Collared is a lifestyle brand serving the BDSM / power-exchange community, with three pillars:
an iOS + Android app for managing dynamics (tasks, journaling, rewards), a Discord community of
5,000+ members, and a podcast. The site's job is to convey the calm, structured world of Collared
and convert visitors into Discord members and app-waitlist signups.

> The **app itself** is a separate project with its own repository — see
> `~/Documents/APPS/CollaredApp` (rebuild in progress). This repo is the website only.

## Stack

Vanilla HTML/CSS/JS, no framework, no build step. **Stage** look since November 2026 (app decision D2147):
a dark studio ground, the app's real screens on real devices, one colour field per feature.

| File | Purpose |
|---|---|
| `index.html` + `home.css` | Home: hero, the feature ribbon, eleven feature sections in the owner's order, the *Coming from Obedience or Life360?* block (the only place Home names them, with the footer's legal line), the privacy band, every screen, community, end card |
| `compare/obedience.html`, `compare/life360.html` + `compare.css` | `/compare/obedience` and `/compare/life360`: dated facts about them, a side-by-side table with honest *Not yet* rows, sources |
| `site.css` / `site.js` | The shared shell on every page but `/account`: self-hosted fonts, tokens, nav and mobile menu, buttons, devices, page heads, footer; the clips and the closing ring on Home |
| `forms.css` | `/beta` and `/team` form styles (dark) |
| `legal.css` | `/privacy` and `/terms` (styles only; the wording is the policy) |
| `team.html` / `team.js` | The **Join the Team** application page, served at `/team` |
| `beta.html` / `beta.js` | The **beta tester signup**, served at `/beta`. Every call to action on the site points here |
| `account.html` / `account.css` / `account.js` / `account-config.js` | **Your account**, served at `/account` (noindex). Signs in to the same Collared account as the app and talks only to Supabase and its `account-web` function. Loads no `site.js` and nothing from anyone else; a Content-Security-Policy says so (`font-src 'self'` for the site's own fonts). `account-config.js` holds the project URL and the **publishable** key only: never a secret key |
| `vendor/` | Pinned copies used by `/account`: `supabase-js-2.116.0.js` (the UMD build, unmodified) and `qrcode-1.5.4.js` (node-qrcode's core with dijkstrajs, MIT, unmodified sources in one wrapper). Update by replacing the file and its version in the name |
| `assets/fonts/` | Nunito, Lora and Caveat (the app's own faces, OFL), subset to Latin as WOFF2. No Google Fonts |
| `assets/v2/` | The Home clips (`.mp4` + `.webm` + `.jpg` poster) and stills: real app captures, fictional cast only |
| `assets/` | Brand marks (wordmark PNGs, broken-circle icon, OG tile) and the Discord post images |
| `tools/stage_shell.py` | Copies the defs, nav and footer from `index.html` into every page with the `<!--DEFS-->`, `<!--NAV-->`, `<!--FOOT-->` markers. Run it after changing the shell (`/account` keeps its own nav: account.js reads it) |
| `_config.yml` | Keeps `README.md`, `CLAUDE.md`, `docs/` and `tools/` out of the published site (GitHub Pages' Jekyll; no page has front matter, so nothing is templated) |
| `docs/drafts/` | Unreviewed policy drafts, kept here and not published |
| `CNAME` | Custom-domain binding for GitHub Pages (`collared.app`) |

The old lavender site (`styles.css`, `app.js`, `team.css`, `beta.css`) is no longer loaded by any page.

## Clips

Every `.v[data-v]` holds its poster `<img>` (lazy). Near the screen, `site.js` swaps in a muted, looping, inline
`<video>` (WebM first, MP4 second) and pauses it when it leaves. Reduce Motion keeps the posters and stops the
CSS loops. A `[data-sync]` pair (Glimpses, Sub Studio) is one story across two phones: both clips are the same length,
the first keeps time and the second follows it, and a phone whose part hasn't started rests dimmed (`data-awake="from-to"`
in seconds on its `.v`). The *Done when* card cycles its words and pills on a timer that holds on hover, focus or a tap.

**Devices are one component each, true to the device:** `.phone` (iPhone 17 Pro), `.phone.open` (iPhone Duo open),
`.watch` (Apple Watch Series 11, 46 mm). Every size is a percentage of the body, so the bezels match at any width.
Watch screens are 416 x 496, the lit area's own shape, so nothing is cropped. Sources: the app repo's `design/website-redo/` (the teaser v4 takes), the NYC map recap recorded on a
simulator for this site (landmarks only, fictional cast), and the Sub Studio film's own simulator takes (Luna's wardrobe capture and surprise look, Theo's Studio and the send), as
two live phones rather than the film.

## The team application page (`/team`)

`team.html` replaces the old Google Form. One page, sectioned, with a custom accessible
team picker (button + listbox: arrows, Home/End, Enter/Space, Escape, type-ahead) that
expands either the **Discord & Community Team** questionnaire or, for a team that isn't
open yet, a short **interest** form.

The questionnaire is 8 required questions in five titled sections, with a live segmented
progress indicator ("3 of 8 answered") that sticks to the top on desktop. Answers are held
in plain JS; validation runs on blur and on submit, and submit scrolls to and focuses the
first unanswered question.

Submission settings live in one constants block at the top of `team.js`:
`TEAM_FORM_ENDPOINT` (the Google Apps Script web-app `/exec` URL) and `TEAM_FORM_KEY`.
The POST is deliberately header-free so it stays a *simple* CORS request — Apps Script
rejects the preflight that a `Content-Type` header would trigger. If the request throws,
it retries once with `mode: "no-cors"` and treats completion as success; if
`TEAM_FORM_ENDPOINT` is blank the page simulates a successful send so it stays previewable.
Both payload shapes (`type: "application"` and `type: "interest"`) carry a hidden `website`
honeypot field.


## The beta signup page (`/beta`)

`beta.html` is the sibling of `/team` for the invite-only beta round. Since the Stage redo it is in the nav
and behind every *Join the beta* button on the site (it still carries `noindex`). Two
platform cards (iPhone / Android, a keyboard-operable radiogroup) open one questionnaire whose
device and store-email fields swap per platform; Android gets a "invites start a few weeks
after iPhone" callout and its own success copy. Eight questions, same progress bar and
validation as `/team`. Constants (`BETA_FORM_ENDPOINT`, `BETA_FORM_KEY`) sit at the top of
`beta.js`; the payload is `type: "beta"` and lands on the **Beta** tab of the same Google
Sheet, notifying by email and a dedicated beta Discord webhook.

## Deploying

GitHub Pages, deploy-from-branch: **push to `main` and the site redeploys** (1–2 min).
Repo must stay **public** for free-plan Pages — note that the served site is public regardless;
static HTML/CSS/JS is always viewable by visitors.

Custom domain `collared.app` is bound via the `CNAME` file — **don't delete it**, and if the
repo's visibility is ever toggled, re-check Settings → Pages (visibility changes unpublish Pages).

## Accessibility & performance

Semantic HTML, a skip link, visible `:focus-visible` styles, `prefers-reduced-motion` honored (posters instead of
clips, no CSS loops), AA contrast. Images are lazy with sizes set; clips load only near the screen.

---

Collared is intended for adults 18+. All content relates to consensual adult dynamics.
