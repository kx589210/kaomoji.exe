// Renderer A's Earth on the GPU (the cosmos, bar 2; build sheet notes/bcos/sheet.md §4.2): double-sided face cards, static on the
// GPU, flipped by the stadium wave in the vertex shader (src/shots/cosmosEarth.ts's flip: the L curve of cosmosBang.ts, line for line);
// the night and the day, the terminator, the lamps, the flinch and the crest's (>ω<) computed from uniforms; Earth's dark body (it hides
// the far side and the Sun behind it) and its cyan atmosphere; the sky of printed space with overprinted nebula streaks and paper specks.
// Two levels of the same globe: the design's 24,000 cards for the landing and the flyover, and a coarse globe whose cards still read at the
// crane's distance (24k cards under ≈ 15 px print as a moiré against the Riso screen, never as faces); they cross-fade by a dither that
// changes every sub-frame, so the sub-frame sum blends them. A card falling under ≈ 16 px (1080p) closes its gutter and fades its face to
// the card's mean: the layer is pre-filtered before the print, so no structure under twice the screen's pitch reaches it.
// Constructible in Node: nothing here is made before init().
import * as THREE from 'three';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import { SDF_EDGE } from '../engine/sdf.ts';
import { GLSL_L } from './cosmosAFields.ts';

type V3 = readonly [number, number, number];
type Rect = readonly [number, number, number, number];

/** Earth's cards as the field holds them (static: written once). */
export type EarthCardData = {
  p: V3;
  up: V3;
  right: V3;
  /** host, twin and flinch atlas rects with each glyph's half-height (card-local) and quad aspect. */
  host: { uv: Rect; glyph: number; aspect: number };
  twin: { uv: Rect; glyph: number; aspect: number };
  flinch: { uv: Rect; glyph: number; aspect: number };
  /** 0 ocean, 1 land, 2 cloud, 3 him. */
  kind: number;
  /** Its flip's start (frames since Earth's downbeat), its angle from his tile (degrees), a hash. */
  flip: number;
  theta: number;
  seed: number;
};

/** What the renderer sets each sub-frame. */
export type EarthUniforms = {
  /** Frames since Earth's downbeat (the cards' flip times are in the same units). */
  time: number;
  sun: V3;
  threshold: number;
  dawn: number;
  pulse: number;
  bob: number;
  front: number;
  band: number;
  /** How far the faces ahead of the front have flinched (0 … 1: jumped off the globe, swollen, catching the light). */
  lift: number;
  /** The crest's (>ω<): the flip window [from, to) of the lamps that wear it, while `on`. */
  top: { from: number; to: number; on: boolean; uv: Rect; glyph: number; aspect: number };
  /** Device px per world unit at distance 1 (for the cards' level of detail), and device px per 1080p px. */
  focalPx: number;
  pxScale: number;
  /** The latest closed 16th: its index (seeds the glitter) and frames since. */
  hat: { index: number; age: number };
  /** The cross-fade to the coarse globe (0 the fine cards … 1 the coarse) and this sub-frame's dither seed. */
  fade: number;
  dither: number;
  /** The paste of the night side (device px): no card is drawn within this radius of `wipeAt` (device px; a huge radius: none yet). */
  wipe: number;
  wipeAt: readonly [number, number];
};

/** The palette (linear; light goes over 1: the print carries it through as HDR, cosmosLook's `hdr`). */
export type EarthPalette = {
  ocean: V3;
  land: V3;
  cloud: V3;
  paper: V3;
  cloudInk: V3;
  /** A lamp at night: a dark card, its ω face and its rim burning amber (HDR). */
  lampBg: V3;
  lamp: V3;
  lampRim: V3;
  dayBg: V3;
  dayInk: V3;
  glint: V3;
  ghostPink: V3;
  ghostBlue: V3;
  /** The night side's unlit cards print at this share of their ink (the oceans at `oceanNight`: a dim blue prints as the ground); the moonlit cloud band at `cloudNight`. */
  night: number;
  oceanNight: number;
  cloudNight: number;
};

