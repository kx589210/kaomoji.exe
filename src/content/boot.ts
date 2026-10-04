// Text of the intro: the boot log, the progress bar and the command (spec §7
// S01–S03 and the boot-log gags of spec §15), the Defender's two log lines (threads
// A1), the RAIN bar's glyphs, faces and scan HUD (bars 1–14 design
// notes/b112/final.md §4.1, §6.3; build sheet notes/b114/sheet.md).
import { hash } from '../engine/random.ts';
import { partFrame } from '../score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { RAIN_FACES } from './castBuild.ts';
import { CAST, type TextItem } from './text.ts';

/** A run of characters [from, to) of a log line drawn in an ink of its own: `red` = DEFENDER red (linear('#E8402B', 1.7)), the antivirus's. */
export type LogInk = { readonly from: number; readonly to: number; readonly ink: 'red' };

export type LogLine = {
  text: string;
  kind: 'title' | 'dim' | 'ok' | 'warn';
  /** Character index from which the line is drawn in pink (a kaomoji). */
  accent?: number;
  /** Runs in an ink of their own; they win over `accent` and the kind's colours (src/shots/intro.ts lineInk reads them first). */
  inks?: readonly LogInk[];
};

const chars = (s: string): number => [...s].length;
const ok = (text: string, face?: string): LogLine => {
  const full = face ? `[ OK ] ${text} ${face}` : `[ OK ] ${text}`;
  return face ? { text: full, kind: 'ok', accent: chars(full) - chars(face) } : { text: full, kind: 'ok' };
};
const dim = (text: string): LogLine => ({ text, kind: 'dim' });

/**
 * The bars 1–14 additions to the approved intro that can each be switched off on its own (the story bible's 先保留、再加: keep what was
 * approved, add on top; build sheet notes/b114/sheet.md §0). Off, each one's shots draw exactly what v04 drew there (the identity
 * gates of the sheet's §9 render them off as well as on). The RAIN bar itself is the map (src/score/film.ts), not a flag: the fallback
 * is the 58-bar map, both new bars or neither.
 */
export type IntroThreads = {
  /** A1: the Defender's two log lines (53, 55) in place of two filler lines; off = v04's head. */
  readonly bootLines: boolean;
  /** The rain's walls 3–6 raining on as the highway's sky (intro 3, ≤ 45 % of the near rows). */
  readonly rainSky: boolean;
  /** The dome: the log plane bulges into a dome round the flight path on the highway (intro 3), flat again through the whip. */
  readonly dome: boolean;
  /** The tube kick on the lock (intro 5.3): curvature spike, fringing, bloom, heavier scanlines and grille, haze. */
  readonly tubeKick: boolean;
  /** The antivirus looks (intro 5.3&): the DEFENDER-red refresh band, the face cells it crosses flickering red. */
  readonly redBand: boolean;
  /**
   * The boot title's K inside the CRT glass (2026-10-03). S01 aims the log 34 further left on intro 1.3
   * (src/shots/intro.ts S01_MOVES_TITLE_SAFE), so 'KAOMOJI.EXE' reads whole on 50–72 (the approved aim cuts the K: 'AOMOJI.EXE').
   * Changes 48–96 only (48 and 96 through their motion-blur sub-frames, 96 ≤ 4 levels). ON since 2026-10-03 (spec
   * rev 11 §16 item 1); off = the earlier approved picture, byte for byte.
   */
  readonly titleSafe: boolean;
};
export const INTRO_THREADS: IntroThreads = { bootLines: true, rainSky: true, dome: true, tubeKick: true, redBand: true, titleSafe: true };

/** His signature: `• ω •` in UTF-8, hidden in every world (the story bible, 暗线 2; never decoded before the ending's hexdump). */
export const SIGNATURE = 'E2 80 A2 20 CF 89 20 E2 80 A2';
/** The guest — the antivirus — as the log names it. */
const DEFENDER_FACE = '(￣▽￣)';

export const BOOT_TITLE = 'KAOMOJI.EXE v1.0 (•ω•)';

