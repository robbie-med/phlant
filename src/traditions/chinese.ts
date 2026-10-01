import { addAll, mk, type Tradition, SOW_ALL, type Task } from './types';
import { ZH_MONTHS, zhDay } from '../astro/lunisolar';
import { BRANCHES } from '../astro/sexagenary';

export type ZhRegion = 'north' | 'jiangnan' | 'lingnan' | 'northeast';
export const ZH_REGIONS: Record<ZhRegion, { name: string; zh: string; desc: string }> = {
  north: { name: 'North China Plain', zh: '华北', desc: 'Wheat–maize belt (Beijing, Shandong, Henan). Clear four seasons, dry spring.' },
  jiangnan: { name: 'Jiangnan / Yangtze', zh: '江南', desc: 'Rice paddies and vegetables (Shanghai, Jiangsu, Zhejiang, Hunan). Humid, 梅雨 plum rains in June.' },
  lingnan: { name: 'Lingnan / South', zh: '岭南', desc: 'Double-cropped rice, no winter dormancy (Guangdong, Guangxi, Fujian).' },
  northeast: { name: 'Northeast', zh: '东北', desc: 'One short season (Heilongjiang, Jilin, Liaoning): everything sown 谷雨–立夏.' }
};

/** Day officers 建除十二神: index = (dayBranch − monthBranch) mod 12. */
const OFFICERS = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
const OFFICER_EN = ['Establish', 'Remove', 'Full', 'Level', 'Settle', 'Hold', 'Break', 'Danger', 'Succeed', 'Receive', 'Open', 'Close'];
const OFFICER_RULE: Array<{ good: Task[]; bad: Task[]; text: string }> = [
  { good: ['soil_compost'], bad: ['sow_root'], text: '建日: begin undertakings, lay out beds — but no 动土 (digging deep).' },
  { good: ['weed_pest', 'prune'], bad: [], text: '除日: removal — weed, clear pests (除虫), clean out, prune.' },
  { good: ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower', 'transplant'], bad: [], text: '满日: fullness — 宜栽种: auspicious for sowing and planting.' },
  { good: ['soil_compost', 'transplant'], bad: [], text: '平日: level the ground, make paths and beds, mild for planting.' },
  { good: ['transplant', 'sow_fruit', 'sow_root', 'graft'], bad: [], text: '定日: stability — 宜栽种: plant what should stay (trees, perennials, grafts).' },
  { good: ['weed_pest', 'harvest_store'], bad: ['transplant'], text: '执日: hold/catch — 捕捉 pests, harvest; avoid moving plants.' },
  { good: ['weed_pest'], bad: ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower', 'transplant', 'graft'], text: '破日: destruction — 诸事不宜 except tearing out; clear old crops.' },
  { good: [], bad: ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower', 'transplant'], text: '危日: danger — a cautious day, nothing new.' },
  { good: ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower', 'transplant', 'graft', 'harvest_store'], bad: [], text: '成日: success — good for everything, 宜栽种.' },
  { good: ['harvest_store'], bad: ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower'], text: '收日: receive — harvest and store, bring in; not for sowing.' },
  { good: ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower', 'transplant', 'graft', 'water_feed'], bad: [], text: '开日: open — favourable for starting, planting, opening channels.' },
  { good: ['soil_compost'], bad: ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower', 'transplant'], text: '闭日: close — fill holes, bank soil, build dykes; do not plant.' }
];

/** Farming proverbs (农谚) per solar term with regional variants. */
const TERM_ZH: Array<{ all: string; by?: Partial<Record<ZhRegion, string>>; do: Task[] }> = [
  { all: '立春: 立春一日，百草回芽 — repair, manure, start seedlings under cover.', do: ['soil_compost'], by: { lingnan: 'Lingnan: early rice seedbeds (早稻育秧) begin.' } },
  { all: '雨水: 雨水有雨庄稼好 — spring ploughing; sow cold-frame greens.', do: ['soil_compost', 'sow_leaf'], by: { jiangnan: 'Jiangnan: top-dress the wheat and rapeseed.' } },
  { all: '惊蛰: 惊蛰春雷响，农夫闲转忙 — field work begins: peas, spinach, spring radish.', do: ['sow_leaf', 'sow_root'], by: { lingnan: 'Lingnan: 惊蛰 sow early rice (惊蛰春分，早稻下种).', north: 'North: still too cold outdoors; seedlings indoors.' } },
  { all: '春分: 春分麦起身，一刻值千金 — wheat stands up; sow carrot, beet, lettuce, potatoes.', do: ['sow_leaf', 'sow_root', 'transplant'], by: { jiangnan: 'Jiangnan: 春分 sow early rice seedbeds.' } },
  { all: '清明: 清明前后，种瓜点豆 — sow melons, cucumbers, beans; plant trees (植树).', do: ['sow_fruit', 'transplant', 'graft'], by: { north: 'North: the classic 种瓜点豆 term.', jiangnan: 'Jiangnan: 清明浸种, 谷雨下秧 — soak rice seed now.', northeast: 'Northeast: still frozen; prepare only.' } },
  { all: '谷雨: 谷雨前后，栽瓜种豆 — rain for the hundred grains; sow beans, corn, squash; set rice seedlings.', do: ['sow_fruit', 'sow_leaf', 'transplant'], by: { northeast: 'Northeast: 谷雨种大田 — the whole field goes in now.', lingnan: 'Lingnan: transplant early rice (谷雨插秧).' } },
  { all: '立夏: 立夏种棉花 / 立夏栽茄子 — set out aubergine, pepper, tomato; sow cotton, sesame.', do: ['transplant', 'sow_fruit'], by: { north: 'North: 立夏 sow millet and sorghum (立夏种谷).', northeast: 'Northeast: last sowing window — soybeans, maize.' } },
  { all: '小满: 小满小满，麦粒渐满 — weed hard, side-dress, watch for aphids.', do: ['weed_pest', 'water_feed'], by: { jiangnan: 'Jiangnan: 小满动三车 — water wheels, silk reels, oil presses all turning.' } },
  { all: '芒种: 芒种忙种 — harvest wheat, transplant rice, sow soybean and late maize in the stubble.', do: ['harvest_store', 'sow_fruit', 'transplant'], by: { jiangnan: 'Jiangnan: 梅雨 begins — drainage.', north: 'North: 三夏 — harvest, sow, manage all at once.' } },
  { all: '夏至: 夏至不种高山黍 — last chance for late crops; harvest garlic and early potatoes.', do: ['weed_pest', 'water_feed', 'harvest_store'], by: { lingnan: 'Lingnan: early rice ripens; prepare late-rice seedbeds.' } },
  { all: '小暑: 小暑大暑，上蒸下煮 — irrigate at dawn; shade seedlings; start autumn seedlings late in term.', do: ['water_feed', 'weed_pest'] },
  { all: '大暑: 大暑不热，五谷不结 — the heat sets fruit; pick cucumbers daily; sow autumn cabbage in shaded beds.', do: ['harvest_store', 'water_feed', 'sow_leaf'], by: { lingnan: 'Lingnan: 大暑 harvest early rice, transplant late rice (双抢).' } },
  { all: '立秋: 头伏萝卜二伏菜 — sow autumn radish, then Chinese cabbage (大白菜).', do: ['sow_root', 'sow_leaf'], by: { north: 'North: 立秋 sow 大白菜 for winter storage.', northeast: 'Northeast: autumn greens only, frost by 白露.' } },
  { all: '处暑: 处暑萝卜白露菜 — radish in, cabbage seedlings out; sow spinach, mustard.', do: ['sow_leaf', 'sow_root', 'transplant'] },
  { all: '白露: 白露早，寒露迟，秋分种麦正当时 — last leafy sowings; thin roots.', do: ['sow_leaf', 'weed_pest'], by: { northeast: 'Northeast: first frosts — harvest tender crops now.' } },
  { all: '秋分: 秋分种麦正当时 (北方) — the north sows winter wheat; harvest maize and soybeans.', do: ['harvest_store', 'sow_leaf'], by: { north: 'North: winter wheat goes in this term.', jiangnan: 'Jiangnan: wheat waits for 寒露–霜降.' } },
  { all: '寒露: 寒露种麦正当时 (中部) — plant garlic, harvest sweet potatoes, sesame, peanuts.', do: ['harvest_store', 'transplant'], by: { jiangnan: 'Jiangnan: sow wheat and rapeseed; harvest late rice begins.', lingnan: 'Lingnan: late rice fills; sow winter vegetables.' } },
  { all: '霜降: 霜降杀百草 — frost kills the grass: harvest everything tender; dig the beds.', do: ['harvest_store', 'soil_compost'], by: { jiangnan: 'Jiangnan: 霜降种麦 — last wheat sowing.' } },
  { all: '立冬: 立冬补冬 — store cabbage and radish; mulch garlic; compost.', do: ['harvest_store', 'soil_compost'], by: { lingnan: 'Lingnan: no winter — sow lettuce, choy sum, peas now (立冬种菜).' } },
  { all: '小雪: 小雪封地 — the ground closes; last manuring.', do: ['soil_compost'], by: { lingnan: 'Lingnan: winter greens growing well.' } },
  { all: '大雪: 瑞雪兆丰年 — snow promises a good year; rest and repair.', do: [], by: { lingnan: 'Lingnan: harvest winter vegetables, plant garlic.' } },
  { all: '冬至: 冬至阳生 — the yang returns; count the 九九 to spring.', do: [] },
  { all: '小寒: 小寒大寒，冷成冰团 — indoors: seed selection, tool repair.', do: [] },
  { all: '大寒: 大寒到顶点，日后天渐暖 — prune dormant trees; start pepper and aubergine seedlings on heat.', do: ['prune'] }
];

export function makeChinese(region: ZhRegion): Tradition {
  const R = ZH_REGIONS[region];
  return {
    id: `chinese_${region}`,
    name: `中国农历 · ${R.zh}`,
    region: `China — ${R.name}`,
    flag: '🇨🇳',
    summary: `The Chinese farmer's almanac (通书) reads the 24 节气 with their regional proverbs (农谚), the lunar month and day, and the day's sexagenary 干支 through the Twelve Day Officers (建除十二神) that mark a day 宜栽种 (good for planting) or 忌. Regional variant: ${R.name} (${R.zh}) — ${R.desc}`,
    basis: ['24 节气 and 72 候', '农历 lunisolar date (CST)', '干支 day → 建除十二神 day officer', '月忌日 (lunar 5, 14, 23)', 'Regional 农谚'],
    sources: ['《齐民要术》 (6th c.)', '《授时通考》', '通书 / 通勝 (Hong Kong almanac)', '中国农业博物馆 二十四节气'],
    evaluate(ctx) {
      const d = mk();
      const t = TERM_ZH[ctx.seasonalTermIndex];
      const term = ctx.term.term.def;
      addAll(d, t.do, 2, `${term.zh} (${term.pinyin}): ${t.all}`);
      if (t.by?.[region]) { d.notes.push(t.by[region]!); }
      d.notes.push(t.all.split(' — ')[0]);
      if (t.do.some(x => SOW_ALL.includes(x))) addAll(d, SOW_ALL.filter(x => !t.do.includes(x)), -1, `${term.zh}: not this term's crop`);
      if (region !== 'lingnan' && (ctx.seasonalTermIndex >= 19 || ctx.seasonalTermIndex <= 0)) addAll(d, [...SOW_ALL, 'transplant'], -2, `${term.zh}: dormant season`);
      if (region === 'northeast' && (ctx.seasonalTermIndex >= 15 || ctx.seasonalTermIndex <= 3)) addAll(d, [...SOW_ALL, 'transplant'], -2, '东北: outside the short frost-free season');

      // Day officer
      const monthBranch = (2 + Math.floor(ctx.seasonalTermIndexRaw() / 2)) % 12; // 立春 month = 寅 (2)
      const off = ((ctx.sexDay.branch - monthBranch) % 12 + 12) % 12;
      const rule = OFFICER_RULE[off];
      addAll(d, rule.good, 1, `${OFFICERS[off]}日 (${OFFICER_EN[off]}): ${rule.text}`);
      addAll(d, rule.bad, -1, `${OFFICERS[off]}日: ${rule.text}`);
      if (off === 6 || off === 7) d.blocked = `${OFFICERS[off]}日 — 诸事不宜 (nothing new today).`;
      const L = ctx.zhLunar;
      const lunarTxt = `农历${L.leap ? '闰' : ''}${ZH_MONTHS[L.month - 1]}${zhDay(L.day)} · ${ctx.sexDay.hanzi}日 · ${OFFICERS[off]}`;
      d.notes.push(lunarTxt);
      if ([5, 14, 23].includes(L.day)) { addAll(d, [...SOW_ALL, 'transplant'], -1, '月忌日 (初五、十四、二十三) — the three unlucky days of each lunar month'); d.notes.push('月忌日 — an inauspicious day for beginnings.'); }
      const fest: Record<string, string> = { '1-1': '春节 — the year turns; no digging for three days.', '1-15': '元宵 — lanterns; the farm year begins after.', '2-2': '龙抬头 — the dragon raises its head: rain begins, spring ploughing opens (二月二，龙抬头，大家小户使耕牛).', '5-5': '端午 — hang 艾草 and 菖蒲; gather medicinal herbs at noon.', '6-6': '天贶节 — air the seed stores and books.', '7-7': '七夕 — the Weaver Girl; melons and fruit offered.', '7-15': '中元 — the hungry ghosts; fields rest.', '8-15': '中秋 — harvest Moon; the osmanthus blooms.', '9-9': '重阳 — chrysanthemums; climb high, the harvest is in.', '12-8': '腊八 — 腊八粥; 腊八蒜 garlic pickled today.' };
      const k = `${L.month}-${L.day}`;
      if (!L.leap && fest[k]) d.notes.push(fest[k]);
      if (ctx.hemisphere === 'S') d.notes.push('Southern hemisphere: seasonal advice shifted six months from the named term.');
      d.headline = `${term.zh} ${term.pinyin} · ${OFFICERS[off]}日 ${OFFICER_EN[off]} · ${BRANCHES[ctx.sexDay.branch]}`;
      return d;
    }
  };
}
