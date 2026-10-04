// The comic club's own voices (the part 'club'; sections/club.mjs plays them; build sheet notes/b58/club-sheet.md §11, music bible
// notes/prep/music.md §7). The shared voices (drums.mjs, synth.mjs, fm.mjs, fx.mjs, vox.mjs) and two of the break's and drop 2's
// (chirp, plip, zip; sweep) cover most of the club's gags; these are the ones they do not: the ride, the antivirus's villain lick and lock
// chirp, the cat DJ's scratch, the quarantine stamp, the needle drop, the paper sounds, the ink's splats and thwack, the bloop with its
// little room, the red growl, the arm stretching and the whip of the throw, and a whoosh that travels across the stereo field. With no
// chord held behind the club (since 2026-10-03), the harmony is the club's own short voices: the house piano
// that the lit floor steps on and the horn section that hits the lettered words (housePiano, hornHit).
// Every voice adds into its output from a sample index; deterministic for a seed (seeds 7000–7999, the club's range).
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { fmBell } from './fm.mjs';
import { panGains } from './mix.mjs';
import { Osc } from './osc.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

/**
 * A ride (the record's peak, club bar 3): a hat ringing for about 300 ms (decayMs, the time constant), a little darker than the closed
 * hats, with a bell ping on it — an FM bell at `bell` Hz, ratio 2.7, its index dying fast — so the quarters shimmer.
 */
export function ride(out, at, sr, { gain = 0.12, bell = 2637, decayMs = 300, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round((decayMs / 1000) * 4 * sr);
  for (let i = 0; i < n; i++) {
    f.process(r() * 2 - 1, 6200, 0.8);
    const t = i / sr;
    put(out, at + i, gain * (f.hp + 0.4 * f.bp) * Math.min(1, t / 0.0008) * Math.exp(-t / (decayMs / 1000)));
  }
  fmBell(out, at, sr, { freq: bell, gain: 0.55 * gain, decay: 0.16, ratio: 2.7, index: 1.8, attackMs: 0.8 });
}

/**
 * The antivirus's villain lick (club 4.1&, 4.3&): a bass "wah-wah" — each of `notes` ([MIDI, samples], played one after the other) a
 * saw through a resonant low-pass that opens and shuts once per note (the wah) over a sine at its pitch, gliding into the next note over
 * 12 ms; dry and plain, the Defender's sound. Mono.
 */
export function villainLick(out, at, sr, { notes, gain = 0.25 } = {}) {
  const saw = new Osc(sr);
  const sine = new Osc(sr);
  const wah = new SVF(sr);
  const total = notes.reduce((s, [, len]) => s + len, 0);
  const rel = Math.round(0.006 * sr);
  const glide = Math.round(0.012 * sr);
  let start = 0;
  for (let k = 0; k < notes.length; k++) {
    const [m, len] = notes[k];
    const prev = k ? midiHz(notes[k - 1][0]) : midiHz(m);
    for (let i = 0; i < len; i++) {
      const u = i / len;
      const g = Math.min(1, i / glide);
      const freq = prev * (midiHz(m) / prev) ** (g * g * (3 - 2 * g));
      // The wah: a resonant low-pass opening 280 Hz → 2 kHz a third of the way into the note and shutting again by its end. A rising
      // saw's fundamental is −sin, so the sine under it goes in with the same sign (added, they would cancel).
      const w = u < 0.33 ? u / 0.33 : 1 - (u - 0.33) / 0.67;
      wah.process(saw.saw(freq), 280 * 7 ** (w * w * (3 - 2 * w)), 4);
      const j = start + i;
      const env = Math.min(1, j / (0.002 * sr)) * (j > total - rel ? (total - j) / rel : 1);
      put(out, at + j, gain * env * Math.tanh(0.9 * wah.lp - 0.5 * sine.sine(freq)));
    }
    start += len;
  }
}

/**
 * The lock (club 4.4): an FM chirp rising C7 → G7 over 80 ms (the reticle snapping on), a low clunk (a sine falling 110 → 60 Hz) and a
 * dry "chk" of noise above 3 kHz — the Defender's, pure and dry. Mono.
 */
export function lockChirp(out, at, sr, { gain = 0.1, seed = 7000 } = {}) {
  const n = Math.round(0.08 * sr);
  let pc = 0;
  let pm = 0;
  const [f0, f1] = [midiHz(96), midiHz(103)];
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const f = f0 * (f1 / f0) ** u;
    pc += f / sr;
    pm += (2 * f) / sr;
    const env = Math.min(1, i / (0.001 * sr)) * Math.min(1, (n - i) / (0.006 * sr));
    put(out, at + i, gain * env * Math.sin(2 * Math.PI * pc + 0.8 * (1 - u) * Math.sin(2 * Math.PI * pm)));
  }
  let ph = 0;
  const m = Math.round(0.12 * sr);
  for (let i = 0; i < m; i++) {
    const t = i / sr;
    ph += (60 + 50 * Math.exp(-t / 0.012)) / sr;
    put(out, at + i, 0.9 * gain * Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.001) * Math.exp(-t / 0.03));
  }
  const r = rng(seed);
  const f = new SVF(sr);
  const k = Math.round(0.03 * sr);
  const chk = Math.round(0.07 * sr);
  for (let i = 0; i < k; i++) {
    f.process(r() * 2 - 1, 4200, 1.2);
    put(out, at + chk + i, 0.7 * gain * f.bp * Math.exp(-i / sr / 0.006));
  }
}

