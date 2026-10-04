// Renderer A of the cosmos (bars 1–2: the printed Big Bang in bullet time, Earth's city lights and the sunrise; build sheet
// notes/bcos/sheet.md §4.1–§4.2, §5 E5–E10, §6.2–§6.3; design notes/cosmos3/final.md §4 bars 15–16): its pure shots
// (src/shots/cosmosBang.ts, cosmosEarth.ts, cosmosBangLook.ts) against the design, part-locally (every pin is COSMOS.from + the design's
// offset, so the map may move): the explosion clock and the bullet-time orbit, the anamorphic lock solved from V*, the clear view of his
// card, the ream and the fountain, the white; Earth's cards, the stadium wave, the camera's landing, flyover and crane, the Sun and the
// light, the ring-counter's arch and ellipse, the unwrap, the drag trail's stamps, the monitor; the looks and the sub-frames; and the
// part itself (constructible in Node, the CosmosPart contract).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BANG_PARTS, EARTH_HOSTS, HERO_FACES } from '../src/content/castCosmos.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BangPart } from '../src/scenes/cosmosAPart.ts';
import * as CS from '../src/score/cosmos.ts';
import * as B from '../src/shots/cosmosBang.ts';
import { aLook, aTemporal } from '../src/shots/cosmosBangLook.ts';
import * as E from '../src/shots/cosmosEarth.ts';
import { cosmosTemporal } from '../src/shots/cosmosKit.ts';
import { COLS, formatFriends } from '../src/shots/hud.ts';

const { cs, COSMOS } = CS;
/** A design frame (58-bar numbering, cosmos 1.1 = 1344) as a film frame on today's map. */
const d = (designFrame: number): number => COSMOS.from + designFrame - 1344;
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`);

// ——— Bar 1: the clock, the orbit ————————————————————————————————————————————————————————————————————————————————————————————————

test('the explosion clock runs 1× through the white, lands continuously in the freeze on 1.1e (0.03×), holds, and the slice ramps it to 4× in 3 f', () => {
  for (let f = COSMOS.from; f < CS.TIME.freeze - 1; f += 0.5) near(B.tauAt(f + 0.5) - B.tauAt(f), 0.5, 1e-9, `1× at ${f}`);
  near(B.tauAt(CS.TIME.freeze - 1e-6), B.tauAt(CS.TIME.freeze), 1e-4, 'continuous into the freeze');
  for (let f = CS.TIME.freeze; f < CS.TIME.restart - 1; f += 3) near(B.tauAt(f + 1) - B.tauAt(f), 0.03, 1e-9, `frozen at ${f}`);
  near(B.tauAt(CS.TIME.restart + 6) - B.tauAt(CS.TIME.restart + 5), 4, 1e-6, '4× after the slice');
  near(B.tauAt(CS.TIME.restart - 1e-6), B.tauAt(CS.TIME.restart), 1e-4, 'continuous through the slice');
  for (let f = COSMOS.from; f < CS.LEVELS.earth; f += 0.25) assert.ok(B.tauAt(f + 0.25) >= B.tauAt(f), `the clock never runs back at ${f}`);
});

test('the bullet-time orbit lands the design’s keys: −12° through the white, −6.6° by 1.2, step 1 to 48° (LK, a drift under it), ≈ 53° → the impact into V* = 70° on 1.3, step 2b to 90°, step 3 to 180°', () => {
  near(B.yawAt(d(1344)), -12, 1e-9, '1.1');
  near(B.yawAt(d(1368) - B.LK_LEAD - 1e-6), -6.6 - 0.3 * B.LK_LEAD, 1e-3, 'into 1.2 (step 1 leaves on its frame’s first sub-frame)');
  near(B.yawAt(d(1380)), 48, 0.1, 'step 1 settled by 1.2&');
  near(B.yawAt(d(1386)), 48 + 6 * B.YAW_DRIFT, 0.1, '1.2a: the drift carried on');
  near(B.yawAt(d(1392)), 70, 1e-9, 'V* on 1.3');
  near(B.yawAt(d(1410)), 90, 0.6, 'edge-on by 1.3& + 6');
  near(B.yawAt(d(1428)), 180, 1.5, 'the back of the ream by 1.4&');
  // a launch: 75 % of step 1 within 3 f
  assert.ok((B.yawAt(d(1371)) + 6.6) / 54.6 >= 0.72, 'step 1 launches');
  // continuous (no snap but the moves), on every instant of the bar
  for (let f = COSMOS.from; f < CS.LEVELS.earth; f += 0.25) assert.ok(Math.abs(B.yawAt(f + 0.25) - B.yawAt(f)) < 12, `no jump at ${f}`);
});

test('the camera orbits his card at the design’s radius and pitch: 1.1 W through the white, 1.75 W in bullet time, 8° above his card’s plane, horizontal FOV 64°', () => {
  near(B.orbitRadius(COSMOS.from), 1.1, 1e-9, 'the white');
  near(B.orbitRadius(CS.TIME.freeze + 20), 1.75, 1e-6, 'bullet time');
  near((2 * Math.atan(960 / B.BANG_FOCAL) * 180) / Math.PI, 64, 0.1, 'horizontal FOV');
  const p = B.bangPose(cs(1, 2.5));
  assert.ok(p.position[1] > 0, 'above the card');
});

// ——— Bar 1: the white, the ream, the lock, the slice, the fountain, the zoom-out ———————————————————————————————————————————————

test('1.1 is the film’s one white: the frame is bare paper but his face (≈ 1150 px, 40–50 px ghosts), the halftone prints back from the corners, gone by 1.1e', () => {
  const w0 = B.whiteAt(COSMOS.from)!;
  assert.ok(w0.bright >= 2000, 'the whole frame knocked out');
  near(w0.face, 1150, 1, 'his face');
  assert.ok(w0.ghost >= 40 && w0.ghost <= 50, 'the ghosts');
  assert.ok(B.whiteAt(COSMOS.from + 1)!.bright < B.whiteAt(COSMOS.from)!.bright, 'contracting');
  near(B.whiteAt(COSMOS.from + 5)!.bright, B.FIREBALL_FREEZE, 1, 'the fireball by +5 (v07: condensing toward his card, 620)');
  // v07 (FW5 at the freeze): the bang punches his face at us, then he lands on his card's own size (≈ 1090) as the white goes.
  assert.ok(B.whiteAt(COSMOS.from + 2)!.face > 1150 * 1.05, 'the bang punches him at us');
  assert.ok(Math.abs(B.whiteAt(CS.TIME.freeze - 1)!.face - B.FACE_FREEZE) / B.FACE_FREEZE < 0.06, 'his last white frame is within 6 % of his card');
  for (let t = 3; t < 6; t++) assert.ok(B.whiteAt(COSMOS.from + t + 1)!.face < B.whiteAt(COSMOS.from + t)!.face, `shrinking into the dolly back at +${t}`);
  assert.equal(B.whiteAt(CS.TIME.freeze)!.bright, 0, 'gone on the freeze');
  assert.equal(B.whiteAt(CS.TIME.freeze)!.face, 0, 'his face is the card from 1.1e');
  assert.ok(B.whiteAt(COSMOS.from + 2)!.ring! >= 950 && B.whiteAt(COSMOS.from + 1)!.ring! > 600, 'the shock ring races out');
  assert.equal(B.whiteAt(COSMOS.from + 3)!.ring, null, 'and has left the frame by +3');
  assert.equal(B.whiteAt(COSMOS.from + 1.2)!.ring, B.whiteAt(COSMOS.from + 0.8)!.ring, 'taken at the output frame: printed crisp');
  // the light falls off from the edges inward: the solid core inside the fireball, contracting
  for (let t = 1; t < 6; t++) assert.ok(B.whiteAt(COSMOS.from + t)!.core < B.whiteAt(COSMOS.from + t)!.bright, `a dot-gain fall-off at +${t}`);
  for (let t = 1; t < 5; t++) assert.ok(B.whiteAt(COSMOS.from + t + 1)!.bright < B.whiteAt(COSMOS.from + t)!.bright, `contracting at +${t}`);
  assert.equal(B.whiteAt(COSMOS.from + 8), null);
});

test('only he moves in frozen time: the ream pastes 1 → 7 → 49 → 343 on 1.1e, 1.1& and 1.1a (each a launch), and fans out a quarter a fill snare from the slice, his front sheet staying', () => {
  assert.equal(B.reamCount(COSMOS.from), 1);
  for (const [i, n] of [[0, 7], [1, 49], [2, 343]] as const) near(B.reamCount(CS.REAM_PASTES[i].at + 6 - B.LK_LEAD - 1e-6), n, n * 0.05, `paste ${i}`);
  assert.ok(B.reamCount(CS.REAM_PASTES[2].at + 3) - 49 >= 294 * 0.75, '≥ 75 % of a paste in 3 f');
  assert.equal(B.reamLeft(CS.SLICE.at - 1), 343);
  const quarters = CS.FILL.map((f) => B.reamLeft(f + 3));
  for (let i = 1; i < quarters.length; i++) assert.ok(quarters[i] < quarters[i - 1], `a quarter more on fill ${i}`);
  assert.equal(B.reamLeft(CS.LEVELS.earth - 1), 1, 'his front sheet stays');
  // the copies paste themselves a generation a fill snare (2.4k, 17k, 118k)
  for (let c = 1; c <= 18; c++) {
    const at = B.copyAppears(5, c);
    const gen = Math.ceil(c / 6);
    assert.ok(at >= CS.FOUNTAIN[gen].at - B.LK_LEAD && at <= CS.FOUNTAIN[gen].at - B.LK_LEAD + 0.02, `copy ${c} pastes whole on fill ${gen}'s frame`);
  }
});