const vertex = (mode: number) => /* glsl */ `
  ${GLSL_L}
  attribute vec3 aP; attribute vec3 aUpv; attribute vec3 aRt;
  attribute vec4 aUvF; attribute vec4 aUvB; attribute vec4 aUvX; attribute vec4 aGF; attribute vec2 aGX; attribute vec4 aK;
  uniform float uTime; uniform vec3 uSun; uniform float uSide; uniform float uBob; uniform float uFocal; uniform float uPxScale; uniform vec4 uGhost;
  uniform float uThr; uniform float uDawn; uniform float uFront; uniform float uBand; uniform float uLift;
  varying vec2 vL; varying float vT; varying float vLit; varying float vPx; varying float vKind; varying float vTheta; varying float vSeed; varying float vFlip;
  varying float vFlinch; varying float vSmall;
  varying vec4 vUvF; varying vec4 vUvB; varying vec4 vUvX; varying vec4 vGF; varying vec2 vGX;
  void main() {
    float t = uTime - aK.y;
    float fl = t <= 0.0 ? 0.0 : min(1.04, launchL(t));
    float ang = fl * 3.14159265;
    vec3 n = aP;
    vec3 rt = aRt;
    vec3 up0 = aUpv;
    float pop = t >= 3.0 ? 1.0 + 0.25 * (1.0 - clamp((t - 3.0) / 6.0, 0.0, 1.0)) : 1.0;
    float side = uSide * pop;
    if (aK.x > 2.5) side *= 1.0 + 0.08 * uBob;
    // the flinch: an uninfected face just ahead of the lit front pulls its flinch face, jumps (it swells and rises a little off the globe:
    // a pop on the clap) and catches the light, until the wave reaches it
    float ahead = uBand > 0.0 && aK.z > uFront && aK.z < uFront + uBand && aK.x < 2.5 ? 1.0 - clamp(t / 2.0, 0.0, 1.0) : 0.0;
    float lift = ahead * uLift;
    vec3 rise = vec3(0.0);
    if (lift > 0.0) {
      side *= 1.0 + 0.3 * lift;
      rise = n * side * 0.6 * lift;
    }
    // the level of detail: a card under ≈ 16 px (1080p) closes its gutter (its face fades to its mean in the fragment)
    vec4 mc = modelViewMatrix * vec4(n, 1.0);
    float px = side * uFocal / max(-mc.z, 1e-4);
    float small = 1.0 - smoothstep(10.0, 18.0, px / uPxScale);
    side *= 1.0 + 0.22 * small;
    vec3 up = up0 * cos(ang) + n * sin(ang);
    bool keep = true;
    ${mode === 1 || mode === 2 ? 'keep = t >= 3.0 && t < 5.0;' : ''}
    // the sparks: 30 % of the night's new lamps; in the day every flip (a racing ring of flashbulbs), bigger, facing the camera
    float dayHere = uDawn * step(uThr, dot(n, uSun));
    ${mode === 3 ? 'keep = t >= 3.0 && t < 6.0 && (aK.w < 0.3 || dayHere > 0.5); side *= mix(0.75, 1.6, dayHere);' : ''}
    // the card turns about an axis lifted off the globe, so it never cuts into its neighbours
    vec3 world = n * (1.0006 + side * abs(sin(ang)) * 1.05) + rise + (position.x * rt + position.y * up) * side;
    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    ${mode === 3 ? 'mv = modelViewMatrix * vec4(n * (1.0 + side * 0.8), 1.0); mv.xy += position.xy * side;' : ''}
    vec4 clip = projectionMatrix * mv;
    ${mode === 1 || mode === 2 ? 'clip.xy += uGhost.xy * clip.w;' : ''}
    gl_Position = keep ? clip : vec4(2.0, 2.0, 2.0, 1.0);
    vL = position.xy; vT = t; vLit = dot(n, uSun); vKind = aK.x; vTheta = aK.z; vSeed = aK.w; vFlip = fl;
    vFlinch = ahead; vSmall = small;
    vPx = side * uFocal / max(-mv.z, 1e-4);
    vUvF = aUvF; vUvB = aUvB; vUvX = aUvX; vGF = aGF; vGX = aGX;
  }`;