/**
 * A record scratched (the cat DJ, club 2.4&: "wikka-wikka"): `src` (mono, the sound on the record) is read at a moving place. Each of
 * `moves` ({ from, to, ms }: seconds into `src`) drags the record from one place to the other, its speed a half sine (the hand starts and
 * stops each move), so the pitch swoops up and back within each move, and a pull plays it backwards. The crossfader cuts each move in two
 * ("wik-ka"): shut for `gapMs` around its middle (1 ms ramps). Vinyl noise rides on the speed (`noise`). Mono.
 */
export function scratch(out, at, sr, { src, moves, gain = 0.3, gapMs = 10, noise = 0.06, seed = 7000 }) {
  const r = rng(seed);
  const hiss = new SVF(sr);
  const ramp = 0.001 * sr;
  let start = 0;
  for (const { from, to, ms } of moves) {
    const n = Math.round((ms / 1000) * sr);
    const gap = (gapMs / 1000) * sr;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const pos = (from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * u))) * sr;
      const speed = (((to - from) * sr) / n) * (Math.PI / 2) * Math.sin(Math.PI * u);
      const k = Math.floor(pos);
      const x = k >= 0 && k + 1 < src.length ? src[k] + (src[k + 1] - src[k]) * (pos - k) : 0;
      hiss.process(r() * 2 - 1, 1800, 0.9);
      // The crossfader: open, shut for the gap around the move's middle, open again; 1 ms ramps; open from the move's first sample.
      const d = Math.abs(i - n / 2) - gap / 2;
      const fader = Math.min(1, Math.max(0, d / ramp)) * Math.min(1, (i + 1) / ramp) * Math.min(1, (n - i) / ramp);
      put(out, at + start + i, gain * fader * (x + noise * Math.min(3, Math.abs(speed)) * hiss.bp));
    }
    start += n;
  }
}

/**
 * The quarantine stamp (club 5.3): "ka" — a bright tick a 32nd (50 ms at 60 fps) before `at` as the stamp comes down — then "chunk" on
 * `at`: a thud falling 140 → 70 Hz, a dry paper slap and a click. Mono.
 */
export function stampChunk(out, at, sr, { gain = 0.3, seed = 7000 } = {}) {
  const r = rng(seed);
  const ka = at - Math.round(0.05 * sr);
  const tick = new SVF(sr);
  for (let i = 0; i < Math.round(0.012 * sr); i++) {
    tick.process(r() * 2 - 1, 3200, 2);
    put(out, ka + i, 0.5 * gain * tick.bp * Math.exp(-i / sr / 0.003));
  }
  let ph = 0;
  const paper = new SVF(sr);
  const n = Math.round(0.25 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (70 + 70 * Math.exp(-t / 0.01)) / sr;
    paper.process(r() * 2 - 1, 1600, 0.7);
    const thud = Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.0015) * Math.exp(-t / 0.07);
    const slap = paper.bp * Math.exp(-t / 0.008) * 1.4;
    put(out, at + i, gain * Math.tanh(1.4 * thud + slap));
  }
}

