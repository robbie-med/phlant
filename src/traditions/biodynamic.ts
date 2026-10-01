import { ELEMENT_PART, SIGN_ELEMENT, SIGN_GLYPH } from '../astro/moon';
import { add, addAll, mk, type Task, type Tradition, SOW_ALL } from './types';

const PART_TASK: Record<'root' | 'leaf' | 'flower' | 'fruit', Task> = { root: 'sow_root', leaf: 'sow_leaf', flower: 'sow_flower', fruit: 'sow_fruit' };

export const biodynamic: Tradition = {
  id: 'biodynamic',
  name: 'Biodynamic (Maria Thun)',
  region: 'Germany / Austria / Switzerland',
  flag: '🇩🇪',
  summary: 'Steiner-derived method formalised by Maria Thun from 1952. Reads the Moon against the real, unequal sidereal constellations: the element of the constellation picks the plant part (root, leaf, flower, fruit); ascending vs descending Moon picks sow vs plant-out; nodes, perigee and eclipses are rest days.',
  basis: ['Sidereal constellation of the Moon (IAU boundaries)', 'Ascending / descending Moon (declination)', 'Lunar nodes, perigee', 'Moon–Saturn opposition'],
  sources: ['Maria Thun, Aussaattage (annual, since 1963)', 'Thun & Thun, The Biodynamic Sowing and Planting Calendar', 'Demeter guidance'],
  evaluate(ctx) {
    const d = mk();
    const m = ctx.moon;
    const part = ELEMENT_PART[SIGN_ELEMENT[m.sidereal]];
    const ascending = ctx.hemisphere === 'N' ? m.ascending : !m.ascending;

    if (Math.abs(m.nearestNode.hours) <= 12) {
      d.blocked = `Lunar node (${m.nearestNode.kind}) within 12 h — Thun calendars leave these days blank. Rest, observe, plan.`;
      addAll(d, [...SOW_ALL, 'transplant', 'graft', 'prune'], -2, 'Lunar node: unfavourable for all planting work');
    }
    if (m.nearestApsis.kind === 'perigee' && Math.abs(m.nearestApsis.hours) <= 12) {
      addAll(d, [...SOW_ALL, 'transplant'], -2, 'Perigee: Thun found sowings at perigee prone to fungal trouble and poor keeping');
      d.notes.push('Perigee today — unfavourable day in the Thun calendar.');
    }
    if (m.nearestApsis.kind === 'apogee' && Math.abs(m.nearestApsis.hours) <= 12) {
      add(d, 'sow_root', 1, 'Apogee: Thun recommends planting potatoes at apogee');
      d.notes.push('Apogee today — Thun: a good day to plant potatoes.');
    }

    // Constellation → plant part
    const task = PART_TASK[part];
    add(d, task, 2, `Moon in ${m.sidereal} ${SIGN_GLYPH[m.sidereal]} (${SIGN_ELEMENT[m.sidereal]} constellation) → ${part} day`);
    for (const t of SOW_ALL) if (t !== task) add(d, t, -1, `${part} day: other plant parts are not favoured`);
    // Same-part work: cultivate, hoe, harvest the same part
    add(d, 'harvest_store', part === 'fruit' || part === 'flower' ? 1 : 0, `${part} day: harvest ${part} crops for storage`);
    if (part === 'root') add(d, 'harvest_store', 1, 'Root day: lift roots for storage');

    if (ascending) {
      add(d, 'graft', 2, 'Ascending Moon: sap rises, grafting and taking scions favoured');
      add(d, 'harvest_store', 1, 'Ascending Moon: harvest above-ground crops for storage, fruit keeps better');
      addAll(d, SOW_ALL, 1, 'Ascending Moon: sowing time (seed vitality rises)');
      add(d, 'transplant', -1, 'Ascending Moon: planting out and pruning are left for the descending phase');
      add(d, 'prune', -1, 'Ascending Moon: pruning now bleeds sap');
    } else {
      add(d, 'transplant', 2, 'Descending Moon: planting time — roots take, transplants settle');
      add(d, 'prune', 2, 'Descending Moon: prune, cut hedges, take cuttings');
      add(d, 'soil_compost', 2, 'Descending Moon: spread compost and manure, the soil "breathes in"');
      add(d, 'graft', -1, 'Descending Moon: graft in the ascending period instead');
      add(d, 'sow_root', 1, 'Descending Moon favours root development');
    }
    if (m.saturnOpposition) {
      addAll(d, SOW_ALL, 1, 'Moon opposite Saturn: Thun\'s favourite sowing aspect — sturdier, more disease-resistant plants');
      d.notes.push('Moon in opposition to Saturn — a prized sowing day in biodynamic practice.');
    }
    if (m.isFullMoonDay) {
      add(d, 'weed_pest', 1, 'Full Moon: biodynamic pest control (ash, preparations) traditionally timed to full Moon');
      add(d, 'water_feed', 1, 'Full Moon: liquid manures applied at full Moon');
    }
    d.headline = `${part[0].toUpperCase() + part.slice(1)} day · Moon ${ascending ? 'ascending' : 'descending'} in ${m.sidereal}`;
    return d;
  }
};
