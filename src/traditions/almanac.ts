import { SIGN_GLYPH, type Sign } from '../astro/moon';
import { add, addAll, mk, md, type Tradition, SOW_ALL } from './types';

const BODY_PART: Record<Sign, string> = { Aries: 'Head', Taurus: 'Neck', Gemini: 'Arms', Cancer: 'Breast', Leo: 'Heart', Virgo: 'Bowels', Libra: 'Reins (kidneys)', Scorpio: 'Secrets (loins)', Sagittarius: 'Thighs', Capricorn: 'Knees', Aquarius: 'Legs', Pisces: 'Feet' };
const FERTILITY: Record<Sign, 'very fruitful' | 'fruitful' | 'semi-fruitful' | 'barren' | 'very barren'> = {
  Cancer: 'very fruitful', Scorpio: 'very fruitful', Pisces: 'very fruitful',
  Taurus: 'fruitful', Capricorn: 'fruitful', Libra: 'semi-fruitful',
  Aries: 'barren', Sagittarius: 'barren', Aquarius: 'barren', Gemini: 'barren',
  Leo: 'very barren', Virgo: 'very barren'
};

export const almanac: Tradition = {
  id: 'almanac',
  name: 'American Northeast almanac & "the Signs"',
  region: 'New England, Appalachia, Mid-Atlantic',
  flag: '🇺🇸',
  summary: 'The Old Farmer\'s Almanac (Dublin NH, since 1792) and Appalachian "planting by the signs": the Moon\'s quarter decides what kind of crop (above-ground in the light of the Moon, below-ground in the dark), and the Moon\'s tropical zodiac sign decides whether the day is fruitful or barren, named by the part of the body it rules.',
  basis: ['Moon quarter (light vs dark of the Moon)', 'Tropical zodiac sign of the Moon', 'Fruitful / barren signs, body parts', 'Northeast folk dates and phenology'],
  sources: ['The Old Farmer\'s Almanac, "Gardening by the Moon"', 'Llewellyn\'s Moon Sign Book', 'Foxfire Book (Appalachian signs)'],
  evaluate(ctx) {
    const d = mk();
    const m = ctx.moon;
    const s = m.tropical;
    const fert = FERTILITY[s];
    const q = m.quarter;
    const signNote = `Moon in ${s} ${SIGN_GLYPH[s]} — the ${BODY_PART[s]}, a ${fert} sign`;

    // Quarter → crop kind
    if (q === 1) {
      add(d, 'sow_leaf', 2, '1st quarter (new → half): sow leafy annuals and crops that bear seed outside the fruit (lettuce, cabbage, spinach, broccoli, grains)');
      add(d, 'sow_fruit', 1, '1st quarter: above-ground crops generally favoured; the 2nd quarter is best for fruiting ones');
      add(d, 'sow_flower', 1, '1st quarter: annual flowers');
      add(d, 'sow_root', -1, 'Light of the Moon: wait for the dark of the Moon for root crops');
    } else if (q === 2) {
      add(d, 'sow_fruit', 2, '2nd quarter (half → full): sow annuals that bear seed inside the fruit — beans, peas, peppers, squash, tomatoes, melons');
      add(d, 'sow_leaf', 1, '2nd quarter: above-ground crops still favoured');
      add(d, 'sow_flower', 1, '2nd quarter: flowers');
      add(d, 'graft', 1, 'Waxing Moon: grafting takes');
      add(d, 'sow_root', -1, 'Light of the Moon: root crops wait for the dark');
    } else if (q === 3) {
      add(d, 'sow_root', 2, '3rd quarter (full → half): root crops, bulbs, biennials and perennials — the dark of the Moon');
      add(d, 'transplant', 2, '3rd quarter: the best transplanting quarter');
      add(d, 'sow_leaf', -1, 'Dark of the Moon: above-ground sowing waits for the new Moon');
      add(d, 'sow_fruit', -1, 'Dark of the Moon: above-ground sowing waits for the new Moon');
      add(d, 'harvest_store', 1, 'Waning Moon: harvest for keeping');
    } else {
      addAll(d, SOW_ALL, -2, '4th quarter: a "no planting" quarter — cultivate, weed, turn sod');
      add(d, 'weed_pest', 2, '4th quarter: kill weeds and pests, the Moon pulls them out');
      add(d, 'soil_compost', 2, '4th quarter: turn sod, plough, spread manure');
      add(d, 'harvest_store', 2, '4th quarter: harvest crops for storage, they keep driest');
      add(d, 'prune', 1, '4th quarter: prune to retard growth');
    }

    // Sign fertility
    if (fert === 'very fruitful') { addAll(d, [...SOW_ALL, 'transplant', 'graft'], 2, `${signNote}: water signs are the most productive for planting`); add(d, 'weed_pest', -1, `${signNote}: too moist and fertile to kill weeds`); }
    else if (fert === 'fruitful') { addAll(d, [...SOW_ALL, 'transplant'], 1, `${signNote}: earthy, good for root crops and anything that must stand`); add(d, 'sow_root', 1, 'Earth sign: root crops'); }
    else if (fert === 'semi-fruitful') { add(d, 'sow_flower', 2, `${signNote}: the best sign for flowers and vines`); add(d, 'sow_root', 1, 'Libra: good for root crops and hay'); }
    else if (fert === 'barren') { addAll(d, [...SOW_ALL, 'transplant'], -1, `${signNote}: barren — cultivate instead`); add(d, 'weed_pest', 1, `${signNote}: barren, dry sign — good for weeding and pest control`); add(d, 'harvest_store', 1, 'Dry sign: harvest and dry herbs, hay, onions'); }
    else { addAll(d, [...SOW_ALL, 'transplant', 'graft'], -2, `${signNote}: the most barren signs — "nothing planted in the Heart will prosper"`); add(d, 'weed_pest', 2, `${signNote}: the classic day to kill weeds, briars and pests`); add(d, 'prune', 1, 'Barren sign: prune to discourage regrowth'); if (s === 'Virgo') add(d, 'sow_flower', 1, 'Virgo: barren for food but the sign for showy flowers'); }
    if (s === 'Scorpio') add(d, 'prune', 1, 'Prune in Scorpio to encourage strong new growth');
    if (s === 'Pisces' || s === 'Cancer') add(d, 'water_feed', 1, 'Water sign: irrigate and feed');

    // Northeast / Irish-American folk dates
    const m_d = md(ctx.ymd);
    if (m_d === '03-17') d.notes.push('St. Patrick\'s Day — the traditional day to sow peas (and plant potatoes, in Irish-American gardens).');
    if (ctx.ymd === addDaysLocal(ctx.easter, -2)) d.notes.push('Good Friday — plant potatoes today, say the old New England and Irish gardeners.');
    if (m_d >= '05-25' && m_d <= '05-31' && ctx.ymd === lastMondayOfMay(ctx.year)) d.notes.push('Memorial Day — the Northeast rule of thumb for setting out tomatoes, peppers and basil.');
    if (ctx.daysFromLastFrost >= -7 && ctx.daysFromLastFrost <= 7) d.notes.push('Near your average last frost: "plant corn when oak leaves are the size of a squirrel\'s ear."');
    if (m.isFullMoonDay) d.notes.push(fullMoonName(ctx.ymd));
    if (ctx.daysToFirstFrost <= 10 && ctx.daysToFirstFrost >= 0) d.notes.push('First frost expected within ten days — a frost often follows the clear night after a cold rain; cover tender crops when the sky is clear and the wind drops.');

    d.headline = `Q${q} ${q <= 2 ? '(light of the Moon)' : '(dark of the Moon)'} · ${s}, ${BODY_PART[s]} — ${fert}`;
    return d;
  }
};

function addDaysLocal(ymd: string, n: number) { const [y, m, dd] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); }
function lastMondayOfMay(y: number) { const d = new Date(Date.UTC(y, 4, 31)); while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
function fullMoonName(ymd: string) {
  const names = ['Wolf Moon', 'Snow Moon', 'Worm Moon', 'Pink Moon', 'Flower Moon', 'Strawberry Moon', 'Buck Moon', 'Sturgeon Moon', 'Harvest / Corn Moon', 'Hunter\'s Moon', 'Beaver Moon', 'Cold Moon'];
  return `Full ${names[+ymd.slice(5, 7) - 1]} (Almanac / Algonquian name).`;
}