/** The needle drop (club 3.1): 80 ms of crackle (sparse clicks above 1.5 kHz) over a soft thump (a sine falling 90 → 50 Hz). Mono. */
export function needleDrop(out, at, sr, { gain = 0.2, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.08 * sr);
  for (let i = 0; i < n + Math.round(0.01 * sr); i++) {
    const pulse = i < n && r() < 0.012 ? (r() * 2 - 1) * (0.5 + r()) : 0;
    f.process(pulse, 3000, 0.6);
    put(out, at + i, gain * 1.6 * f.hp * Math.min(1, (n + 0.01 * sr - i) / (0.01 * sr)));
  }
  let ph = 0;
  for (let i = 0; i < Math.round(0.15 * sr); i++) {
    const t = i / sr;
    ph += (50 + 40 * Math.exp(-t / 0.015)) / sr;
    put(out, at + i, 0.8 * gain * Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.002) * Math.exp(-t / 0.025));
  }
}

/** A paper cut ("shk", the trail cut into a gutter): noise through a band-pass rising 1.5 → 7 kHz, swelling into sample `end`, where it stops. Mono. */
export function paperCut(out, end, len, sr, { gain = 0.1, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const u = (i + 1) / len;
    f.process(r() * 2 - 1, 1500 * (7000 / 1500) ** u, 1.4);
    put(out, end - len + i, gain * u ** 2.5 * Math.min(1, (len - i) / (0.0005 * sr)) * f.bp);
  }
}

/** A bloop with a little room (the cocktail, club 4.1 and 4.2): a sine gliding `from` → `to` Hz over `ms`, with three early reflections. Mono. */
export function bloopRoom(out, at, sr, { from = 659.3, to = 329.6, ms = 120, gain = 0.1 } = {}) {
  const n = Math.round((ms / 1000) * sr);
  const dry = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    ph += (from * (to / from) ** Math.min(1, 1.6 * u)) / sr;
    dry[i] = Math.sin(2 * Math.PI * ph) * Math.min(1, i / (0.0015 * sr)) * (1 - u) ** 1.2;
  }
  for (const [ms2, g] of [[0, 1], [7, 0.45], [13, 0.3], [19, 0.18]]) {
    const d = Math.round((ms2 / 1000) * sr);
    for (let i = 0; i < n; i++) put(out, at + d + i, gain * g * dry[i]);
  }
}

/** Ink hitting paper (club 1.1, the dot inks): a thwack — noise low-passed at 1.2 kHz for 80 ms over a short 150 Hz body. Mono. */
export function inkThwack(out, at, sr, { gain = 0.2, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.08 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 1200, 0.9);
    const env = Math.min(1, t / 0.0006) * Math.exp(-t / 0.022) * Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * env * (1.8 * f.lp + 0.6 * Math.sin(2 * Math.PI * 150 * t)));
  }
}

/** Paper slapped down or snapping (the corner box, the border snap): band-passed noise around `tone` Hz, gone in ~40 ms, with a little body. Mono. */
export function paperSlap(out, at, sr, { gain = 0.1, tone = 2500, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.05 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, tone, 0.9);
    put(out, at + i, gain * Math.min(1, t / 0.0005) * (1.5 * f.bp * Math.exp(-t / 0.008) + 0.3 * Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t / 0.01)));
  }
}

/**
 * The print's thwack (the club's beat-lock, plan v07 §4): the page's colour plate slipping off register on a clap is heard — a paper slap
 * (noise round `tone` Hz, gone in ~12 ms) on a 150 Hz thud (gone in ~25 ms); all of it over within 40 ms. Mono.
 */
export function printThwack(out, at, sr, { gain = 0.1, tone = 1900, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.04 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, tone, 1.1);
    ph += (150 * (1 + 0.4 * Math.exp(-t / 0.004))) / sr;
    const tail = Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * tail * Math.min(1, t / 0.0004) * (1.6 * f.bp * Math.exp(-t / 0.004) + 0.9 * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.008)));
  }
}

/**
 * The needle bumped (the record, club bar 3: the DJ's nudge on each kick): one crackle tick above 2 kHz and a little low knock of the
 * tonearm (a sine falling 95 → 55 Hz), gone in 50 ms. Mono.
 */
export function needleBump(out, at, sr, { gain = 0.1, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.05 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(i < Math.round(0.0015 * sr) ? r() * 2 - 1 : 0, 2600, 0.7);
    ph += (55 + 40 * Math.exp(-t / 0.008)) / sr;
    const tail = Math.min(1, (n - i) / (0.005 * sr));
    put(out, at + i, gain * tail * (1.4 * f.hp + 0.7 * Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.001) * Math.exp(-t / 0.012)));
  }
}

