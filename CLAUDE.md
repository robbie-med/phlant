# Phlant — agent notes

Comparative moon/tradition planting almanac. Vite + React 19 + TypeScript, astronomy-engine for ephemeris.
Ports (from /home/user/Projects/PORTS.md): dev 3917, preview 3510. Never change them without updating PORTS.md.

Layout: `src/astro` (pure ephemeris/calendar math, unit-tested), `src/traditions` (one rule engine per tradition
returning scored tasks + reasons; `index.ts` builds the DayContext and consensus), `src/data` (plants, companions),
`src/services` (network fetchers + offline site packs in IndexedDB), `src/state/store.ts` (persisted settings),
`src/ui` (one file per tab).

Rules of the house:
- Nothing is a lookup table: every date is computed from the sky. Add traditions as new `Tradition` objects.
- Keep tradition content attributable: every rule string names what it reads; cite sources in `sources`.
- Korean lunisolar math uses KST (UTC+9), Chinese uses CST (UTC+8), regardless of the user's zone — that is the tradition.
- Frost dates applied from a site pack: spring = 90th percentile at ≤2 °C (safe date), autumn = median.
- `npm test` must pass (calendar anchors). `npm run build` needs Node 18's web-crypto flag (already in the script).