const fragment = (mode: number) => /* glsl */ `
  uniform sampler2D atlas;
  uniform float uTime; uniform float uThr; uniform float uDawn; uniform float uPulse;
  uniform vec3 uTop; uniform vec4 uTopUv; uniform vec2 uTopG; uniform vec2 uHat;
  uniform vec3 uOcean; uniform vec3 uLand; uniform vec3 uCloud; uniform vec3 uPaper; uniform vec3 uCloudInk; uniform vec3 uLampBg; uniform vec3 uLamp; uniform vec3 uLampRim;
  uniform vec3 uDayBg; uniform vec3 uDayInk; uniform vec3 uGlint; uniform vec3 uGhostPink; uniform vec3 uGhostBlue; uniform float uNight; uniform float uOceanNight; uniform float uCloudNight;
  uniform float uRole; uniform float uFade; uniform float uDither; uniform vec3 uWipe;
  varying vec2 vL; varying float vT; varying float vLit; varying float vPx; varying float vKind; varying float vTheta; varying float vSeed; varying float vFlip;
  varying float vFlinch; varying float vSmall;
  varying vec4 vUvF; varying vec4 vUvB; varying vec4 vUvX; varying vec4 vGF; varying vec2 vGX;
  float glyph(vec4 uv, float gh, float ga, vec2 l) {
    vec2 g = vec2(l.x / (gh * ga), l.y / gh);
    if (abs(g.x) > 1.0 || abs(g.y) > 1.0) return 0.0;
    float m = texture2D(atlas, vec2(mix(uv.x, uv.z, g.x * 0.5 + 0.5), mix(uv.w, uv.y, g.y * 0.5 + 0.5))).r;
    float aa = max(fwidth(m), 1e-4) * 0.7;
    return smoothstep(${SDF_EDGE.toFixed(4)} - aa, ${SDF_EDGE.toFixed(4)} + aa, m);
  }
  void main() {
    // the two globes cross-fade by a dither that changes every sub-frame (the sum blends them): the fine where it is ≥ the fade, the coarse below
    float dz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uDither) * 43758.5453);
    if (uRole < 0.5 ? dz < uFade : dz >= uFade) discard;
    // the paste of the night side: from the frame's edges inward
    if (length(gl_FragCoord.xy - uWipe.xy) < uWipe.z) discard;
    vec2 q = abs(vL) - vec2(0.7);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.3;
    float aa = max(fwidth(d), 1e-4);
    float card = 1.0 - smoothstep(-aa, aa, d);
    ${mode === 3 ? `
    vec2 p = abs(vL);
    float ray = pow(max(0.0, 1.0 - p.x), 3.0) * exp(-p.y * p.y * 600.0) + pow(max(0.0, 1.0 - p.y), 3.0) * exp(-p.x * p.x * 600.0);
    float a3 = clamp(ray + exp(-dot(vL, vL) * 30.0), 0.0, 1.0) * (1.0 - clamp((vT - 3.0) / 3.0, 0.0, 1.0));
    if (a3 < 0.003) discard;
    gl_FragColor = vec4(uGlint * a3, a3);` : mode === 1 || mode === 2 ? `
    if (card < 0.5) discard;
    gl_FragColor = vec4(${mode === 1 ? 'uGhostPink' : 'uGhostBlue'}, 1.0);` : `
    if (mix(card, 1.0, vSmall) < 0.5) discard;
    bool back = !gl_FrontFacing;
    vec2 l = back ? vec2(vL.x, -vL.y) : vL;
    float lod = smoothstep(2.0, 7.0, vPx);
    float day = uDawn * smoothstep(uThr, uThr + 0.12, vLit);
    // a small card's face is its mean (a face's ink covers ≈ 16 % of its card): nothing finer than the card reaches the print
    float flat0 = vSmall;
    vec3 col;
    if (!back) {
      bool flinch = vFlinch > 0.0;
      float g = flinch ? glyph(vUvX, vGX.x, vGX.y, l) : glyph(vUvF, vGF.x, vGF.y, l);
      g = mix(g * lod, 0.16, flat0);
      bool cloud = vKind > 1.5 && vKind < 2.5;
      vec3 bg = vKind < 0.5 ? uOcean : vKind < 1.5 ? uLand : cloud ? uCloud : uDayBg;
      vec3 ink = cloud ? uCloudInk : uPaper;
      float level = mix(cloud ? uCloudNight : vKind < 0.5 ? uOceanNight : uNight, 1.0, day);
      // a flinching face catches the light ahead of the front: its face lights up (over 1) on the card still at night
      float inkLevel = mix(level, 1.3, vFlinch);
      col = mix(bg * (level + 0.08 * vFlinch), ink * inkLevel, g);
    } else {
      float flipAt = uTime - vT;
      bool top = uTop.z > 0.5 && flipAt >= uTop.x && flipAt < uTop.y;
      float g = top ? glyph(uTopUv, uTopG.x, uTopG.y, l) : glyph(vUvB, vGF.z, vGF.w, l);
      g = mix(g * lod, 0.16, flat0);
      // a lamp at night: the dark card, its ω face and its rim burning amber (light: the print carries it, the bloom glows it); a small one
      // is its mean, a warm point
      float rim = smoothstep(-0.2, -0.09, d) * (1.0 - flat0);
      vec3 nightCol = mix(mix(uLampBg, uLampRim, rim), uLamp, g);
      nightCol = mix(nightCol, uLamp * 0.32, flat0);
      vec3 dayCol = mix(uDayBg, uDayInk, g);
      col = mix(nightCol, dayCol, day);
      // the kick's pulse on the subject: his lamp and the wave's (the wave is what carries him in this bar)
      float him = vKind > 2.5 ? 1.0 : 0.9;
      col *= 1.0 + 0.35 * uPulse * him;
      // landing: a flashbulb in the day, a soft flare of the lamp at night
      float flash = 1.0 - clamp(abs(vT - 3.0) / 2.0, 0.0, 1.0);
      col += uGlint * flash * mix(0.08, 1.0, day);
      // in the day the infected globe glitters: on each 16th a hashed 4 % of the cards catch the Sun for 3 frames
      float pick = fract(sin(vSeed * 91.7 + uHat.x * 13.1) * 43758.5);
      col += uGlint * day * step(pick, 0.04) * (1.0 - clamp(uHat.y / 3.0, 0.0, 1.0)) * 0.8;
    }
    gl_FragColor = vec4(col, 1.0);`}
  }`;

