import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMMAND, DEFENDER_LINE, DOME, INTRO_THREADS, LOG_LINES, LOOK_BAND, RAIN_FACES, RAIN_FLANK_GLYPHS, RAIN_GLYPHS, RAIN_HUD, RAIN_HUD_DONE, RAIN_WORLD, READOUT_SLOT, SCAN_LINE, SIGNATURE, SIG_BYTES, TICKER, TUBE, V04_INTRO_TEXTS, progressText } from '../src/content/boot.ts';
import { SWISS } from '../src/worlds/swiss.ts';
import { lineWidth } from '../src/engine/textGrid.ts';
import * as I from '../src/score/intro.ts';
import { BLINK, ENTER_FRAME, FLING, INTRO_END, LAUNCH, LOCK, LOG_START, MORPH, PROGRESS_STEPS, PUSH, SLAM, TICKER_FRAMES, WHIP, logFrames, typeFrames } from '../src/score/intro.ts';
import { partBars, partEnd, partFrame } from '../src/score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../src/score/tempo.ts';
import { TERM, cellCenter } from '../src/worlds/terminal.ts';

/** The intro's bar `bar` (1-based), plus `beat` beats (0-based). */
const intro = (bar: number, beat = 0): number => partFrame('intro', bar, beat);

test('the boot log carries every boot-log gag of spec §15 and fits the terminal', () => {
  const texts = LOG_LINES.map((l) => l.text);
  assert.equal(texts[0], 'KAOMOJI.EXE v1.0 (•ω•)');
  for (const gag of ['[ OK ] mounting /dev/smile', '[ OK ] calibrating mouth ... ω', '[ OK ] loading 1024 friends', '[WARN] cuteness exceeds safe limits (；・∀・)', '[ OK ] tuning kick drum to 150 bpm']) {
    assert.ok(texts.includes(gag), gag);
  }
  for (const t of texts) assert.ok(lineWidth(t) <= TERM.cols, `fits: ${t}`);
});

test('A1: the antivirus loads and queues a scan in the burst — lines 10 and 14, printing on 53 and 55 — in DEFENDER red, and the head keeps its 28 lines and kinds', () => {
  assert.equal(LOG_LINES[DEFENDER_LINE].text, '[ OK ] defender loaded (￣▽￣)');
  assert.equal(LOG_LINES[SCAN_LINE].text, '[SCAN] kaomoji.exe ... queued');
  assert.deepEqual([DEFENDER_LINE, SCAN_LINE, I.DEFENDER_LOADED, I.SCAN_QUEUED], [10, 14, 53, 55]);
  const red = (i: number) => (LOG_LINES[i].inks ?? []).flatMap((r) => [...LOG_LINES[i].text].slice(r.from, r.to)).join('');
  assert.equal(red(DEFENDER_LINE), '(￣▽￣)', 'its face red');
  assert.equal(red(SCAN_LINE), '[SCAN]', 'its tag red');
  assert.equal(LOG_LINES[DEFENDER_LINE].accent, undefined, 'not pink: the face is the antivirus, nobody’s friend');
  // The two dropped filler lines make room: the warning is still line 26 and lands on 1.4, the burst and the scroll unchanged.
  assert.ok(!LOG_LINES.some((l) => /glitter shaders|brutalist shadows/.test(l.text)));
  assert.equal(LOG_LINES.findIndex((l) => l.kind === 'warn'), 26);
  assert.equal(logFrames[26], intro(1, 3));
  assert.deepEqual(LOG_LINES.slice(0, 28).map((l) => l.kind), ['title', 'dim', 'dim', 'dim', 'dim', ...Array(21).fill('ok'), 'warn', 'ok']);
  // Red is only ever the antivirus: no other log line carries an ink run; the guest's face appears only on its own line.
  assert.deepEqual(LOG_LINES.map((l, i) => (l.inks ? i : -1)).filter((i) => i >= 0), [DEFENDER_LINE, SCAN_LINE]);
  assert.deepEqual(LOG_LINES.map((l, i) => (l.text.includes('￣▽￣') ? i : -1)).filter((i) => i >= 0), [DEFENDER_LINE]);
});

