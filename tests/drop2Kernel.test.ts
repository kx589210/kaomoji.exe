// S31K KERNEL, drop2 8 (src/shots/drop2Kernel.ts; build sheet notes/bid2/drop2-sheet2.md §3 "drop2 8", §5 #9–#10, §6.3; the act-1
// fixer's round 1, R1 / R1-T01): read back like a viewer — where he lands, what falls when, what the scan and the hang do, and the two
// contracts the switch's hard cut is matched on (the install bar is the hairline; the cracked ring is v2.0's reticle).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DROP2_TEXTS } from '../src/content/drop2.ts';
import { CORE_CRACK, DOMINOES_L, DOMINOES_R, HANG, INSTALL, INSTALL_STEPS, KERNEL, KERNEL_DOLLY, KERNEL_SCAN, PAN, SWITCH } from '../src/score/drop2.ts';
import { HANDOFFS, drop2Segment } from '../src/shots/drop2Shared.ts';
import * as K from '../src/shots/drop2Kernel.ts';
import { hairlineAt } from '../src/shots/drop2Monitor.ts';
import { KERNEL_ADVANCE, KERNEL_LANDING, wrapAt } from '../src/shots/drop2Overflow.ts';
import { reticleAt } from '../src/shots/drop2Switch.ts';
import { FACE_ADVANCE, FACE_CHAR_ADVANCE, FACE_PARTS } from '../src/shots/drop2SwitchType.ts';

const T0 = KERNEL.from;
const LAST = SWITCH.from - 1;
const adv = { mono: () => 0.6, jp: () => 4, rounded: (ch: string) => FACE_CHAR_ADVANCE[ch] ?? 0.5 };
const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

test('the part runs drop2 8.1 → 9.1 − 1, its frames from the score: the dominoes land on the clacks (left on the 16ths, right a 32nd later), the scan on 8.2, the crack on 8.3a, the hang on 8.4, the install on 8.4&', () => {
  assert.equal(K.KERNEL_LAST, LAST);
  assert.equal(SWITCH.from - KERNEL.from, 96);
  assert.equal(K.PILLARS.length, 16);
  assert.deepEqual(K.PILLARS.filter((p) => p.side < 0).map((p) => p.land), DOMINOES_L);
  assert.deepEqual(K.PILLARS.filter((p) => p.side > 0).map((p) => p.land), DOMINOES_R);
  for (const f of [...DOMINOES_L, ...DOMINOES_R, KERNEL_SCAN, CORE_CRACK, HANG.from, INSTALL.from, ...INSTALL_STEPS]) assert.equal((f - T0) % 3, 0, `${f} on the 32nd grid`);
  // The pillars' names: Defender's processes, left and right; trust() and main() are the last pair, at the core.
  assert.deepEqual([K.PILLARS[14].label, K.PILLARS[15].label], ['trust()', 'main()']);
});

test('the dominoes: each pillar stands until the one before it strikes it (a 16th earlier), falls toward the core accelerating, lands flat on its clack and bursts into 40 fragments; its ║ turn to ω from the base up as it falls', () => {
  for (const [n, p] of K.PILLARS.entries()) {
    assert.equal(p.land - p.start, K.FALL);
    assert.equal(K.fallAt(p, p.start), 0);
    assert.ok(Math.abs(K.fallAt(p, p.land) - Math.PI / 2) < 1e-9, `${p.label}: flat on its clack`);
    let last = 0;
    let lastStep = 0;
    for (let f = p.start; f <= p.land; f += 0.5) {
      const a = K.fallAt(p, f);
      assert.ok(a >= last, 'it never rises');
      assert.ok(a - last >= lastStep - 1e-9, 'it accelerates');
      lastStep = a - last;
      last = a;
    }
    if (n >= 2) assert.equal(p.start, K.PILLARS[n - 2].start + (DOMINOES_L[1] - DOMINOES_L[0]), `${p.label}: struck a 16th after the one before it`);
    // The infection climbs: the base row first, the capital last, all ω before it lands.
    assert.ok(K.flipAt(p, 0, p.start + 4) === 1 && K.flipAt(p, 11, p.start + 4) === 0);
    assert.equal(K.flipAt(p, 11, p.land), 1);
    assert.equal(K.FRAGMENTS[n].length, 40);
    assert.equal(K.fragmentAt(p, K.FRAGMENTS[n][0], p.land - 1), null);
    assert.ok(K.fragmentAt(p, K.FRAGMENTS[n][0], p.land + 4)!.y > K.NAVE.floor + 40, 'thrown up');
  }
});

