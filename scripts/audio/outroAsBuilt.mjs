// The ending as it is heard once its bars are built through (build sheet §10.3). While FILM held the outro's `built` count, the film held
// the outro's last built frame over its tail and bgm.mjs gated that tail to digital zero; importing this module first — before anything
// that loads src/score/film.ts — made this process read FILM without it, so the music's tests and QA scripts heard the ending through
// the real chain as the film would. Nothing on disk changes. Since r4 (the 61-bar map) the outro is built through on disk, so this does
// nothing (`patched` stays false); it is kept so a `built` count put back while a bar is rebuilt is heard through again.
//   import '../scripts/audio/outroAsBuilt.mjs';            // first, as a static import; then
//   const { mixdown } = await import('../scripts/audio/bgm.mjs');
import { Buffer } from 'node:buffer';
import { registerHooks } from 'node:module';

/** The outro's FILM row with a `built` count, as src/score/film.ts writes it. */
const OUTRO_BUILT = /(\{\s*id:\s*'outro',\s*bars:\s*\d+)\s*,\s*built:\s*\d+\s*\}/;

/** Whether FILM, as this process loaded it, had the outro's `built` removed here (false once the lead has removed it on disk). */
export let patched = false;

registerHooks({
  load(url, context, nextLoad) {
    const r = nextLoad(url, context);
    if (!url.endsWith('/src/score/film.ts')) return r;
    const src = typeof r.source === 'string' ? r.source : Buffer.from(r.source).toString('utf8');
    const out = src.replace(OUTRO_BUILT, '$1 }');
    patched = out !== src;
    return { ...r, source: out };
  },
});
