# The traditions in Phlant

_Generated from `src/traditions/*.ts` by `npm run docs:traditions`. Edit the code, not this file._

Each tradition is a rule engine: given the computed sky for a day (see [ARCHITECTURE.md](ARCHITECTURE.md)), it scores eleven garden tasks from −2 (avoid) to +2 (ideal) and states the reason for every score. The app then shows where the traditions agree.

## The eleven tasks

- **Sow leaf crops** (`sow_leaf`)
- **Sow root crops** (`sow_root`)
- **Sow fruit & seed crops** (`sow_fruit`)
- **Sow flowers** (`sow_flower`)
- **Transplant / plant out** (`transplant`)
- **Prune & cut back** (`prune`)
- **Graft & take cuttings** (`graft`)
- **Weed & control pests** (`weed_pest`)
- **Harvest for storage** (`harvest_store`)
- **Work soil, compost, manure** (`soil_compost`)
- **Water & feed** (`water_feed`)

## 🇰🇷 한국 전통 농사력

_Korea_

Korean farm timing follows the 24 절기 (solar terms) and the lunisolar calendar far more than the Moon's phase: each term names a job, from 입춘 seedlings to 처서 napa cabbage and 입동 김장. The 음력 brings the festival days (한식, 단오, 백중), 삼복 dog days, and 손 없는 날 — the "no-spirit" days for starting anything new.

**Reads:** 24 절기 by exact solar longitude · 음력 lunisolar date (KST) · 삼복 via 경(庚) days · 한식 = 동지 + 105 days · 손 없는 날 (lunar 9, 10, 19, 20, 29, 30)

**Sources:**
- 정학유, 농가월령가 (1816)
- 한국천문연구원 — 24절기 역법
- 국립민속박물관, 한국세시풍속사전

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**추분 秋分 · 음력 팔월 22일 (기유일)**

- Sow leaf crops: **+2** — 추분 (秋分): 추분: harvest begins, sow garlic (마늘) and 양파 seedbeds at the end of the term; gather 들깨.
- Sow root crops: **-1** — 추분: not the term for this crop type
- Sow fruit & seed crops: **-1** — 추분: not the term for this crop type
- Sow flowers: **-1** — 추분: not the term for this crop type
- Harvest for storage: **+2** — 추분 (秋分): 추분: harvest begins, sow garlic (마늘) and 양파 seedbeds at the end of the term; gather 들깨.

Notes: 추분이 지나면 우렛소리 멈추고 벌레가 숨는다. · 추분 秋分, day 9 · 중후 · 음력 팔월 22일 (기유일)

</details>

## 🇨🇳 中国农历 · 华北

_China — North China Plain_

The Chinese farmer's almanac (通书) reads the 24 节气 with their regional proverbs (农谚), the lunar month and day, and the day's sexagenary 干支 through the Twelve Day Officers (建除十二神) that mark a day 宜栽种 (good for planting) or 忌. Regional variant: North China Plain (华北) — Wheat–maize belt (Beijing, Shandong, Henan). Clear four seasons, dry spring.

**Reads:** 24 节气 and 72 候 · 农历 lunisolar date (CST) · 干支 day → 建除十二神 day officer · 月忌日 (lunar 5, 14, 23) · Regional 农谚

**Sources:**
- 《齐民要术》 (6th c.)
- 《授时通考》
- 通书 / 通勝 (Hong Kong almanac)
- 中国农业博物馆 二十四节气

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**秋分 Qiūfēn · 建日 Establish · 酉**

- Sow leaf crops: **+2** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.
- Sow root crops: **-2** — 秋分: not this term's crop; 建日: 建日: begin undertakings, lay out beds — but no 动土 (digging deep).
- Sow fruit & seed crops: **-1** — 秋分: not this term's crop
- Sow flowers: **-1** — 秋分: not this term's crop
- Harvest for storage: **+2** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.
- Work soil, compost, manure: **+1** — 建日 (Establish): 建日: begin undertakings, lay out beds — but no 动土 (digging deep).

Notes: North: winter wheat goes in this term. · 秋分: 秋分种麦正当时 (北方) · 农历八月廿二 · 己酉日 · 建

</details>

## 🇨🇳 中国农历 · 江南

_China — Jiangnan / Yangtze_

The Chinese farmer's almanac (通书) reads the 24 节气 with their regional proverbs (农谚), the lunar month and day, and the day's sexagenary 干支 through the Twelve Day Officers (建除十二神) that mark a day 宜栽种 (good for planting) or 忌. Regional variant: Jiangnan / Yangtze (江南) — Rice paddies and vegetables (Shanghai, Jiangsu, Zhejiang, Hunan). Humid, 梅雨 plum rains in June.