test('the whip lands him where the overflow flung him: (960, 640), its 628 px (600 of ink), squashed 1.08 / 0.92, upright; by the dolly’s landing he is the switch’s 600 px at (960, 540)', () => {
  const w = wrapAt(T0);
  const h = K.kernelHeroAt(T0);
  assert.deepEqual([w.x, w.y].map((v) => Math.round(v)), [KERNEL_LANDING.x, KERNEL_LANDING.y], 'the overflow’s contract lands him there');
  assert.deepEqual(h.centre, [KERNEL_LANDING.x, KERNEL_LANDING.y]);
  assert.ok(Math.abs(h.width - KERNEL_ADVANCE) < 1e-9);
  assert.ok(Math.abs(h.sx - 1.08) < 1e-9 && Math.abs(h.sy - 0.92) < 1e-9, 'the landing squash');
  assert.ok(Math.abs(h.rot) < 1e-9, 'upright on the landing');
  assert.ok(Math.abs(K.kernelHeroAt(T0 + 2).rot) < 0.12, 'the fling’s spin rings out small');
  const d = K.kernelHeroAt(KERNEL_DOLLY.to);
  assert.deepEqual(d.centre, [960, 540]);
  assert.equal(d.width, 600);
  const pose = HANDOFFS.find((x) => x.frame === KERNEL_DOLLY.to)!;
  assert.deepEqual(pose.centre, d.centre);
  // He is the subject the whole bar: never under 420 px, never off his column by more than a sway.
  for (const f of range(T0, SWITCH.from, 0.5)) {
    const k = K.kernelHeroAt(f);
    assert.ok(k.width >= 590, `${f}: ${k.width}`);
    assert.ok(Math.abs(k.centre[0] - 960) <= 20 && k.centre[1] >= 530 && k.centre[1] <= 652, `${f}: ${k.centre}`);
  }
});

test('the dolly: still on the whip’s landing, 60 u/f by the first clack, ≤ 90 at its peak, landing on 8.3 (the ring Ø ≈ 900 round him), then a 1 %-a-beat creep through the hang and the install (a living hold)', () => {
  const v = (f: number) => K.camZ(f - 0.5) - K.camZ(f + 0.5);
  assert.ok(v(T0 + 0.5) < 6, 'it launches from rest');
  assert.ok(Math.abs(v(DOMINOES_L[0]) - 60) < 1.5);
  for (const f of range(T0, SWITCH.from)) {
    assert.ok(v(f) >= 0.5 && v(f) <= 90.5, `${f}: ${v(f)} u/f, always moving`);
  }
  // The scan's fire lights the nave on its clap.
  assert.ok(K.kernelLook(KERNEL_SCAN).exposure > K.kernelLook(KERNEL_SCAN - 1).exposure * 1.2, 'the core’s light on 8.2');
  assert.ok(v(KERNEL_DOLLY.to + 1) <= 1.05, 'landed: the creep');
  const r = K.kernelRingAt(KERNEL_DOLLY.to).r;
  assert.ok(r > 430 && r < 450, `the ring on the landing: Ø ${2 * r}`);
  // The ring stays on his centre (the floor's tremor under the last landings shakes it by a few px).
  for (const f of range(KERNEL_DOLLY.to, SWITCH.from)) {
    const c = K.kernelRingAt(f).centre;
    assert.ok(Math.abs(c[0] - 960) <= 4 && Math.abs(c[1] - 540) <= 4, `${f}: ${c}`);
  }
  assert.deepEqual(K.kernelRingAt(HANG.from).centre, [960, 540], 'still by the hang');
});

