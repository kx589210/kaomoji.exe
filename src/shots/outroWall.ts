// The curtain call's wall (build sheet notes/b58/ending-sheet.md §6.3, §7 E4): every face the film's sections cast, in film order
// (each section's lists in the order they appear), each credited to its first appearance (NFKC, spaces removed), with the principals,
// their variants, the spares and the headliners left out — the dim stadium behind the risers, texture by design (6–20 px). Read live
// from the sections' own cast files, so the wall stays honest when a team recasts (the build sheet's castCurtain script, folded into a
// pure module: nothing to regenerate). W5's friends count reads WALL_FACES.length. Pure.
import { LOG_LINES } from '../content/boot.ts';
import { FLIPBOOK, HALFTONE_FACES, MOUTH_FACES } from '../content/build.ts';
import { BREAK_CAST } from '../content/castBreak.ts';
import { BUILD_CAST } from '../content/castBuild.ts';
import { CLUB_CAST } from '../content/castClub.ts';
import { BURST_FACES, CORE_FACES, CROWD_FACES, FILLER, GALAXY_FACES, GUESTS, PANIC, PLANETS } from '../content/castDrop1.ts';
import { CAST_DROP2, SPARES } from '../content/castDrop2.ts';
import { CAT_OUT, GUEST_OUT, HEADLINERS, HERO_OUT, TABLE_BACK } from '../content/outro.ts';
import { lineWidth } from '../engine/textGrid.ts';

/** A face's identity for the one-face rule: NFKC, spaces removed. */
export const faceKey = (s: string): string => s.normalize('NFKC').replace(/\s/g, '');
/** The boot log's faces (a line's face: from its accent on). */
const bootFaces = (): string[] => LOG_LINES.filter((l) => l.accent !== undefined).map((l) => [...l.text].slice(l.accent).join(''));

/** Each section's cast in film order: boot, Swiss + Riso, cosmos, club, interlude, drop 2. */
export const WALL_SOURCES: readonly { world: string; faces: readonly string[] }[] = [
  { world: 'boot', faces: bootFaces() },
  { world: 'build', faces: [...BUILD_CAST, ...FLIPBOOK.flat(), ...MOUTH_FACES.map((m) => m.face), ...HALFTONE_FACES] },
  { world: 'cosmos', faces: [...PLANETS, ...BURST_FACES, ...GALAXY_FACES, ...CORE_FACES] },
  { world: 'club', faces: [...CLUB_CAST, ...CROWD_FACES, ...GUESTS, ...FILLER, ...PANIC] },
  { world: 'interlude', faces: BREAK_CAST },
  { world: 'drop2', faces: CAST_DROP2 },
];
/**
 * Headliners retired from their seat: N1 (2026-10-02) turned the riso headliner Σ(°ロ°) into Σ(・ロ・). The wall was
 * approved without Σ(°ロ°) (the club casts it too), so it stays off: the wall's lines and W5's count are as approved.
 */
const RETIRED_HEADLINERS: readonly string[] = ['Σ(°ロ°)'];
/** Who never stands in the wall: the hero, the guest and the cat in every variant, the spares, the headliners (and the retired one). */
const EXCLUDED: ReadonlySet<string> = new Set(
  [...Object.values(HERO_OUT), ...Object.values(GUEST_OUT), ...Object.values(CAT_OUT), TABLE_BACK, ...SPARES, ...HEADLINERS.map((h) => h.face), ...RETIRED_HEADLINERS, '(•ω•)', '(×ω×)', '(－ω－)', '(-ω-)', '(￣▽￣)', '(=^･ω･^=)'].map(faceKey),
);
/** A principal's variant: his (•ω•) / its (￣ω￣) / the cat's (=^･ω･^=) inside a longer face (ヽ(•ω•)ノ, (￣▽￣)ノ …). */
const principal = (face: string): boolean => /[•][ω][•]|￣[ω▽]￣|=\^.ω.\^=/u.test(face.normalize('NFKC').replace(/\s/g, '')) || /•ω•|￣ω￣|￣▽￣/u.test(face);
/** Characters the wall's font (the mono stack, whole faces) does not have: their faces stay off the wall (tests/outroCompany.test.ts reads the fonts). */
const UNDRAWABLE = /[⌐]/u;
/** The widest a wall face may be (terminal cells): longer strings are props, not faces. */
const MAX_CELLS = 16;

/** The wall: every non-principal, non-headliner face of the film, each once, in film order. */
export const WALL_FACES: readonly string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const src of WALL_SOURCES)
    for (const face of src.faces) {
      const k = faceKey(face);
      if (!k || seen.has(k) || EXCLUDED.has(k) || principal(face) || lineWidth(face) > MAX_CELLS || [...face].length < 3 || UNDRAWABLE.test(face)) continue;
      seen.add(k);
      out.push(face);
    }
  return out;
})();

/** The wall's faces as on-screen strings for scripts/check-glyphs.mjs, in the role the company draws them (the mono stack, whole faces): the lead appends them to SCREEN_TEXTS (src/content/all.ts). */
export const WALL_TEXTS: readonly { role: 'mono'; text: string; where: string }[] = WALL_FACES.map((text) => ({ role: 'mono', text, where: 'E4: the curtain call’s wall' }));
