// Fails if any on-screen character is missing from its font stack, or if an
// extruded character is missing from the extrusion font.
//   node scripts/check-glyphs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCoverage } from './lib/cmap.mjs';

const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
const SKIP = new Set([0x20, 0x3000, 0x0a]);

/** Characters in `texts` that no family of their role's stack covers. */
export function findMissing(texts, coverageByFamily, stacks) {
  const missing = [];
  for (const item of texts) {
    for (const ch of item.text) {
      const cp = ch.codePointAt(0);
      if (SKIP.has(cp)) continue;
      const stack = stacks[item.role];
      if (!stack.some((family) => coverageByFamily.get(family)?.has(cp))) {
        missing.push({ char: ch, codePoint: hex(cp), text: item.text, where: item.where, stack: stack.join(' > ') });
      }
    }
  }
  return missing;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { FONT_FILES, STACKS, EXTRUDE_FONT } = await import('../src/engine/fonts.ts');
  // Every section's strings and extruded characters (src/content/all.ts merges each section's lists).
  const { SCREEN_TEXTS: TEXTS, SCREEN_EXTRUDE_CHARS: EXTRUDE_CHARS } = await import('../src/content/all.ts');
  const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const coverage = new Map();
  const fileCoverage = new Map();
  for (const f of FONT_FILES) {
    const cov = readCoverage(fs.readFileSync(path.join(pub, f.file)));
    fileCoverage.set(f.file, cov);
    const prev = coverage.get(f.family) ?? new Set();
    coverage.set(f.family, new Set([...prev, ...cov]));
  }
  const missing = findMissing(TEXTS, coverage, STACKS);
  const extrude = fileCoverage.get(EXTRUDE_FONT);
  for (const ch of EXTRUDE_CHARS) {
    if (!extrude.has(ch.codePointAt(0))) missing.push({ char: ch, codePoint: hex(ch.codePointAt(0)), text: EXTRUDE_CHARS, where: '3D extrusion', stack: EXTRUDE_FONT });
  }
  if (missing.length) {
    for (const m of missing) {
      const offer = FONT_FILES.filter((f) => fileCoverage.get(f.file).has(m.char.codePointAt(0))).map((f) => f.family);
      console.error(`TOFU  ${m.char} ${m.codePoint}  in "${m.text}" (${m.where})  stack: ${m.stack}  available in: ${offer.join(', ') || 'none'}`);
    }
    process.exit(1);
  }
  console.log(`glyphs OK: ${TEXTS.length} strings, ${FONT_FILES.length} font files, 0 tofu`);
}