test('9.1 is a match: the kernel’s ring on its last frame is v2.0’s reticle (same centre, Ø 900), the install bar has folded into its crosshair, and he is the switch’s X-ray (•ω•) glyph for glyph', () => {
  const k = K.kernelRingAt(LAST);
  const r = reticleAt(SWITCH.from);
  assert.deepEqual(k.centre, r.centre);
  assert.ok(Math.abs(k.r - r.r) < 1e-9, `${k.r} vs ${r.r}`);
  assert.equal(k.reticle, 1, 'all of it redrawn as the reticle');
  assert.equal(k.crack, 1);
  const b = K.installBarAt(LAST)!;
  assert.equal(b.fold, 1);
  assert.equal(b.h, 2.5, 'the crosshair’s stroke');
  assert.equal(b.y, 540);
  assert.equal(b.edge, 1920);
  // His glyphs on the last frame: the switch's fill on its first (drop2SwitchFrame.ts: em = 600 / FACE_ADVANCE, the placement line 22/360 em up).
  const em = 600 / FACE_ADVANCE;
  const g = K.heroGlyphs(LAST, 'xray');
  FACE_PARTS.forEach((p, i) => {
    const x = (p.x + FACE_CHAR_ADVANCE[p.ch] / 2 - FACE_ADVANCE / 2) * em;
    assert.equal(g[i].ch, p.ch);
    assert.ok(Math.abs(g[i].x - x) < 0.5 && Math.abs(g[i].y - (22 / 360) * em) < 0.5 && Math.abs(g[i].size - em) < 0.5, `${p.ch}: (${g[i].x}, ${g[i].y}) ${g[i].size}`);
  });
  const xr = K.kernelFrame(LAST, adv, LAST, 'xray');
  assert.deepEqual(xr.ground, K.XRAY.ground, 'the slate X-ray’s ground: the switch’s on its downbeat');
  // The cut itself: a hard one (sub-frames never cross it).
  assert.equal(drop2Segment(LAST).to, SWITCH.from);
});

test('the install bar is the hairline (sheet §6.3): it takes the hairline’s place, length and colour on 8.4&, lifts to y 540 in 3 f (2 → 24 px) and fills on the last three install beeps; left of its edge the picture is the X-ray', () => {
  assert.equal(K.installBarAt(INSTALL.from - 1), null);
  const h = hairlineAt(INSTALL.from - 1)!;
  const b0 = K.installBarAt(INSTALL.from)!;
  assert.deepEqual([b0.y, b0.h, b0.len, b0.alpha], [h.y, h.h, h.len, h.alpha], 'the same object');
  assert.equal(b0.fill, 0, 'the first beep lifts it');
  const b3 = K.installBarAt(INSTALL.from + 3)!;
  assert.deepEqual([b3.y, b3.h], [540, 24]);
  let last = 0;
  for (const f of range(INSTALL.from, SWITCH.from)) {
    const b = K.installBarAt(f)!;
    assert.ok(b.fill >= last - 1e-12, `${f}: never back`);
    last = b.fill;
  }
  for (const s of INSTALL_STEPS.slice(1)) assert.ok(K.installBarAt(s)!.fill - K.installBarAt(s - 1)!.fill > 0.15, `${s}: a step on its beep`);
  assert.equal(K.installBarAt(LAST)!.fill, 1);
});

test('the hang (8.4): the veil eases in over 6 f, the kernel’s clock stops (the flood and the fragments freeze) while he breathes and the camera creeps', () => {
  assert.equal(K.veilAt(HANG.from - 1), 0);
  assert.ok(Math.abs(K.veilAt(HANG.from + 6) - K.VEIL) < 1e-9);
  assert.equal(K.kt(HANG.from + 6), K.kt(INSTALL.from), 'frozen');
  assert.ok(K.kt(HANG.from + 6) - HANG.from <= 3.0001);
  const p = K.PILLARS[0];
  const fr = K.FRAGMENTS[0][3];
  assert.deepEqual(K.fragmentAt(p, fr, HANG.from + 6), K.fragmentAt(p, fr, LAST), 'a fragment hangs where it was');
  assert.ok(K.kernelHeroAt(HANG.from + 3).width > K.kernelHeroAt(HANG.from).width + 3, 'he breathes');
  assert.equal(K.kernelHeroAt(INSTALL.from).width, 600, 'and is the switch’s 600 px again for the install');
  assert.ok(K.camZ(HANG.from + 6) < K.camZ(HANG.from), 'the creep');
});