test('the anamorphic lock: from V* (the orbit on 1.3) each of the 36 fragments covers its cell of `10⁻⁷ m` exactly (seams ≤ 2 px), each at its own depth 0.35–1.7 W', () => {
  const V = B.bangPose(CS.LOCK.from);
  near(B.yawAt(CS.LOCK.from), 70, 1e-9, 'V* is the orbit at the lock');
  const frags = B.labelFragments();
  assert.equal(frags.length, 36);
  for (const g of frags) {
    assert.ok(g.lam >= 0.35 && g.lam <= 1.7, 'depth');
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => B.project(V, [g.centre[0] + x * g.right[0] + y * g.up[0], g.centre[1] + x * g.right[1] + y * g.up[1], g.centre[2] + x * g.right[2] + y * g.up[2]], B.BANG_FOCAL)!);
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    near(Math.min(...xs), g.cx - g.w / 2, 2, 'left seam');
    near(Math.max(...xs), g.cx + g.w / 2, 2, 'right seam');
    near(Math.min(...ys), g.cy - g.h / 2, 2, 'bottom seam');
    near(Math.max(...ys), g.cy + g.h / 2, 2, 'top seam');
  }
  // the cells tile the label's box (cap 300, x −700 … +740, the top third)
  const area = frags.reduce((a, g) => a + g.w * g.h, 0);
  near(area, B.LOCK_LABEL.width * B.LOCK_LABEL.height, 1, 'the cells tile the label');
  // from anywhere else on the orbit they do not line up
  const off = B.bangPose(CS.SHELL);
  const g = frags[10];
  const p = B.project(off, g.centre, B.BANG_FOCAL)!;
  assert.ok(Math.hypot(p.x - g.cx, p.y - g.cy) > 40, 'scattered away from V*');
});

