// Generates docs/TRADITIONS.md from the tradition definitions. Run: npm run docs:traditions
import { writeFileSync } from 'node:fs';
import { TRADITIONS, buildContext } from '../src/traditions';
import { TASKS } from '../src/traditions/types';

const tulsa = { lat: 36.15, lon: -95.99, elevationM: 220, tz: 'America/Chicago', lastFrost: '04-15', firstFrost: '11-01' };
let md = `# The traditions in Phlant\n\n_Generated from \`src/traditions/*.ts\` by \`npm run docs:traditions\`. Edit the code, not this file._\n\nEach tradition is a rule engine: given the computed sky for a day (see [ARCHITECTURE.md](ARCHITECTURE.md)), it scores eleven garden tasks from −2 (avoid) to +2 (ideal) and states the reason for every score. The app then shows where the traditions agree.\n\n## The eleven tasks\n\n${TASKS.map(t => `- **${t.label}** (\`${t.id}\`)`).join('\n')}\n\n`;
for (const t of TRADITIONS) {
  md += `## ${t.flag} ${t.name}\n\n_${t.region}_\n\n${t.summary}\n\n**Reads:** ${t.basis.join(' · ')}\n\n**Sources:**\n${t.sources.map(s => `- ${s}`).join('\n')}\n\n`;
  // worked example
  const ctx = buildContext('2026-10-01', tulsa);
  const r = t.evaluate(ctx);
  md += `<details><summary>Worked example — 2026-10-01 at Tulsa, OK</summary>\n\n**${r.headline}**${r.blocked ? `\n\n⛔ ${r.blocked}` : ''}\n\n${TASKS.filter(x => r.scores[x.id] !== undefined).map(x => `- ${x.label}: **${r.scores[x.id]! > 0 ? '+' : ''}${r.scores[x.id]}** — ${(r.reasons[x.id] ?? []).join('; ')}`).join('\n')}\n\n${r.notes.length ? 'Notes: ' + r.notes.join(' · ') : ''}\n\n</details>\n\n`;
}
writeFileSync('docs/TRADITIONS.md', md);
console.log('wrote docs/TRADITIONS.md');
