// Renderer A's screen overlay (the cosmos, bars 1–2): what is drawn once per output frame after the Riso print, clean of the print and of
// the motion blur (build sheet notes/bcos/sheet.md §7.1). The threat count (an amber number and the Defender's red word), the bang's
// caption, the ring-counter round Earth (real 3D: the output frame's camera and the rig's punch; characters behind the globe hidden), its
// unwrap into `8,100,000,000` and the red `THREATS` slamming after it, and the party monitor (hud.ts's box, glyph for glyph).
import * as THREE from 'three';
import { LEVEL_TYPE, groupDigits, shortCount, threatWord } from '../content/cosmos.ts';
import { type RGB, linear } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Shape } from '../engine/shapeField.ts';
import { rigAt } from '../score/energy.ts';
import { BANG, EAMES, FOUNTAIN, LEVELS, LOCK, POWERS, REAM_PASTES, SLICE, UNWRAP, threatsAt } from '../score/cosmos.ts';
import { FOV, FRONT, defenderRed } from '../shots/cosmosKit.ts';
import { Im, LK, LK_LEAD, type V3, crashZoom, eamesRush, lerp, project } from '../shots/cosmosBang.ts';
import {
  EARTH_FOCAL, RING_BLOCK, RING_EM, RING_SLOTS, UNWRAP_ROW, earthCamera, monitorRows, monitorText, ringChar, ringShown, ringSlot, rowExit, threatsSlam, unwrapped,
} from '../shots/cosmosEarth.ts';
import { HUD } from '../shots/hud.ts';
import { PALETTE } from '../worlds/terminal.ts';
import { ACardField, CARD_MODE } from './cosmosAFields.ts';
import { type AKit, aim } from './cosmosAKit.ts';
import { eamesSquare } from './cosmosABang.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const AMBER: RGB = linear('#FFB23E', 1.5);
const PAPER: RGB = linear('#F2EDE3', 1.2);
const PINK: RGB = linear('#FFB0D8', 1.1);
const OUTLINE: RGB = linear('#0B0824');
const GREEN = linear(PALETTE.green, 1.4);
const DIM = linear(PALETTE.text, 0.55);
const PANEL = linear('#06091C');
/** The Eames squares' and the zoom-out keyline's cream (rules, not light: they stay paper). */
const RULE: RGB = linear('#F6EFDF');

/** Where bar 2's printed label and its caption sit (screen px, y up): the ring's type sinks behind it. */
const LABEL_BOX = { x0: -950, x1: -100, y0: 110, y1: 480 } as const;

const lastOf = (list: readonly number[], f: number): number => {
  let k = -1e9;
  for (const v of list) if (v <= f && v > k) k = v;
  return k;
};

/** Is the segment from `eye` to `p` cut by Earth (the unit sphere)? */
function behindEarth(eye: V3, p: V3): boolean {
  const d: V3 = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
  const a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const b = 2 * (eye[0] * d[0] + eye[1] * d[1] + eye[2] * d[2]);
  const c = eye[0] * eye[0] + eye[1] * eye[1] + eye[2] * eye[2] - 1;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t > 0 && t < 1;
}