test('the scan (8.2): a red plane from the core up the nave and through the lens in an 8th, its lower edge bent by the flood into an ω', () => {
  assert.equal(K.scanPlaneAt(KERNEL_SCAN - 1), null);
  const a = K.scanPlaneAt(KERNEL_SCAN)!;
  assert.ok(a.z < K.NAVE.edge, 'from the core');
  const b = K.scanPlaneAt(KERNEL_SCAN + K.SCAN_DUR - 1)!;
  assert.ok(K.camZ(KERNEL_SCAN + K.SCAN_DUR - 1) - b.z < 600, 'at the lens');
  assert.ok(b.bend > 0.99 && a.bend === 0);
  const live = K.kernelFrame(KERNEL_SCAN + 6, adv, KERNEL_SCAN + 6, 'live');
  assert.ok(live.glow.some((s) => s.kind === 'segment' && s.color[0] > 1.2 && s.color[1] < 0.15 * s.color[0]), 'Defender’s emissive red');
  assert.ok(!live.glow.some((s) => s.kind === 'rect' && s.w > 1000 && s.h > 500), 'a laser sheet, never a red wall over the frame');
});

test('the colour law: Defender’s pillars, ring, scan and avatar red; every ω his amber (the infection); the flood the overflow’s green; in the X-ray, the POV’s slate ramp and his ω the hot spot', () => {
  const f = DOMINOES_L[3] - 4;
  const live = K.kernelFrame(f, adv, f, 'live');
  // Hue, not level: a fragment's flash brightens its ink for 4 f.
  const sameHue = (c: readonly number[], ink: readonly number[]) => c.every((v, i) => Math.abs(v / c[0] - ink[i] / ink[0]) < 1e-6);
  let omegas = 0;
  for (const g of live.nave) {
    if (g.ch === 'ω') {
      omegas++;
      assert.ok(sameHue(g.color, K.INK.amber), 'every ω his amber');
    }
    if (g.ch === '║') assert.ok(sameHue(g.color, K.INK.red), '║ Defender’s red');
    if (g.ch === '@') assert.ok(sameHue(g.color, K.INK.green) || sameHue(g.color, K.INK.foam), 'the flood the overflow’s green (its front’s foam pale)');
  }
  assert.ok(omegas > 20, 'the infection is on screen');
  for (const g of live.hero) assert.deepEqual(g.color, K.INK.hero);
  const xr = K.kernelFrame(f, adv, f, 'xray');
  for (const g of xr.hero) assert.deepEqual(g.color, g.ch === 'ω' ? K.XRAY.hot : K.XRAY.ink);
  assert.equal(xr.glow.length, 0, 'the X-ray is a grade: no light of its own');
});

test('every string the kernel draws is in drop 2’s screen texts under the role its atlas uses (check-glyphs covers it); every glyph it draws is in its atlas', () => {
  const byRole = (role: string) => new Set(DROP2_TEXTS.filter((t) => t.role === role).flatMap((t) => [...t.text]));
  const mono = byRole('mono');
  for (const s of K.KERNEL_STRINGS.mono) for (const c of s) if (c !== ' ') assert.ok(mono.has(c), `${c} (mono)`);
  const jp = new Set(DROP2_TEXTS.filter((t) => t.role === 'jp').map((t) => t.text));
  for (const s of K.KERNEL_STRINGS.jp) assert.ok(jp.has(s), `${s} (jp)`);
  const monoChars = new Set(K.KERNEL_STRINGS.mono.join(''));
  for (const f of range(T0, SWITCH.from, 5)) {
    for (const skin of ['live', 'xray'] as const) {
      const c = K.kernelFrame(f, adv, f, skin);
      for (const g of [...c.nave, ...c.back.mono]) assert.ok(monoChars.has(g.ch), `${f} ${skin}: ${g.ch}`);
      for (const g of c.faces.jp) assert.ok((K.KERNEL_STRINGS.jp as readonly string[]).includes(g.ch), `${f}: ${g.ch}`);
      for (const g of c.hero) assert.ok((K.KERNEL_STRINGS.rounded as readonly string[]).includes(g.ch));
    }
    for (const g of K.kernelHud(f, () => 0.6).mono) assert.ok(monoChars.has(g.ch), `${f} hud: ${g.ch}`);
  }
});