/** A1: the antivirus loads (its face red, the boot's first red) … */
const DEFENDER: LogLine = (() => {
  const text = `[ OK ] defender loaded ${DEFENDER_FACE}`;
  return { text, kind: 'ok', inks: [{ from: chars(text) - chars(DEFENDER_FACE), to: chars(text), ink: 'red' }] };
})();
/** … and queues a scan of him (`[SCAN]` red: the antivirus's tag for the rest of the film). An `ok` line, so the head keeps its kinds. */
const SCAN: LogLine = { text: '[SCAN] kaomoji.exe ... queued', kind: 'ok', inks: [{ from: 0, to: chars('[SCAN]'), ink: 'red' }] };

const HEAD: readonly LogLine[] = [
  { text: BOOT_TITLE, kind: 'title', accent: chars('KAOMOJI.EXE v1.0 ') },
  dim('(c) 2026 kaomoji labs · all faces reserved'),
  dim('[    0.000000] boot: cpu0 online · clock 150 bpm'),
  dim('[    0.000413] mem: 1024 friends of ram'),
  dim('[    0.001337] gpu: angle · 16 samples per frame'),
  ok('mounting /dev/smile'),
  ok('started emote-daemon.service'),
  ok('started blink-scheduler.service'),
  ok('calibrating mouth ... ω'),
  ok('loading eyes ... • •'),
  DEFENDER,
  ok('loading 1024 friends'),
  ok('found cat', '(=^･ω･^=)'),
  ok('found bear', 'ʕ•ᴥ•ʔ'),
  SCAN,
  ok('reticulating kaomoji splines'),
  ok('negotiating with table', '┻━┻'),
  ok('checking tofu ... 0 missing glyphs'),
  ok('inflating memphis shapes ▲ ● ■'),
  ok('inking riso drums · pink · blue'),
  ok('drawing swiss grid · 12 columns'),
  ok('lighting led matrix 5x7'),
  ok('reached target party.target'),
  ok('spawning confetti pool (4096)'),
  ok('syncing hi-hats to 16th notes'),
  ok('arming sidechain'),
  { text: '[WARN] cuteness exceeds safe limits (；・∀・)', kind: 'warn' },
  ok('tuning kick drum to 150 bpm'),
];
/**
 * v04's head, as approved (INTRO_THREADS.bootLines off): the Defender's lines out, the two filler lines back where v04 had them
 * ('warming up glitter shaders ✧' after 'checking tofu', 'polishing brutalist shadows 6px' after 'lighting led matrix'). The same 28
 * lines and kinds, so logFrames, the burst and the scroll are the same either way.
 */
const V04_HEAD: readonly LogLine[] = (() => {
  const base = HEAD.filter((l) => l !== DEFENDER && l !== SCAN);
  const out = [...base];
  out.splice(out.findIndex((l) => l.text.includes('checking tofu')) + 1, 0, ok('warming up glitter shaders ✧'));
  out.splice(out.findIndex((l) => l.text.includes('lighting led matrix')) + 1, 0, ok('polishing brutalist shadows 6px'));
  return out;
})();
const ACTIVE_HEAD: readonly LogLine[] = INTRO_THREADS.bootLines ? HEAD : V04_HEAD;
/** Where the Defender's two lines sit in the log (burst lines: they print on 53 and 55, src/score/intro.ts DEFENDER_LOADED, SCAN_QUEUED); −1 with bootLines off. */
export const DEFENDER_LINE = ACTIVE_HEAD.indexOf(DEFENDER);
export const SCAN_LINE = ACTIVE_HEAD.indexOf(SCAN);

/**
 * The friends' faces: the film's cast, except the guest's table flip — the antivirus's own rage, °□° — which v04's log listed among the
 * friends online (the cast slip: friends 0338, 0604, 0690, 0735, 0780). A friend online is an infected kaomoji, and an infected face's
 * mouth becomes his ω (the story bible), so those rows show the flip infected: his ω in place of its □. The same glyphs in the same
 * cells, so the approved fling (S04), which flies every character on screen at the launch, keeps its count and its places.
 */
const GUEST_FLIP = '(╯°□°)╯︵ ┻━┻';
const GUEST_FLIP_INFECTED = '(╯°ω°)╯︵ ┻━┻';
const FACES = CAST.filter((f) => chars(f) > 2);
const friendFace = (i: number): string => {
  const face = FACES[Math.floor(hash(i, 77) * FACES.length)];
  return face === GUEST_FLIP ? GUEST_FLIP_INFECTED : face;
};
const FRIENDS: readonly LogLine[] = Array.from({ length: 32 }, (_, i) => {
  const n = Math.max(i + 1, Math.round(1024 * ((i + 1) / 32) ** 1.6));
  return ok(`friend ${String(n).padStart(4, '0')} online`, friendFace(i));
});

