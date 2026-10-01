import { add, addAll, mk, type Tradition, SOW_ALL, type Task } from './types';
import { KO_MONTHS } from '../astro/lunisolar';
import { sexagenaryDay } from '../astro/sexagenary';
import { solarTermDate } from '../astro/solarterms';
import { addDays } from '../astro/dates';

/** Advice per solar term (index 0 = 입춘), from 농가월령가 and farming proverbs. */
const TERM_ADVICE: Array<{ do: Task[]; avoid?: Task[]; text: string; proverb?: string }> = [
  { do: ['soil_compost'], text: '입춘: mend tools, spread compost, start seedlings of pepper (고추) and leafy greens indoors.', proverb: '입춘 추위는 꿔다 해도 한다 — Ipchun cold comes even if you have to borrow it.' },
  { do: ['soil_compost', 'prune'], text: '우수: thaw begins. Prune fruit trees, sow 상추/시금치 under cover, soak 콩 for seedlings.', proverb: '우수 경칩에 대동강 물이 풀린다 — at Usu and Gyeongchip the Taedong river thaws.' },
  { do: ['sow_leaf', 'sow_root', 'soil_compost'], text: '경칩: insects wake. Direct-sow peas, spinach, spring radish; till the beds.', proverb: '경칩이 되면 삼라만상이 겨울잠에서 깬다.' },
  { do: ['sow_leaf', 'sow_root', 'transplant'], text: '춘분: sow lettuce, 쑥갓, carrot, beet; plant potatoes (감자) — "춘분에 감자 심는다".', proverb: '춘분에 비가 오면 병자가 드물다.' },
  { do: ['transplant', 'sow_leaf', 'sow_root', 'graft'], text: '청명: plant trees — anything stuck in the ground sprouts. 한식 falls now: trees and 묘 tending.', proverb: '청명에는 부지깽이를 꽂아도 싹이 난다 — at Cheongmyeong even a fire poker sprouts if planted.' },
  { do: ['sow_fruit', 'sow_leaf', 'transplant'], text: '곡우: grain rain. Soak rice seed; sow beans, corn, perilla (들깨) beds; transplant 고추 after last frost.', proverb: '곡우에 모든 곡식이 잠을 깬다 — at Gogu every grain wakes.' },
  { do: ['transplant', 'sow_fruit'], text: '입하: summer begins. Set out 고추, 토마토, 가지, 오이, 호박; sow 들깨, 참깨.', proverb: '입하 바람에 씨나락 몰린다.' },
  { do: ['sow_fruit', 'weed_pest', 'water_feed'], text: '소만: everything fills out. Weed hard, side-dress; rice transplanting begins in the south.', proverb: '소만 바람에 설늙은이 얼어 죽는다 — a Soman wind freezes an old man.' },
  { do: ['sow_fruit', 'harvest_store', 'weed_pest'], text: '망종: busiest term — harvest barley and wheat, transplant rice, sow 콩 and 팥 in the stubble.', proverb: '망종에는 발등에 오줌 싼다 — at Mangjong you piss on your own foot (no time).' },
  { do: ['weed_pest', 'water_feed'], text: '하지: longest day. Harvest potatoes ("하지 감자"), garlic and onions; weed, mulch, water deeply.', proverb: '하지가 지나면 발을 물에 담그고 산다 — after Haji you live with your feet in water (monsoon).' },
  { do: ['weed_pest', 'water_feed'], text: '소서: 장마 monsoon. Drainage, pest watch, no sowing in wet soil.', proverb: '소서 장마에 벼가 자란다.' },
  { do: ['harvest_store', 'water_feed'], text: '대서: 삼복 heat. Harvest cucumbers, melons; shade and irrigate; start fall seedlings of 배추 indoors late in term.', proverb: '대서에는 염소 뿔도 녹는다 — at Daeseo even a goat\'s horns melt.' },
  { do: ['sow_root', 'sow_leaf'], text: '입추: autumn begins — sow fall radish (무) now: "입추에 무 심는다". Start napa cabbage (배추) seedlings.', proverb: '입추 때 벼 자라는 소리에 개가 짖는다 — at Ipchu the rice grows so loud the dog barks.' },
  { do: ['sow_leaf', 'transplant', 'sow_root'], text: '처서: heat breaks. Transplant 배추 seedlings for 김장 ("처서에 배추 심는다"); sow 쪽파, 갓, 시금치, 알타리무.', proverb: '처서가 지나면 모기도 입이 비뚤어진다 — after Cheoseo even the mosquito\'s mouth bends.' },
  { do: ['sow_leaf', 'weed_pest', 'water_feed'], text: '백로: white dew. Last sowing of leafy greens; thin radishes; watch cabbage worms on 배추.', proverb: '백로에 벼 안 패면 농사 망친다.' },
  { do: ['harvest_store', 'sow_leaf'], text: '추분: harvest begins, sow garlic (마늘) and 양파 seedbeds at the end of the term; gather 들깨.', proverb: '추분이 지나면 우렛소리 멈추고 벌레가 숨는다.' },
  { do: ['harvest_store', 'transplant'], text: '한로: cold dew. Plant garlic cloves; harvest 고구마, 들깨, 참깨; bring in squash.', proverb: '한로가 지나면 제비도 강남으로 간다.' },
  { do: ['harvest_store', 'soil_compost'], text: '상강: frost descends. Harvest everything frost-tender; 김장 radish and cabbage mature; sow 보리 (barley).', proverb: '상강 전에 가을걷이 끝내라 — finish the harvest before Sanggang.' },
  { do: ['harvest_store', 'soil_compost'], text: '입동: winter begins. 김장 time — harvest napa and radish; mulch garlic; turn beds.', proverb: '입동 전 가위 보리, 입동 후 바늘 보리.' },
  { do: ['soil_compost'], text: '소설: first snow. Protect perennials, bank soil on 마늘, finish 김장.', proverb: '소설 추위는 빚을 내서라도 한다.' },
  { do: ['soil_compost'], text: '대설: rest. Repair, compost, plan next year\'s rotation.', proverb: '대설에 눈이 많이 오면 다음 해 풍년.' },
  { do: [], text: '동지: solstice, 팥죽 day. The farm year turns; count 105 days to 한식.', proverb: '동지가 지나면 푸성귀도 새 마음 든다.' },
  { do: [], text: '소한: the coldest. Indoors: seed inventory, soil-block prep.', proverb: '대한이 소한 집에 가서 얼어 죽었다 — Daehan froze to death visiting Sohan.' },
  { do: ['prune'], text: '대한: last cold. Prune dormant fruit trees on mild days; start 고추 seedlings at the end of the term.', proverb: '대한 끝에 양춘이 있다 — after Daehan comes warm spring.' }
];

