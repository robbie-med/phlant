import { SIGN_GLYPH, type Sign } from '../astro/moon';
import { add, addAll, mk, md, type Tradition, SOW_ALL } from './types';

const FERT: Record<Sign, number> = { Cancer: 2, Scorpio: 2, Pisces: 2, Taurus: 1, Libra: 1, Capricorn: 1, Virgo: 0, Sagittarius: -1, Gemini: -1, Aries: -1, Leo: -2, Aquarius: -2 };
const RU: Record<Sign, string> = { Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнецы', Cancer: 'Рак', Leo: 'Лев', Virgo: 'Дева', Libra: 'Весы', Scorpio: 'Скорпион', Sagittarius: 'Стрелец', Capricorn: 'Козерог', Aquarius: 'Водолей', Pisces: 'Рыбы' };
const GOOD_DAYS = new Set([3, 5, 6, 8, 10, 11, 13, 14, 16, 17, 21, 22, 24, 25, 27, 28]);
const BAD_DAYS = new Set([1, 2, 9, 15, 19, 23, 29, 30]);

export const russian: Tradition = {
  id: 'russian',
  name: 'Лунный посевной календарь',
  region: 'Russia, Ukraine, Belarus (dacha tradition)',
  flag: '🇷🇺',
  summary: 'The dacha gardener\'s lunar sowing calendar, printed in every spring newspaper since the 1990s but rooted in village practice: fertile vs barren tropical signs, waxing for "tops" and waning for "roots", three forbidden days around the new Moon and the full Moon day, plus the numbered lunar day (лунные сутки, counted from moonrise to moonrise) with its own luck.',
  basis: ['Tropical zodiac sign (плодородные / бесплодные знаки)', 'Waxing / waning', 'New-Moon ±1 day and full-Moon day forbidden', 'Lunar day number (лунные сутки)', 'Orthodox folk calendar'],
  sources: ['Лунный посевной календарь садовода-огородника (annual, many publishers)', 'Народный календарь (Даль, Ермолов)'],
  evaluate(ctx) {
    const d = mk();
    const m = ctx.moon;
    const s = m.tropical;
    const f = FERT[s];
    if (Math.abs(m.hoursToNewMoon) <= 36) { d.blocked = 'Новолуние ±1 день — запрещённые дни: no sowing or planting.'; addAll(d, [...SOW_ALL, 'transplant', 'graft'], -2, d.blocked); add(d, 'weed_pest', 1, 'Forbidden for planting, but weeding and pest control are allowed'); }
    if (m.isFullMoonDay) { d.blocked = 'Полнолуние — forbidden day for sowing and planting.'; addAll(d, [...SOW_ALL, 'transplant'], -2, d.blocked); add(d, 'harvest_store', 1, 'Full Moon: harvest herbs — the tops are full of juice'); }

    const signTxt = `Луна в ${RU[s]} ${SIGN_GLYPH[s]} (${s})`;
    if (f === 2) { addAll(d, [...SOW_ALL, 'transplant'], 2, `${signTxt}: самый плодородный знак — the most fertile`); add(d, 'water_feed', 1, 'Water sign: watering and feeding are absorbed'); add(d, 'weed_pest', -1, 'Fertile sign: weeds sown back'); }
    else if (f === 1) { addAll(d, [...SOW_ALL, 'transplant'], 1, `${signTxt}: плодородный знак`); if (s === 'Taurus' || s === 'Capricorn') add(d, 'sow_root', 1, 'Earth sign: roots and anything for long storage'); if (s === 'Libra') add(d, 'sow_flower', 1, 'Весы: flowers and ornamentals'); }
    else if (f === 0) { add(d, 'sow_flower', 1, `${signTxt}: малоплодородный — flowers and ornamentals only`); addAll(d, ['sow_leaf', 'sow_root', 'sow_fruit'], -1, 'Дева: poor for vegetables (except ornamentals)'); add(d, 'weed_pest', 1, 'Virgo: weed, hoe, treat for pests'); }
    else if (f === -1) { addAll(d, [...SOW_ALL, 'transplant'], -1, `${signTxt}: бесплодный знак`); add(d, 'weed_pest', 1, 'Barren sign: weeding, spraying'); add(d, 'harvest_store', 1, 'Dry sign: harvest for storage, dry herbs'); if (s === 'Sagittarius') add(d, 'sow_fruit', 1, 'Стрелец: onions, garlic, peppers tolerated'); }
    else { addAll(d, [...SOW_ALL, 'transplant', 'graft'], -2, `${signTxt}: самый бесплодный знак — nothing is sown`); add(d, 'weed_pest', 2, 'The barren day: weed, fight pests, prune to stop growth'); add(d, 'soil_compost', 1, 'Barren sign: dig and prepare beds'); }

    if (m.waxing) { addAll(d, ['sow_leaf', 'sow_fruit', 'sow_flower'], 1, 'Растущая Луна: sow everything that grows upward ("вершки")'); add(d, 'graft', 1, 'Waxing: grafting'); add(d, 'sow_root', -1, 'Waxing: roots wait for the waning Moon'); }
    else { add(d, 'sow_root', 2, 'Убывающая Луна: корешки — roots, bulbs, potatoes'); add(d, 'transplant', 1, 'Waning: transplant and plant trees'); add(d, 'prune', 1, 'Waning: pruning'); add(d, 'harvest_store', 1, 'Waning: harvest for storing, make preserves'); add(d, 'weed_pest', 1, 'Waning: weed and treat pests'); addAll(d, ['sow_leaf', 'sow_fruit'], -1, 'Waning: tops wait for the growing Moon'); }

    const ld = ctx.lunarDay;
    if (GOOD_DAYS.has(ld)) { addAll(d, SOW_ALL, 1, `${ld}-е лунные сутки — favourable lunar day`); }
    if (BAD_DAYS.has(ld)) { addAll(d, [...SOW_ALL, 'transplant'], -1, `${ld}-е лунные сутки — an unfavourable ("сатанинский"/transition) lunar day`); }
    d.notes.push(`${ld}-е лунные сутки (lunar day ${ld}, moonrise-to-moonrise).`);

    const dm = md(ctx.ymd);
    const folk: Record<string, string> = {
      '03-14': 'Евдокия-Плющиха — the day that forecasts the summer; start seedlings on the windowsill.',
      '04-07': 'Благовещение — no work on the land: "птица гнезда не вьёт, девица косы не плетёт". A rest day.',
      '05-06': 'Егорий Вешний (St George) — the start of field work; cattle out, early sowing.',
      '05-22': 'Никола Вешний — potatoes and cucumbers go in; no more frost "после Николы".',
      '06-07': 'Иван — Медвяные росы: sow late cucumbers and beans.',
      '07-07': 'Иван Купала — gather herbs; the first cucumbers.',
      '07-12': 'Петров день — the end of sowing: "кто на Петра не посеял, тот не пожнёт".',
      '08-02': 'Ильин день — summer ends: no more swimming, start harvesting; nights turn cold.',
      '08-14': 'Медовый Спас — first honey and poppy harvest; sow winter rye.',
      '08-19': 'Яблочный Спас — apples may now be eaten; the fruit harvest opens.',
      '09-21': 'Осенины — the autumn equinox harvest festival; onions and garlic in.',
      '10-14': 'Покров — "на Покров до обеда осень, после обеда зима": the garden is put to bed.'
    };
    if (folk[dm]) d.notes.push(folk[dm]);
    d.headline = `${m.waxing ? 'Растущая' : 'Убывающая'} Луна в ${RU[s]} · ${ld}-е лунные сутки`;
    return d;
  }
};
