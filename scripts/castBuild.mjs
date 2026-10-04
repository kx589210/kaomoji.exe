// Casts bars 1–14 (the intro's RAIN bar, S06's split, S08's poster) from the bars 1–14 design (notes/b112/final-cast.json, §7 of
// notes/b112/final.md; build sheet notes/b114/sheet.md §7) and checks every pick before writing src/content/castBuild.ts:
//   - every face is a face of docs/reference/kaomoji-collection.json that draws (`renders`), in the type it is drawn in (Noto Sans JP
//     Black, the `jp` stack; the rain's faces also in the terminal's `mono` stack), with no combining marks;
//   - many different faces: none twice here (NFKC, whitespace stripped), and none cast by another section today (castBreak.ts,
//     castDrop2.ts, castClub.ts, drop2.ts, outro.ts; castDrop1.ts is drop 1's v04 cast, retired by the new cosmos and club);
//   - none of the principals' look: no ω (only he wears it), no ￣▽￣ / ‾▽‾ / ￣∀￣ (the guest), no °□° / °ロ° (the guest's
//     table-flip core), nothing rude.
// It throws on the first failure and writes nothing.
//   node scripts/castBuild.mjs [--print]
// Slips fixed against the design's list (2026-10-01, b114): (✿◠‿◠) (rain) and (o_O) (S08) are cosmos3's galaxy hosts → swapped for the
// first two eligible reserves, (づ◡﹏◡)づ and (´；д；`). The boot log's friend rows lose the guest's (╯°□°)╯︵ ┻━┻ in src/content/boot.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCoverage } from './lib/cmap.mjs';
import { readCollection } from './lib/collection.mjs';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FONT_FILES, STACKS } = await import('../src/engine/fonts.ts');
const collection = readCollection(KX);
const entry = new Map(collection.map((e) => [e.face, e]));

const byFamily = new Map();
for (const f of FONT_FILES) {
  const cov = readCoverage(fs.readFileSync(path.join(KX, 'public', f.file)));
  byFamily.set(f.family, new Set([...(byFamily.get(f.family) ?? []), ...cov]));
}
const SPACE = new Set([0x20, 0x3000]);
/** Every character of `face` is in some family of `role`'s stack. */
const draws = (face, role) => [...face].filter((c) => !SPACE.has(c.codePointAt(0))).every((c) => STACKS[role].some((fam) => byFamily.get(fam)?.has(c.codePointAt(0))));
/** No combining marks, variation selectors or joiners: the atlas places characters one by one. */
const plain = (face) => [...face].every((c) => !/[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︀-️︠-︯​-‏]/u.test(c));
/** The identity of a face: NFKC with whitespace stripped. */
const key = (face) => face.normalize('NFKC').replace(/\s/gu, '');
const fail = (why) => {
  throw new Error(`castBuild: ${why}`);
};

// ——— The picks (b112/final-cast.json, with the b114 swaps) ————————————————————————————————————————————————————————————————————————

