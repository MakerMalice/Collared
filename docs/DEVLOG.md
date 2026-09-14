# Collared Site — Build Log & Asset Provenance

How this site was made (June 2026), what it was based on, and the rules that governed it.
Written so any future session — human or Claude — can pick up the thread.

## Process

1. **Studied the real app.** The only records of the original Collared app were:
   - `CollaredPreview-2.mov` — a 55-second, 720×1560 screen recording of the app (June 2026 build)
   - A 7-screen design composite from the older 2023 design pass
   - Two standalone design comps: `Collared App Profile.png`, `Collared App Rewards.png`

   ffmpeg wasn't installed, so frames were extracted with a **Swift/AVFoundation script**
   (1 frame/sec → 56 frames → contact sheets for review). A copy of that script lives in the
   app project: `~/Documents/APPS/CollaredApp/tools/extract-frames.swift`.

2. **Recreated, never embedded.** Every app screen shown on the site is hand-built HTML/CSS/JS
   modeled on those frames. The video and composites were reference only. Where the video and the
   older composite disagreed, the video (newer) won.

3. **Privacy rule (standing).** The recording contains the developer's real avatar photo,
   username ("tox"), email, location, and partner usernames. **None of that may ever appear in
   site output.** All recreations use fictional data ("Luna", generic tasks, invented rewards).
   This rule carries over to the app rebuild and any future marketing material.

## Brand assets — sources of truth

| Asset | Location | Use |
|---|---|---|
| `collared-logo-white.png` (1941×550, transparent) | `assets/` (source: ~/Downloads) | Wordmark on lavender/dark: hero, merch band, footer |
| `collared-logo-purple.png` (1941×550, transparent) | `assets/` (source: ~/Downloads) | Wordmark on light: nav |
| `collared-logo-lavender.png` | ~/Downloads only | Unused spare |
| `collodis.png` (512², broken-circle icon on lavender tile) | `assets/` (source: ~/Documents) | Favicon / touch icon |
| `collared-tile.png` (1200², wordmark on lavender tile) | `assets/` (from ~/Documents/COLLARED.png, 2500²) | OG / social-preview image (solid bg needed for link cards) |
| `looponCOLLARED.png` (collar-with-O-ring variant) | ~/Documents only | Unused so far — candidate for podcast art or app icon exploration |
| Broken-circle motif | inline SVG `#collar-mark` in `index.html` | Drawn as a stroked circle with `stroke-dasharray` gaps — no image needed |

The wordmark must never be recreated in a webfont — always use the supplied PNGs.
An earlier version of the site used a cropped-tile wordmark (lavender box baked in); it was
replaced by the transparent PNGs in the second session at the owner's request.

## Decisions worth remembering

- **Ink text on lavender, not white** — white-on-`#A9A4C9` fails WCAG AA (~2.2:1). Hero
  tagline/subline, merch copy use `#2E2A3F`/`#36324A`; the join band's gradient was deepened to
  `#7A739F → #615B85` so its white text passes.
- **Task cards inside the phone need `flex: none`** — as flex children of the scrollable list
  they otherwise get squashed (that bug shipped briefly).
- **`.mobile-menu[hidden] { display:none }`** — the menu's `display:flex` rule overrides the
  `hidden` attribute without it.
- **Hero auto-loop** pauses permanently on first user interaction; respects
  `prefers-reduced-motion` (never starts).
- The empty-filter wording ("You don't have any completed tasks") and overdue-banner phrasing
  copy the real app verbatim.

## Launch history

- **Built & launched June 11–12, 2026.** Repo: `github.com/MakerMalice/Collared` (public),
  GitHub Pages deploy-from-branch (`main`, root).
- Launch hiccup for the record: changing repo visibility **unpublishes** Pages, and GitHub's
  CDN (Fastly) serves stale cached 404s/200s during re-provisioning — which made the site appear
  to flap. Ground truth is the API's `has_pages` + the "pages build and deployment" workflow run,
  not what curl returns from an edge cache.
- **Custom domain `collared.app`** added by the owner (CNAME commits, Sept 2026).
- **Waitlist:** Kit (ConvertKit) form `9553709`, double opt-in off, wired June 2026 and verified
  live end-to-end (two test subscribers were created and flagged for deletion).

## Standing to-dos on the site

- Delete the two `collared.site.test.delete.me*@gmail.com` test subscribers in Kit (if not done).
- Create the `merch_interest` custom field in Kit (or a second form + `KIT_MERCH_FORM_ID`) so
  the merch checkbox is queryable.
- Fill store/podcast URL constants in `app.js` when those exist.
- Refresh the §2 demo panels after the rebuilt app's visual language settles
  (owner's call: site stays as-is until the new app is visually further along).