**Reads:** 24 节气 and 72 候 · 农历 lunisolar date (CST) · 干支 day → 建除十二神 day officer · 月忌日 (lunar 5, 14, 23) · Regional 农谚

**Sources:**
- 《齐民要术》 (6th c.)
- 《授时通考》
- 通书 / 通勝 (Hong Kong almanac)
- 中国农业博物馆 二十四节气

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**秋分 Qiūfēn · 建日 Establish · 酉**

- Sow leaf crops: **+2** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.
- Sow root crops: **-2** — 秋分: not this term's crop; 建日: 建日: begin undertakings, lay out beds — but no 动土 (digging deep).
- Sow fruit & seed crops: **-1** — 秋分: not this term's crop
- Sow flowers: **-1** — 秋分: not this term's crop
- Harvest for storage: **+2** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.
- Work soil, compost, manure: **+1** — 建日 (Establish): 建日: begin undertakings, lay out beds — but no 动土 (digging deep).

Notes: Jiangnan: wheat waits for 寒露–霜降. · 秋分: 秋分种麦正当时 (北方) · 农历八月廿二 · 己酉日 · 建

</details>

## 🇨🇳 中国农历 · 岭南

_China — Lingnan / South_

The Chinese farmer's almanac (通书) reads the 24 节气 with their regional proverbs (农谚), the lunar month and day, and the day's sexagenary 干支 through the Twelve Day Officers (建除十二神) that mark a day 宜栽种 (good for planting) or 忌. Regional variant: Lingnan / South (岭南) — Double-cropped rice, no winter dormancy (Guangdong, Guangxi, Fujian).

**Reads:** 24 节气 and 72 候 · 农历 lunisolar date (CST) · 干支 day → 建除十二神 day officer · 月忌日 (lunar 5, 14, 23) · Regional 农谚

**Sources:**
- 《齐民要术》 (6th c.)
- 《授时通考》
- 通书 / 通勝 (Hong Kong almanac)
- 中国农业博物馆 二十四节气

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**秋分 Qiūfēn · 建日 Establish · 酉**

- Sow leaf crops: **+2** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.
- Sow root crops: **-2** — 秋分: not this term's crop; 建日: 建日: begin undertakings, lay out beds — but no 动土 (digging deep).
- Sow fruit & seed crops: **-1** — 秋分: not this term's crop
- Sow flowers: **-1** — 秋分: not this term's crop
- Harvest for storage: **+2** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.
- Work soil, compost, manure: **+1** — 建日 (Establish): 建日: begin undertakings, lay out beds — but no 动土 (digging deep).

Notes: 秋分: 秋分种麦正当时 (北方) · 农历八月廿二 · 己酉日 · 建

</details>

## 🇨🇳 中国农历 · 东北

_China — Northeast_

The Chinese farmer's almanac (通书) reads the 24 节气 with their regional proverbs (农谚), the lunar month and day, and the day's sexagenary 干支 through the Twelve Day Officers (建除十二神) that mark a day 宜栽种 (good for planting) or 忌. Regional variant: Northeast (东北) — One short season (Heilongjiang, Jilin, Liaoning): everything sown 谷雨–立夏.

**Reads:** 24 节气 and 72 候 · 农历 lunisolar date (CST) · 干支 day → 建除十二神 day officer · 月忌日 (lunar 5, 14, 23) · Regional 农谚

**Sources:**
- 《齐民要术》 (6th c.)
- 《授时通考》
- 通书 / 通勝 (Hong Kong almanac)
- 中国农业博物馆 二十四节气

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**秋分 Qiūfēn · 建日 Establish · 酉**

- Sow leaf crops: **0** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.; 东北: outside the short frost-free season
- Sow root crops: **-2** — 秋分: not this term's crop; 东北: outside the short frost-free season; 建日: 建日: begin undertakings, lay out beds — but no 动土 (digging deep).
- Sow fruit & seed crops: **-2** — 秋分: not this term's crop; 东北: outside the short frost-free season
- Sow flowers: **-2** — 秋分: not this term's crop; 东北: outside the short frost-free season
- Transplant / plant out: **-2** — 东北: outside the short frost-free season
- Harvest for storage: **+2** — 秋分 (Qiūfēn): 秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.
- Work soil, compost, manure: **+1** — 建日 (Establish): 建日: begin undertakings, lay out beds — but no 动土 (digging deep).

Notes: 秋分: 秋分种麦正当时 (北方) · 农历八月廿二 · 己酉日 · 建

</details>

## 🇩🇪 Biodynamic (Maria Thun)

_Germany / Austria / Switzerland_

Steiner-derived method formalised by Maria Thun from 1952. Reads the Moon against the real, unequal sidereal constellations: the element of the constellation picks the plant part (root, leaf, flower, fruit); ascending vs descending Moon picks sow vs plant-out; nodes, perigee and eclipses are rest days.

