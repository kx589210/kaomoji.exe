// Casts Drop 1's kaomoji from the collection (docs/reference/kaomoji-collection.json):
// many different faces, none twice anywhere in the drop (the
// backlog), each drawable by its world's fonts. Faces that differ only
// by spacing or full-width forms count as the same face (NFKC, whitespace
// stripped). Candidates are filtered, then taken in the order of an FNV-1a
// hash of the face, so the choice is fixed and spreads over both sites and
// every mood. Writes src/content/castDrop1.ts.
//   node scripts/cast.mjs [--print]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCoverage } from './lib/cmap.mjs';
import { readCollection } from './lib/collection.mjs';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FONT_FILES, STACKS, EXTRUDE_FONT } = await import('../src/engine/fonts.ts');
const collection = readCollection(KX);

const byFamily = new Map();
const byFile = new Map();
for (const f of FONT_FILES) {
  const cov = readCoverage(fs.readFileSync(path.join(KX, 'public', f.file)));
  byFile.set(f.file, cov);
  byFamily.set(f.family, new Set([...(byFamily.get(f.family) ?? []), ...cov]));
}
const SPACE = new Set([0x20, 0x3000]);
const chars = (face) => [...face].filter((c) => !SPACE.has(c.codePointAt(0)));
/** Every character of `face` in some family of the `rounded` stack (the world's type). */
const flat = (face) => chars(face).every((c) => STACKS.rounded.some((fam) => byFamily.get(fam)?.has(c.codePointAt(0))));
/** Every character of `face` in the extrusion font itself (the 3D burst has no fallback). */
const solid = (face) => chars(face).every((c) => byFile.get(EXTRUDE_FONT).has(c.codePointAt(0)));
/** No combining marks, variation selectors or joiners: every character is drawn on its own advance (the SDF atlas and the extrusion both place characters one by one). */
const plain = (face) => [...face].every((c) => !/[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︀-️︠-︯​-‏]/u.test(c));
/** Rude gestures and weapons stay out of a party for everyone. */
const RUDE = /[凸╭╮∩︻デ═┌┐🖕]/u;
/** The identity of a face: NFKC with whitespace stripped, so "(¬‿¬ )" and "(¬‿¬)" are one face. */
const key = (face) => face.normalize('NFKC').replace(/\s/gu, '');
const fnv = (s) => {
  let h = 0x811c9dc5;
  for (const b of Buffer.from(s, 'utf8')) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h;
};
const ordered = (list) => [...list].sort((a, b) => fnv(a.face) - fnv(b.face) || (a.face < b.face ? -1 : 1));
const JOYFUL = new Set(['happy', 'cute', 'love', 'blush & shy', 'surprised & scared', 'hugs & friends', 'dance & music', 'cats', 'bears', 'bunnies', 'wink & smug', 'birds, fish & other animals', 'dogs']);
const joyful = (e) => e.moods.some((m) => JOYFUL.has(m));
const len = (face) => [...face].length;

/** Faces taken so far (by key), so no face appears twice in the drop. */
const used = new Set();
/** The named friends and fixed faces of the drop (spec §4), claimed first. */
const FIXED = {
  HERO: '(•ω•)',
  FLIPPER: '(╯°□°)╯',
  /** The cocktail guest before he loses it. */
  FLIPPER_CALM: '(￣▽￣)',
  /** No longer drawn; still reserved, so the hashed picks below stay the faces already approved. */
  SHOCKED: ['(⊙_⊙)', '(°ロ°)'],
  MOON: ['(－ω－)', '(◕ω◕)'],
  PLANETS: ['ヽ(°〇°)ﾉ', 'ᕕ( ᐛ )ᕗ', 'ʕ•ᴥ•ʔ', '¯\\_(ツ)_/¯', '(ง •_•)ง', '(=^･ω･^=)', '┏(＾0＾)┛'],
};
for (const f of [FIXED.HERO, FIXED.FLIPPER, FIXED.FLIPPER_CALM, ...FIXED.SHOCKED, ...FIXED.MOON, ...FIXED.PLANETS]) used.add(key(f));

/** The first `count` faces of `pool` (hash order) that pass `ok` and are not taken yet; they are taken. */
function take(count, ok, name) {
  const out = [];
  for (const e of ordered(collection)) {
    if (out.length === count) break;
    if (!plain(e.face) || RUDE.test(e.face) || !ok(e) || used.has(key(e.face))) continue;
    used.add(key(e.face));
    out.push(e.face);
  }
  if (out.length < count) throw new Error(`not enough faces for ${name}: ${out.length} of ${count}`);
  return out;
}

