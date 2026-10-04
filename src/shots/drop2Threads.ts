// Drop 2's picture switches ("threads"), read by the dispatcher (src/scenes/drop2.ts) when the film is built. The default draws the film as
// released; a composition's props (src/Root.tsx) or a test (threadsOf) can switch one back, e.g. waveStyle 'v09'.
// Nothing in the default film reads anything but DROP2_THREADS.
//   waveStyle  drop2 10–11's ukiyo-e world: 'v09' (the golden-curl wave of cut v09: src/shots/drop2Wave.ts) or 'mochi' (the lead's
//              redesign of 2026-10-03, ported from output/qa/wave-lab/final/: src/shots/drop2Mochi*.ts; the film's since
//              that morning, spec rev 11 §16 item 2). With 'mochi' the switch's
//              blueprint (bar 9) drafts the mochi's outline instead of the golden curl, and the scoreboard's dock ducks round the mochi's hero.
//   mochiSfx   the mochi's katakana sound-effect lettering (ザッパーン on the crash, 11.1); on, a sub-flag so it can be dropped.
export type WaveStyle = 'v09' | 'mochi';
export type Drop2Threads = { readonly waveStyle: WaveStyle; readonly mochiSfx: boolean };

/** The film's switches: the mochi wave with its lettering (since 2026-10-03; v09's wave stays behind waveStyle 'v09'). */
export const DROP2_THREADS: Drop2Threads = { waveStyle: 'mochi', mochiSfx: true };

/** The default with some switches overridden (a composition's props). */
export const threadsOf = (o?: Partial<Drop2Threads>): Drop2Threads => ({ ...DROP2_THREADS, ...(o ?? {}) });
