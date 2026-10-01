# Architecture

Phlant is a static single-page app (Vite + React 19 + TypeScript) that runs entirely in the browser. There is no backend. It installs as a PWA and, after one "site pack" download per location, works with no network at all.

```
┌────────────────────────────── browser ──────────────────────────────┐
│  src/astro      ephemeris & calendars (astronomy-engine, MIT)        │
│      ↓ DayContext (Moon state, solar term, lunisolar date, 干支 …)   │
│  src/traditions one rule engine per tradition → scores + reasons     │
│      ↓ consensus                                                     │
│  src/ui         Today · Calendar · Sky · Plants · Garden · Tools ·   │
│                 Site & data (Leaflet map, soil polygons)             │
│  src/garden     solar geometry: shadows, sun-hours per bed           │
│  src/services   fetchers + site packs (IndexedDB)  ← public APIs     │
│  src/state      settings (localStorage)                              │
└──────────────────────────────────────────────────────────────────────┘
```

## Astronomy (`src/astro`)

Everything is computed, nothing is looked up.

- **`moon.ts`** — `moonState(date, observer)`: phase angle, illumination, age, quarter, tropical sign (longitude of date ÷ 30°), sidereal constellation (precession-corrected longitude against the IAU boundary crossings of the ecliptic, Ophiuchus folded into Scorpius as biodynamic calendars do), declination and its trend (ascending/descending), distance and nearest apsis, nearest node, Moon–Saturn opposition. `signIngresses()` bisects to the minute. `lunarDay()` counts moonrises since the new Moon (the Russian лунные сутки).
- **`solarterms.ts`** — the 24 节气/절기 as exact instants (`SearchSunLongitude`), with Chinese, Korean, pinyin and English names; 72 pentads.
- **`lunisolar.ts`** — Chinese/Korean lunisolar months by the standard rule: the month containing the winter solstice is month 11; between two such months, if thirteen new Moons fall, the first month without a 中气 is the leap month. Evaluated in the tradition's own zone (CST for China, KST for Korea).
- **`sexagenary.ts`** — 干支 day from the Julian Day Number ((JDN + 49) mod 60 = 甲子), anchored on 2000-01-01 = 戊午 and 1949-10-01 = 甲子.
- **`dates.ts`** — civil-date helpers in a fixed UTC offset, Easter (Meeus), JDN.

`astro.test.ts` pins these to known facts: Chinese New Year 2026, the 2025 leap sixth month, Chuseok 2026, winter solstice in KST, the IAU boundaries re-derived from astronomy-engine's own constellation tables.

## Traditions (`src/traditions`)

`types.ts` defines `DayContext` (what every tradition can read) and `TraditionDay` (what it returns). `index.ts` builds the context for a date at a site and runs the enabled traditions; `evaluateDay` averages the scores per task and measures agreement. Each tradition file is self-contained and cites its sources. See [TRADITIONS.md](TRADITIONS.md).

Hemisphere handling: phase rules are universal; ascending/descending flips south of the equator; solar-term advice is shifted six months.

## Garden geometry (`src/garden/sun.ts`)

Plan coordinates are metres with +y down the page; `rotationDeg` says which compass bearing the top of the plan faces. `sunSamples` returns the Sun's azimuth and altitude every 15 minutes while it is up. `shadedBy` ray-casts from a point toward the Sun through a box caster. `bedSunHours` averages a 3×3 grid of points over the day. The 2D plan draws the shadow footprint (convex hull of the box and its translated copy); the 3D view places a directional light at the same azimuth/altitude so both agree.

## Services and offline packs (`src/services`)

A **site pack** is fetched once per site and stored in IndexedDB: elevation, ten years of ERA5 daily temperatures reduced to frost statistics and zone, three years of hourly wind reduced to a month × direction rose, the SSURGO (or SoilGrids) soil at the pin, and nearby USGS gauges. Every step has a timeout and records errors instead of failing the pack. Packs export/import as JSON. Only live river readings and the 7-day forecast fetch again (the forecast is cached 3 h in localStorage). See [DATA-SOURCES.md](DATA-SOURCES.md).

## State (`src/state/store.ts`)

A tiny external store (`useSyncExternalStore`) persisted to localStorage: sites (with beds, features, orientation), enabled traditions, mode, theme, selected date, onboarding flag. `migrateSite` upgrades older saved shapes.

## Build

Vite 5. `vite-plugin-pwa` generates the service worker (precache of the app shell; the app updates on the second load after a deploy). `three` and `leaflet` are lazy chunks so the core bundle stays ~175 kB gzipped. Fonts (Fraunces, Inter) are bundled via Fontsource for offline use.
