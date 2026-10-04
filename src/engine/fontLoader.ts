import { staticFile } from 'remotion';
import { FONT_FILES } from './fonts.ts';

let loading: Promise<void> | null = null;

/** Loads every font file once per tab. Rejects if any file fails, so a render never falls back silently. */
export const loadFonts = (): Promise<void> => {
  loading ??= Promise.all(
    FONT_FILES.map(async (f) => {
      const face = new FontFace(f.family, `url("${staticFile(f.file)}")`, { weight: f.weight, style: 'normal', display: 'block' });
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);
  return loading;
};