test('the friends online are infected friends, never the guest: his table flip (°□°) is nowhere in the log (the cast slip); its rows show the flip infected, his ω for its □, glyph for glyph in the same cells', () => {
  for (const l of [...LOG_LINES, ...TICKER]) assert.ok(!/°□°/.test(l.text), l.text);
  const friends = LOG_LINES.filter((l) => /^\[ OK \] friend \d{4} online /.test(l.text));
  assert.equal(friends.length, 32);
  const infected = friends.filter((l) => l.text.endsWith('(╯°ω°)╯︵ ┻━┻'));
  assert.deepEqual(infected.map((l) => l.text.slice(14, 18)), ['0338', '0604', '0690', '0735', '0780'], 'v04’s five slip rows');
  assert.equal(lineWidth('(╯°ω°)╯︵ ┻━┻'), lineWidth('(╯°□°)╯︵ ┻━┻'), 'the same cells: the fling’s sources keep their places');
});

test('the grid spans the frame inside its margins', () => {
  assert.deepEqual(cellCenter(0, 0), [84 + 6.6 - 960, 540 - 60 - 15]);
  const [x, y] = cellCenter(TERM.cols - 1, TERM.rows - 1);
  assert.ok(x < 960 - 100 && y > -540 + 60);
});

test('the log’s clock: the film frame in intro 1, held on 95 through the RAIN bar, then v04’s frames from intro 3.1 (192 → 96)', () => {
  assert.deepEqual([0, 47, 94, 95, 95.5, 96, 150, 191, 191.75, 192, 200, 479].map(I.logClock), [0, 47, 94, 95, 95, 95, 95, 95, 95, 96, 104, 383]);
  for (let f = -2; f < INTRO_END; f += 0.25) assert.ok(I.logClock(f + 0.25) >= I.logClock(f), `never runs back at ${f}`);
  for (const c of [0, 48, 95, 96, 177, 300]) assert.equal(I.logClock(I.logToFilm(c)), c, `${c} round-trips`);
});

test('log lines start on intro 1.3, burst, then stream on the log’s clock until the progress bar completes; none print in the RAIN bar', () => {
  assert.equal(logFrames.length, LOG_LINES.length);
  assert.equal(logFrames[0], LOG_START);
  assert.ok(logFrames.every((f, i) => i === 0 || f >= logFrames[i - 1]));
  const warn = LOG_LINES.findIndex((l) => l.kind === 'warn');
  assert.equal(logFrames[warn] % FRAMES_PER_BEAT, 0, 'the warning lands on a beat');
  assert.deepEqual(I.LOG_TICKS, logFrames.map(I.logToFilm));
  assert.ok(I.LOG_TICKS.every((f) => f < I.RAIN.from || f >= I.RAIN.to), 'no log tick 96–191');
  assert.ok(I.LOG_TICKS.at(-1)! < PROGRESS_STEPS.at(-1)!);
  assert.ok(I.LOG_TICKS.some((f) => f >= I.HIGHWAY_START), 'the friend rows resume on the highway');
});