export const korean: Tradition = {
  id: 'korean',
  name: '한국 전통 농사력',
  region: 'Korea',
  flag: '🇰🇷',
  summary: 'Korean farm timing follows the 24 절기 (solar terms) and the lunisolar calendar far more than the Moon\'s phase: each term names a job, from 입춘 seedlings to 처서 napa cabbage and 입동 김장. The 음력 brings the festival days (한식, 단오, 백중), 삼복 dog days, and 손 없는 날 — the "no-spirit" days for starting anything new.',
  basis: ['24 절기 by exact solar longitude', '음력 lunisolar date (KST)', '삼복 via 경(庚) days', '한식 = 동지 + 105 days', '손 없는 날 (lunar 9, 10, 19, 20, 29, 30)'],
  sources: ['정학유, 농가월령가 (1816)', '한국천문연구원 — 24절기 역법', '국립민속박물관, 한국세시풍속사전'],
  evaluate(ctx) {
    const d = mk();
    const t = TERM_ADVICE[ctx.seasonalTermIndex];
    const term = ctx.term.term.def;
    addAll(d, t.do, 2, `${term.ko} (${term.hanja}): ${t.text}`);
    const rest = SOW_ALL.filter(x => !t.do.includes(x));
    if (t.do.some(x => (SOW_ALL as Task[]).includes(x))) addAll(d, rest, -1, `${term.ko}: not the term for this crop type`);
    if (ctx.seasonalTermIndex >= 19 || ctx.seasonalTermIndex <= 0) addAll(d, [...SOW_ALL, 'transplant'], -2, `${term.ko}: dormant season — no outdoor sowing`);
    if (t.proverb) d.notes.push(t.proverb);
    d.notes.push(`${term.ko} ${term.hanja}, day ${Math.floor(ctx.term.daysIn) + 1} · ${['초후', '중후', '말후'][ctx.term.pentad]}`);
    if (ctx.hemisphere === 'S') d.notes.push('Southern hemisphere: seasonal advice shifted six months from the named term.');

    const L = ctx.koLunar;
    const lunarTxt = `음력 ${L.leap ? '윤' : ''}${KO_MONTHS[L.month - 1]} ${L.day}일 (${ctx.sexDayKo}일)`;
    d.notes.push(lunarTxt);
    if ([9, 10, 19, 20, 29, 30].includes(L.day)) {
      addAll(d, ['transplant', 'graft', 'soil_compost'], 1, '손 없는 날 — no wandering spirits: the day to start something new, move plants, build beds');
      d.notes.push('손 없는 날 — a traditional day for beginnings and moving things (and plants).');
    }
    const fest: Record<string, string> = {
      '1-15': '정월 대보름 — first full Moon: 부럼, 오곡밥, 달집태우기; farmers divine the year\'s harvest from the Moon\'s colour.',
      '2-1': '영등날 (음력 2월 초하루) — 영등할미, the wind goddess, arrives: a windy fortnight, bad for planting out in Jeju lore.',
      '3-3': '삼짇날 — swallows return, 진달래 화전; spring work begins in earnest.',
      '5-5': '단오 — cut medicinal herbs (약쑥, 익모초, 창포) at noon; the strongest yang of the year.',
      '6-15': '유두 — wash hair in the east-flowing stream; offer first fruits to the field spirits.',
      '7-7': '칠석 — airing books and clothes; cucumbers and squash offered.',
      '7-15': '백중 — farmhands\' holiday: the weeding (김매기) is done, 호미씻이 — wash the hoe.',
      '8-15': '추석 — harvest Moon: 송편 from new rice; harvest thanks.',
      '9-9': '중양절 — chrysanthemum day; the swallows leave.'
    };
    const k = `${L.month}-${L.day}`;
    if (!L.leap && fest[k]) d.notes.push(fest[k]);

    // 한식 = 동지(prev year) + 105 days
    const hansik = addDays(solarTermDate(ctx.year - 1, 21, 9), 105);
    if (ctx.ymd === hansik) { add(d, 'transplant', 2, '한식 — the traditional day to plant trees and tend graves'); d.notes.push('한식 (105 days after 동지) — plant trees today.'); }
    // 삼복
    const haji = solarTermDate(ctx.year, 9, 9), ipchu = solarTermDate(ctx.year, 12, 9);
    const gyeong = (from: string, n: number) => { let x = from, c = 0; while (true) { if (sexagenaryDay(x).stem === 6) { c++; if (c === n) return x; } x = addDays(x, 1); } };
    const chobok = gyeong(haji, 3), jungbok = gyeong(haji, 4), malbok = gyeong(ipchu, 1);
    if (ctx.ymd === chobok) d.notes.push('초복 — first dog day: 삼계탕; too hot to sow, water at dawn.');
    if (ctx.ymd === jungbok) d.notes.push('중복 — mid dog day.');
    if (ctx.ymd === malbok) d.notes.push('말복 — last dog day: "말복 지나면 김장 배추 심는다" — after Malbok, set out the kimchi cabbage.');
    if (ctx.ymd >= chobok && ctx.ymd <= malbok) { add(d, 'water_feed', 1, '삼복 heat: irrigate early and late, shade seedlings'); addAll(d, SOW_ALL, -1, '삼복 — seeds sown in dog-day heat fail; start them in shade/indoors'); }

    const latNote = Math.abs(Math.abs(ctx.lat) - 36.5);
    if (latNote > 6) d.notes.push(`Your latitude differs from the Korean farm belt (~34–38°N) by ${latNote.toFixed(0)}°: shift term advice ${ctx.lat > 36.5 ? 'later in spring / earlier in autumn' : 'earlier in spring / later in autumn'} by roughly a week per 2°.`);
    d.headline = `${term.ko} ${term.hanja} · ${lunarTxt}`;
    return d;
  }
};
