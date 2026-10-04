// Break bar 6 (src/score/break.ts LAUNCH): the launch. Owned by the launch builder (build sheet
// notes/break/break-sheet.md §3 break bar 6, §4.7, §4.8 (the window), §4.12, §7.2–§7.3). From the hard match cut on break 6.1 (a segment
// boundary: no sub-frame crosses it) every sub-frame is drawn in three passes:
//   1. the world (src/shots/breakLaunch.ts) into a HalfFloat backplate: the violet ground, break bar 5's blocks (sheared through their own
//      ShapeField's model matrix, so the whole field leans −10° from break 6.3 + 3), the confetti, the band's cord, the extrude stack / the band's
//      links, then — in a second draw — his hard shadow, him (ง•ω•)ง✧ → ─=≡Σ((( つ•ω•)つ, his brows, the fist's glint, and over him the
//      anchor post (the band's pin);
//   2. E5's window (the system's one voice) into a transparent HalfFloat `screen` target, in screen px (its backing opaque, so nothing
//      of the world shows through what is printed on the screen);
//   3. E6, the soap film (real 3D, the break's one 3D shot, S26): a 192 × 108-quad membrane over the whole frame, held by the frame's
//      edges and displaced away from us toward him (positions, normals and the stretch thinning per vertex from src/shots/breakFilm.ts;
//      the marbling, the drain and the black spot per pixel from the same module's GLSL), shading = the backplate seen 1:1 (no lens:
//      review round 2, R2-01) with the window printed on it, plus thin-film interference (a LUT of thinFilmRGB, coloured only where the
//      film is thin) times the studio it reflects — never on ink and never on his face (his mask: the front draw again into `mask`) —
//      plus through the held breath the black spot round his ω's ink centre and its crisp silver-gold ring (filmHalo, R2-02).
//      With its colour at 0 and no depth (until break 6.3 + 3) it is exactly the backplate with the window over it, so the step into 6.3's frame is seamless.
// The film and the window printed on it are the screen: the mesh is scaled by the inverse of the rig's zoom (the break's rig only
// punches), so after the pipeline punches the frame they stay put while the world behind them punches.
// `next` is drop 2's scene (shared): the break does not draw it (the pop is drop 2's own first frames, drawn from breakFilm.ts).
//
// v2 (LAUNCH_V2, sheet notes/bid2/break-sheet2.md §3 bars 7–8): the same three passes draw break 6.4a → drop 2 natively from
// src/shots/breakLaunch.ts launchAtV2 and breakFilm.ts filmAtV2 — the world in three draws (behind him: the confetti, the braced fork,
// the cords, the cars, the stack and the links; him; over him in break 8 until he passes the fork's plane: the band and the fork), the
// window and the red cursor printed on the screen, and the film over it all (break 7: no colour, no depth — the world and the window as
// they are; break 8: the fake drop's suction, dome and black spot). With LAUNCH_V2 false only v04's path is built and drawn, exactly as
// approved (the dispatcher's stub then plays it one bar later).
import * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import { linear } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { type Shape, ShapeField } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { rigAt } from '../score/energy.ts';
import { FILM, FILM_AMBIENT, FILM_ENV_GLSL, FILM_FRONT, FILM_HALO_GLSL, FILM_MARBLE_GLSL, FILM_OVER_GLSL, FILM_RIM_GLSL, type FilmState, HOLE, domeGlint, filmAt, filmAtV2, filmLUT } from '../shots/breakFilm.ts';
import {
  LAUNCH_ATLAS,
  LAUNCH_ATLAS_V2,
  LAUNCH_V2,
  type LaunchLayout,
  launchAt,
  launchAtV2,
  launchLook,
  launchSegment,
  launchSegmentV2,
  launchTemporal,
  launchTemporalV2,
} from '../shots/breakLaunch.ts';
import { BREAK_PALETTE, FOV, FRONT } from '../shots/breakShared.ts';
import type { BreakPart } from './break.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
/** The film's mesh: one quad per 10 px. */
const GRID = { x: 192, y: 108 } as const;