/** intro 2, the RAIN bar: 8 face columns, one face each, drawn rotated 90° CW (vertical Japanese setting) in the log's pink. */
const RAIN = ['(ᵔ◡ᵔ)', '(°◡°♡)', '(・‿・)', '(*^^)/', '(^人^)', '(◕ᴗ◕✿)', '(づ◡﹏◡)づ', '(´ ∀ ` *)'];
/** swiss 2 (S06), the split: the hosts each level adds round him, in anchor order (level 1 = the startled crowd of the first split). */
const S06 = {
  level1: ['Σ(□_□)', '(O_O;)', '(⊙_◎)'],
  level2: ['┐( ´ д ` )┌', '(￢ ￢)', 'm(_ _)m', '(◎ ◎)ゞ', 'ヽ(ー_ー )ノ', '(→_→)', '(^_<)〜☆', 'Σ(￣。￣ﾉ)', '(⌒_⌒;)', '(☞ﾟヮﾟ)☞', '(￣^￣)ゞ', 'ヽ(ˇヘˇ)ノ'],
  level3: [
    '(~˘▽˘)~', '≧( ° ° )≦', 'ヽ(♡‿♡)ノ', '(o-_-o)', 'U^ｪ^U', '( ˘⊖˘)', '(·(エ)·)', '(//▽//)', '(o´〰`o)', '／(＞×＜)＼', '／(^ x ^)＼', '(= ; ｪ ; =)',
    '<(￣ ﹌ ￣)>', '(≡^∇^≡)', 'ζ°)))彡', '(」＞＜)」', '(.❛ ᴗ ❛.)', '(^.~)', '╮(︶︿︶)╭', '(・Θ・)', 'ヾ( ￣O￣)ツ', '♡( ◡‿◡ )', '(≧◦◦≦)', '┐(￣ヘ￣;)┌',
    '(ㆆ_ㆆ)', '（・□・；）', 'ヽ(´o｀;)ノ', '(♡˙︶˙♡)', '(─‿‿─)♡', '(♡μ_μ)', '(▰˘◡˘▰)', '(╯✧▽✧)╯', '√(￣‥￣√)', '└(￣-￣└))', '(／(ｴ)＼)', 'ＵＴｪＴＵ',
    '(・8・)', '(:3っ)っ', '(ﾉД`)', 'ヽ(。_°)ノ', 'Σ(ﾟДﾟ)', '(＃`Д´)', '(┳Д┳)', '(ﾒ`ﾛ´)', '(¬▂¬)', '(＿ ＿*) Z z z', '(¦3[▓▓])', '(ー。ー)',
  ],
};
/** swiss 5 (S08), the poster: 114 faces in card order (row by row from the top-left, skipping his card, the guest's, the counter and the type rows). */
const S08 = [
  '☆ ～(\'▽^人)', '( ´_ゝ`)', '(◞‸◟；)', '(≧◠◡◠≦)✧', '(˶ᵔ ᵕ ᵔ˶)♡', '♪(/_ _ )/♪', '__φ(◎◎ヘ)', '(／ˍ・、)', '(°)#))<<', '(￣(00)￣)', '(^₃^)₌₃♕', '☆⌒(>。<)',
  'ヽ(　￣д￣)ノ', '*(ﾉ▽ﾉ)', '(◣∀◢)ψ', '(￣3￣)♡', '(シ_ _)シ', '⚞^. .^⚟', '(＾＾＃)', '∑d(°∀°d)', 'V●ᴥ●V', '乁(ツ)ㄏ', 'U・ᴥ・U', '(◉Θ◉)',
  '\\(￣ﾊ￣)', '（ミ￣ー￣ミ）', '(・ε・)', '(<_<)', '(っ´▽`)っ', '(￣ ¨ヽ￣)', '₍ᐢ..ᐢ₎♡', '(;;;*_*)', '( ﾟｏ⌒)', '/ᐢ⑅ᐢ\\', '●︿●', '(￢з￢)',
  '(＋_＋)', '╮( ˘ ､ ˘ )╭', '(☆_☆)', '(・ヘ・?)', '(￣(工)￣)', '(ᴗ˳ᴗ)', '┐(´～｀)┌', '(*/。＼)', '(¬‿¬)b', '(˘ ³˘)♥', '( ˶ˆᗜˆ˵ )', '┗(・o･)┓♪',
  '／(=ㅅ=)＼', '(＠´ー`)ﾉﾞ', 'ヽ(>∀<☆)ノ', '◄.►', '₍ᐢ・⚇・ᐢ₎', '☆(>ᴗ•)', '><(((°>', '(ᵔ(oo)ᵔ)', '／(=ｖ=)＼', '__φ(。。)', '(・人・)', '(´−`) ﾝｰ',
  '(ﾟﾛﾟ)', '( ᵘ ᵕ ᵘ ⁎)', '(╯︵╰,)', '( ・◇・)', '(-_-;)', '(´ ε ` )♡', '(^◕ᴥ◕^)', '◎[▪‿▪]◎', '(￣Θ￣)', '(◔_◔)', '(*￣ii￣)', '(*ﾟｰﾟ)ゞ',
  '(￣﹃￣)', '(/▿＼ )', '(ノ_<。)', 'o(TヘTo)', 'ヽ(`⌒´メ)ノ', 'ψ( `∇´ )ψ', 'ヾ(`ヘ´)ﾉﾞ', 'ヽ(‵﹏´)ノ', 'Σ(▼□▼メ)', '(҂`з´)', '〣( ºΔº )〣', '(ᓀ ᓀ)',
  '(´；д；`)', 'ヾ(*\'▽\')', '( ~*-*)~', '( -_・)', '☆⌒(ゝ。∂)', '(=⌒‿‿⌒=)', 'ʕ ᵔᴥᵔ ʔ', 'ヾ(￣◇￣)ノ〃', '(〜￣△￣)〜', '(ᵕ—ᴗ—)', '(=ＴェＴ=)', '(π_π)',
  '(ToT)', '(TдT)', '(っ- ‸ – ς)', '(ʘ言ʘ╬)', '(●__●)', '☆ヽ(o_ _)o', '(=｀ェ´=)', '／(•ㅅ•)＼', '／(=∵=)＼', '／(◕ x ◕)＼', 'ʕ→ᴥ←ʔ', '(⊃･ᴥ･)つ',
  '(θ‿θ)', '(-ι_- )', '(｀∀´)Ψ', '(－‿◦)', '(ﾒ▼_▼)', '(๑´ㅂ`๑)',
];
/** Swap-ins if a face has to go (same order of preference); re-run this script after any swap. */
const RESERVE = ['┐( ˘_˘ )┌', '(*¯︶¯*)', '(¬_¬ )', 'ʚ₍ᐢ. .ᐢ₎ɞ', '(^._.^)ﾉ'];
/** S08's type cards: Swiss poster type (Inter Tight Black, the `display` stack), one character per card: the headline row 0, the footer row 8. */
const HEADLINE = 'KAOMOJI.EXE';
const FOOTER = '150BPM·4/4·16×9';