/**
 * One of Earth's globes of cards (the fine or the coarse). Four materials share the geometry: the two misregistered Ctrl+V ghosts (pink,
 * blue; 2 f after a card lands), the cards (opaque, writing depth) and the 3-frame ✧ sparks on the newly infected.
 */
export class EarthCardField {
  readonly meshes: THREE.Mesh[];
  private readonly materials: THREE.ShaderMaterial[];
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly ghosts: Record<string, THREE.IUniform>[];

  /** `role`: 0 the fine globe (drawn where the dither is ≥ the fade), 1 the coarse (below it). */
  constructor(cards: readonly EarthCardData[], atlas: GlyphAtlas, side: number, pal: EarthPalette, role: 0 | 1 = 0) {
    const n = cards.length;
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    base.dispose();
    const attr = (k: string, size: number, fill: (c: EarthCardData, a: Float32Array, o: number) => void) => {
      const a = new Float32Array(n * size);
      cards.forEach((c, i) => fill(c, a, i * size));
      this.geo.setAttribute(k, new THREE.InstancedBufferAttribute(a, size));
    };
    attr('aP', 3, (c, a, o) => a.set(c.p, o));
    attr('aUpv', 3, (c, a, o) => a.set(c.up, o));
    attr('aRt', 3, (c, a, o) => a.set(c.right, o));
    attr('aUvF', 4, (c, a, o) => a.set(c.host.uv, o));
    attr('aUvB', 4, (c, a, o) => a.set(c.twin.uv, o));
    attr('aUvX', 4, (c, a, o) => a.set(c.flinch.uv, o));
    attr('aGF', 4, (c, a, o) => a.set([c.host.glyph, c.host.aspect, c.twin.glyph, c.twin.aspect], o));
    attr('aGX', 2, (c, a, o) => a.set([c.flinch.glyph, c.flinch.aspect], o));
    attr('aK', 4, (c, a, o) => a.set([c.kind, c.flip, c.theta, c.seed], o));
    this.geo.instanceCount = n;
    const v3 = (x: V3) => new THREE.Vector3(x[0], x[1], x[2]);
    this.uniforms = {
      atlas: { value: atlas.texture },
      uTime: { value: 0 },
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uThr: { value: 2 },
      uDawn: { value: 0 },
      uSide: { value: side / 2 },
      uPulse: { value: 0 },
      uBob: { value: 0 },
      uFront: { value: 0 },
      uBand: { value: 0 },
      uLift: { value: 0 },
      uTop: { value: new THREE.Vector3(0, 0, 0) },
      uTopUv: { value: new THREE.Vector4() },
      uTopG: { value: new THREE.Vector2(0.5, 1) },
      uHat: { value: new THREE.Vector2(0, 99) },
      uFocal: { value: 1000 },
      uPxScale: { value: 1 },
      uRole: { value: role },
      uFade: { value: 0 },
      uDither: { value: 0 },
      uWipe: { value: new THREE.Vector3(0, 0, 0) },
      uOcean: { value: v3(pal.ocean) },
      uLand: { value: v3(pal.land) },
      uCloud: { value: v3(pal.cloud) },
      uPaper: { value: v3(pal.paper) },
      uCloudInk: { value: v3(pal.cloudInk) },
      uLampBg: { value: v3(pal.lampBg) },
      uLamp: { value: v3(pal.lamp) },
      uLampRim: { value: v3(pal.lampRim) },
      uDayBg: { value: v3(pal.dayBg) },
      uDayInk: { value: v3(pal.dayInk) },
      uGlint: { value: v3(pal.glint) },
      uGhostPink: { value: v3(pal.ghostPink) },
      uGhostBlue: { value: v3(pal.ghostBlue) },
      uNight: { value: pal.night },
      uOceanNight: { value: pal.oceanNight },
      uCloudNight: { value: pal.cloudNight },
    };
    // the ghosts share every uniform object but their own offset
    this.ghosts = [0, 1].map(() => ({ ...this.uniforms, uGhost: { value: new THREE.Vector4() } }));
    this.materials = [1, 2, 0, 3].map((mode) => {
      const u = mode === 1 || mode === 2 ? this.ghosts[mode - 1] : { ...this.uniforms, uGhost: { value: new THREE.Vector4() } };
      return new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: vertex(mode),
        fragmentShader: fragment(mode),
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: mode === 0,
        transparent: mode === 3,
        blending: mode === 3 ? THREE.AdditiveBlending : THREE.NormalBlending,
        premultipliedAlpha: mode === 3,
      });
    });
    this.meshes = this.materials.map((m, i) => {
      const mesh = new THREE.Mesh(this.geo, m);
      mesh.frustumCulled = false;
      mesh.renderOrder = 10 + i;
      return mesh;
    });
  }

  set(u: EarthUniforms, ghostNdc: readonly [number, number]): void {
    const U = this.uniforms;
    U.uTime.value = u.time;
    (U.uSun.value as THREE.Vector3).set(u.sun[0], u.sun[1], u.sun[2]);
    U.uThr.value = u.threshold;
    U.uDawn.value = u.dawn;
    U.uPulse.value = u.pulse;
    U.uBob.value = u.bob;
    U.uFront.value = u.front;
    U.uBand.value = u.band;
    U.uLift.value = u.lift;
    (U.uTop.value as THREE.Vector3).set(u.top.from, u.top.to, u.top.on ? 1 : 0);
    (U.uTopUv.value as THREE.Vector4).set(u.top.uv[0], u.top.uv[1], u.top.uv[2], u.top.uv[3]);
    (U.uTopG.value as THREE.Vector2).set(u.top.glyph, u.top.aspect);
    U.uFocal.value = u.focalPx;
    U.uPxScale.value = u.pxScale;
    U.uFade.value = u.fade;
    U.uDither.value = u.dither;
    (U.uWipe.value as THREE.Vector3).set(u.wipeAt[0], u.wipeAt[1], u.wipe);
    (U.uHat.value as THREE.Vector2).set(u.hat.index, u.hat.age);
    (this.ghosts[0].uGhost.value as THREE.Vector4).set(ghostNdc[0], ghostNdc[1], 0, 0);
    (this.ghosts[1].uGhost.value as THREE.Vector4).set(-ghostNdc[0], -ghostNdc[1], 0, 0);
  }

  /** Shows or hides the whole globe (a globe faded out is not drawn at all). */
  show(v: boolean): void {
    for (const m of this.meshes) m.visible = v;
  }

  dispose(): void {
    this.geo.dispose();
    for (const m of this.materials) m.dispose();
  }
}