const TAIL: readonly LogLine[] = [ok('all friends accounted for (1024/1024)'), ok('boot complete in 0.15 s · have fun', '✧')];

/** The whole boot log in print order. */
export const LOG_LINES: readonly LogLine[] = [...ACTIVE_HEAD, ...FRIENDS, ...TAIL];

const PARTIAL = '▏▎▍▌▋▊▉';

/** The progress line after `step` of its 8 steps, e.g. 'loading friends [█▎        ]  13%'; step 8 ends with '100% ✧'. */
export function progressText(step: number): string {
  const s = Math.max(0, Math.min(8, step));
  const fill = (s / 8) * 10;
  const full = Math.floor(fill);
  const part = Math.round((fill - full) * 8);
  const bar = ('█'.repeat(full) + (part > 0 ? PARTIAL[part - 1] : '')).padEnd(10, ' ');
  return `loading friends [${bar}] ${String(Math.round((s / 8) * 100)).padStart(3, ' ')}%${s === 8 ? ' ✧' : ''}`;
}

/**
 * The film frame on which ticker line `i` appears: one per eighth note of intro bar 4 (typing) — TICKER_FRAMES of src/score/intro.ts,
 * computed here again because that file imports this one. Its log stamp is that frame's time in the film and the emote-daemon
 * counts that frame, so both are derived from it.
 */
const tickerFrame = (i: number): number => partFrame('intro', 4) + i * (FRAMES_PER_BEAT / 2);
/** The ticker printed for line frames `at(i)`: the stamp is that frame's time in the film, the emote-daemon counts that frame. */
const ticker = (at: (i: number) => number): LogLine[] => {
  const stamp = (i: number): string => `[${(at(i) / FPS).toFixed(6).padStart(12, ' ')}]`;
  const frameNo = (i: number): string => String(at(i)).padStart(4, '0');
  return [
    dim(`${stamp(0)} emote-daemon: frame ${frameNo(0)} ok`),
    dim(`${stamp(1)} blink-scheduler: next blink in 7 beats`),
    dim(`${stamp(2)} emote-daemon: frame ${frameNo(2)} ok`),
    dim(`${stamp(3)} gpu: 64 samples on the whip`),
    dim(`${stamp(4)} emote-daemon: frame ${frameNo(4)} ok`),
    dim(`${stamp(5)} party-planner: 1023 friends waiting`),
    dim(`${stamp(6)} emote-daemon: frame ${frameNo(6)} ok`),
    dim(`${stamp(7)} input: enter key armed`),
  ];
};

/** What the daemons print while the command is typed (intro bar 4), one line per eighth note: the film's real time (it moved +96 with the RAIN bar; the timeline text rule). */
export const TICKER: readonly LogLine[] = ticker(tickerFrame);

/**
 * Every string v04's intro drew, in v04's order: its log (v04's head, the guest's flip among the friends) and its ticker (stamped on
 * v04's frames, 96 earlier). The intro's atlas (src/shots/intro.ts INTRO_GLYPHS) takes its characters in first-appearance order from
 * these first and appends the new ones after them, so every glyph v04 drew keeps its atlas slot and draws to the bit (the identity
 * gates of build sheet §9).
 */
export const V04_INTRO_TEXTS: readonly string[] = [
  ...V04_HEAD.map((l) => l.text),
  ...Array.from({ length: 32 }, (_, i) => {
    const n = Math.max(i + 1, Math.round(1024 * ((i + 1) / 32) ** 1.6));
    return `[ OK ] friend ${String(n).padStart(4, '0')} online ${FACES[Math.floor(hash(i, 77) * FACES.length)]}`;
  }),
  ...TAIL.map((l) => l.text),
  ...ticker((i) => tickerFrame(i) - FRAMES_PER_BEAT * 4).map((l) => l.text),
];