test('the lock reads: no piece of the blast stands in front of the label from V*; his card stays clear of the pieces in front of it all through bullet time', () => {
  const V = B.bangPose(CS.LOCK.from);
  const blockers = B.labelBlockers();
  const debris = B.bangDebris();
  const t = B.tauAt(CS.LOCK.from);
  for (let i = 0; i < debris.length; i++) {
    if (blockers.has(i) || debris[i].fg) continue;
    const p = B.project(V, B.debrisCentre(debris[i], t), B.BANG_FOCAL);
    if (!p || p.z > 1.6) continue;
    const inside = p.x > B.LOCK_LABEL.left && p.x < B.LOCK_LABEL.left + B.LOCK_LABEL.width && p.y < B.LOCK_LABEL.top && p.y > B.LOCK_LABEL.top - B.LOCK_LABEL.height;
    assert.ok(!inside, `piece ${i} would cover the label at (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
  }
  for (const f of [CS.TIME.freeze + 1, CS.SHELL, CS.SWEEP, CS.LOCK.from, CS.REAM + 3]) {
    const pose = B.bangPose(f);
    const box = B.cardShield(pose, B.REAM_PITCH * (B.reamLeft(f) - 1));
    for (let i = 0; i < debris.length; i += 7) {
      const c = B.debrisCentre(debris[i], B.tauAt(f));
      const p = B.project(pose, c, B.BANG_FOCAL);
      if (!p || debris[i].fg) continue;
      const deep = p.x > box.x0 + 12 && p.x < box.x1 - 12 && p.y > box.y0 + 12 && p.y < box.y1 - 12 && p.z < box.near;
      if (deep) assert.equal(B.shieldFade(p.x, p.y, p.z, box), 0, `piece ${i} over his card at ${f}`);
    }
  }
});

test('the blast is the design’s: 4,000 face-part cards (no ω: ω is his), 600 splats, 200 strips, 300 ✦; ≈ 9,000 dome dots on 3 shells; 800 speed ribbons; its pieces 30–300 px', () => {
  const debris = B.bangDebris();
  const count = (k: B.DebrisKind) => debris.filter((x) => x.kind === k).length;
  assert.deepEqual([count('part'), count('splat'), count('strip'), count('star')], [4000, 600, 200, 300]);
  assert.ok(debris.filter((x) => x.kind === 'part').every((x) => !BANG_PARTS[x.variant].includes('ω')), 'no ω');
  near(B.DOMES.reduce((a, x) => a + x.n, 0), 9000, 0, 'dome dots');
  assert.deepEqual(B.DOMES.map((x) => x.r), [0.8, 1.6, 2.6]);
  assert.equal(B.ribbonPieces(debris).length, 800);
  // seen from the freeze's camera: the pieces span about 30–300 px (near ones may be larger: they cross the lens)
  const pose = B.bangPose(CS.TIME.freeze + 6);
  const px = debris.filter((x) => x.kind === 'part').map((x) => {
    const p = B.project(pose, B.debrisCentre(x, B.tauAt(CS.TIME.freeze + 6)), B.BANG_FOCAL);
    return p ? (x.size * B.BANG_FOCAL) / p.z : 0;
  }).filter((v) => v > 0).sort((a, b) => a - b);
  const med = px[Math.floor(px.length / 2)];
  assert.ok(med > 15 && med < 160, `median ${med.toFixed(0)} px`);
});

test('Ctrl+V made literal: every copy lands misregistered down-left, so from the 1.1e–1.2 vantage the stack peeks out of his card as a fat drop shadow (7, 49 and 343 copies), and the shield guards the offset stack', () => {
  assert.deepEqual(B.reamOffset(0), [0, 0]);
  let prev = 0;
  for (let i = 0.5; i <= 342; i += 0.5) {
    const o = B.reamOffset(i);
    const m = Math.hypot(o[0], o[1]);
    assert.ok(m > prev && o[0] < 0 && o[1] < 0, `sheet ${i} further down-left`);
    prev = m;
  }
  // the first six copies stand apart (each ≥ 0.02 W: a stripe of its own), the later pastes pack tighter (concave)
  assert.ok(Math.hypot(...B.reamOffset(1)) >= 0.02, 'the first copy is a stripe of its own');
  const step = (i: number) => Math.hypot(...B.reamOffset(i + 1)) - Math.hypot(...B.reamOffset(i));
  assert.ok(step(2) > step(20) && step(20) > step(200), 'concave');
  for (const [f, n] of [[CS.REAM_PASTES[0].at + 5.5, 7], [CS.REAM_PASTES[1].at + 5.5, 49], [CS.REAM_PASTES[2].at + 5, 343]] as const) {
    near(B.reamCount(f), n, n * 0.06, `${n} copies by ${f}`);
    const pose = B.bangPose(f);
    const k = B.reamCount(f) - 1;
    const o = B.reamOffset(k);
    const front = B.project(pose, [-0.5, -0.21, 0], B.BANG_FOCAL)!;
    const back = B.project(pose, [-0.5 + o[0], -0.21 + o[1], -B.REAM_PITCH * k], B.BANG_FOCAL)!;
    assert.ok(front.x - back.x >= 40 && front.y - back.y >= 30, `${n} copies: the shadow peeks out (${(front.x - back.x).toFixed(0)}, ${(front.y - back.y).toFixed(0)} px)`);
    const box = B.cardShield(pose, B.REAM_PITCH * k);
    assert.ok(box.x0 <= back.x + 1e-6 && box.y0 <= back.y + 1e-6, `${n} copies: the shield covers the offset stack`);
  }
});

test('the card fountain sprays: each flung sheet leaves from its place in the stack, opens out past 1 W of the ream within 12 f, streams away from the camera behind him (through his card, into the blast), spins slowly enough to read (≤ 0.1 rad a frame), and its copies trail it ≥ 0.1 W apart', () => {
  for (const i of [1, 40, 120, 341]) {
    const o = B.reamOffset(i);
    const c0 = B.fountainCard(i, 0).centre;
    assert.ok(Math.hypot(c0[0] - o[0], c0[1] - o[1]) < 0.2 && Math.abs(c0[2] + B.REAM_PITCH * i) < 1e-9, `sheet ${i} leaves from the stack`);
    const c12 = B.fountainCard(i, 12).centre;
    assert.ok(Math.hypot(c12[0] - o[0], c12[1] - o[1]) > 1, `sheet ${i} opens out past 1 W`);
    assert.ok(c12[2] > c0[2] + 0.3, `sheet ${i} streams away from the camera behind him`);
    const spin = B.fountainCard(i, 6.5).roll - B.fountainCard(i, 5.5).roll;
    assert.ok(Math.abs(spin) <= 0.1 + 1e-9, `sheet ${i} spins ${spin.toFixed(3)} rad a frame`);
    for (let c = 1; c <= 6; c++) {
      const a = B.fountainCard(i, 12 - B.COPY_LAG * (c - 1)).centre;
      const b = B.fountainCard(i, 12 - B.COPY_LAG * c).centre;
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) >= 0.1, `copy ${c} of sheet ${i} trails apart`);
    }
  }
});

test('the slice: the clap’s line through (−80, 0) at −35°, the halves sliding 28 px (L), held to 1.4e, back by 1.4&; the frozen blast restarts from it', () => {
  assert.equal(B.sliceAt(CS.SLICE.at - 1), null);
  near(B.SLICE_LINE.angle, (-35 * Math.PI) / 180, 1e-9, 'the angle');
  assert.ok(B.sliceAt(CS.SLICE.at + 3)!.offset >= 28 * 0.72, 'a launch');
  near(B.sliceAt(CS.SLICE.held - 1e-3)!.offset, 28, 1, 'held');
  assert.equal(B.sliceAt(CS.SLICE.back), null);
  assert.ok(B.sliceAt(CS.SLICE.at)!.reach < 1 && B.sliceAt(CS.SLICE.at + 1)!.reach === 1, 'the line wipes across in 2 f');
});

test('Powers of Ten: the crash zoom-out starts whole on 1.4& and shrinks the bang into a ≈ 25 px spark by 1.4a + 1 (an impact), cream squares rushing in from inside the frame one per 32nd', () => {
  assert.equal(B.crashZoom(CS.POWERS[0] - 1), 1);
  assert.equal(B.crashZoom(CS.POWERS[0]), 1, 'whole on 1.4& itself: no rectangle on its frame');
  assert.ok(B.crashZoom(CS.POWERS[0] + 1) > 0.5, 'a frame later it has only begun');
  assert.ok(B.crashZoom(CS.SPARK) < 0.03 && B.crashZoom(CS.SPARK + 1) < 0.014, `the spark ${B.crashZoom(CS.SPARK)}`);
  for (const f of CS.POWERS) assert.ok(B.eamesRush(f)[B.eamesRush(f).length - 1].half <= 520, 'each square starts inside the frame');
  assert.ok(B.eamesRush(CS.POWERS[0] + 2)[0].half < 330, 'and rushes in (an ease-out)');
  assert.equal(B.sparkGlow(CS.SPARK - 0.6), 0);
  assert.equal(B.sparkGlow(CS.SPARK - 0.4), 1, 'the spark ignites whole on 1.4a');
  for (let f = CS.POWERS[0]; f < CS.LEVELS.earth; f += 0.5) assert.ok(B.crashZoom(f + 0.5) <= B.crashZoom(f), `shrinking at ${f}`);
  assert.equal(B.eamesRush(CS.POWERS[0]).length, 1);
  assert.ok(B.eamesRush(CS.POWERS[3]).length >= 2, 'one per 32nd');
});

// ——— Bar 2: Earth ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('Earth is 24,000 double-sided cards; his tile at the pole wears his face; hosts never wear ω and every twin does', () => {
  const cards = E.earthCards();
  assert.equal(cards.length, 24000);
  assert.deepEqual(cards[0].p, [0, 1, 0]);
  assert.equal(cards[0].host, HERO_FACES.face);
  for (const c of cards.slice(1)) {
    assert.ok(!c.host.includes('ω'), `host ${c.host}`);
    assert.ok(c.twin.includes('ω'), `twin ${c.twin}`);
  }
  assert.ok(cards.some((c) => EARTH_HOSTS.some((h) => h.host === c.host)), 'the named hosts');
  // the cards tile the globe: a card is the lattice's spacing less a gutter
  near(E.CARD_SIDE, Math.sqrt((4 * Math.PI) / 24000) * 0.94, 1e-12, 'side');
});

test('the stadium wave: ring k flips on 2.1 + 6(k − 1), each card ragged by 0–4 f; ring 1 is his six neighbours; the antipode is ring 13 on 2.4; every card infected by the unwrap', () => {
  const cards = E.earthCards();
  assert.equal(CS.WAVE_RINGS.length, 13);
  for (const c of cards.slice(1)) {
    const lag = c.flip - CS.WAVE_RINGS[c.ring - 1];
    assert.ok(lag >= 0 && lag < 4, `lag ${lag}`);
  }
  const ring1 = cards.filter((c, i) => i > 0 && c.ring === 1).length;
  assert.ok(ring1 >= 5 && ring1 <= 8, `ring 1 has ${ring1}`);
  assert.equal(E.ringOf(180), 13);
  assert.equal(CS.WAVE_RINGS[12], CS.UNWRAP.at);
  assert.ok(cards.every((c) => E.infected(c, CS.UNWRAP.at + 6)), 'all amber');
  // his tile is the first lamp, lit by the landing
  assert.ok(E.infected(cards[0], CS.LANDING), 'his tile lit on 2.1');
  assert.ok(!E.infected(cards[1], CS.LANDING - 1), 'his neighbours not yet');
});

test('the camera: the crash zoom-out lands straight down on his tile (tiles ≈ 130 px), the flyover’s horizon settles at y ≈ +250, the crane frames Earth at R ≈ 650 px, centre (0, −240)', () => {
  const land = E.earthCamera(CS.LANDING);
  near(land.pitch, 90, 1e-9, 'straight down');
  near(land.distance - 1, E.LANDED_ALTITUDE, 0.01, 'altitude');
  near((E.CARD_SIDE * E.EARTH_FOCAL) / (land.distance - 1), 134, 10, 'tile px');
  // the flyover's horizon: the limb's apex on screen
  const fly = E.earthCamera(CS.cs(2, 2.5));
  const g = E.globeOnScreen(fly.pose);
  near(g.top, 250, 40, 'horizon');
  const crane = E.earthCamera(CS.SUNRISE.settled);
  const gc = E.globeOnScreen(crane.pose);
  near(gc.r, 650, 30, 'R');
  near(gc.top, 410, 40, 'the limb’s apex');
  near(gc.x, 0, 1, 'centre x');
  // the zoom-out is an impact into the landing (rising off his tile)
  for (let f = CS.POWERS[0]; f < CS.LANDING; f += 1) assert.ok(E.earthCamera(f + 1).distance >= E.earthCamera(f).distance - 0.002, `rising at ${f} (the kick's rebound aside)`);
  // the night side pastes in on 1.4a's fill (from the edges inward, whole a frame later); the zoom-out lands on 2.1 as an impact
  assert.ok(E.seaPaste(CS.SPARK - 1) > 2000 && E.seaPaste(CS.SPARK) > 0 && E.seaPaste(CS.SPARK) < 400 && E.seaPaste(CS.SPARK + 1) === 0, 'the paste');
  const step = (f: number) => E.zoomAltitude(f) - E.zoomAltitude(f - 1);
  assert.ok(step(CS.LANDING) > step(CS.LANDING - 1) && step(CS.LANDING) > 2 * Math.abs(step(CS.LANDING + 1)), 'the impact lands on 2.1');
});

test('the sunrise is a light event on 2.3’s kick: the Sun crests the limb on its first sub-frame, lifts clear as the crane lands, settling just over the apex near (0, +410); the terminator sweeps toward the camera over 12 f', () => {
  // hidden before the kick: under the limb
  assert.ok(E.sunRise(CS.SUNRISE.at - 0.3) < -E.SUN_DISC.r, 'under the limb before 2.3');
  // every sub-frame of 2.3's own frame shows its cap over the limb (the light breaks on the drum, never frames later)
  for (const s of temporalSamples(CS.SUNRISE.at, aTemporal(CS.SUNRISE.at), CS.cosmosSegment(CS.SUNRISE.at))) {
    const r = E.sunRise(s.frame);
    assert.ok(r > -0.5 * E.SUN_DISC.r && r < E.SUN_DISC.r, `cresting at ${s.frame.toFixed(2)} (${r.toFixed(0)} px)`);
  }
  assert.ok(E.SUN_DISC.r >= 60, 'a core of r ≥ 60 px');
  const settled = E.sunScreen(CS.SUNRISE.settled);
  near(settled.y, 410, 30, 'sun y as the crane lands');
  near(settled.x, 0, 2, 'sun x');
  const g = E.globeOnScreen(E.earthCamera(CS.SUNRISE.settled).pose);
  assert.ok(settled.y > g.top && settled.y < g.top + E.SUN_DISC.r, `breaking the limb (${settled.y.toFixed(0)} over ${g.top.toFixed(0)})`);
  // the rising Sun keeps climbing after the settle
  assert.ok(E.sunRise(CS.MOON_BEAM + 6) > E.sunRise(CS.MOON_BEAM) + 20, 'rising');
  assert.equal(E.terminator(CS.SUNRISE.at - 1), 2, 'night until 2.3');
  near(E.terminator(CS.SUNRISE.settled), -0.7, 0.02, 'day by 2.3&');
  // the day reaches the near side: the card under the crane is lit by the settle
  const crane = E.earthCamera(CS.SUNRISE.settled).pose;
  const l = E.lightDirection();
  const c = crane.position;
  const cl = Math.hypot(c[0], c[1], c[2]);
  assert.ok((c[0] * l[0] + c[1] * l[1] + c[2] * l[2]) / cl > E.terminator(CS.SUNRISE.settled), 'the near side in day');
});

test('the 2001 alignment, then the eclipse: on the beam the Moon card (em 64, at (0, +500)) stands over the Sun on the same vertical; the rising Sun slides behind the infected Moon and is eclipsed dead centre as THREATS slams (2.4 + a 32nd)', () => {
  assert.equal(E.MOON_CARD.em, 64);
  const moonAt = (f: number) => B.project(E.earthCamera(f).pose, E.moonPosition(f), E.EARTH_FOCAL)!;
  for (const f of [CS.MOON_BEAM, CS.MOON_BEAM + 3]) {
    const sun = E.sunScreen(f);
    const moon = moonAt(f);
    near(sun.x, 0, 1, 'the Sun on the vertical');
    near(moon.x, 0, 1, 'the Moon on the vertical');
    near(moon.y, E.MOON_ON_SCREEN, 1, 'the Moon at +500');
    assert.ok(moon.y - E.MOON_CARD.hh >= sun.y + E.SUN_DISC.r - 30, `the card stands over the disc at ${f}`);
    assert.ok(E.eclipseAt(f) < 0.25, `no eclipse yet at ${f}`);
  }
  assert.equal(E.eclipseAt(CS.MOON_BEAM), 0, 'the beam meets a clear Sun');
  near(E.eclipseAt(CS.UNWRAP.slam), 1, 0.05, 'dead centre on the slam');
  assert.ok(E.eclipseAt(CS.UNWRAP.slam - 4) > 0 && E.eclipseAt(CS.UNWRAP.slam - 4) < 0.8, 'sliding in');
  assert.ok(E.eclipseAt(CS.UNWRAP.slam + 4) > 0 && E.eclipseAt(CS.UNWRAP.slam + 4) < 0.8, 'sliding out');
  assert.equal(E.eclipseAt(CS.WHIP.from), 0, 'over by the whip');
  for (let f = CS.SUNRISE.at; f < CS.WHIP.from; f += 0.25) assert.ok(E.eclipseAt(f) <= E.eclipseAt(CS.UNWRAP.slam) + 1e-9, `the peak is the slam (${f})`);
});

test('the ring-counter is a real ring round Earth: from the flyover an arch across the sky (the camera inside its radius), from the crane a flat ellipse whose front crosses the lower globe', () => {
  const fly = E.earthCamera(CS.PREDAWN).pose;
  assert.ok(Math.hypot(...fly.position) < E.RING.radius, 'inside the ring');
  let sky = 0;
  for (let s = 0; s < E.RING_SLOTS; s++) {
    const p = B.project(fly, E.ringSlot(s, CS.PREDAWN).centre, E.EARTH_FOCAL);
    if (p && Math.abs(p.x) < 960 && p.y > 0 && p.y < 540) sky++;
  }
  assert.ok(sky >= 20, `an arch in the sky (${sky} slots)`);
  // the arch spans the frame over the horizon all through the flyover (it keeps its place in the sky while the ground streams under it):
  // its crown high in the sky under the Moon card, its legs falling toward the horizon at the frame's edges
  for (const f of [CS.TILT_UP + 14, CS.OUTRUN, CS.PREDAWN, CS.SUNRISE.at - 1]) {
    const pose = E.earthCamera(f).pose;
    const pts = Array.from({ length: E.RING_SLOTS * 4 }, (_, s) => B.project(pose, E.ringSlot(s / 4, f).centre, E.EARTH_FOCAL)).filter((p): p is { x: number; y: number; z: number } => !!p && Math.abs(p.x) < 960 && Math.abs(p.y) < 540);
    const at = (x: number) => Math.max(...pts.filter((p) => Math.abs(p.x - x) < 40).map((p) => p.y));
    const crown = at(0);
    const horizon = E.globeOnScreen(pose).top;
    assert.ok(crown > horizon + 100 && crown < E.moonOnScreen() - E.MOON_CARD.hh - 40, `the crown high in the sky at ${f} (${crown.toFixed(0)})`);
    assert.ok(at(-850) < crown - 150 && at(850) < crown - 150, `the legs fall toward the horizon at ${f}`);
  }
  const crane = E.earthCamera(CS.SUNRISE.settled + 6).pose;
  const pts = Array.from({ length: E.RING_SLOTS }, (_, s) => B.project(crane, E.ringSlot(s, CS.SUNRISE.settled + 6).centre, E.EARTH_FOCAL)!);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1500, 'wide');
  assert.ok(Math.max(...ys) - Math.min(...ys) < 0.3 * (Math.max(...xs) - Math.min(...xs)), 'flat');
  assert.ok(Math.max(...ys) < E.globeOnScreen(crane).top, 'under the limb');
  // the count rolls up to the lock and the unwrap's row reads it
  assert.equal(E.ringCount(CS.UNWRAP.at).trim(), '8,100,000,000');
  assert.equal(E.ringChar(13 + 1, CS.UNWRAP.at).ch, 'T');
  assert.equal(E.ringChar(13 + 1, CS.UNWRAP.at).count, false);
});

test('2.4: the ring unwraps (L over 8 f) into `8,100,000,000`; THREATS slams a 32nd later; on 2.4& the row smears out with the whip', () => {
  assert.equal(E.unwrapped(CS.UNWRAP.at - 1), 0);
  assert.ok(E.unwrapped(CS.UNWRAP.at + 3) >= 0.72);
  near(E.threatsSlam(CS.UNWRAP.slam)!, 1, 0.02, 'landed on the slam');
  assert.ok(E.threatsSlam(CS.UNWRAP.slam - 1)! > 1.05, 'impact into it');
  assert.equal(E.rowExit(CS.WHIP.from - 1), 0);
  assert.equal(E.rowExit(CS.WHIP.from + 4), 1);
});

test('the whip pans 90° right as an impact into 3.1 after a 3° anticipation; Earth leaves six crisp stamps one every 2 f, the last on B’s orbit slot (r 60) by 3.1', () => {
  assert.equal(E.whipPan(CS.WHIP.from - 3), 0);
  near(E.whipPan(CS.WHIP.from), -3, 1e-9, 'anticipation');
  near(E.whipPan(CS.WHIP.to), 90, 1e-9, '90° on 3.1');
  const rate = E.whipPan(CS.WHIP.to - 1) - E.whipPan(CS.WHIP.to - 2);
  assert.ok(rate > 12 && rate < 20, `≈ 14–18°/f at the end (${rate.toFixed(1)})`);
  assert.deepEqual(E.STAMP_AT, [0, 2, 4, 6, 8, 10].map((k) => CS.WHIP.from + k));
  const globe = E.globeOnScreen(E.earthCamera(CS.WHIP.from).pose);
  const layout = E.stampLayout(globe);
  near(layout[5].x, E.A_STAMP_SLOTS[5][0], 1e-6, 'slot x');
  near(layout[5].y, E.A_STAMP_SLOTS[5][1], 1e-6, 'slot y');
  near(layout[5].r, E.SLOT_RADIUS, 1e-6, 'slot r');
  near(layout[0].r, globe.r, globe.r * 0.05, 'the first stamp is the globe');
  for (let k = 0; k < 6; k++) {
    const g = E.trailGlobe(E.STAMP_AT[k], layout, globe);
    near(g.x, layout[k].x, 1e-6, `the globe leaves stamp ${k} where it is`);
  }
});

test('the party monitor types in on 2.1e with friends = the threat count and folds by 2.3e, hud.ts’s box glyph for glyph', () => {
  const w = CS.MONITOR[0];
  assert.equal(E.monitorRows(w.from - 1), null);
  const m = E.monitorRows(w.from + 10)!;
  assert.equal(m.friends, formatFriends(CS.threatsAt(w.from + 10)));
  const rows = E.monitorText(m);
  assert.ok(rows.every((r) => [...r].length === COLS), 'every row COLS wide');
  assert.ok(rows[0].startsWith('╔═ kaomoji.exe :: party monitor '));
  assert.equal(E.monitorRows(w.to), null);
});

// ——— The drums on their frames (check-sync: the biggest picture change on the drum's frame or the next, never two frames late) ———

/** The per-frame step of `fn` under the house's shutter (each output frame the mean of its sub-frames), frames F … F + 4. */
const steps = (fn: (f: number) => number, F: number): number[] => {
  const at = (G: number) => temporalSamples(G, { samples: 64, shutter: 0.5, persistence: 0 }).reduce((a, s) => a + fn(s.frame) * s.weight, 0);
  return [0, 1, 2, 3, 4].map((k) => Math.abs(at(F + k) - at(F + k - 1)));
};
const peakAt = (xs: number[]) => xs.indexOf(Math.max(...xs));

test('drum-keyed moves leave at speed on the drum frame’s first sub-frame (LK): their biggest step lands on the drum frame or the next, never two frames late', () => {
  assert.ok(B.LK(-B.LK_LEAD) === 0 && B.LK(0) > 0.05, 'already moving on the drum frame');
  near(B.LK(40), 1, 1e-6, 'settles to 1');
  let peak = 0;
  for (let t = 0; t < 30; t += 0.05) peak = Math.max(peak, B.LK(t));
  assert.ok(peak <= 1.04, `rebound ${((peak - 1) * 100).toFixed(1)} %`);
  assert.ok(B.LK(3) >= 0.75, '75 % in 3 f');
  // the moves: the orbit's step 1 (1.2) and step 3 (1.4), the crane (2.3), the zoom-out's landing (2.1), the flyover's surge (2.2)
  const cases: [string, (f: number) => number, number][] = [
    ['orbit step 1', B.yawAt, CS.SHELL],
    ['orbit step 3', B.yawAt, CS.SLICE.at],
    ['the crane', (f) => E.earthCamera(f).distance, CS.SUNRISE.at],
    ['the zoom-out landing (an impact: its biggest step on the frame)', E.zoomAltitude, CS.LANDING],
    ['the surge', E.flown, CS.OUTRUN],
  ];
  for (const [name, fn, F] of cases) assert.ok(peakAt(steps(fn, F)) <= 1, `${name}: biggest step on +${peakAt(steps(fn, F))}`);
});

test('bullet time never stalls: the orbit turns forward on every instant from the freeze to the lock (the drift carries each step’s rebound), the lock breathes', () => {
  for (let f = CS.TIME.freeze; f < CS.LOCK.from; f += 0.25) assert.ok(B.yawAt(f + 0.25) - B.yawAt(f) >= 0.25 * 0.29, `turning at ${f - COSMOS.from}`);
  near(B.yawAt(CS.LOCK.from + 11) - B.yawAt(CS.LOCK.from), 0.44, 0.05, 'the lock breathes');
});

test('2.2 outruns us: a ×1.8 velocity step whole on the clap’s frame (between its sub-frames and the frame before’s), decaying to the cruise over ≈ 10 f; the faces just ahead of the lit front flinch at ≥ 60 px', () => {
  const before = E.flySpeed(CS.OUTRUN - E.SURGE_LEAD - 0.05);
  const on = E.flySpeed(CS.OUTRUN - E.SURGE_LEAD + 0.05);
  for (const s of temporalSamples(CS.OUTRUN - 1, aTemporal(CS.OUTRUN - 1))) assert.ok(s.frame < CS.OUTRUN - E.SURGE_LEAD, 'the frame before is untouched');
  for (const s of temporalSamples(CS.OUTRUN, aTemporal(CS.OUTRUN))) assert.ok(s.frame > CS.OUTRUN - E.SURGE_LEAD, 'the clap’s frame moves at the new speed throughout');
  near(on, 0.9 * (1 + E.FLY_SURGE), 0.05, 'the step: the cruise × 1.8');
  assert.ok(on > 5 * before, 'at once');
  assert.ok(E.flySpeed(CS.OUTRUN + 10) < 1.05, 'back to the cruise by +10');
  // the flinching faces: just ahead of the lit front, jumping ×1.25, ≥ 60 px on 2.2's frame
  const pose = E.earthCamera(CS.OUTRUN).pose;
  const from = E.litFront(CS.OUTRUN);
  let big = 0;
  for (const c of E.earthCards()) {
    if (c.theta <= from || c.theta >= from + E.flinchBand(CS.OUTRUN) || c.flip <= CS.OUTRUN) continue;
    const p = B.project(pose, c.p, E.EARTH_FOCAL);
    if (!p || Math.abs(p.x) > 900 || Math.abs(p.y) > 500) continue;
    if ((E.CARD_SIDE * 1.25 * E.EARTH_FOCAL) / p.z >= 60) big++;
  }
  assert.ok(big >= 20, `${big} flinching faces at ≥ 60 px`);
});

test('two globes: the design’s 24,000 cards up close, 3,000 that still read from the crane (≈ 60 px), the same wave; they cross-fade under the crane’s blur', () => {
  const coarse = E.coarseCards();
  assert.equal(coarse.length, E.COARSE_N);
  assert.equal(coarse[0].host, HERO_FACES.face);
  for (const c of coarse.slice(1)) assert.ok(c.flip - CS.WAVE_RINGS[c.ring - 1] >= 0 && c.flip - CS.WAVE_RINGS[c.ring - 1] < 4, 'the same rings');
  assert.equal(E.coarseFade(CS.SUNRISE.at), 0);
  assert.equal(E.coarseFade(CS.SUNRISE.settled - 2), 1);
  for (let f = CS.SUNRISE.at; f < CS.SUNRISE.settled; f++) assert.ok(cosmosTemporal(f).samples >= 64, 'under the crane’s 64 sub-frames');
  const near0 = E.earthCamera(CS.SUNRISE.settled).distance - 1;
  near((E.COARSE_SIDE * E.EARTH_FOCAL) / near0, 60, 8, 'coarse cards at the near side');
  assert.ok((E.CARD_SIDE * E.EARTH_FOCAL) / near0 < 22, 'the fine ones would be under twice the screen’s pitch');
});

// ——— The look and the photography ——————————————————————————————————————————————————————————————————————————————————————————————

test('the look: the night print with the power dial (0.12 on the bang, 0.28 on Earth); the white prints in register (his ghosts are drawn); the sub-frames are the score’s, never fewer', () => {
  for (const f of [COSMOS.from, cs(1, 3), cs(2), cs(2, 3)]) {
    const l = aLook(f);
    assert.equal(l.riso?.night, 1);
    assert.equal(l.riso?.voidPitch, 0);
  }
  assert.equal(aLook(COSMOS.from).riso?.power, 0.12);
  assert.equal(aLook(cs(2, 2)).riso?.power, 0.28);
  assert.equal(aLook(COSMOS.from + 2).riso?.offsets, undefined);
  for (let f = COSMOS.from; f < cs(3); f++) assert.ok(aTemporal(f).samples >= cosmosTemporal(f).samples, `never fewer at ${f}`);
});

test('fast moves are blurred, never printed: every frame whose camera moves more than 20 px a frame takes ≥ 32 sub-frames (the drag trail’s stamps are crisp on purpose)', () => {
  const speed = (f: number): number => {
    if (f < CS.POWERS[0]) {
      const pts: B.V3[] = [[0, 0, 0], [0.5, 0.21, 0], [-0.5, -0.21, 0], [1.2, 0.4, 0.3], [-1, -0.5, -0.6]];
      let m = 0;
      for (const p of pts) {
        const a = B.project(B.bangPose(f - 0.5), p, B.BANG_FOCAL);
        const b = B.project(B.bangPose(f + 0.5), p, B.BANG_FOCAL);
        if (a && b && Math.abs(a.x) < 960 && Math.abs(a.y) < 540) m = Math.max(m, Math.hypot(a.x - b.x, a.y - b.y));
      }
      return m;
    }
    if (f < CS.LANDING) return 0;
    const ga = E.globeOnScreen(E.earthCamera(f - 0.5).pose);
    const gb = E.globeOnScreen(E.earthCamera(f + 0.5).pose);
    // a point on the ground under the view's centre: the globe's own turn across the frame
    const pa = E.earthCamera(f - 0.5);
    const pb = E.earthCamera(f + 0.5);
    const groundShift = ((pb.th - pa.th) * Math.PI) / 180 / Math.max(0.05, pa.distance - 1) * E.EARTH_FOCAL * 0.6;
    const pan = Math.abs(E.whipPan(f + 0.5) - E.whipPan(f - 0.5)) * (Math.PI / 180) * E.EARTH_FOCAL;
    const tilt = Math.abs(pb.pitch - pa.pitch) * (Math.PI / 180) * E.EARTH_FOCAL;
    return Math.max(Math.hypot(ga.x - gb.x, ga.y - gb.y), groundShift, pan, tilt);
  };
  for (let f = COSMOS.from; f < cs(3); f++) {
    const v = speed(f);
    if (v > 20) assert.ok(aTemporal(f).samples >= 32, `frame +${f - COSMOS.from} moves ${v.toFixed(0)} px a frame on ${aTemporal(f).samples} sub-frames`);
  }
});

test('the four standards: every swap keyed on a drum is whole on its frame (his wave on 1.2, the Moon’s flip on 2.3& + 3), and no sub-frame leaves its segment', () => {
  const check = (F: number, fn: (x: number) => unknown) => {
    const samples = temporalSamples(F, aTemporal(F), CS.cosmosSegment(F));
    const states = new Set(samples.map((s) => JSON.stringify(fn(s.frame))));
    assert.equal(states.size, 1, `frame ${F} mixes states`);
  };
  check(CS.SHELL, (x) => B.waving(x));
  check(CS.SHELL + 8, (x) => B.waving(x));
  check(CS.MOON_BEAM + 3, (x) => E.moonFace(x));
  for (let F = COSMOS.from; F < cs(3); F++) {
    const seg = CS.cosmosSegment(F);
    for (const s of temporalSamples(F, aTemporal(F), seg)) assert.ok(s.frame >= seg.from && s.frame < seg.to, `frame ${F} leaves its segment`);
  }
});

test('the part keeps the CosmosPart contract and is constructible in Node (no GL before init)', () => {
  const p = new BangPart();
  assert.equal(typeof p.init, 'function');
  assert.equal(typeof p.render, 'function');
  assert.equal(typeof p.screenOverlay, 'function');
  assert.deepEqual(p.temporal(cs(1, 2)), aTemporal(cs(1, 2)));
  assert.deepEqual(p.look(cs(2, 3)), aLook(cs(2, 3)));
});