/** The sky: printed space with overprinted nebula streaks (pink and blue, smooth: the print screens them) and paper specks, on a far sphere. */
export class SkyDome {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private readonly geo: THREE.SphereGeometry;

  constructor() {
    this.geo = new THREE.SphereGeometry(60, 64, 32);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uPink: { value: new THREE.Vector3() }, uBlue: { value: new THREE.Vector3() }, uSpeck: { value: new THREE.Vector3() }, uSwell: { value: 1 } },
      vertexShader: /* glsl */ `varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uPink; uniform vec3 uBlue; uniform vec3 uSpeck; uniform float uSwell;
        varying vec3 vD;
        float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float vn(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                     mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
        }
        float fbm(vec3 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
        void main() {
          vec3 d = normalize(vD);
          vec3 sp = vec3(d.x * 1.3, d.y * 5.0, d.z * 1.3);
          float pink = smoothstep(0.5, 0.78, fbm(sp * 2.4 + vec3(3.1, 0.0, 1.7)));
          float blue = smoothstep(0.5, 0.78, fbm(sp * 2.4 + vec3(0.0, 0.08, 9.2)));
          vec3 col = uPink * pink + uBlue * blue;
          vec3 g = d * 230.0;
          vec3 cell = floor(g);
          float r = h3(cell);
          vec3 c = cell + 0.5 + (vec3(h3(cell + 1.3), h3(cell + 2.7), h3(cell + 4.1)) - 0.5) * 0.6;
          float dist = length(g - c);
          float speck = step(0.93, r) * (1.0 - smoothstep(0.09 * uSwell, 0.17 * uSwell, dist));
          col += uSpeck * speck;
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/**
 * Earth's dark body (it hides the far side and the Sun behind it) and its atmosphere: a cyan rim waking with the dawn, burning toward the
 * Sun once it is up (forward scattering: light over 1 where the limb faces the Sun, so the band glows past the print).
 */
export class EarthBody {
  readonly body: THREE.Mesh;
  readonly air: THREE.Mesh;
  readonly bodyMaterial: THREE.ShaderMaterial;
  readonly airMaterial: THREE.ShaderMaterial;
  private readonly geo: THREE.SphereGeometry;

  constructor() {
    this.geo = new THREE.SphereGeometry(1, 128, 64);
    this.bodyMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Vector3() } },
      vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position * 0.996, 1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    });
    this.airMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Vector3() }, uAmount: { value: 0 }, uSunV: { value: new THREE.Vector3(0, 1, 0) }, uHot: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position * 1.04, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uAmount; uniform vec3 uSunV; uniform float uHot;
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec3 nn = normalize(vN);
          float mu = abs(dot(nn, normalize(vV)));
          float rim = pow(1.0 - mu, 2.4) * smoothstep(0.0, 0.2, mu);
          float toward = pow(max(0.0, dot(nn, uSunV)), 6.0);
          float a = rim * uAmount * (1.0 + uHot * toward);
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor * a, min(a, 1.0));
        }`,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      depthWrite: false,
      transparent: true,
    });
    this.body = new THREE.Mesh(this.geo, this.bodyMaterial);
    this.air = new THREE.Mesh(this.geo, this.airMaterial);
    this.body.renderOrder = 5;
    this.air.renderOrder = 30;
  }

  dispose(): void {
    this.geo.dispose();
    this.bodyMaterial.dispose();
    this.airMaterial.dispose();
  }
}
