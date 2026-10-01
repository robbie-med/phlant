import { ELEMENT_PART, SIGN_ELEMENT, SIGN_GLYPH } from '../astro/moon';
import * as A from 'astronomy-engine';
import { add, addAll, mk, md, type Task, type Tradition, SOW_ALL } from './types';

const PART_TASK: Record<string, Task> = { root: 'sow_root', leaf: 'sow_leaf', flower: 'sow_flower', fruit: 'sow_fruit' };
const JOUR: Record<string, string> = { root: 'jour racines', leaf: 'jour feuilles', flower: 'jour fleurs', fruit: 'jour fruits et graines' };

export const french: Tradition = {
  id: 'french',
  name: 'Jardiner avec la Lune',
  region: 'France, Belgium, Switzerland (Rustica school)',
  flag: '🇫🇷',
  summary: 'The French potager calendar insists the phase (croissante/décroissante) matters little: what counts is the Moon montante (sow, graft, harvest aerial parts — "la sève monte") or descendante (plant, prune, cut, work the soil), crossed with the jour racines / feuilles / fleurs / fruits of its constellation. Nodes, apogee and perigee are "ne pas jardiner" hours. Watch the lune rousse and the saints de glace for frost.',
  basis: ['Lune montante / descendante (declination)', 'Constellation → jour racines/feuilles/fleurs/fruits', 'Nœuds lunaires, apogée, périgée', 'Lune rousse, saints de glace, Sainte-Catherine'],
  sources: ['Rustica, Jardiner avec la Lune (annual)', 'Michel Gros, Calendrier lunaire', 'Thérèse Trédoulat, Mon jardin avec la Lune'],
  evaluate(ctx) {
    const d = mk();
    const m = ctx.moon;
    const part = ELEMENT_PART[SIGN_ELEMENT[m.sidereal]];
    const montante = ctx.hemisphere === 'N' ? m.ascending : !m.ascending;
    const nodeH = Math.abs(m.nearestNode.hours), apH = Math.abs(m.nearestApsis.hours);
    if (nodeH <= 6 || apH <= 6) {
      d.blocked = nodeH <= 6 ? `Nœud lunaire à ${Math.round(nodeH)} h — "ne pas jardiner" (Rustica masks ±5 h around the node).` : `${m.nearestApsis.kind === 'perigee' ? 'Périgée' : 'Apogée'} within ${Math.round(apH)} h — hours to avoid.`;
      addAll(d, [...SOW_ALL, 'transplant', 'graft', 'prune'], -2, d.blocked);
    }
    add(d, PART_TASK[part], 2, `Lune en ${m.sidereal} ${SIGN_GLYPH[m.sidereal]} → ${JOUR[part]}`);
    for (const t of SOW_ALL) if (t !== PART_TASK[part]) add(d, t, -1, `${JOUR[part]}: other parts are not the day's focus`);
    if (montante) {
      addAll(d, SOW_ALL, 1, 'Lune montante: semer — la sève monte, germination favoured');
      add(d, 'graft', 2, 'Lune montante: greffer, récolter les fruits et légumes-feuilles');
      add(d, 'harvest_store', 1, 'Lune montante: harvest the aerial parts, they keep better');
      add(d, 'transplant', -1, 'Lune montante: planter attend la lune descendante');
      add(d, 'prune', -2, 'Lune montante: ne pas tailler (bleeding)');
    } else {
      add(d, 'transplant', 2, 'Lune descendante: planter, repiquer, bouturer — la sève descend vers les racines');
      add(d, 'prune', 2, 'Lune descendante: tailler, élaguer');
      add(d, 'soil_compost', 2, 'Lune descendante: travailler la terre, fumer, composter');
      add(d, 'sow_root', 1, 'Lune descendante: récolte et plantation des racines');
      add(d, 'harvest_store', part === 'root' ? 1 : 0, 'Lune descendante + jour racines: lift roots');
      add(d, 'graft', -1, 'Lune descendante: pas de greffe');
      addAll(d, ['sow_leaf', 'sow_fruit', 'sow_flower'], -1, 'Lune descendante: semis attend la lune montante');
    }
    // Lune rousse: lunation after Easter (new moon following Easter) until its full moon
    const easter = new Date(ctx.easter + 'T12:00:00Z');
    const nmAfterEaster = A.SearchMoonPhase(0, easter, 35)!.date;
    const fmAfter = A.SearchMoonPhase(180, nmAfterEaster, 35)!.date;
    if (ctx.noon >= nmAfterEaster && ctx.noon <= fmAfter) d.notes.push('Lune rousse — the lunation after Easter: clear nights under this Moon redden young shoots with frost. Cover seedlings when the sky is clear.');
    const dm = md(ctx.ymd);
    if (dm >= '05-11' && dm <= '05-13') d.notes.push('Saints de glace (Mamert, Pancrace, Servais) — the last traditional frost risk; after the 13th, plant out tomatoes and beans.');
    if (dm === '11-25') d.notes.push('Sainte-Catherine — "à la Sainte-Catherine, tout bois prend racine": plant trees and shrubs.');
    if (dm === '02-02') d.notes.push('Chandeleur — sow under glass; "à la Chandeleur l\'hiver se passe ou prend vigueur".');
    if (dm === '03-19') d.notes.push('Saint-Joseph — sow peas and early lettuces outdoors.');
    if (dm === '06-24') d.notes.push('Saint-Jean — harvest medicinal herbs; cut the herbes de la Saint-Jean at dawn.');
    d.headline = `${JOUR[part]} · lune ${montante ? 'montante' : 'descendante'} (${m.waxing ? 'croissante' : 'décroissante'})`;
    return d;
  }
};