test('photography: the whip lands crisp (the landing frame’s sub-frames start on the downbeat), 64 sub-frames there, ≥ 32 while the camera races, the look sliding into the switch’s', () => {
  assert.deepEqual(K.kernelSegment(T0), { from: T0, to: SWITCH.from });
  assert.equal(drop2Segment(T0).from < T0, true, 'drop 2’s own segment runs through the pan');
  assert.equal(PAN.to, T0);
  assert.equal(K.kernelTemporal(T0).samples, 64);
  for (const f of range(T0, KERNEL_DOLLY.to)) assert.ok(K.kernelTemporal(f).samples >= 32, `${f}`);
  const a = K.kernelLook(LAST);
  assert.ok(a.vignette > 0.3 && a.grain > 0, 'the POV’s finish on the last frame');
});

test('the overflow’s whip-pan flies past this nave: its 16 pillars hang exactly where the kernel’s first frame stands them (F), so the blur resolves into the kernel on 8.1', async () => {
  const { NAVE_PILLARS } = await import('../src/shots/drop2Overflow.ts');
  const pose = K.kernelPose(T0);
  K.PILLARS.forEach((p, i) => {
    const a = K.project(pose, [p.x, K.NAVE.floor, p.z])!;
    const b = K.project(pose, [p.x, K.NAVE.floor + K.NAVE.height, p.z])!;
    const q = NAVE_PILLARS[i];
    assert.ok(Math.abs(q.x - a.x) < 1e-6 && Math.abs(q.y0 - a.y) < 1e-6 && Math.abs(q.y1 - b.y) < 1e-6, `${p.label}: (${q.x}, ${q.y0}–${q.y1}) vs (${a.x}, ${a.y}–${b.y})`);
  });
});

test('卡点: every beat of the bar has its picture event on its own frame — 8.1 the landing, 8.1& on the clacks a pillar lands, 8.2 the core fires the scan (the ring flares), 8.3 the dolly lands with his amber "wa", 8.3a the crack, 8.4 the hang’s veil, 8.4& the bar lifts', () => {
  const adv2 = { mono: () => 0.6, jp: () => 4, rounded: () => 0.5 };
  const glowMax = (f: number) => Math.max(...K.kernelFrame(f, adv2, f, 'live').glow.filter((s) => s.kind === 'ring').map((s) => s.color[0] * (s.alpha ?? 1)));
  assert.ok(glowMax(KERNEL_SCAN) > 1.5 * glowMax(KERNEL_SCAN - 1), '8.2: the core ring flares as the scan fires');
  assert.equal(K.waRingAt(K.WA - 1), null);
  assert.ok(K.waRingAt(K.WA)!.a > 0.9, '8.3: the wa ring is out on the landing frame');
  assert.equal(K.waRingAt(K.WA + 10), null, 'and gone in 10 f');
  assert.ok(K.crackAt(CORE_CRACK) > 0 && K.crackAt(CORE_CRACK - 1) === 0, '8.3a: the crack');
  assert.ok(K.veilAt(HANG.from) > 0 && K.veilAt(HANG.from - 1) === 0, '8.4: the veil');
  assert.ok(K.installBarAt(INSTALL.from)!.label === 0 && K.installBarAt(INSTALL.from + 1)!.label > 0.5, '8.4&: the bar launches');
  for (const p of K.PILLARS) assert.ok(K.fragmentAt(p, K.FRAGMENTS[0][0], p.land - 1) === null && K.fragmentAt(p, K.FRAGMENTS[0][0], p.land) !== null, `${p.label}: bursts on its clack`);
});
