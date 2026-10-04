// Every font the film uses. All SIL OFL 1.1, downloaded once by
// scripts/fetch-fonts.mjs into public/fonts with their license texts.
// Families carry a "KX " prefix so the browser can never pick a system copy.
export type FontFile = { family: string; file: string; weight: string; url: string; licenses: readonly string[] };

const GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl';

export const FONT_FILES: readonly FontFile[] = [
  { family: 'KX JetBrains Mono', file: 'fonts/jetbrains-mono.ttf', weight: '100 800', url: `${GF}/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf`, licenses: [`${GF}/jetbrainsmono/OFL.txt`] },
  { family: 'KX M PLUS 1 Code', file: 'fonts/mplus-1-code.ttf', weight: '100 700', url: `${GF}/mplus1code/MPLUS1Code%5Bwght%5D.ttf`, licenses: [`${GF}/mplus1code/OFL.txt`] },
  { family: 'KX Noto Sans JP', file: 'fonts/noto-sans-jp.ttf', weight: '100 900', url: `${GF}/notosansjp/NotoSansJP%5Bwght%5D.ttf`, licenses: [`${GF}/notosansjp/OFL.txt`] },
  // The Rounded M+ folder ships no OFL.txt: keep its METADATA.pb (license: "OFL",
  // copyright line) next to the OFL 1.1 text from the sibling M+ folder.
  { family: 'KX M PLUS Rounded 1c', file: 'fonts/mplus-rounded-1c-extrabold.ttf', weight: '800', url: `${GF}/mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf`, licenses: [`${GF}/mplusrounded1c/METADATA.pb`, `${GF}/mplus1code/OFL.txt`] },
  { family: 'KX M PLUS Rounded 1c', file: 'fonts/mplus-rounded-1c-black.ttf', weight: '900', url: `${GF}/mplusrounded1c/MPLUSRounded1c-Black.ttf`, licenses: [`${GF}/mplusrounded1c/METADATA.pb`, `${GF}/mplus1code/OFL.txt`] },
  { family: 'KX Inter Tight', file: 'fonts/inter-tight.ttf', weight: '100 900', url: `${GF}/intertight/InterTight%5Bwght%5D.ttf`, licenses: [`${GF}/intertight/OFL.txt`] },
  { family: 'KX Space Grotesk', file: 'fonts/space-grotesk.ttf', weight: '300 700', url: `${GF}/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf`, licenses: [`${GF}/spacegrotesk/OFL.txt`] },
  { family: 'KX DotGothic16', file: 'fonts/dotgothic16.ttf', weight: '400', url: `${GF}/dotgothic16/DotGothic16-Regular.ttf`, licenses: [`${GF}/dotgothic16/OFL.txt`] },
  { family: 'KX Noto Sans', file: 'fonts/noto-sans.ttf', weight: '100 900', url: `${GF}/notosans/NotoSans%5Bwdth,wght%5D.ttf`, licenses: [`${GF}/notosans/OFL.txt`] },
  { family: 'KX Noto Sans Symbols 2', file: 'fonts/noto-sans-symbols-2.ttf', weight: '400', url: `${GF}/notosanssymbols2/NotoSansSymbols2-Regular.ttf`, licenses: [`${GF}/notosanssymbols2/OFL.txt`] },
  { family: 'KX Noto Sans Canadian Aboriginal', file: 'fonts/noto-sans-canadian-aboriginal.ttf', weight: '100 900', url: `${GF}/notosanscanadianaboriginal/NotoSansCanadianAboriginal%5Bwght%5D.ttf`, licenses: [`${GF}/notosanscanadianaboriginal/OFL.txt`] },
  { family: 'KX Noto Sans Thai Looped', file: 'fonts/noto-sans-thai-looped.ttf', weight: '100 900', url: `${GF}/notosansthailooped/NotoSansThaiLooped%5Bwdth,wght%5D.ttf`, licenses: [`${GF}/notosansthailooped/OFL.txt`] },
];

export type FontRole = 'mono' | 'jp' | 'rounded' | 'display' | 'ui' | 'dot';

const FALLBACK = ['KX Noto Sans JP', 'KX Noto Sans', 'KX Noto Sans Symbols 2', 'KX Noto Sans Canadian Aboriginal', 'KX Noto Sans Thai Looped'] as const;

/** Font stacks per role. The browser and check-glyphs both pick the first family that has a character. */
export const STACKS: Record<FontRole, readonly string[]> = {
  mono: ['KX JetBrains Mono', 'KX M PLUS 1 Code', ...FALLBACK],
  jp: [...FALLBACK],
  rounded: ['KX M PLUS Rounded 1c', ...FALLBACK],
  display: ['KX Inter Tight', ...FALLBACK],
  ui: ['KX Space Grotesk', ...FALLBACK],
  dot: ['KX DotGothic16', ...FALLBACK],
};

export const cssStack = (role: FontRole): string => STACKS[role].map((f) => `"${f}"`).join(', ');

/** The one file whose outlines are extruded into 3D kaomoji. */
export const EXTRUDE_FONT = 'fonts/mplus-rounded-1c-black.ttf';
