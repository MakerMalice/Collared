# Collared marketing site

Live at https://collared.app (GitHub Pages from `main`, custom domain via `CNAME` — never delete that file).

- Read `README.md` (structure, editing guide) and `docs/DEVLOG.md` (asset provenance, decisions, privacy rules) before making changes.
- This repo is the **website only**. The Collared app is a separate project at `~/Documents/APPS/CollaredApp` — app work never goes in this repo.
- Tone: plain, confident, non-explicit. Community vocabulary (D/s, Dom, sub, power exchange) used naturally; no euphemisms, no edginess, no explicit content.
- Two palettes by design: site chrome = soft lavender; `.app-ui` demo panels = real app palette (`#F6F0FF` / `#7444FF`). Don't blend them.
- Never put real personal data in demo panels — fictional data only ("Luna", invented tasks/rewards).
- All external links + the events array live in one constants block at the top of `app.js`.
- Push to `main` = deploy. Keep the repo public (free-plan Pages requirement).
