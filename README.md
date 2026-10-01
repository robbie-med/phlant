# Phlant — comparative moon & tradition planting almanac

Seven planting traditions, one sky. For any location on Earth, Phlant computes the real
ephemeris (Moon phase, tropical sign, sidereal constellation, ascending/descending, nodes,
perigee, Saturn opposition, 24 solar terms, Chinese/Korean lunisolar date, sexagenary day)
and runs each tradition's rules over it, then shows where they agree and disagree:

Korean 농사력 · Chinese 农历/通书 (华北, 江南, 岭南, 东北 variants) · Biodynamic (Thun) ·
French Rustica · English cottage lore · Russian лунный календарь · American Northeast almanac & the Signs.

Nothing here is a lookup table — everything is computed, so it works for 2026 or 2060, Tulsa or Wyoming.

## Deployed
- https://phlant.robbiemed.org — GitHub Pages, built by `.github/workflows/pages.yml` on every push to `main` (DNS: Cloudflare CNAME → robbie-med.github.io).
- https://field.bo-bob.com — `phlant.service` (systemd --user) serves `dist/` on 127.0.0.1:3510 behind the diet-loggers Cloudflare tunnel.
Redeploy: `npm run build` (the service reads dist/ live; no restart needed).

## Run
```bash
npm install
npm run dev        # Vite dev server on 127.0.0.1:3917 (see /home/user/Projects/PORTS.md)
npm test           # vitest: calendar anchors, lunisolar leap months, tradition engines
./start.sh         # build + preview on 127.0.0.1:3510
```
APK later: `npm run build && npm run cap:init && npm run cap:android` (Capacitor), then open `android/` in Android Studio.

## Data sources (free, keyless, fetched once per site into an offline "site pack")
- Soil: USDA NRCS Soil Data Access (SSURGO) in the US; ISRIC SoilGrids elsewhere.
- Water: USGS Water Data OGC API (nearby stream/groundwater gauges; live readings need network).
- Climate: Open-Meteo ERA5 archive → 10-year frost dates, hardiness zone, GDD, wind rose; geocoding; 7-day forecast with soil temperature.
- Elevation: USGS EPQS / Open-Meteo.
- Ephemeris: astronomy-engine (MIT), on-device.

## Status (2026-10-01)
Done: astro core + tests, 7 tradition engines (10 incl. Chinese regions) + consensus, plant DB (48 crops with Korean/Chinese names, companions), services + offline site-pack storage, settings store, Today view, month & year calendars.
All seven tabs built. Sky: five-clock explainer, ecliptic ring with planets, month panels with exact sign ingress times, 20-year pattern grid. Garden: 2D plan editor (beds, house/tree/fence/shed/greenhouse/path casters, plan orientation, snapping, undo, templates, export/import) with hourly shadow footprints and per-bed sun hours from the real solar path (`src/garden/sun.ts`, tested), plus a three.js 3D view (lazy chunk) with real sun position, soft shadows, plants, and view presets. Today: weather strip (Open-Meteo, cached).