/** Moods that would sour a party, and decorations that are not faces. */
const GLUM = new Set(['angry', 'annoyed', 'sad & hurt', 'crying', 'borders & decorations']);
// The Big Bang's 3D faces become the planet they gather into: as many as the extrusion font can make.
const burst = take(140, (e) => !e.moods.some((m) => GLUM.has(m)) && solid(e.face) && len(e.face) >= 3 && len(e.face) <= 9, 'burst');
const crowd = take(40, (e) => joyful(e) && e.renders && flat(e.face) && len(e.face) >= 3 && len(e.face) <= 8, 'crowd');
const galaxy = take(160, (e) => !e.moods.some((m) => GLUM.has(m)) && e.renders && flat(e.face) && len(e.face) >= 3 && len(e.face) <= 8, 'galaxy');
const cores = take(36, (e) => joyful(e) && e.renders && flat(e.face) && len(e.face) >= 3 && len(e.face) <= 7, 'galaxy cores');
const guests = take(6, (e) => joyful(e) && e.renders && flat(e.face) && len(e.face) >= 5 && len(e.face) <= 9, 'guests');
// The dense fill — continents, asteroid belts, galaxy arms — draws from everything cast plus this pool.
const filler = take(220, (e) => !e.moods.some((m) => GLUM.has(m)) && e.renders && flat(e.face) && len(e.face) >= 3 && len(e.face) <= 10, 'filler');

// The Big Bang throws 220 faces (src/shots/burst.ts): 80 more 3D faces, taken last so every list above keeps the faces already approved.
// When the pool runs dry, faces cast elsewhere in the drop that the extrusion font can make fill in (they are 2D there; none repeats in the burst).
const BURST_TOTAL = 220;
const burstMore = (() => {
  const out = [];
  for (const e of ordered(collection)) {
    if (burst.length + out.length === BURST_TOTAL) break;
    if (!plain(e.face) || RUDE.test(e.face) || used.has(key(e.face)) || e.moods.some((m) => GLUM.has(m)) || !solid(e.face) || len(e.face) < 3 || len(e.face) > 9) continue;
    used.add(key(e.face));
    out.push(e.face);
  }
  const inBurst = new Set([...burst, ...out].map(key));
  for (const f of [...galaxy, ...filler, ...cores, ...guests]) {
    if (burst.length + out.length === BURST_TOTAL) break;
    if (solid(f) && !inBurst.has(key(f))) {
      inBurst.add(key(f));
      out.push(f);
    }
  }
  if (burst.length + out.length < BURST_TOTAL) throw new Error(`not enough 3D faces for the burst: ${burst.length + out.length} of ${BURST_TOTAL}`);
  return out;
})();

// The dancers' panic (club bars 3–4): every scared face that draws, whatever else uses it (faces may repeat elsewhere).
const panic = ordered(collection.filter((e) => e.moods.some((m) => m === 'surprised & scared' || m === 'crying') && plain(e.face) && !RUDE.test(e.face) && e.renders && flat(e.face) && len(e.face) >= 3 && len(e.face) <= 10)).map((e) => e.face);

const list = (name, doc, faces) => `/** ${doc} */\nexport const ${name}: readonly string[] = [\n${faces.map((f) => `  ${JSON.stringify(f)},`).join('\n')}\n];\n`;
const out = `// Generated by scripts/cast.mjs from docs/reference/kaomoji-collection.json — do not edit by hand.
// Drop 1's cast: many different faces, chosen by hash, none twice (NFKC, spaces aside).

/** The protagonist (spec §4): dances in amber in club bars 1–3, kicks the cocktail over the guest, is thrown at the screen. */
export const HERO = ${JSON.stringify(FIXED.HERO)};
/** S19: the cocktail guest, red with rage, throwing him. */
export const FLIPPER = ${JSON.stringify(FIXED.FLIPPER)};
/** Club bars 1–3: the cocktail guest, calm at the centre of the dancing lines. */
export const FLIPPER_CALM = ${JSON.stringify(FIXED.FLIPPER_CALM)};
/** S14: the Moon, asleep, then woken by the party. */
export const MOON: readonly [string, string] = [${FIXED.MOON.map((f) => JSON.stringify(f)).join(', ')}];
/** S15: the planets are the named friends (spec §4). */
${list('PLANETS', '', FIXED.PLANETS).replace('/**  */\n', '')}
${list('BURST_FACES', "S13's 3D Big Bang (220 faces, none twice), which gathers into Earth: every character in the extrusion font.", [...burst, ...burstMore])}
${list('CROWD_FACES', "Joyful faces for the cosmos's fill and the dancing lines' extras.", crowd)}
${list('GALAXY_FACES', "S16: the faces that make the galaxy's arms.", galaxy)}
${list('CORE_FACES', "More faces for the cosmos's mini atlas.", cores)}
${list('GUESTS', "More faces for the cosmos's mini atlas.", guests)}
${list('FILLER', 'More faces for the dense fill (each drawn whole, as one glyph).', filler)}
${list('PANIC', 'Club bars 3–4: the scared faces the dancers pull when (•ω•) is thrown.', panic)}`;
if (process.argv.includes('--print')) process.stdout.write(out);
else {
  fs.writeFileSync(path.join(KX, 'src', 'content', 'castDrop1.ts'), out);
  console.log(`burst ${burst.length + burstMore.length}, crowd ${crowd.length}, galaxy ${galaxy.length}, cores ${cores.length}, guests ${guests.length}, filler ${filler.length}, panic ${panic.length}`);
}