export class AOverlay {
  private kit!: AKit;
  private ring!: ACardField;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.002, 300);
  private aspect = 16 / 9;
  private frontBlock = -1;

  init(kit: AKit, size: { width: number; height: number }): void {
    this.kit = kit;
    this.aspect = size.width / size.height;
    // the digits outlined in printed space like THREATS, so the amber reads over the amber globe
    this.ring = new ACardField({ capacity: RING_SLOTS + 16, atlas: kit.display, blend: 'over', depthTest: false, outline: { width: (0.07 * kit.display.fontPx) / kit.display.radius, color: OUTLINE } });
    this.ring.material.uniforms.uUnmirror.value = 0;
    this.scene.add(this.ring.mesh);
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    if (frame < LEVELS.earth) this.bang(gl, target, frame);
    else this.earth(gl, target, frame);
  }

  /** A display count: the amber number, then the Defender's red word, at (x, baseline y), left aligned, `size` px, scaled by `pop` about its left. */
  private count(n: number, text: string, x: number, y: number, size: number, pop: number, frame: number): Glyph[] {
    const adv = this.kit.advDisplay;
    const s = size * pop;
    const mid = y + s * 0.36;
    const out: Glyph[] = [];
    const red = linear(defenderRed(frame), 1.3);
    let cx = x;
    const put = (str: string, color: RGB) => {
      for (const ch of str) {
        const w = adv(ch) * s;
        if (ch.trim() !== '') out.push({ ch, x: cx + w / 2, y: mid, size: s, color, outline: 0.07, outlineColor: OUTLINE });
        cx += w;
      }
    };
    put(text, AMBER);
    put(` ${threatWord(n)}`, red);
    return out;
  }

  /**
   * Bar 1: the count bottom-left (1 THREAT → 118k THREATS, alive through the crash zoom-out: 17k on 1.4&, 118k on 1.4a), popping on each
   * paste; the caption flying in under his card on the lock; the crash zoom-out's cream keyline round the shrinking bang, the Eames
   * squares rushing in one per 32nd and the one closing on the spark (crisp rules after the print: printed, 3 px rules screen away).
   */
  private bang(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const display: Glyph[] = [];
    const mono: Glyph[] = [];
    const plate: Shape[] = [];
    const rules: Shape[] = [];
    const z = crashZoom(frame);
    if (frame >= POWERS[0] && z < 0.995 && z > 0.003) {
      const w = 1920 * z;
      const h = 1080 * z;
      const t = 3;
      rules.push({ kind: 'rect', x: 0, y: h / 2, w: w + t, h: t, color: RULE }, { kind: 'rect', x: 0, y: -h / 2, w: w + t, h: t, color: RULE });
      rules.push({ kind: 'rect', x: w / 2, y: 0, w: t, h: h + t, color: RULE }, { kind: 'rect', x: -w / 2, y: 0, w: t, h: h + t, color: RULE });
    }
    for (const sq of eamesRush(frame)) {
      const h = sq.half;
      const w2 = (h * 16) / 9;
      for (const [x, y, ww, hh] of [[0, h, 2 * w2, 3], [0, -h, 2 * w2, 3], [w2, 0, 3, 2 * h], [-w2, 0, 3, 2 * h]] as const) rules.push({ kind: 'rect', x, y, w: ww, h: hh, color: RULE, alpha: sq.alpha });
    }
    if (frame >= EAMES[0]) rules.push(...eamesSquare(frame - EAMES[0], 60).map((s) => ({ ...s, color: RULE })));
    if (frame < LEVELS.earth) {
      const n = threatsAt(frame);
      const changes = [BANG, ...REAM_PASTES.map((p) => p.at), ...FOUNTAIN.slice(1).map((p) => p.at)];
      const k = lastOf(changes, frame);
      const pop = 1 + 0.3 * (1 - Math.min(1, Im(frame - k + 2, 2)));
      display.push(...this.count(n, shortCount(n), -900, -490, 124, pop, frame));
    }
    if (frame >= LOCK.from - LK_LEAD && frame < SLICE.at) {
      const u = Math.min(1, LK(frame - LOCK.from));
      const y = lerp(-600, -340, u);
      const adv = this.kit.advMono;
      const parts: [string, RGB][] = [['VIRUS · ', PAPER], ['343', AMBER], [' THREATS', linear(defenderRed(frame), 1.3)]];
      const size = 34;
      const width = parts.reduce((w, [s]) => w + [...s].reduce((a, ch) => a + adv(ch) * size, 0), 0);
      let x = -width / 2;
      for (const [s, c] of parts) {
        for (const ch of s) {
          const w = adv(ch) * size;
          if (ch.trim() !== '') mono.push({ ch, x: x + w / 2, y, size, color: c });
          x += w;
        }
      }
      const legend = LEVEL_TYPE.bang.legend;
      const lw = [...legend].reduce((a, ch) => a + adv(ch) * 22, 0);
      // a tag of printed space under the two lines, so the caption reads over the ream's stripes
      plate.push({ kind: 'rect', x: 0, y: y - 18, w: Math.max(width, lw) + 44, h: 96, color: OUTLINE, alpha: 0.82 * u, soft: 6 });
      let lx = -lw / 2;
      for (const ch of legend) {
        const w = adv(ch) * 22;
        if (ch.trim() !== '') mono.push({ ch, x: lx + w / 2, y: y - 40, size: 22, color: PINK });
        lx += w;
      }
    }
    if (display.length || mono.length || rules.length) this.kit.type.draw(gl, target, SCREEN, { under: [...rules, ...plate], glyphs: { display, mono }, over: [] }, null);
  }

  /** Bar 2: the ring-counter, its unwrap and THREATS; the party monitor; the landing's Eames square, pinned to his tile as the camera tilts away. */
  private earth(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.ringCounter(gl, target, frame);
    const display: Glyph[] = [];
    const rules: Shape[] = [];
    if (frame >= EAMES[1] && frame - EAMES[1] < 22) {
      const tile = project(earthCamera(frame).pose, [0, 1.001, 0], EARTH_FOCAL);
      if (tile && Math.abs(tile.x) < 1100 && Math.abs(tile.y) < 700) rules.push(...eamesSquare(frame - EAMES[1], 80).map((s) => ({ ...s, x: s.x + tile.x, y: s.y + tile.y, color: RULE })));
    }
    const slam = threatsSlam(frame);
    const exit = rowExit(frame);
    if (slam !== null && exit < 1) {
      const adv = this.kit.advDisplay;
      const word = threatWord(2);
      const s = UNWRAP_ROW.word.size * slam;
      const w = [...word].reduce((a, ch) => a + adv(ch) * s, 0);
      let x = -w / 2 - 700 * exit * exit;
      const red = linear(defenderRed(frame), 1.3);
      for (const ch of word) {
        const cw = adv(ch) * s;
        display.push({ ch, x: x + cw / 2, y: UNWRAP_ROW.word.y, size: s, color: red, alpha: 1 - exit, stretch: 1 + 2.5 * exit, outline: 0.07, outlineColor: OUTLINE });
        x += cw;
      }
    }
    const under: Shape[] = [...rules];
    const readout: Glyph[] = [];
    const m = monitorRows(frame);
    if (m) {
      const rows = monitorText(m);
      const adv = this.kit.advReadout;
      const cell = adv('═') * HUD.size;
      const left = -960 + HUD.margin;
      const bottom = -540 + HUD.margin;
      const top = bottom + HUD.pitch * rows.length;
      const cols = rows[0].length;
      under.push({ kind: 'rect', x: left - 6 + (cols * cell + 12) / 2, y: (top + bottom) / 2, w: cols * cell + 12, h: (top - bottom + 8) * m.shown, color: PANEL, alpha: HUD.panel });
      const count = Math.ceil(m.typed * cols * 1.5);
      rows.forEach((r, i) => {
        const y = (top + bottom) / 2 + (top - i * HUD.pitch - HUD.pitch / 2 - (top + bottom) / 2) * m.shown;
        [...r].slice(0, count).forEach((ch, c) => {
          if (ch.trim() === '') return;
          const frameCh = '╔═╗║╚╝'.includes(ch);
          readout.push({ ch, x: left + (c + 0.5) * cell, y, size: HUD.size, color: frameCh ? DIM : GREEN, alpha: m.shown });
        });
      });
    }
    if (display.length || readout.length || under.length) this.kit.type.draw(gl, target, SCREEN, { under, glyphs: { display, readout }, over: [] }, null);
  }

  /** The block of the ring whose count faces the camera on 2.4 (it unwraps into the row; the others fade). */
  private pickFront(): number {
    if (this.frontBlock >= 0) return this.frontBlock;
    const cam = earthCamera(UNWRAP.at).pose;
    let best = 0;
    let bestScore = Infinity;
    for (let b = 0; b < RING_SLOTS / RING_BLOCK; b++) {
      const slot = ringSlot(b * RING_BLOCK + 6, UNWRAP.at);
      if (behindEarth(cam.position, slot.centre)) continue;
      const d: V3 = [slot.centre[0] - cam.position[0], slot.centre[1] - cam.position[1], slot.centre[2] - cam.position[2]];
      const len = Math.hypot(...d);
      const fwd: V3 = [cam.target[0] - cam.position[0], cam.target[1] - cam.position[1], cam.target[2] - cam.position[2]];
      const fl = Math.hypot(...fwd);
      const score = 1 - (d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2]) / (len * fl);
      if (score < bestScore) {
        bestScore = score;
        best = b;
      }
    }
    this.frontBlock = best;
    return best;
  }

  /** The ring-counter in 3D (the output frame's camera, the rig's punch), unwrapping on 2.4 into the locked row. */
  private ringCounter(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const u = unwrapped(frame);
    const exit = rowExit(frame);
    if (!ringShown(frame) && (u === 0 || exit >= 1)) return;
    const pose = earthCamera(frame).pose;
    aim(this.camera, pose, 0.002, 300, this.aspect);
    const rig = rigAt(frame);
    if (rig.zoom !== 1) this.camera.projectionMatrix.premultiply(new THREE.Matrix4().makeScale(rig.zoom, rig.zoom, 1));
    const display = this.kit.display;
    const quadEm = display.cellH / display.fontPx;
    const fadeIn = Math.min(1, Math.max(0, (frame - (LEVELS.earth + 12)) / 8));
    const front = this.pickFront();
    const red = linear(defenderRed(frame), 1.3);
    // the row: `8,100,000,000` centred across the lower third
    const rowText = groupDigits(8.1e9);
    const adv = this.kit.advDisplay;
    const rowW = [...rowText].reduce((a, ch) => a + adv(ch) * UNWRAP_ROW.size, 0);
    const rowX: number[] = [];
    let rx = -rowW / 2;
    for (const ch of rowText) {
      rowX.push(rx + (adv(ch) * UNWRAP_ROW.size) / 2);
      rx += adv(ch) * UNWRAP_ROW.size;
    }
    this.ring.begin();
    const proj = (q: V3): [number, number] => {
      const v = new THREE.Vector3(q[0], q[1], q[2]).project(this.camera);
      return [v.x, v.y];
    };
    for (let blk = 0; blk < RING_SLOTS / RING_BLOCK; blk++) {
      // each block reads left to right and upright from where the camera stands: its run of slots reversed and its cards turned when needed
      const mid = ringSlot(blk * RING_BLOCK + RING_BLOCK / 2, frame);
      const p0 = proj(mid.centre);
      const pt = proj([mid.centre[0] + mid.tangent[0] * 0.01, mid.centre[1] + mid.tangent[1] * 0.01, mid.centre[2] + mid.tangent[2] * 0.01]);
      const pn = proj([mid.centre[0] + mid.normal[0] * 0.01, mid.centre[1] + mid.normal[1] * 0.01, mid.centre[2] + mid.normal[2] * 0.01]);
      const rev = pt[0] < p0[0];
      const flipUp = pn[1] < p0[1];
      for (let k = 0; k < RING_BLOCK; k++) {
        const sIdx = blk * RING_BLOCK + (rev ? RING_BLOCK - 1 - k : k);
        const inRow = blk === front && k < 13 && u > 0;
        const { ch: live, count } = ringChar(blk * RING_BLOCK + k, frame);
        const ch = inRow ? rowText[k] : live;
        if (ch.trim() === '') continue;
        const e = display.entries.get(ch);
        if (!e) continue;
        const slot = ringSlot(sIdx, frame);
        const hidden = behindEarth(pose.position, slot.centre);
        let alpha = (hidden ? 0 : 1) * fadeIn;
        if (u > 0 && !inRow) alpha *= 1 - u;
        // the arch passes behind the printed label top-left (`10⁷ m` and its caption): its type is masked there (a 40 px fade) so both read
        if (!inRow && alpha > 0.01) {
          const q = proj(slot.centre);
          const d = Math.max(LABEL_BOX.x0 - q[0] * 960, q[0] * 960 - LABEL_BOX.x1, LABEL_BOX.y0 - q[1] * 540, q[1] * 540 - LABEL_BOX.y1);
          if (d < 40) alpha *= Math.max(0, d / 40);
        }
        if (alpha <= 0.01 && !inRow) continue;
        const hh = (RING_EM * quadEm) / 2;
        const hw = hh * e.aspect;
        const t = rev ? -1 : 1;
        const nn = flipUp ? -1 : 1;
        const right: V3 = [slot.tangent[0] * hw * t, slot.tangent[1] * hw * t, slot.tangent[2] * hw * t];
        const up: V3 = [slot.normal[0] * hh * nn, slot.normal[1] * hh * nn, slot.normal[2] * hh * nn];
        const color = count ? AMBER : red;
        let flat: [number, number, number, number] | undefined;
        let mix = 0;
        if (inRow) {
          const fh = (UNWRAP_ROW.size * quadEm) / 2;
          flat = [(rowX[k] - 700 * exit * exit) / 960, UNWRAP_ROW.y / 540, (fh * e.aspect * (1 + 2.5 * exit)) / 960, fh / 540];
          mix = u;
          alpha = Math.max(alpha, u) * (1 - exit);
        }
        this.ring.push({ centre: slot.centre, right, up, uv: [e.u0, e.v0, e.u1, e.v1], ink: [color[0], color[1], color[2], alpha], bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.glyph, aspect: e.aspect, flat, mix });
      }
    }
    this.ring.end();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.ring.dispose();
  }
}