**Reads:** Sidereal constellation of the Moon (IAU boundaries) · Ascending / descending Moon (declination) · Lunar nodes, perigee · Moon–Saturn opposition

**Sources:**
- Maria Thun, Aussaattage (annual, since 1963)
- Thun & Thun, The Biodynamic Sowing and Planting Calendar
- Demeter guidance

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**Root day · Moon descending in Taurus**

- Sow leaf crops: **-2** — Perigee: Thun found sowings at perigee prone to fungal trouble and poor keeping; root day: other plant parts are not favoured
- Sow root crops: **+1** — Perigee: Thun found sowings at perigee prone to fungal trouble and poor keeping; Moon in Taurus ♉ (earth constellation) → root day; Descending Moon favours root development
- Sow fruit & seed crops: **-2** — Perigee: Thun found sowings at perigee prone to fungal trouble and poor keeping; root day: other plant parts are not favoured
- Sow flowers: **-2** — Perigee: Thun found sowings at perigee prone to fungal trouble and poor keeping; root day: other plant parts are not favoured
- Transplant / plant out: **0** — Perigee: Thun found sowings at perigee prone to fungal trouble and poor keeping; Descending Moon: planting time — roots take, transplants settle
- Prune & cut back: **+2** — Descending Moon: prune, cut hedges, take cuttings
- Graft & take cuttings: **-1** — Descending Moon: graft in the ascending period instead
- Harvest for storage: **+1** — root day: harvest root crops for storage; Root day: lift roots for storage
- Work soil, compost, manure: **+2** — Descending Moon: spread compost and manure, the soil "breathes in"

Notes: Perigee today — unfavourable day in the Thun calendar.

</details>

## 🇫🇷 Jardiner avec la Lune

_France, Belgium, Switzerland (Rustica school)_

The French potager calendar insists the phase (croissante/décroissante) matters little: what counts is the Moon montante (sow, graft, harvest aerial parts — "la sève monte") or descendante (plant, prune, cut, work the soil), crossed with the jour racines / feuilles / fleurs / fruits of its constellation. Nodes, apogee and perigee are "ne pas jardiner" hours. Watch the lune rousse and the saints de glace for frost.

**Reads:** Lune montante / descendante (declination) · Constellation → jour racines/feuilles/fleurs/fruits · Nœuds lunaires, apogée, périgée · Lune rousse, saints de glace, Sainte-Catherine

**Sources:**
- Rustica, Jardiner avec la Lune (annual)
- Michel Gros, Calendrier lunaire
- Thérèse Trédoulat, Mon jardin avec la Lune

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**jour racines · lune descendante (décroissante)**

⛔ Périgée within 4 h — hours to avoid.

- Sow leaf crops: **-2** — Périgée within 4 h — hours to avoid.; jour racines: other parts are not the day's focus; Lune descendante: semis attend la lune montante
- Sow root crops: **+1** — Périgée within 4 h — hours to avoid.; Lune en Taurus ♉ → jour racines; Lune descendante: récolte et plantation des racines
- Sow fruit & seed crops: **-2** — Périgée within 4 h — hours to avoid.; jour racines: other parts are not the day's focus; Lune descendante: semis attend la lune montante
- Sow flowers: **-2** — Périgée within 4 h — hours to avoid.; jour racines: other parts are not the day's focus; Lune descendante: semis attend la lune montante
- Transplant / plant out: **0** — Périgée within 4 h — hours to avoid.; Lune descendante: planter, repiquer, bouturer — la sève descend vers les racines
- Prune & cut back: **0** — Périgée within 4 h — hours to avoid.; Lune descendante: tailler, élaguer
- Graft & take cuttings: **-2** — Périgée within 4 h — hours to avoid.; Lune descendante: pas de greffe
- Harvest for storage: **+1** — Lune descendante + jour racines: lift roots
- Work soil, compost, manure: **+2** — Lune descendante: travailler la terre, fumer, composter



</details>

## 🇬🇧 English cottage-garden lore

_England, Wales, Ireland_

Phase-first folk practice recorded from Tusser (1557) to the modern Tresillian method: sow above-ground crops as the Moon waxes, roots and cuttings as it wanes, never on the new or full Moon itself, and keep the saints' days — potatoes on Good Friday, nothing tender till May is out.

**Reads:** Waxing / waning Moon · Two days before full Moon = peak germination · Moveable and fixed feast days · Weather-saints

**Sources:**
- Thomas Tusser, Five Hundred Points of Good Husbandry (1557)
- John Harris, Moon Gardening (Tresillian)
- RHS folklore collections

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**Waning Moon, 71% lit**