/** The film's shaders, exported so drop 2 can draw the same film around its pop (uniforms: see BreakLaunch.init). */
export const FILM_VERT = /* glsl */ `
attribute vec2 aRest;
attribute float aStretch;
varying vec2 vRest;
varying float vStretch;
varying vec3 vObj;
varying vec3 vNormal;
void main() {
  vRest = aRest;
  vStretch = aStretch;
  vObj = position;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const FILM_FRAG = /* glsl */ `
uniform sampler2D backplate;
uniform sampler2D printed;
uniform sampler2D heroMask;
uniform sampler2D lut;
uniform vec2 resolution;
uniform float amount;
uniform float lutMax;
uniform float lutSize;
uniform vec2 anchor;
uniform vec2 apex;
uniform float blackPx;
uniform float blackNm;
uniform float heroOn;
uniform float spec;
uniform float ambient;
uniform float camZ;
uniform float thick;
uniform float drainTop;
uniform float marbleAmp;
uniform float marbleScale;
uniform float flowPhase;
uniform float pulse;
uniform float sweep;
uniform float ior;
varying vec2 vRest;
varying float vStretch;
varying vec3 vObj;
varying vec3 vNormal;
${FILM_MARBLE_GLSL}
${FILM_ENV_GLSL}
${FILM_HALO_GLSL}
${FILM_OVER_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vObj - vec3(0.0, 0.0, camZ));
  float cosI = clamp(-dot(v, n), 0.0, 1.0);
  vec3 r = reflect(v, n);
  // The world behind, seen 1:1 at this very pixel (a soap film is two parallel surfaces a micron apart: no lens, every channel
  // registered), and the window printed on the film (it balloons with it).
  vec2 suv = gl_FragCoord.xy / resolution;
  vec3 base = texture2D(backplate, suv).rgb;
  vec4 ink = texture2D(printed, vec2(vRest.x / 1920.0, 1.0 - vRest.y / 1080.0));
  base = ink.rgb + base * (1.0 - ink.a);
  // His face (his mask: him, his shadow, his brows, the post): the film leaves it alone (heroOn 0: no mask).
  float hero = heroOn * texture2D(heroMask, suv).a;
  // Where this point of the film is seen on the screen (layout px): the black spot and its ring are round there, about his ω's ink.
  float k = camZ / (camZ - vObj.z);
  float dist = length(vec2(960.0 + vObj.x * k, 540.0 - vObj.y * k) - apex);
  float m = filmBlack(dist, blackPx);
  // Its thickness: drained toward the top (fastest near it), marbled in fine fringes, stretched thin on the slopes; black film inside the spot.
  float yy = clamp(vRest.y / 1080.0, 0.0, 1.0);
  float drain = drainTop + (1.0 - drainTop) * (1.0 - (1.0 - yy) * (1.0 - yy));
  float d = max(0.0, (thick * drain + marbleAmp * pulse * marbling(vec2(vRest.x / marbleScale, vRest.y / marbleScale + flowPhase))) * vStretch);
  d = mix(d, blackNm, m);
  float cosT = sqrt(1.0 - (1.0 - cosI * cosI) / (ior * ior));
  float e = d * cosT;
  vec3 film = texture2D(lut, vec2((clamp(e / lutMax, 0.0, 1.0) * (lutSize - 1.0) + 0.5) / lutSize, 0.5)).rgb;
  // The reflection's footprint per pixel (tangent-plane units): where the dimple minifies the studio, its lights blur instead of aliasing.
  vec2 tr = r.xy / max(abs(r.z), 0.05);
  vec3 env = filmEnv(r, min(length(fwidth(tr)) * 4.0, 1.5), sweep);
  // The softboxes also glint white (a neutral specular on the lights only, not on the even studio), except on black film.
  vec3 refl = film * env + spec * smoothstep(22.0, 50.0, e) * max(env - vec3(ambient), 0.0);
  gl_FragColor = vec4(filmOver(base, film, refl, amount, hero, m, filmHalo(dist, blackPx)), 1.0);
}`;

/** Replaces `from` (which must occur exactly once) in `src`. */
const spliceOnce = (src: string, from: string, to: string): string => {
  const i = src.indexOf(from);
  if (i < 0 || src.indexOf(from, i + from.length) >= 0) throw new Error(`breakLaunch: FILM_FRAG splice point not unique: ${from.slice(0, 40)}`);
  return src.slice(0, i) + to + src.slice(i + from.length);
};
/** A number as a GLSL float literal; a linear colour as a vec3. */
const gf = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const gv3 = (hex: string): string => `vec3(${linear(hex).map(gf).join(', ')})`;
/**
 * The hole his ω eats, as drop 2's own world (breakFilm.ts HOLE; the continuity plan v07 §2.7): `vec3 holeWorld(vec2 p, float hero)` at
 * screen point p (layout px) — drop 2's terminal ground, one lens ring or none per cell drifting out from his ω (`holeT` frames after he
 * gets it), and where his mask is (`hero`) him in drop 2's glyph rows: a 3 × 5 dot matrix a cell, retyped every few frames, green, his ω
 * pink. Needs FILM_MARBLE_GLSL's kxHash and the `apex` uniform.
 */
export const HOLE_GLSL = /* glsl */ `
uniform float holeOn;
uniform float holeT;
vec3 holeWorld(vec2 p, float hero) {
  vec3 col = ${gv3(HOLE.world)};
  vec2 q = apex + (p - apex) / (1.0 + ${gf(HOLE.bubbles.drift)} * holeT);
  vec2 cell = floor(q / ${gf(HOLE.bubbles.cell)});
  int cx = int(cell.x);
  int cy = int(cell.y);
  if (kxHash(cx, cy, 91) < ${gf(HOLE.bubbles.share)}) {
    vec2 c = (cell + vec2(0.2 + 0.6 * kxHash(cx, cy, 92), 0.2 + 0.6 * kxHash(cx, cy, 93))) * ${gf(HOLE.bubbles.cell)};
    float r = ${gf(HOLE.bubbles.r[0])} + ${gf(HOLE.bubbles.r[1] - HOLE.bubbles.r[0])} * kxHash(cx, cy, 94);
    vec2 v = q - c;
    float ring = 1.0 - smoothstep(0.8, 2.0, abs(length(v) - r));
    float glint = 1.0 - smoothstep(0.0, 1.5, length(v + 0.4 * r * vec2(1.0, 1.0)) - 0.2 * r);
    vec3 tint = 0.5 + 0.5 * cos(6.2831853 * (atan(v.y, v.x) / 6.2831853 + vec3(0.0, 0.33, 0.67)));
    col += 0.5 * ring * mix(vec3(1.0), tint, 0.5) + 0.7 * glint;
  }
  if (hero > 0.0) {
    vec2 cs = vec2(${gf(HOLE.glyph.cell[0])}, ${gf(HOLE.glyph.cell[1])});
    vec2 gc = floor(p / cs);
    vec2 dm = floor((p - gc * cs - 1.0) / ${gf(HOLE.glyph.dot)});
    float inCell = step(0.0, dm.x) * step(dm.x, 2.0) * step(0.0, dm.y) * step(dm.y, 4.0);
    int seed = 95 + int(floor(holeT / ${gf(HOLE.glyph.retype)}));
    float lit = inCell * step(0.42, kxHash(int(gc.x) * 3 + int(dm.x), int(gc.y) * 5 + int(dm.y), seed));
    vec2 e = (p - apex) / vec2(${gf(HOLE.omega[0])}, ${gf(HOLE.omega[1])});
    vec3 glyph = dot(e, e) < 1.0 ? ${gv3(HOLE.pink)} : ${gv3(HOLE.green)};
    col = mix(col, ${gv3(HOLE.world)} + lit * glyph, hero);
  }
  return col;
}`;

/**
 * v2's film shader: FILM_FRAG (kept exactly as approved for v04's film, and as drop 2 splices it) plus break 8's suction rim
 * (breakFilm.ts FILM_RIM / filmRim, review round 1 F4): the iridescent band round him, over the film's light, never on ink, on the
 * window printed on the film or on his face; and (v07, HOLE_GLSL) inside the black spot drop 2's world instead of the world behind the
 * film (the window printed on the film stays on it).
 * Its last statement keeps FILM_FRAG's shape (`gl_FragColor = vec4(…, 1.0);`).
 */
export const FILM_FRAG_V2 = spliceOnce(
  spliceOnce(
    spliceOnce(spliceOnce(FILM_FRAG, 'uniform float ior;', 'uniform float ior;\nuniform float rimPx;\nuniform float rimAmt;'), 'void main() {', `${FILM_RIM_GLSL}\n${HOLE_GLSL}\nvoid main() {`),
    '  base = ink.rgb + base * (1.0 - ink.a);',
    `  if (holeOn > 0.0) {
    float hk = camZ / (camZ - vObj.z);
    vec2 hp = vec2(960.0 + vObj.x * hk, 540.0 - vObj.y * hk);
    float hm = filmBlack(length(hp - apex), blackPx);
    if (hm > 0.0) base = mix(base, holeWorld(hp, heroOn * texture2D(heroMask, suv).a), hm);
  }
  base = ink.rgb + base * (1.0 - ink.a);`,
  ),
  '  gl_FragColor = vec4(filmOver(base, film, refl, amount, hero, m, filmHalo(dist, blackPx)), 1.0);',
  `  vec4 halo = filmHalo(dist, blackPx);
  halo.a *= 1.0 - holeOn * ink.a;
  vec3 col = filmOver(base, film, refl, amount, hero, m, halo);
  vec4 rim = filmRim(dist, rimPx, rimAmt);
  col = mix(col, rim.rgb, rim.a * (1.0 - hero) * (1.0 - ink.a) * smoothstep(${FILM.ink[0]}, ${FILM.ink[1]}, dot(base, vec3(0.2126, 0.7152, 0.0722))));
  gl_FragColor = vec4(col, 1.0);`,
);

export class BreakLaunch implements BreakPart {
  /** Drop 2's scene, made on first call: kept for the contract, not drawn (drop 2 draws the pop itself from breakFilm.ts). */
  readonly next: (() => Renderable) | undefined;
  private world: FlatLayer | null = null;
  private screen: FlatLayer | null = null;
  private blocks: ShapeField | null = null;
  private layout: LaunchLayout | null = null;
  private backplate: THREE.WebGLRenderTarget | null = null;
  private printed: THREE.WebGLRenderTarget | null = null;
  /** His mask (alpha): him, his shadow, his brows, the post — drawn again into a clear target so the film can leave them alone. */
  private mask: THREE.WebGLRenderTarget | null = null;
  private readonly filmScene = new THREE.Scene();
  private readonly filmCamera = new THREE.PerspectiveCamera(20, 16 / 9, 10, 20000);
  private film: THREE.Mesh | null = null;
  private filmMaterial: THREE.ShaderMaterial | null = null;
  private behind: FullscreenQuad | null = null;
  private flat = false;
  private readonly owned: { dispose(): void }[] = [];
  /** Draws break 6.4a → drop 2 natively (v2) instead of v04's bar 6; fixed for the scene's life (the module's switch). */
  private readonly v2 = LAUNCH_V2;

  constructor(next?: () => Renderable) {
    this.next = next;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.v2) return this.initV2(size);
    await loadFonts();
    const hero = buildGlyphAtlas(chars(LAUNCH_ATLAS.hero), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 24, size: 2048 });
    const mono = buildGlyphAtlas(chars(LAUNCH_ATLAS.mono), (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 12, size: 2048 });
    const aspect = size.width / size.height;
    this.world = new FlatLayer({ atlases: { hero }, blend: 'normal', aspect, shapes: 512, glyphs: 1024 });
    this.screen = new FlatLayer({ atlases: { mono, hero }, blend: 'normal', aspect, shapes: 64, glyphs: 512 });
    // The blocks lean through their own field's model matrix (a shear about the world origin), drawn after the paper, before the rest.
    this.blocks = new ShapeField({ capacity: 32, blend: 'normal' });
    this.blocks.mesh.renderOrder = -0.5;
    this.blocks.mesh.matrixAutoUpdate = false;
    this.world.scene.add(this.blocks.mesh);
    this.layout = { advance: advanceOf(hero) };
    this.owned.push(hero.texture, mono.texture, this.world, this.screen, this.blocks);

    this.backplate = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    this.printed = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    this.mask = new THREE.WebGLRenderTarget(size.width, size.height);
    this.owned.push(this.backplate, this.printed, this.mask);

    // The thin-film colour as a texture: thinFilmRGB itself, sampled by thickness.
    const l = filmLUT();
    const lut = new THREE.DataTexture(Uint16Array.from(l.data, (v) => THREE.DataUtils.toHalfFloat(v)), l.size, 1, THREE.RGBAFormat, THREE.HalfFloatType);
    lut.minFilter = THREE.LinearFilter;
    lut.magFilter = THREE.LinearFilter;
    lut.wrapS = THREE.ClampToEdgeWrapping;
    lut.wrapT = THREE.ClampToEdgeWrapping;
    lut.needsUpdate = true;
    this.owned.push(lut);

    // The membrane: rest positions (film px) as an attribute; positions, normals and the stretch rewritten per sub-frame.
    const geo = new THREE.PlaneGeometry(1920, 1080, GRID.x, GRID.y);
    const pos = geo.getAttribute('position');
    const rest = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) rest.set([pos.getX(i) + 960, 540 - pos.getY(i)], 2 * i);
    geo.setAttribute('aRest', new THREE.BufferAttribute(rest, 2));
    geo.setAttribute('aStretch', new THREE.BufferAttribute(new Float32Array(pos.count).fill(1), 1));
    (pos as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.filmMaterial = new THREE.ShaderMaterial({
      uniforms: {
        backplate: { value: this.backplate.texture },
        printed: { value: this.printed.texture },
        heroMask: { value: this.mask.texture },
        heroOn: { value: 1 },
        lut: { value: lut },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        amount: { value: 0 },
        lutMax: { value: l.maxNm },
        lutSize: { value: l.size },
        anchor: { value: new THREE.Vector2() },
        apex: { value: new THREE.Vector2() },
        blackPx: { value: 0 },
        blackNm: { value: FILM.black.nm },
        spec: { value: FILM.spec },
        ambient: { value: FILM_AMBIENT.front },
        camZ: { value: FILM_FRONT },
        thick: { value: FILM.thick },
        drainTop: { value: FILM.drainTop },
        marbleAmp: { value: FILM.marble },
        marbleScale: { value: FILM.marbleScale },
        flowPhase: { value: 0 },
        pulse: { value: 1 },
        sweep: { value: 0 },
        ior: { value: FILM.n },
      },
      vertexShader: FILM_VERT,
      fragmentShader: FILM_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.film = new THREE.Mesh(geo, this.filmMaterial);
    this.film.frustumCulled = false;
    this.behind = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: this.backplate.texture } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0); }',
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.behind.mesh.renderOrder = -1;
    this.filmScene.add(this.behind.mesh, this.film);
    this.owned.push(geo, this.filmMaterial, this.behind);
    this.filmCamera.aspect = aspect;
    this.filmCamera.position.set(0, 0, FILM_FRONT);
    this.filmCamera.lookAt(0, 0, 0);
    this.filmCamera.updateProjectionMatrix();
  }

  /** v2's init: v04's targets, film and studio, with v2's atlases (every face of bars 7–8, the window's new rows) and room for the fork, band and cursor. */
  private async initV2(size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const hero = buildGlyphAtlas(chars(LAUNCH_ATLAS_V2.hero), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 24, size: 2048 });
    const mono = buildGlyphAtlas(chars(LAUNCH_ATLAS_V2.mono), (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 12, size: 2048 });
    const aspect = size.width / size.height;
    this.world = new FlatLayer({ atlases: { hero }, blend: 'normal', aspect, shapes: 1024, glyphs: 1024 });
    this.screen = new FlatLayer({ atlases: { mono, hero }, blend: 'normal', aspect, shapes: 256, glyphs: 512 });
    this.layout = { advance: advanceOf(hero) };
    this.owned.push(hero.texture, mono.texture, this.world, this.screen);
    this.backplate = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    this.printed = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    this.mask = new THREE.WebGLRenderTarget(size.width, size.height);
    this.owned.push(this.backplate, this.printed, this.mask);
    this.buildFilm(size, aspect);
  }

  /** The film's mesh, its shader and the studio (v2; v04's init builds the same inline, kept as it was). */
  private buildFilm(size: { width: number; height: number }, aspect: number): void {
    const l = filmLUT();
    const lut = new THREE.DataTexture(Uint16Array.from(l.data, (v) => THREE.DataUtils.toHalfFloat(v)), l.size, 1, THREE.RGBAFormat, THREE.HalfFloatType);
    lut.minFilter = THREE.LinearFilter;
    lut.magFilter = THREE.LinearFilter;
    lut.wrapS = THREE.ClampToEdgeWrapping;
    lut.wrapT = THREE.ClampToEdgeWrapping;
    lut.needsUpdate = true;
    this.owned.push(lut);
    const geo = new THREE.PlaneGeometry(1920, 1080, GRID.x, GRID.y);
    const pos = geo.getAttribute('position');
    const rest = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) rest.set([pos.getX(i) + 960, 540 - pos.getY(i)], 2 * i);
    geo.setAttribute('aRest', new THREE.BufferAttribute(rest, 2));
    geo.setAttribute('aStretch', new THREE.BufferAttribute(new Float32Array(pos.count).fill(1), 1));
    (pos as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.filmMaterial = new THREE.ShaderMaterial({
      uniforms: {
        backplate: { value: this.backplate!.texture },
        printed: { value: this.printed!.texture },
        heroMask: { value: this.mask!.texture },
        heroOn: { value: 1 },
        lut: { value: lut },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        amount: { value: 0 },
        lutMax: { value: l.maxNm },
        lutSize: { value: l.size },
        anchor: { value: new THREE.Vector2() },
        apex: { value: new THREE.Vector2() },
        blackPx: { value: 0 },
        blackNm: { value: FILM.black.nm },
        spec: { value: FILM.spec },
        ambient: { value: FILM_AMBIENT.front },
        camZ: { value: FILM_FRONT },
        thick: { value: FILM.thick },
        drainTop: { value: FILM.drainTop },
        marbleAmp: { value: FILM.marble },
        marbleScale: { value: FILM.marbleScale },
        flowPhase: { value: 0 },
        pulse: { value: 1 },
        sweep: { value: 0 },
        ior: { value: FILM.n },
        rimPx: { value: 0 },
        rimAmt: { value: 0 },
        holeOn: { value: 0 },
        holeT: { value: 0 },
      },
      vertexShader: FILM_VERT,
      fragmentShader: FILM_FRAG_V2,
      depthTest: false,
      depthWrite: false,
    });
    this.film = new THREE.Mesh(geo, this.filmMaterial);
    this.film.frustumCulled = false;
    this.behind = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: this.backplate!.texture } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0); }',
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.behind.mesh.renderOrder = -1;
    this.filmScene.add(this.behind.mesh, this.film);
    this.owned.push(geo, this.filmMaterial, this.behind);
    this.filmCamera.aspect = aspect;
    this.filmCamera.position.set(0, 0, FILM_FRONT);
    this.filmCamera.lookAt(0, 0, 0);
    this.filmCamera.updateProjectionMatrix();
  }

  /** The membrane at instant f: positions, normals and stretch from breakFilm.ts (flat, once, while it has no depth). */
  private shapeFilm(f: number): void {
    this.shapeFilmAt(filmAt(f));
  }

  /** The membrane in state s: positions, normals and stretch (flat, once, while it has no depth). */
  private shapeFilmAt(s: FilmState): void {
    const geo = this.film!.geometry;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
    const str = geo.getAttribute('aStretch') as THREE.BufferAttribute;
    const u = this.filmMaterial!.uniforms;
    u.amount.value = s.amount;
    (u.anchor.value as THREE.Vector2).set(s.anchor[0], s.anchor[1]);
    (u.apex.value as THREE.Vector2).set(s.apex[0], s.apex[1]);
    // v2 draws the hole (HOLE: the black spot as a window onto drop 2, swallowing his ω at the end); v04's film draws its black spot.
    u.blackPx.value = s.holePx ?? s.blackPx;
    u.flowPhase.value = s.flow;
    u.pulse.value = s.pulse;
    u.sweep.value = s.sweep;
    // v2's suction rim (v04's material has no such uniforms: its film never has one).
    if (u.rimPx) {
      u.rimPx.value = s.rimPx ?? 0;
      u.rimAmt.value = s.rim ?? 0;
    }
    if (u.holeOn) {
      u.holeOn.value = s.holePx ? 1 : 0;
      u.holeT.value = s.holePx ? Math.max(0, s.frame - HOLE.from) : 0;
    }
    if (s.depth === 0 && this.flat) return;
    // The depth is separable: D · bx(x) · by(y). Each column's and row's profile and slope once, then their products per vertex.
    const cols = GRID.x + 1;
    const rows = GRID.y + 1;
    const bx = new Float64Array(cols);
    const sx = new Float64Array(cols);
    const by = new Float64Array(rows);
    const sy = new Float64Array(rows);
    const prof = (t: number, m: number, hi: number): [number, number] => {
      const left = t <= m;
      const w = left ? m : hi - m;
      const a = (Math.PI / 2) * Math.min(1, Math.max(0, left ? t / w : (hi - t) / w));
      const sn = Math.sin(a);
      const d = t <= 0 || t >= hi ? 0 : 1.5 * Math.sqrt(sn) * Math.cos(a) * (Math.PI / 2 / w);
      return [sn ** 1.5, left ? d : -d];
    };
    for (let i = 0; i < cols; i++) [bx[i], sx[i]] = prof((1920 * i) / GRID.x, s.anchor[0], 1920);
    for (let j = 0; j < rows; j++) [by[j], sy[j]] = prof((1080 * j) / GRID.y, s.anchor[1], 1080);
    const D = s.depth;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const x = (1920 * i) / GRID.x;
        const y = (1080 * j) / GRID.y;
        const b = bx[i] * by[j];
        const depth = D * b;
        const gx = D * sx[i] * by[j];
        const gy = D * bx[i] * sy[j];
        pos.setXYZ(k, x + s.tremble[0] * b - 960, 540 - (y + s.tremble[1] * b), -depth);
        const nl = Math.hypot(gx, gy, 1);
        nor.setXYZ(k, gx / nl, -gy / nl, 1 / nl);
        str.setX(k, 1 / (1 + FILM.stretch * (gx * gx + gy * gy)));
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
    str.needsUpdate = true;
    this.flat = D === 0;
  }

  /** Clears a target to transparent black (colour only). */
  private clearTarget(gl: THREE.WebGLRenderer, t: THREE.WebGLRenderTarget): void {
    const clear = gl.getClearColor(new THREE.Color());
    const alpha = gl.getClearAlpha();
    gl.setRenderTarget(t);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, false, false);
    gl.setClearColor(clear, alpha);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    if (this.v2) {
      this.renderV2(gl, ctx, target);
      return;
    }
    const f = ctx.frame;
    const c = launchAt(f, this.layout!);
    const paper = { color: BREAK_PALETTE.violet, grain: 0 };

    // 1. The world into the backplate: ground, sheared blocks, confetti, the copies; then the peg and him.
    const m = this.blocks!.mesh;
    c.blocks.shapes.forEach((s, i) => this.blocks!.set(i, s));
    this.blocks!.commit(c.blocks.shapes.length);
    m.matrix.set(1, -c.blocks.shear, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    m.matrixWorldNeedsUpdate = true;
    m.visible = true;
    this.world!.draw(gl, this.backplate!, c.pose, c.back, paper);
    m.visible = false;
    this.world!.draw(gl, this.backplate!, c.pose, c.front, null);
    // His mask: the same front draw into a clear target (its alpha is his coverage).
    this.clearTarget(gl, this.mask!);
    this.world!.draw(gl, this.mask!, c.pose, c.front, null);

    // 2. The window, printed on the screen: into a transparent target.
    this.clearTarget(gl, this.printed!);
    this.screen!.draw(gl, this.printed!, SCREEN, c.window, null);

    // 3. The film (the screen itself) over the world, at the inverse of the rig's punch.
    this.shapeFilm(f);
    const z = rigAt(ctx.cam).zoom;
    this.film!.scale.set(1 / z, 1 / z, 1);
    this.behind!.mesh.visible = z !== 1;
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.filmScene, this.filmCamera);
    gl.autoClear = auto;
  }

  /** v2: break 6.4a → drop 2 (launchAtV2): the world in three draws, his mask, the window and the cursor printed, the film over it all. */
  private renderV2(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const c = launchAtV2(f, this.layout!);
    const paper = { color: BREAK_PALETTE.violet, grain: 0 };
    // 1. The world into the backplate: behind him, him, over him.
    this.world!.draw(gl, this.backplate!, c.pose, c.back, paper);
    this.world!.draw(gl, this.backplate!, c.pose, c.front, null);
    this.world!.draw(gl, this.backplate!, c.pose, c.top, null);
    // His mask: him again, alone (the film leaves his face alone).
    this.clearTarget(gl, this.mask!);
    this.world!.draw(gl, this.mask!, c.pose, c.front, null);
    // 2. The window and the cursor, printed on the screen (and the dome's glint, printed on the film).
    const film = filmAtV2(f);
    const g = domeGlint(film);
    const arc: Shape[] = [];
    if (g) {
      const n = 24;
      const pt = (i: number): [number, number] => {
        const a = ((g.from + ((g.to - g.from) * i) / n) * Math.PI) / 180;
        return [g.x + g.r * Math.cos(a) - 960, 540 - (g.y + g.r * Math.sin(a))];
      };
      for (let i = 0; i < n; i++) {
        const [ax, ay] = pt(i);
        const [bx, by] = pt(i + 1);
        arc.push({ kind: 'segment', x: (ax + bx) / 2, y: (ay + by) / 2, w: Math.hypot(bx - ax, by - ay) + g.w, h: g.w, rot: Math.atan2(by - ay, bx - ax), color: [1, 1, 1], alpha: g.alpha });
      }
    }
    this.clearTarget(gl, this.printed!);
    this.screen!.draw(gl, this.printed!, SCREEN, arc.length ? { ...c.window, over: [...c.window.over, ...arc] } : c.window, null);
    // 3. The film over the world, at the inverse of the rig's punch.
    this.shapeFilmAt(film);
    const z = rigAt(ctx.cam).zoom;
    this.film!.scale.set(1 / z, 1 / z, 1);
    this.behind!.mesh.visible = z !== 1;
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.filmScene, this.filmCamera);
    gl.autoClear = auto;
  }

  look(): Look {
    return launchLook();
  }

  temporal(frame: number): Temporal {
    return this.v2 ? launchTemporalV2(frame) : launchTemporal(frame);
  }

  /** v04: from the match cut to the end of the break (no sub-frame crosses break 6.1). v2: the whip's tail and break 7, then break 8 (C8 is a hard cut). */
  segment(frame: number): Segment {
    return this.v2 ? launchSegmentV2(frame) : launchSegment();
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
