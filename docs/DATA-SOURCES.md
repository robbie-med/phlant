# Data sources

All sources are free, need no API key, and answer browser requests (CORS). Coordinates are the only thing sent.

| What | Source | Endpoint | Licence | Used for |
|---|---|---|---|---|
| Ephemeris | [astronomy-engine](https://github.com/cosinekitty/astronomy) (on-device) | — | MIT | Everything astronomical |
| Soil at the pin (US) | USDA-NRCS Soil Data Access (SSURGO) | `POST https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest` (SQL) | Public domain (US Gov) | Texture, pH, drainage, horizons; site pack |
| Soil map polygons (US) | USDA-NRCS SDA spatial (`mupolygon`) + SDM WMS | same endpoint, `STIntersection`; `https://SDMDataAccess.sc.egov.usda.gov/Spatial/SDM.wms` | Public domain | Soil map for 0.25–200 acres on the Site page |
| Soil outside the US | ISRIC SoilGrids 250 m | `https://rest.isric.org/soilgrids/v2.0/properties/query` | CC-BY 4.0 | Fallback texture/pH |
| Stream & groundwater gauges (US) | USGS Water Data OGC API | `https://api.waterdata.usgs.gov/ogcapi/v0/` | Public domain | Nearby gauges (pack), live readings (online) |
| Temperature history | Open-Meteo Historical (ERA5) | `https://archive-api.open-meteo.com/v1/archive` | CC-BY 4.0 | Frost dates (≤2 °C, p90 spring / median autumn), zone, GDD, monthly normals |
| Wind history | Open-Meteo Historical (ERA5), hourly | same | CC-BY 4.0 | Wind rose by month |
| Forecast | Open-Meteo Forecast | `https://api.open-meteo.com/v1/forecast` | CC-BY 4.0 | 7-day outlook, soil temperature/moisture (online, cached 3 h) |
| Elevation | Open-Meteo Elevation (90 m DEM) | `https://api.open-meteo.com/v1/elevation` | CC-BY 4.0 | Observer height |
| Geocoding | Open-Meteo Geocoding | `https://geocoding-api.open-meteo.com/v1/search` | CC-BY 4.0 | Adding sites by name |
| Base map | OpenStreetMap tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | ODbL (data), tile usage policy | Site map picker |

## Notes

- **Frost threshold.** ERA5 2 m temperature runs warm on clear nights, so a 2 °C threshold reproduces station "last freeze" normals (checked against NWS Tulsa: median Mar 29, safe Apr 19, first Oct 30). The spring date applied to a site is the 90th percentile (frost-free after it in 9 years of 10); the autumn date is the median.
- **USGS EPQS** elevation is not used: it answers curl but not browsers (no CORS header).
- **SDA** has a short maintenance window around 00:30 CST; the fetcher reports it rather than failing silently.
- **OSM tiles** are requested only from the Site page map; keep usage light (no bulk prefetch).