// ——— The checks ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const others = {
  castBreak: (await import('../src/content/castBreak.ts')).BREAK_CAST,
  castDrop2: (await import('../src/content/castDrop2.ts')).CAST_DROP2,
};
/** Every other section's face text today (the club and the ending are rebuilt in parallel: their files are read as text). */
const otherText = ['castClub.ts', 'club.ts', 'drop2.ts', 'outro.ts', 'break.ts']
  .map((f) => path.join(KX, 'src', 'content', f))
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n')
  .normalize('NFKC')
  .replace(/\s/gu, '');
const taken = new Set(Object.values(others).flat().map(key));

const picks = [...RAIN.map((f) => ['rain', f]), ...Object.entries(S06).flatMap(([l, v]) => v.map((f) => [`s06.${l}`, f])), ...S08.map((f) => ['s08', f]), ...RESERVE.map((f) => ['reserve', f])];
if (RAIN.length !== 8) fail(`the rain has ${RAIN.length} face columns, not 8`);
if (S06.level1.length !== 3 || S06.level2.length !== 12 || S06.level3.length !== 48) fail('S06 adds 3, 12 and 48 hosts (1 → 4 → 16 → 64 cells)');
if (S08.length !== 114) fail(`S08 has ${S08.length} faces, not 114`);
if ([...HEADLINE].length !== 11 || [...FOOTER].length !== 15) fail('the type rows are 11 and 15 cards');
const seen = new Map();
for (const [role, f] of picks) {
  const e = entry.get(f);
  if (!e) fail(`${role} ${f} is not in the collection`);
  if (!e.renders) fail(`${role} ${f} does not render`);
  if (!plain(f)) fail(`${role} ${f} has combining marks`);
  if (!draws(f, 'jp')) fail(`${role} ${f} does not draw in the jp stack`);
  if (role === 'rain' && !draws(f, 'mono')) fail(`${role} ${f} does not draw in the mono stack`);
  if (/ω/u.test(f)) fail(`${role} ${f} wears his ω`);
  if (/￣▽￣|‾▽‾|￣∀￣/u.test(key(f))) fail(`${role} ${f} looks like the guest`);
  if (/°□°|°ロ°/u.test(f)) fail(`${role} ${f} has the guest's table-flip core`);
  if (/[凸🖕︻═]/u.test(f)) fail(`${role} ${f} is rude`);
  if (taken.has(key(f)) || otherText.includes(key(f))) fail(`${role} ${f} is already cast by another section`);
  if (seen.has(key(f))) fail(`${role} ${f} repeats ${seen.get(key(f))}`);
  seen.set(key(f), `${role} ${f}`);
}
for (const ch of HEADLINE + FOOTER) if (!draws(ch, 'display')) fail(`type card ${ch} does not draw in the display stack`);

// ——— The file ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const q = (s) => JSON.stringify(s);
const list = (faces) => `[${faces.map(q).join(', ')}]`;
const out = `// Generated by scripts/castBuild.mjs from the bars 1–14 design (notes/b112/final-cast.json; build sheet notes/b114/sheet.md
// §7) — do not edit by hand; change the picks there and re-run it. Bars 1–14's hosts: real faces of the collection, every one different
// (NFKC, spaces aside), none cast by another section, none wearing his ω, the guest's ￣▽￣ or the table-flip core °□°. The principals
// — him (•ω•), the guest (￣▽￣), the cat (=^･ω･^=) — are not listed; they come back on purpose.

/** intro 2, the RAIN bar: the 8 face columns, one face each, left to right; drawn rotated 90° CW in the log's pink (mono atlas). */
export const RAIN_FACES: readonly string[] = ${list(RAIN)};
/** swiss 2 (S06), the split 1 → 4 → 16 → 64: the hosts each level adds, in anchor order (jp atlas). */
export const S06_HOSTS = {
  level1: ${list(S06.level1)},
  level2: ${list(S06.level2)},
  level3: ${list(S06.level3)},
} as const;
/** swiss 5 (S08), the poster: the 114 faces in card order (src/content/build.ts S08_CARDS places them; jp atlas). */
export const S08_FACES: readonly string[] = ${list(S08)};
/** S08's type cards (Inter Tight Black, display atlas), one character per card: the headline (row 0, cards 0–10) and the footer (row 8, cards 0–14). */
export const S08_HEADLINE = ${q(HEADLINE)};
export const S08_FOOTER = ${q(FOOTER)};
/** Swap-ins, in order of preference (re-run scripts/castBuild.mjs after a swap). */
export const BUILD_RESERVE: readonly string[] = ${list(RESERVE)};
/** Every host face of bars 1–14, for the later sections' casts to exclude. */
export const BUILD_CAST: readonly string[] = [...RAIN_FACES, ...S06_HOSTS.level1, ...S06_HOSTS.level2, ...S06_HOSTS.level3, ...S08_FACES];
`;
if (process.argv.includes('--print')) process.stdout.write(out);
else {
  fs.writeFileSync(path.join(KX, 'src', 'content', 'castBuild.ts'), out);
  console.log(`rain ${RAIN.length}, S06 ${S06.level1.length}+${S06.level2.length}+${S06.level3.length}, S08 ${S08.length} + ${[...HEADLINE].length + [...FOOTER].length} type cards, ${RESERVE.length} reserve: ${seen.size} distinct, all checked`);
}