/** A splat (SPLASH!): low-passed noise falling 4 kHz → 500 Hz over 70 ms on a wet 140 Hz body, with a few bubbles popping after it. Mono. */
export function splat(out, at, sr, { gain = 0.25, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.14 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 500 + 3500 * Math.exp(-t / 0.025), 1.1);
    const env = Math.min(1, t / 0.0008) * Math.exp(-t / 0.035);
    put(out, at + i, gain * env * (1.6 * f.lp + 0.7 * Math.sin(2 * Math.PI * (140 + 60 * Math.exp(-t / 0.01)) * t)));
  }
  for (let k = 0; k < 4; k++) {
    const s = at + Math.round((0.03 + 0.025 * k + 0.01 * r()) * sr);
    const freq = 500 + 700 * r();
    let ph = 0;
    for (let i = 0; i < Math.round(0.03 * sr); i++) {
      const t = i / sr;
      ph += (freq * (1 + 1.5 * t / 0.03)) / sr;
      put(out, s + i, 0.18 * gain * Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.001) * Math.exp(-t / 0.008));
    }
  }
}

/** The red growl (the grab): three saws detuned ±14 cents at `freq` through a 900 Hz low-pass, trembling at 32 Hz, for `ms`. Dry. Mono. */
export function growl(out, at, sr, { freq = 110, ms = 80, gain = 0.1 } = {}) {
  const oscs = [-14, 0, 14].map((c, k) => ({ f: freq * 2 ** (c / 1200), o: new Osc(sr, k / 3) }));
  const f = new SVF(sr);
  const n = Math.round((ms / 1000) * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let x = 0;
    for (const { f: hz, o } of oscs) x += o.saw(hz);
    f.process(x / 3, 900, 1.2);
    const env = Math.min(1, t / 0.003) * Math.min(1, (n - i) / (0.01 * sr)) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 32 * t));
    put(out, at + i, gain * env * Math.tanh(2 * f.lp));
  }
}

/**
 * The guest's arm stretching as he hauls the hero down (the throw's wind-up, U2): a rubbery low tone — a saw gliding `from` → `to` Hz as
 * the pull's `tension(p)` (0 → 1 over the sound, p its share of `len`) rises, through a resonant low-pass opening with it, fluttering
 * 28 → 48 Hz — and a creak on it: stick-slip ticks (60 → 180 a second, jittered) ringing a narrow band 650 → 1050 Hz. It swells with the
 * tension and stops on its last sample (the swing takes over). Panned by `pan(p)`; into the stereo pair L, R from sample `at`.
 */
export function armStretch(L, R, at, len, sr, { from = 174.6, to = 261.6, gain = 0.1, creak = 1.5, tension = (p) => p, pan = () => 0, seed = 7000 } = {}) {
  const r = rng(seed);
  const saw = new Osc(sr);
  const lp = new SVF(sr);
  const bp = new SVF(sr);
  let next = 0;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const k = Math.max(0, Math.min(1, tension(p)));
    const hz = from * (to / from) ** k;
    lp.process(saw.saw(hz), hz * (2.5 + 4 * k), 2.5);
    ph += (28 + 20 * k) / sr;
    const flutter = 1 - 0.3 * (0.5 + 0.5 * Math.sin(2 * Math.PI * ph));
    let tick = 0;
    if (i >= next) {
      tick = 1;
      next = i + Math.max(1, Math.round(sr / ((60 + 120 * k) * (0.7 + 0.6 * r()))));
    }
    const ring = 650 + 400 * k;
    // Each tick rings the band at about full scale (an impulse into the band-pass rings at 2 tan(π f / sr) of its height).
    bp.process(tick / (2 * Math.tan((Math.PI * ring) / sr)), ring, 7);
    const env = Math.min(1, i / (0.008 * sr)) * (0.35 + 0.65 * k) * Math.min(1, (len - i) / (0.003 * sr));
    const v = gain * env * (Math.tanh(1.5 * lp.lp) * flutter + creak * bp.bp);
    const [gl, gr] = panGains(pan(p));
    put(L, at + i, v * gl);
    put(R, at + i, v * gr);
  }
}

/**
 * A whip round a loop (the throw's swing, U2): the air rushing past something swung round and let go — noise through a band-pass, a
 * whistle on it (the same air through a narrow band a fifth higher, `whistle` of it), driven by the swing's `speed(p)` (0 → 1, p the share
 * of `len`) and by its own rise into the release (`rise` of the drive is p): the band's centre climbs `from` → `to` Hz with the drive, the
 * level follows the speed and swells with p; cut on its last sample, where the hand lets go. Panned by `pan(p)` (the fist's x); into the
 * stereo pair L, R from sample `at`.
 */