export const PROMPT = '> ';
export const COMMAND = 'kaomoji --run --party';
export const CURSOR = '█';
/** Characters a glyph flickers through while it flies (the decode look). */
export const DECODE = '!#$%&*+-/0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_{|}~ω•･°∀ツ';

// ——— intro 2, the RAIN bar ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** What the rain's trails are made of: kaomoji parts only (never the mirrored half-width katakana of the homage). */
export const RAIN_GLYPHS = '()•ω･°∀ツ▽＾≧≦◕´`ᴥʕʔ┻━✧';
/** The two columns either side of the signature column leave out • ω ･, so nothing next to the bytes hints at their decode. */
export const RAIN_FLANK_GLYPHS = [...RAIN_GLYPHS].filter((c) => !'•ω･'.includes(c)).join('');
/** The 8 face columns (src/content/castBuild.ts): one face each, rotated 90° CW, in the log's pink. */
export { RAIN_FACES };
/** The signature column's bytes, top-down, one per sixteenth (src/score/intro.ts SIG_RAIN): amber × 1.2, never flickers, never tagged. */
export const SIG_BYTES: readonly string[] = SIGNATURE.split(' ');
/** The scan HUD (readout slot, JetBrains Mono 19 px over #06091C at 62 %): `[SCAN]` and ✓ red, the rest bone-green. */
export const RAIN_HUD = {
  /** Types over 144–149. */
  tag: '[SCAN] kaomoji.exe',
  /** One ▓ per 32nd, 144 … 165. */
  cell: '▓',
  cells: 8,
  /** Appends on 168 (a beat late): the film's first `0 threats ✓`. */
  verdict: ' · 0 threats ✓',
} as const;
/** The HUD's full line once the verdict is in (168–190). */
export const RAIN_HUD_DONE = `${RAIN_HUD.tag} ${RAIN_HUD.cell.repeat(RAIN_HUD.cells)}${RAIN_HUD.verdict}`;

/**
 * The readout slot: where the antivirus's readouts print, bottom-left, in every world that shows one (the RAIN bar's scan HUD, the
 * SCAN bar's POV readout; the POV signature of src/content/build.ts DEFENDER_POV). Screen px at 1080p, origin the frame centre, y up;
 * text left-aligned from x, centred on y.
 */
export const READOUT_SLOT = { x: -914, y: -470, font: 'JetBrains Mono', px: 19, ground: '#06091C', groundAlpha: 0.62 } as const;

/**
 * The RAIN bar's world (bars 1–14 design §4.1; build sheet §3.2), world units (= logical px on the log's plane, z up out of the page):
 * six walls of falling kaomoji standing on the page plane beyond its far edge, in x–z planes, facing the camera. `x` is a half-width
 * round the highway's column (src/shots/intro.ts HIGHWAY_X); `cols` the column pitch (wall 1, the rest); `px` the glyph sizes.
 */
export const RAIN_WORLD = {
  walls: [1300, 1700, 2100, 2500, 2900, 3400],
  x: 3200,
  z: [0, 2600],
  cols: [72, 64],
  px: [56, 64],
  /** Speed classes, hashed per column: [cells, frames] — a cell every 3 frames, a cell every 6, two cells every 3 (all on the 32nd grid). */
  speeds: [
    [1, 3],
    [1, 6],
    [2, 3],
  ],
  /** Trail lengths (cells); a trail glyph re-rolls on 1 in `flicker` of the 32nds. */
  trail: [8, 20],
  flicker: 6,
  /** New heads per wall on each beat wave (src/score/intro.ts RAIN_WAVES). */
  waveHeads: 8,
  /** The face columns stand on walls 1–2 at the slow class (1 cell / 6 f), in the log's pink, each glyph rotated 90° CW. */
  faceWalls: [1, 2],
  /** The signature column: wall 2, the right third of the frame (screen x +240 ± 40 over 108–167), cells ≈ 55 px on screen. */
  sig: { wall: 2, screenX: 240, cellPx: 55, amber: 1.2 },
} as const;
/** The rain's inks: white-hot heads, green trails fading down the trail, its own fog [near, far, amount]; in bar 3 (the sky) capped against the near log rows' luminance. */
export const RAIN_INK = { head: '#D8F5E1', headGain: 1.6, trail: '#4CF08C', trailAlpha: [0.6, 0.05], fog: [1800, 7000, 1], skyHead: 0.45, skyTrail: 0.2 } as const;
/** The scan plane: a horizontal red plane sweeping z 2600 → 0 (src/score/intro.ts SCAN_RAIN); a 4 px line + 40 px glow where it cuts a wall; glyphs within ±40 world units tag red for 3 frames (never the amber column); the page's red sheen 3 frames. */
export const SCAN_PLANE = { z: [2600, 0], line: 4, glow: 40, reach: 40, tagFrames: 3, sheenFrames: 3 } as const;
/**
 * The RAIN bar's camera (design §3.2, §4.1): held at S01's 95 position, it tilts up (pitch −90° → 0°, 75 % by 99, τ 3, bounce 0.3,
 * FOV 20 → 42 over 96–108), dollies +y 9 px a frame with a yaw drift of 0.5° a beat, surges ×1.6 on intro 2.2 (decay τ 10), then
 * cranes down (ease in) to the highway's pose on intro 3.1 — within 0.5 px / 0.05° of highway(192) and its velocity ± 10 % — height
 * 1178 → 110, pitch 0 → −8°, FOV 42 → 55, the CRT's curvature 0.045 → 0.2 (HIGHWAY_CURVATURE).
 */
