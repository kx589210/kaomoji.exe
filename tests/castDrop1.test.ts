import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { NO_COLLECTION, readCollection } from './lib/collection.ts';
import { BURST_FACES, CORE_FACES, CROWD_FACES, FILLER, FLIPPER, FLIPPER_CALM, GALAXY_FACES, GUESTS, HERO, MOON, PANIC, PLANETS } from '../src/content/castDrop1.ts';

const collection = readCollection<{ face: string; moods: string[]; renders: boolean }>();
const entry = new Map(collection.map((e) => [e.face, e]));
/** One face whatever its spacing or full-width forms (as cast.mjs counts them). */
const key = (face: string) => face.normalize('NFKC').replace(/\s/gu, '');
/** The lists cast.mjs picks by hash from the collection, each face taken once. */
const PICKED = { BURST_FACES, CROWD_FACES, GALAXY_FACES, CORE_FACES, GUESTS, FILLER } as const;

test('Drop 1 casts many faces: 220 for the burst (one per 3D face piece), 40 for the crowd, 160 for the galaxy, 36 cores, 6 guests, 220 for the fill', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(PICKED).map(([k, v]) => [k, v.length])), { BURST_FACES: 220, CROWD_FACES: 40, GALAXY_FACES: 160, CORE_FACES: 36, GUESTS: 6, FILLER: 220 });
  assert.equal(MOON.length, 2);
  assert.equal(PLANETS.length, 7);
});

test('no face appears twice in the drop’s cast, counting spacing and full-width variants as the same face — except that the burst’s last 80 3D faces may also be among the cosmos’s 2D fill', () => {
  // The extrusion font runs out of unused faces after 148, so the burst's last 80 borrow faces the cosmos prints flat among 60,000 (never twice in the burst).
  const all = [HERO, FLIPPER, FLIPPER_CALM, ...MOON, ...PLANETS, ...BURST_FACES.slice(0, 140), CROWD_FACES, GALAXY_FACES, CORE_FACES, GUESTS, FILLER].flat();
  const seen = new Map<string, string>();
  for (const f of all) {
    assert.ok(!seen.has(key(f)), `${f} repeats ${seen.get(key(f))}`);
    seen.set(key(f), f);
  }
  assert.equal(new Set(BURST_FACES.map(key)).size, BURST_FACES.length, 'none twice in the burst');
  const flat2D = new Set([...GALAXY_FACES, ...FILLER, ...CORE_FACES, ...GUESTS].map(key));
  for (const f of BURST_FACES.slice(140)) assert.ok(!seen.has(key(f)) || flat2D.has(key(f)), `${f}: a burst face borrowed from outside the cosmos's fill`);
  assert.ok(CROWD_FACES.every((f) => !BURST_FACES.some((b) => key(b) === key(f))), 'the crowd is not the burst again');
});

test('every picked face comes from the collection and draws in the browser', { skip: NO_COLLECTION }, () => {
  for (const [name, list] of Object.entries(PICKED)) {
    for (const f of list) {
      assert.ok(entry.has(f), `${name}: ${f} is not in the collection`);
      if (name !== 'BURST_FACES') assert.ok(entry.get(f)!.renders, `${name}: ${f} does not render`);
    }
  }
});

test('the dancers’ panic is a long list of the collection’s scared or crying faces that draw in the browser, each once', { skip: NO_COLLECTION }, () => {
  assert.ok(PANIC.length >= 30, `${PANIC.length} faces`);
  assert.equal(new Set(PANIC).size, PANIC.length, 'no repeats');
  for (const f of PANIC) {
    assert.ok(entry.get(f)?.moods.some((m) => m === 'surprised & scared' || m === 'crying'), `${f} is not a scared face of the collection`);
    assert.ok(entry.get(f)!.renders, `${f} does not render`);
  }
});

test('it is a party: the burst, the galaxy and the fill have no angry, annoyed, sad or crying faces, and the crowd, the cores and the guests are all joyful faces', { skip: NO_COLLECTION }, () => {
  const SOUR = ['angry', 'annoyed', 'sad & hurt', 'crying'];
  for (const [name, list] of Object.entries({ BURST_FACES, GALAXY_FACES, FILLER })) {
    for (const f of list) assert.ok(!entry.get(f)!.moods.some((m) => SOUR.includes(m)), `${name}: ${f} is ${entry.get(f)!.moods.join(', ')}`);
  }
  const JOY = ['happy', 'cute', 'love', 'blush & shy', 'surprised & scared', 'hugs & friends', 'dance & music', 'cats', 'bears', 'bunnies', 'wink & smug', 'birds, fish & other animals', 'dogs'];
  for (const [name, list] of Object.entries({ CROWD_FACES, CORE_FACES, GUESTS })) {
    for (const f of list) assert.ok(entry.get(f)!.moods.some((m) => JOY.includes(m)), `${name}: ${f} is only ${entry.get(f)!.moods.join(', ')}`);
  }
});

test('no rude gestures or weapons anywhere in the drop’s cast', () => {
  for (const f of [HERO, FLIPPER, FLIPPER_CALM, ...MOON, ...PLANETS, ...Object.values(PICKED).flat(), ...PANIC]) assert.ok(!/[凸🖕︻═]/u.test(f), `${f} is rude`);
});

test('the crowd faces are short faces of 3–8 characters', () => {
  for (const f of CROWD_FACES) assert.ok([...f].length >= 3 && [...f].length <= 8, f);
});

test('the named faces: (•ω•) is the hero, (￣▽￣) the calm guest, (╯°□°)╯ the guest who flips', () => {
  assert.equal(HERO, '(•ω•)');
  assert.equal(FLIPPER_CALM, '(￣▽￣)');
  assert.equal(FLIPPER, '(╯°□°)╯');
});

test('the cast file is what cast.mjs writes', { skip: NO_COLLECTION }, () => {
  const before = fs.readFileSync(new URL('../src/content/castDrop1.ts', import.meta.url), 'utf8');
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/cast.mjs', import.meta.url)), '--print'], { encoding: 'utf8' });
  assert.equal(out, before);
});