export function whip(L, R, at, len, sr, { speed = (p) => p, pan = () => 0, from = 600, to = 4200, gain = 0.15, whistle = 0.35, rise = 0.5, seed = 7000 } = {}) {
  const r = rng(seed);
  const air = new SVF(sr);
  const tone = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const v = Math.max(0, Math.min(1, speed(p)));
    const fc = from * (to / from) ** ((1 - rise) * v + rise * p);
    const x = r() * 2 - 1;
    air.process(x, fc, 1.1);
    tone.process(x, 1.5 * fc, 7);
    const env = v * (1 - rise + rise * p) * Math.min(1, i / (0.002 * sr)) * Math.min(1, (len - i) / (0.002 * sr));
    const y = gain * env * (air.bp + whistle * tone.bp);
    const [gl, gr] = panGains(pan(p));
    put(L, at + i, y * gl);
    put(R, at + i, y * gr);
  }
}

/**
 * A whoosh that travels: band-passed noise sweeping `from` → `to` Hz over `len` samples (loudest at 70 %, as fx.mjs whoosh), panned from
 * `panFrom` to `panTo` as it goes (the plates sliding in from either side, the ribbon). Into the stereo pair L, R from sample `at`.
 */
export function travellingWhoosh(L, R, at, len, sr, { from = 800, to = 5000, gain = 0.1, q = 1.3, panFrom = -1, panTo = 0, seed = 7000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f.process(r() * 2 - 1, from * (to / from) ** p, q);
    const env = p < 0.7 ? (p / 0.7) ** 2 : ((1 - p) / 0.3) ** 1.5;
    const [gl, gr] = panGains(panFrom + (panTo - panFrom) * p);
    put(L, at + i, gain * env * f.bp * gl);
    put(R, at + i, gain * env * f.bp * gr);
  }
}

/**
 * A house piano chord stab (the club's groove with no chord held: the lit floor's tiles and the record's grooves step on it): every note
 * a struck string — `partials` partials, a little inharmonic (B), the high ones dying first (partial k rings `decay` / (1 + 0.6 (k − 1)) s)
 * — played three times: in tune in the centre and, a third as loud, ±`cents` off and panned ±`spread` (the organ-piano shimmer of a
 * house record, which never cancels the fundamental), a felt hammer's knock on the attack (a
 * band of noise round 1.8 kHz × `bright`, 4 ms), the damper down after `len` samples (gone over `releaseMs`). `bright` tilts the partials
 * (1: a house piano; < 1 duller). Centred on `pan`. Into the stereo pair L, R from sample `at`. Short by design: harmony on a decaying sound, never held.
 * `click` (0–1, default 0) adds a hard 2 ms tick above 3 kHz on the attack, so a stab reads as a hit (the club's beat-lock, plan v07 §4).
 */
export function housePiano(L, R, at, sr, { notes, len, gain = 0.1, bright = 1, cents = 6, spread = 0.35, pan = 0, decay = 0.5, releaseMs = 45, partials = 10, click = 0, seed = 7000 }) {
  const r = rng(seed);
  const B = 0.00025;
  const rel = Math.max(1, Math.round((releaseMs / 1000) * sr));
  const n = len + rel;
  const norm = gain / Math.sqrt(notes.length);
  const att = Math.max(1, Math.round(0.0015 * sr));
  for (const m of notes) {
    const f0 = midiHz(m);
    for (const side of [0, -1, 1]) {
      const f1 = f0 * 2 ** ((side * cents) / 1200);
      const [gl, gr] = panGains(pan + side * spread);
      const copy = side === 0 ? 1 : 0.35;
      for (let k = 1; k <= partials; k++) {
        const fk = k * f1 * Math.sqrt(1 + B * k * k);
        if (fk > 0.45 * sr) break;
        const amp = (copy * norm * 0.6 * bright ** (k - 1)) / k ** 0.85;
        const tau = decay / (1 + 0.6 * (k - 1));
        let ph = r();
        const dph = fk / sr;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const damper = i < len ? 1 : 1 - (i - len) / rel;
          const v = amp * Math.min(1, i / att) * Math.exp(-t / tau) * damper * Math.sin(2 * Math.PI * ph);
          ph += dph;
          put(L, at + i, v * gl);
          put(R, at + i, v * gr);
        }
      }
    }
  }
  // The hammer: a short knock of felt on the strings.
  const f = new SVF(sr);
  const knock = Math.round(0.03 * sr);
  for (let i = 0; i < knock; i++) {
    f.process(r() * 2 - 1, 1800 * bright, 1);
    const v = 0.35 * norm * Math.sqrt(notes.length) * f.bp * Math.exp(-i / (0.004 * sr));
    const [hl, hr] = panGains(pan);
    put(L, at + i, v * hl);
    put(R, at + i, v * hr);
  }
  // The click (continuity plan v07 §4: the stab must cut through as a hit, not texture): `click` of a hard 2 ms tick on the attack —
  // noise above 3 kHz falling to nothing — so the floor's syncopation is heard where the picture steps on it. 0 (the default) adds nothing.
  if (click > 0) {
    const hp = new SVF(sr);
    const m = Math.round(0.002 * sr);
    const [cl, cr] = panGains(pan);
    for (let i = 0; i < m + Math.round(0.001 * sr); i++) {
      hp.process(i < m ? r() * 2 - 1 : 0, 3200, 0.8);
      const v = click * 0.9 * norm * Math.sqrt(notes.length) * hp.hp * (i < m ? 1 - i / m : 1);
      put(L, at + i, v * cl);
      put(R, at + i, v * cr);
    }
  }
}