export const RAIN_CAMERA = {
  from: [-560, 190, 1178],
  pitch: [-90, 0, -8],
  fov: [20, 42, 55],
  tilt: { tau: 3, bounce: 0.3, at75: 3 },
  dolly: 9,
  yawPerBeat: 0.5,
  surge: { gain: 1.6, tau: 10 },
  craneHeight: 110,
  curvature: [0.045, 0.2],
  /** S01's wind-up into the tilt (反向预备): the camera tips 2° over 90–95. */
  windup: 2,
} as const;
/** The dome (intro 3): every log glyph z += amp · b(f) · exp(−((x − cx)² + (y − cy)²) / sigma²), (cx, cy) = (camera x, camera y + ahead); amp falls back to 90 if it occludes the progress bar on 230. */
export const DOME = { amp: 140, fallbackAmp: 90, sigma: 900, ahead: 700 } as const;
/**
 * The tube kick from the lock (intro 5.3) through the hold, back with the CRT's fade on the push (468–478): [before, on
 * the lock, held]. Curvature springs (τ 4, bounce 0.6), fringing settles (τ 6), the bloom kick decays (τ 10), scanlines and grille ramp
 * in over 432–438.
 */
export const TUBE = {
  curvature: [0.045, 0.12, 0.065],
  aberration: [0.0011, 0.0041, 0.0018],
  bloom: 0.5,
  scanlines: [0.3, 0.45],
  grille: [0.12, 0.2],
  haze: 1.6,
  tau: { curvature: 4, aberration: 6, bloom: 10 },
  bounce: 0.6,
} as const;
/** The antivirus looks (intro 5.3&): a DEFENDER-red band, 60 px, 35 % additive, top → bottom over 444–456; face cells within ±30 px mix 0.7 toward red for 2 frames. */
export const LOOK_BAND = { color: '#E8402B', terminalGain: 1.7, px: 60, alpha: 0.35, mix: 0.7, reach: 30, frames: 2 } as const;

/** Every string the intro draws, for check-glyphs. */
export const INTRO_TEXTS: readonly TextItem[] = [
  ...LOG_LINES.map((l) => ({ role: 'mono' as const, text: l.text, where: 'boot log' })),
  ...TICKER.map((l) => ({ role: 'mono' as const, text: l.text, where: 'daemon ticker' })),
  ...Array.from({ length: 9 }, (_, s) => ({ role: 'mono' as const, text: progressText(s), where: 'progress bar' })),
  { role: 'mono', text: PROMPT + COMMAND + CURSOR, where: 'command line' },
  { role: 'mono', text: DECODE, where: 'decode flicker' },
  { role: 'mono', text: RAIN_GLYPHS, where: 'rain trails' },
  ...RAIN_FACES.map((text) => ({ role: 'mono' as const, text, where: 'rain faces' })),
  { role: 'mono', text: SIGNATURE, where: 'rain signature column' },
  { role: 'mono', text: RAIN_HUD_DONE, where: 'rain scan HUD' },
];