test('the RAIN bar (intro 2): the tilt, the signature column complete on 162 (0x00A2), the scan 144–156, the HUD on the 32nds, `0 threats ✓` a beat late on 168, the crane landing on intro 3.1', () => {
  assert.deepEqual({ ...I.RAIN }, { from: 96, to: 192 });
  assert.deepEqual({ ...I.TILT }, { from: 96, to: 108 });
  assert.deepEqual([...I.SIG_RAIN], [108, 114, 120, 126, 132, 138, 144, 150, 156, 162]);
  assert.equal(I.SIG_RAIN.length, SIG_BYTES.length);
  assert.equal(SIG_BYTES.join(' '), SIGNATURE);
  assert.equal(SIGNATURE, [...new TextEncoder().encode('• ω •')].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '), 'the bytes are • ω • in UTF-8');
  assert.deepEqual({ ...I.SCAN_RAIN }, { from: 144, to: 156 });
  assert.deepEqual([...I.SCAN_HUD_CELLS], [144, 147, 150, 153, 156, 159, 162, 165]);
  assert.equal(I.SCAN_HUD_CELLS.length, RAIN_HUD.cells);
  assert.deepEqual({ ...I.SCAN_SHEEN }, { from: 156, to: 159 });
  assert.equal(I.ZERO_RAIN, 168);
  assert.deepEqual({ ...I.CRANE }, { from: 168, to: 192 });
  assert.deepEqual({ ...I.RAIN_HUD_FADE }, { from: 180, to: 190 });
  assert.deepEqual([...I.RAIN_FACE_SPAWNS], [108, 120, 132, 144]);
  assert.deepEqual([...I.RAIN_WAVES], [120, 144]);
  assert.deepEqual([I.DRIPS[0], I.DRIPS.at(-1), I.DRIPS.length], [96, 186, 16]);
  assert.deepEqual({ ...I.WINDUP }, { from: 90, to: 96 });
  assert.deepEqual({ ...I.PRINT_HEAD }, { from: 48, to: 51 });
  assert.equal(RAIN_HUD_DONE, '[SCAN] kaomoji.exe ▓▓▓▓▓▓▓▓ · 0 threats ✓');
  assert.equal(RAIN_FACES.length, 8, 'eight face columns, one face each');
  assert.equal(new Set(RAIN_FACES).size, 8);
  for (const c of '•ω･') assert.ok(RAIN_GLYPHS.includes(c) && !RAIN_FLANK_GLYPHS.includes(c), `${c}: never beside the bytes`);
  assert.ok(![...RAIN_GLYPHS].some((c) => /[ｦ-ﾝ]/.test(c)), 'no half-width katakana: kaomoji parts only');
});

test('the progress bar fills on the eighth notes of intro bar 3 (the highway), the dome rising on its downbeat and falling with the whip', () => {
  assert.equal(I.HIGHWAY_START, intro(3));
  assert.equal(I.CUT_S02, I.HIGHWAY_START, 'the old name, kept for the shots until the intro builder renames it');
  assert.deepEqual(PROGRESS_STEPS, [intro(3), intro(3, 0.5), intro(3, 1), intro(3, 1.5), intro(3, 2), intro(3, 2.5), intro(3, 3), intro(3, 3.5)]);
  assert.equal(progressText(8), 'loading friends [██████████] 100% ✧');
  assert.equal(progressText(1), 'loading friends [█▎        ]  13%');
  assert.equal(progressText(0), 'loading friends [          ]   0%');
  assert.equal(WHIP.to, intro(4));
  assert.deepEqual({ ...I.DOME_RISE }, { from: 192, to: 200 });
  assert.deepEqual({ ...I.DOME_FALL }, { from: 276, to: 288 });
  assert.deepEqual({ ...I.RAIN_SKY_OUT }, { from: 276, to: 282 });
});

test('each word of the command is a burst of 32nd notes on a beat of intro bar 4; Enter is its last eighth', () => {
  assert.equal(typeFrames.length, [...COMMAND].length);
  assert.deepEqual([typeFrames[0], typeFrames[7], typeFrames[13]], [intro(4), intro(4, 1), intro(4, 2)]);
  assert.ok(typeFrames.every((f) => f % 3 === 0 && f < ENTER_FRAME));
  assert.equal(ENTER_FRAME, intro(4, 3.5));
});

test('intro bar 5: launch, burst, slam onto the lock (the tube kick), the red band (the antivirus looks), blink, and the push into the eye on the last eighth', () => {
  assert.deepEqual([LAUNCH, FLING.to, SLAM.from, LOCK, BLINK.close, PUSH.from, PUSH.to], [intro(5), intro(5, 0.5), intro(5, 1.5), intro(5, 2), intro(5, 3), intro(5, 3.5), partEnd('intro')]);
  assert.equal(INTRO_END, partEnd('intro'));
  assert.equal(I.TUBE_KICK, LOCK);
  assert.deepEqual([I.LOOK, I.RED_BAND.from, I.RED_BAND.to], [444, 444, 456]);
  assert.deepEqual({ ...I.WHITE_BAND_OFF }, { from: 432, to: 468 });
  assert.ok(MORPH.from >= BLINK.open && MORPH.to < PUSH.to);
  assert.deepEqual({ ...WHIP }, { from: intro(3, 3.5), to: intro(4) });
  assert.deepEqual([...TICKER_FRAMES], Array.from({ length: 8 }, (_, i) => intro(4, i / 2)));
});

test('v04’s intro bars 2–4 are intro bars 3–5, every event 96 frames later; intro bar 1 is unchanged', () => {
  assert.deepEqual([LOG_START, I.CURSOR_BLINKS[0][0], I.CURSOR_BLINKS[1][1]], [48, 0, 42]);
  assert.deepEqual([PROGRESS_STEPS[0], WHIP.from, typeFrames[0], ENTER_FRAME, LAUNCH, LOCK, BLINK.close, MORPH.from, PUSH.from, PUSH.to], [96, 180, 192, 276, 288, 336, 360, 366, 372, 384].map((f) => f + 96));
});

test('the daemons stamp each ticker line with the film time and the frame it appears on', () => {
  assert.equal(TICKER.length, TICKER_FRAMES.length);
  TICKER.forEach((line, i) => assert.ok(line.text.startsWith(`[${(TICKER_FRAMES[i] / FPS).toFixed(6).padStart(12, ' ')}] `), line.text));
  for (const i of [0, 2, 4, 6]) assert.ok(TICKER[i].text.endsWith(`emote-daemon: frame ${String(TICKER_FRAMES[i]).padStart(4, '0')} ok`), TICKER[i].text);
});

test('the harmony and the sub: a chord a bar (IV Vsus V iii vi, no tonic), a sub pulse on the downbeats of intro 2–5', () => {
  assert.equal(I.INTRO_CHORDS.length, partBars('intro').length);
  assert.ok(!(I.INTRO_CHORDS as readonly string[]).includes('I'));
  assert.deepEqual(I.SUB_PULSES.map((p) => [p.at, p.midi]), [[96, 36], [192, 36], [288, 33], [384, 38]]);
});

test('every intro event lies inside the intro', () => {
  const lists = [I.SIG_RAIN, I.RAIN_FACE_SPAWNS, I.RAIN_WAVES, I.DRIPS, I.SCAN_HUD_CELLS, I.LOG_TICKS, PROGRESS_STEPS, typeFrames, TICKER_FRAMES];
  const windows = [I.RAIN, I.TILT, I.SCAN_RAIN, I.SCAN_HUD_TYPE, I.SCAN_SHEEN, I.RAIN_HUD_FADE, I.CRANE, I.DOME_RISE, I.DOME_FALL, I.RAIN_SKY_OUT, WHIP, FLING, SLAM, I.RED_BAND, I.WHITE_BAND_OFF, PUSH, I.RISE, MORPH, I.PRINT_HEAD, I.WINDUP];
  for (const f of [...lists.flat(), ...windows.flatMap((w) => [w.from, w.to]), ENTER_FRAME, LAUNCH, LOCK, I.LOOK, I.ZERO_RAIN]) assert.ok(f >= 0 && f <= INTRO_END, `${f}`);
});

test('the builders’ hooks: the rain landing and the near walls out, the dense windows, the music’s marks, the Defender’s beeps, the tube kick’s ramp and its fade into T1', () => {
  assert.deepEqual({ ...I.RAIN_LAND }, { from: 168, to: 186 });
  assert.deepEqual({ ...I.RAIN_NEAR_OUT }, { from: 176, to: 192 });
  assert.deepEqual(I.RAIN_DENSE.map((w) => [...w]), [[95, 110], [166, 192]]);
  assert.deepEqual([I.TILT_PEAK, I.SIG_BELL, I.CRANE_PEAK], [98, 162, 190]);
  assert.equal(I.SIG_BELL, I.SIG_RAIN.at(-1), 'the bell on the signature’s last byte (0x00A2)');
  assert.deepEqual([...I.DEFENDER_BEEPS], [53, 168]);
  assert.deepEqual({ ...I.TUBE_RAMP }, { from: 432, to: 438 });
  assert.deepEqual({ ...I.TUBE_FADE }, { from: 468, to: 478 });
});

test('the design data and the flags: every intro addition switches off on its own, back to v04 (the head’s 28 lines and kinds either way); v04’s strings for the atlas order', () => {
  assert.deepEqual(INTRO_THREADS, { bootLines: true, rainSky: true, dome: true, tubeKick: true, redBand: true, titleSafe: true });
  assert.equal(V04_INTRO_TEXTS.length, 28 + 32 + 2 + 8, 'v04’s log and ticker');
  assert.ok(V04_INTRO_TEXTS.some((t) => t.includes('warming up glitter shaders')) && V04_INTRO_TEXTS.some((t) => t.includes('polishing brutalist shadows')));
  assert.equal(V04_INTRO_TEXTS.filter((t) => t.endsWith('(╯°□°)╯︵ ┻━┻')).length, 5, 'v04’s friends, slip and all: their glyphs keep their atlas slots');
  assert.ok(V04_INTRO_TEXTS.at(-8)!.startsWith(`[${(TICKER_FRAMES[0] - 96) / FPS}`.replace(/^\[/, '[    ').slice(0, 6)), 'v04’s ticker, stamped on v04’s frames');
  assert.equal(LOOK_BAND.color, SWISS.red, 'the band is DEFENDER red');
  assert.deepEqual([READOUT_SLOT.x, READOUT_SLOT.y, READOUT_SLOT.px], [-914, -470, 19]);
  assert.equal(RAIN_WORLD.walls.length, 6);
  assert.ok(RAIN_WORLD.walls.every((y, i) => i === 0 || y > RAIN_WORLD.walls[i - 1]));
  assert.deepEqual([...TUBE.curvature], [0.045, 0.12, 0.065]);
  assert.ok(DOME.amp > DOME.fallbackAmp);
});
