# Voqiva

Purchase-verified customer research for Indian D2C brands. A brand asks a plain-English question; Voqiva interviews its real buyers (or a verified panel) by WhatsApp voice note, links what they said to what they bought, and tracks whether the fixes worked.

**Status:** clickable prototype. Interviews, WhatsApp, Shopify orders, payouts and ad campaigns are simulated with sample data. Data is stored in the visitor's browser only.

## Run locally
Open `index.html` in a browser. No build tools or server needed.

## Edit
Source lives in `src/`. After editing, run `./build.sh` to regenerate `index.html`, then commit both.

| File | What it holds |
|---|---|
| `src/01-head.html` | Title, fonts, all CSS |
| `src/02-scripts.js` | Interview scripts and sample answer pools for seeded studies |
| `src/03-engine.js` | Data store, matching, payouts, synthesis writer, seed data |
| `src/04-ai.js` | AI plan, simulated interviews, synthesis (with rule-based fallback) |
| `src/05-views.js` | Core screens: Home, Define Objective, Plan & Budget, Live Monitor, Insights, Action Plan |
| `src/07-v2.js`, `08-v2-actions.js` | Customer circle, consent, orders, always-on triggers, outcome tracking, pricing |
| `src/09-panel.js`, `10-panel-actions.js` | Voqiva panel and audience segments |
| `docs/data-model.json` | Data model (v3) |

## AI
Inside claude.ai the prototype calls Claude for plans, interviews and synthesis. On a normal website that capability isn't available, so it runs on built-in rules (the top bar shows "AI offline · rules"). Live AI needs a small backend holding an Anthropic API key.

## Deploy
GitHub Pages: Settings → Pages → Deploy from branch → `main` / root.