- Sow leaf crops: **-1** — Waning Moon: above-ground sowing waits
- Sow root crops: **+2** — Waning Moon: sow and plant root crops, onions, potatoes
- Sow fruit & seed crops: **-1** — Waning Moon: above-ground sowing waits
- Transplant / plant out: **+2** — Waning Moon: transplant, plant trees and shrubs — roots take
- Prune & cut back: **+2** — Waning Moon: prune, lay hedges, cut back
- Weed & control pests: **+1** — Waning Moon: weeds pulled now stay down
- Harvest for storage: **+2** — Waning Moon: harvest for storing, lift potatoes, pick apples for the loft
- Work soil, compost, manure: **+1** — Waning Moon: dig, manure, mulch



</details>

## 🇷🇺 Лунный посевной календарь

_Russia, Ukraine, Belarus (dacha tradition)_

The dacha gardener's lunar sowing calendar, printed in every spring newspaper since the 1990s but rooted in village practice: fertile vs barren tropical signs, waxing for "tops" and waning for "roots", three forbidden days around the new Moon and the full Moon day, plus the numbered lunar day (лунные сутки, counted from moonrise to moonrise) with its own luck.

**Reads:** Tropical zodiac sign (плодородные / бесплодные знаки) · Waxing / waning · New-Moon ±1 day and full-Moon day forbidden · Lunar day number (лунные сутки) · Orthodox folk calendar

**Sources:**
- Лунный посевной календарь садовода-огородника (annual, many publishers)
- Народный календарь (Даль, Ермолов)

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**Убывающая Луна в Близнецы · 21-е лунные сутки**

- Sow leaf crops: **-1** — Луна в Близнецы ♊ (Gemini): бесплодный знак; Waning: tops wait for the growing Moon; 21-е лунные сутки — favourable lunar day
- Sow root crops: **+2** — Луна в Близнецы ♊ (Gemini): бесплодный знак; Убывающая Луна: корешки — roots, bulbs, potatoes; 21-е лунные сутки — favourable lunar day
- Sow fruit & seed crops: **-1** — Луна в Близнецы ♊ (Gemini): бесплодный знак; Waning: tops wait for the growing Moon; 21-е лунные сутки — favourable lunar day
- Sow flowers: **0** — Луна в Близнецы ♊ (Gemini): бесплодный знак; 21-е лунные сутки — favourable lunar day
- Transplant / plant out: **0** — Луна в Близнецы ♊ (Gemini): бесплодный знак; Waning: transplant and plant trees
- Prune & cut back: **+1** — Waning: pruning
- Weed & control pests: **+2** — Barren sign: weeding, spraying; Waning: weed and treat pests
- Harvest for storage: **+2** — Dry sign: harvest for storage, dry herbs; Waning: harvest for storing, make preserves

Notes: 21-е лунные сутки (lunar day 21, moonrise-to-moonrise).

</details>

## 🇺🇸 American Northeast almanac & "the Signs"

_New England, Appalachia, Mid-Atlantic_

The Old Farmer's Almanac (Dublin NH, since 1792) and Appalachian "planting by the signs": the Moon's quarter decides what kind of crop (above-ground in the light of the Moon, below-ground in the dark), and the Moon's tropical zodiac sign decides whether the day is fruitful or barren, named by the part of the body it rules.

**Reads:** Moon quarter (light vs dark of the Moon) · Tropical zodiac sign of the Moon · Fruitful / barren signs, body parts · Northeast folk dates and phenology

**Sources:**
- The Old Farmer's Almanac, "Gardening by the Moon"
- Llewellyn's Moon Sign Book
- Foxfire Book (Appalachian signs)

<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>

**Q3 (dark of the Moon) · Gemini, Arms — barren**

- Sow leaf crops: **-2** — Dark of the Moon: above-ground sowing waits for the new Moon; Moon in Gemini ♊ — the Arms, a barren sign: barren — cultivate instead
- Sow root crops: **+1** — 3rd quarter (full → half): root crops, bulbs, biennials and perennials — the dark of the Moon; Moon in Gemini ♊ — the Arms, a barren sign: barren — cultivate instead
- Sow fruit & seed crops: **-2** — Dark of the Moon: above-ground sowing waits for the new Moon; Moon in Gemini ♊ — the Arms, a barren sign: barren — cultivate instead
- Sow flowers: **-1** — Moon in Gemini ♊ — the Arms, a barren sign: barren — cultivate instead
- Transplant / plant out: **+1** — 3rd quarter: the best transplanting quarter; Moon in Gemini ♊ — the Arms, a barren sign: barren — cultivate instead
- Weed & control pests: **+1** — Moon in Gemini ♊ — the Arms, a barren sign: barren, dry sign — good for weeding and pest control
- Harvest for storage: **+2** — Waning Moon: harvest for keeping; Dry sign: harvest and dry herbs, hay, onions



</details>

