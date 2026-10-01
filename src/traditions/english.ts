import { add, addAll, mk, md, type Tradition, SOW_ALL } from './types';

export const english: Tradition = {
  id: 'english',
  name: 'English cottage-garden lore',
  region: 'England, Wales, Ireland',
  flag: '🇬🇧',
  summary: 'Phase-first folk practice recorded from Tusser (1557) to the modern Tresillian method: sow above-ground crops as the Moon waxes, roots and cuttings as it wanes, never on the new or full Moon itself, and keep the saints\' days — potatoes on Good Friday, nothing tender till May is out.',
  basis: ['Waxing / waning Moon', 'Two days before full Moon = peak germination', 'Moveable and fixed feast days', 'Weather-saints'],
  sources: ['Thomas Tusser, Five Hundred Points of Good Husbandry (1557)', 'John Harris, Moon Gardening (Tresillian)', 'RHS folklore collections'],
  evaluate(ctx) {
    const d = mk();
    const m = ctx.moon;
    if (m.isNewMoonDay) { addAll(d, [...SOW_ALL, 'transplant'], -2, 'New Moon day: "sow nowt on the change of the Moon"'); d.notes.push('Change of the Moon — a rest day in the old cottage garden.'); }
    if (m.isFullMoonDay) { addAll(d, SOW_ALL, -1, 'Full Moon day itself: let it pass'); }
    if (m.waxing) {
      add(d, 'sow_leaf', 2, 'Waxing Moon: sow all crops that grow above ground');
      add(d, 'sow_fruit', 2, 'Waxing Moon: beans, peas and fruiting crops');
      add(d, 'sow_flower', 1, 'Waxing Moon: annual flowers');
      add(d, 'graft', 1, 'Waxing Moon: grafts and layers take');
      add(d, 'water_feed', 1, 'Waxing Moon: liquid feed is taken up fastest');
      if (m.hoursToFullMoon > 0 && m.hoursToFullMoon <= 60) { addAll(d, SOW_ALL, 1, 'Two days before the full Moon: the Tresillian "peak germination" window'); d.notes.push('Within two days before full Moon — the best sowing days of the month in the Tresillian method.'); }
      add(d, 'sow_root', -1, 'Waxing Moon: roots wait for the wane');
      add(d, 'prune', -1, 'Waxing Moon: pruned wood bleeds and regrows vigorously');
    } else {
      add(d, 'sow_root', 2, 'Waning Moon: sow and plant root crops, onions, potatoes');
      add(d, 'transplant', 2, 'Waning Moon: transplant, plant trees and shrubs — roots take');
      add(d, 'prune', 2, 'Waning Moon: prune, lay hedges, cut back');
      add(d, 'harvest_store', 2, 'Waning Moon: harvest for storing, lift potatoes, pick apples for the loft');
      add(d, 'soil_compost', 1, 'Waning Moon: dig, manure, mulch');
      add(d, 'weed_pest', 1, 'Waning Moon: weeds pulled now stay down');
      add(d, 'sow_leaf', -1, 'Waning Moon: above-ground sowing waits');
      add(d, 'sow_fruit', -1, 'Waning Moon: above-ground sowing waits');
    }
    const dm = md(ctx.ymd);
    const gf = shift(ctx.easter, -2);
    if (ctx.ymd === gf) d.notes.push('Good Friday — plant potatoes and sow parsley: "parsley sown on Good Friday comes up double."');
    if (dm === '02-02') d.notes.push('Candlemas — "half your wood and half your hay"; sow broad beans under cover.');
    if (dm === '03-25') d.notes.push('Lady Day — old quarter day; sow sweet peas and first hardy annuals.');
    if (dm >= '05-01' && dm <= '05-31') d.notes.push('"Ne\'er cast a clout till May be out" — no tender plants out until the hawthorn (may) blossom is over.');
    if (dm === '06-24') d.notes.push('Midsummer Day (St John) — "sow turnips at Midsummer"; herbs cut today keep their virtue.');
    if (dm === '07-15') d.notes.push('St Swithin\'s Day — rain today means forty days of rain, say the apple growers.');
    if (dm === '09-29') d.notes.push('Michaelmas — plant garlic and spring cabbage; "eat no blackberries after Michaelmas."');
    if (dm === '11-11') d.notes.push('Martinmas — plant broad beans and garlic "on the shortest day, harvest on the longest."');
    if (dm === '12-21') d.notes.push('Shortest day — plant garlic and shallots.');
    d.headline = `${m.waxing ? 'Waxing' : 'Waning'} Moon, ${Math.round(m.illumination * 100)}% lit${m.isNewMoonDay ? ' — change of the Moon' : ''}`;
    return d;
  }
};
function shift(ymd: string, n: number) { const [y, m, dd] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); }