/**
 * A horn-section hit (the comic's brass: the BOOMs, SPLASH!, the throw, the BRRR): every note three saws — one in tune, two a third as
 * loud ±`cents` off (a section, never cancelling its fundamental) — lipped up into pitch from
 * `scoop` semitones under over the first 25 ms, through a low-pass that opens with the breath (brass is brighter the louder it plays:
 * cutoff ≈ the note × (2 + 14 × level × `bright`)), a breath of air on the attack, driven a little (tanh). The level: a blat — up over
 * `attackMs`, settling to `body` over `decayMs` — held for `len` samples, then gone over `releaseMs` while the pitch falls `fall`
 * semitones (a negative `fall` rips up: a doit). `swell` (0–1) instead rises from `swell` of full to full over `len` (a crescendo into a
 * cut: no attack peak, no release — the caller cuts it). Notes spread across ±`spread`. Into the stereo pair L, R from sample `at`.
 */
export function hornHit(L, R, at, sr, { notes, len, gain = 0.15, attackMs = 12, body = 0.45, decayMs = 45, releaseMs = 60, fall = 0, scoop = 0.6, cents = 7, bright = 1, spread = 0.5, swell = null, seed = 7000 }) {
  const r = rng(seed);
  const att = Math.max(1, Math.round((attackMs / 1000) * sr));
  const rel = swell === null ? Math.max(1, Math.round((releaseMs / 1000) * sr)) : 0;
  const n = len + rel;
  const norm = gain / Math.sqrt(notes.length);
  const level = (i) => {
    if (swell !== null) {
      const u = Math.min(1, i / len);
      return Math.min(1, i / att) * (swell + (1 - swell) * u * u);
    }
    if (i < att) return (i / att) ** 1.5;
    const s = body + (1 - body) * Math.exp(-(i - att) / ((decayMs / 1000) * sr));
    return i < len ? s : s * (1 - (i - len) / rel);
  };
  notes.forEach((m, k) => {
    const pan = notes.length === 1 ? 0 : spread * ((2 * k) / (notes.length - 1) - 1);
    const [gl, gr] = panGains(pan);
    const oscs = [new Osc(sr, r()), new Osc(sr, r()), new Osc(sr, r())];
    const lp = new SVF(sr);
    const air = new SVF(sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const lift = scoop * Math.max(0, 1 - t / 0.025) ** 2;
      const drop = i < len || rel <= 1 ? 0 : fall * ((i - len) / rel) ** 2;
      const hz = midiHz(m - lift - drop);
      const e = level(i);
      const x = (oscs[0].saw(hz) + 0.35 * (oscs[1].saw(hz * 2 ** (cents / 1200)) + oscs[2].saw(hz * 2 ** (-cents / 1200)))) / 1.7;
      lp.process(x, Math.min(0.4 * sr, hz * (2 + 14 * e * bright)), 0.9);
      air.process(r() * 2 - 1, 1500, 0.8);
      const breath = 0.25 * air.bp * Math.exp(-t / 0.015);
      const v = norm * e * (Math.tanh(1.6 * (lp.lp + breath)) / Math.tanh(1.6));
      put(L, at + i, v * gl);
      put(R, at + i, v * gr);
    }
  });
}
