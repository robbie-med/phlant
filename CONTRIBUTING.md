# Contributing to Phlant

Thanks for helping. Phlant is a small, opinionated app: **every date comes from the sky, every rule cites its source, and everything works offline after one download.** Keep those three promises and most changes are welcome.

## Setup

```bash
git clone git@github.com:robbie-med/phlant.git && cd phlant
npm install
npm run dev          # http://127.0.0.1:3917
npm test             # vitest
npm run lint && npm run typecheck
npm run build        # production bundle in dist/ (PWA, service worker)
```

Node 18+ works; on Node 18 the build script passes `--experimental-global-webcrypto` because the service-worker generator needs the Web Crypto global. Node 20/22 need nothing special.

## Where things live

| Path | What |
|---|---|
| `src/astro/` | Pure ephemeris & calendar math on top of [astronomy-engine](https://github.com/cosinekitty/astronomy): Moon state, solar terms, Chinese/Korean lunisolar months, sexagenary cycle, sign ingresses. Unit-tested against known calendar facts. |
| `src/traditions/` | One file per planting tradition. Each exports a `Tradition` whose `evaluate(ctx)` scores eleven garden tasks (−2…+2) and explains why. `index.ts` builds the shared `DayContext` and the consensus. |
| `src/garden/` | Solar geometry for the plan: sun samples, shadow tests, sun hours per bed. |
| `src/services/` | Network fetchers (USDA SSURGO, USGS Water, Open-Meteo, SoilGrids) and the offline **site pack** store (IndexedDB). |
| `src/data/` | Plants and companion pairs. |
| `src/ui/` | One file per tab plus `kit.tsx` (components) and `common.tsx`. `Garden3D` and `SiteMap` are lazy chunks. |
| `docs/` | Architecture, data sources, deployment, the generated traditions reference. |

## Adding or correcting a tradition rule

1. Edit the tradition file. Every `add(...)` carries a human-readable reason; keep it specific ("Moon in Scorpio, a water sign → sow leaf crops") and in the tradition's own vocabulary where that helps (jour racines, 손 없는 날).
2. Cite the source in the tradition's `sources` array. Folk rules are fine — say where they are from.
3. Run `npm run docs:traditions` to regenerate `docs/TRADITIONS.md`.
4. If the rule depends on an astronomical event that is not yet in `DayContext`, add it to `src/astro` with a test, not inside the tradition.

## Adding a data source

Must be free, keyless, and answer browser requests (CORS). Fetch it in `src/services`, give it a timeout, store the result in the site pack so it works offline, and document it in `docs/DATA-SOURCES.md` with its licence.

## Style

ESLint + Prettier (`npm run format`). Short functions, explicit units in names (`heightM`, `spacingCm`), dates as `YYYY-MM-DD` strings in the site's time zone, instants as `Date`.

## Pull requests

CI runs lint, typecheck, tests and a build. Keep PRs focused; screenshots for UI changes.
