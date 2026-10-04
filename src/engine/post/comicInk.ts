import { Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';
import { encodeRGB, DOT_SCREEN_GLSL, PRINT_HEIGHT } from './dotScreen.ts';
import { COMIC_CHROMA, COMIC_MAX_INKS, type ComicInkLook, comicActive, comicUniformPalette, lineReach, resolveComic } from './comicModel.ts';

const N = COMIC_MAX_INKS;

/** The shader; comicModel.ts comicInkAt and its helpers are the same maths in TypeScript, function for function. */
const COMIC_FRAG = /* glsl */ `
uniform float amount;
uniform float scale;
uniform float pitch;
uniform float levels;
uniform float outline;
uniform vec2 edge;
uniform vec2 offC;
uniform vec2 offM;
uniform vec2 offY;
uniform float inRegister;
uniform vec3 paperShown;
uniform vec3 paperLinear;
uniform vec3 keyShown;
uniform vec3 keyLinear;
uniform vec3 shadeShown;
uniform vec3 shadeLinear;
uniform float shadeAngle;
uniform float inkCount;
uniform vec3 inkShown[${N}];
uniform vec3 inkLinear[${N}];
uniform vec3 inkHue[${N}];
uniform float inkAngle[${N}];
uniform vec4 anchor;
uniform float lineKind;
uniform vec4 lineA;
uniform vec4 lineB;
uniform float lineReach;
uniform vec3 lineInk;
${DOT_SCREEN_GLSL}

// The input hue-clamped and display-encoded (comicSource).
vec3 ciSource(vec2 s) {
  vec3 c = max(texture2D(inputBuffer, kxUv(s, resolution)).rgb, 0.0);
  c /= max(1.0, max(c.r, max(c.g, c.b)));
  return kxEncode(c);
}

// Where x sits on the line from a (0) to b (1), unclamped (comicTone).
float ciTone(vec3 x, vec3 a, vec3 b) {
  vec3 ab = b - a;
  return dot(x - a, ab) / max(dot(ab, ab), 1e-4);
}

// A tone clamped and snapped to the flat tints (comicLevels).
float ciLevels(float a) {
  a = clamp(a, 0.0, 1.0);
  return levels > 0.5 ? floor(a * levels + 0.5) / levels : a;
}

// Where a display colour sits on the page's greys (tone: paper 0 … key 1) and how much it counts as an ink's colour (comicNeutral).
void ciNeutral(vec3 x, out float tone, out float chroma) {
  tone = clamp(ciTone(x, paperShown, keyShown), 0.0, 1.0);
  float spread = max(x.r, max(x.g, x.b)) - min(x.r, min(x.g, x.b));
  chroma = smoothstep(${COMIC_CHROMA[0].toFixed(3)}, ${COMIC_CHROMA[1].toFixed(3)}, min(length(x - mix(paperShown, keyShown, tone)), spread));
}

// The colour plates: a chromatic pixel's ink and its dots, linear RGB; greys leave the page bare (comicPlateAt).
vec3 ciPlate(vec2 s, float px) {
  vec3 x = ciSource(s);
  float t;
  float w;
  ciNeutral(x, t, w);
  if (w <= 0.0 || inkCount < 0.5) return paperLinear;
  vec2 q = kxPlane(s, anchor);
  float mx = max(x.r, max(x.g, x.b));
  float mn = min(x.r, min(x.g, x.b));
  vec3 hue = (x - mn) / max(mx - mn, 1e-4);
  int best = 0;
  float near = 1e9;
  for (int k = 0; k < ${N}; k++) {
    if (float(k) >= inkCount) break;
    vec3 h = hue - inkHue[k];
    float d = dot(h, h);
    if (d < near) {
      near = d;
      best = k;
    }
  }
  vec3 shown = inkShown[best];
  float a = ciTone(x, paperShown, shown);
  vec3 chrom;
  if (a < 1.0) chrom = mix(paperLinear, inkLinear[best], kxScreen(q, ciLevels(a), pitch, inkAngle[best], 0.0, px, 0.0, 0.0));
  else chrom = mix(inkLinear[best], shadeLinear, kxScreen(q, ciLevels(ciTone(x, shown, shadeShown)), pitch, shadeAngle, 0.0, px, 0.0, 0.0));
  return mix(paperLinear, chrom, w);
}

// The key plate's dots, in register: greys as key dots on the page (comicKeyDotsAt).
float ciKeyDots(vec2 s, float px) {
  float t;
  float w;
  ciNeutral(ciSource(s), t, w);
  return (1.0 - w) * kxScreen(kxPlane(s, anchor), ciLevels(t), pitch, shadeAngle, 0.0, px, 0.0, 0.0);
}

// Key ink on the darker side of a colour edge within outline px (comicKeyAt).
float ciKey(vec2 s) {
  if (outline <= 0.0) return 0.0;
  vec3 c0 = ciSource(s);
  float l0 = dot(c0, KX_LUMA);
  float key = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398163397448;
    vec2 d = vec2(cos(a), sin(a)) * outline;
    for (int j = 1; j <= 2; j++) {
      vec3 c = ciSource(s + d * (0.5 * float(j)));
      key = max(key, smoothstep(edge.x, edge.y, length(c - c0)) * smoothstep(-0.06, 0.0, dot(c, KX_LUMA) - l0));
    }
  }
  return key;
}

// Share of a device pixel covered by a line of half-width hw whose centre is d away, both device px (lineCover).
float ciCover(float hw, float d) {
  return clamp(min(hw, d + 0.5) - max(-hw, d - 0.5), 0.0, 1.0);
}

// Speed lines (speedLineInk): lineA = (x, y, angle, count), lineB = (width, inner, seed, amount).
float ciLines(vec2 s, float px) {
  if (lineB.w <= 0.0 || lineA.w <= 0.0) return 0.0;
  vec2 d = s - lineA.xy;
  float n = lineA.w;
  float ink = 0.0;
  if (lineKind < 1.5) {
    float r = length(d);
    float th = atan(d.y, d.x);
    if (th < 0.0) th += KX_2PI;
    float i0 = floor(th / KX_2PI * n);
    for (int j = -1; j <= 1; j++) {
      float i = i0 + float(j);
      int iw = int(mod(i, n) + 0.5);
      if (kxHash(ivec2(iw, 3), lineB.z) >= lineB.w) continue;
      float ti = KX_2PI * (i + 0.5 + 0.7 * (kxHash(ivec2(iw, 0), lineB.z) - 0.5)) / n;
      float dt = th - ti;
      if (cos(dt) <= 0.0) continue;
      float start = lineB.y * (1.0 + 0.5 * kxHash(ivec2(iw, 1), lineB.z));
      float hw = 0.5 * lineB.x * (0.35 + 0.65 * kxHash(ivec2(iw, 2), lineB.z)) * clamp((r - start) / max(lineReach - start, 1.0), 0.0, 1.0);
      ink = max(ink, ciCover(hw * px, r * abs(sin(dt)) * px));
    }
  } else {
    float u = d.x * cos(lineA.z) + d.y * sin(lineA.z);
    float v = -d.x * sin(lineA.z) + d.y * cos(lineA.z);
    float spacing = 1080.0 / n;
    float i0 = floor(v / spacing);
    float clear = smoothstep(lineB.y, lineB.y * 1.5 + 1.0, length(d));
    for (int j = -1; j <= 1; j++) {
      float i = i0 + float(j);
      ivec2 id = ivec2(int(i), 0);
      if (kxHash(id + ivec2(0, 4), lineB.z) >= lineB.w) continue;
      float vi = (i + 0.5 + 0.6 * (kxHash(id, lineB.z) - 0.5)) * spacing;
      float centre = (kxHash(id + ivec2(0, 1), lineB.z) - 0.5) * 1600.0;
      float len = 260.0 + 520.0 * kxHash(id + ivec2(0, 2), lineB.z);
      float along = clamp(min(u - (centre - len), centre + len - u) / len * 2.0, 0.0, 1.0);
      float hw = 0.5 * lineB.x * (0.35 + 0.65 * kxHash(id + ivec2(0, 3), lineB.z)) * along * clear;
      ink = max(ink, ciCover(hw * px, abs(v - vi) * px));
    }
  }
  return ink;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 s = kxScreenPx(gl_FragCoord.xy, resolution);
  vec3 col = inputColor.rgb;
  if (amount > 0.0) {
    float px = scale * max(anchor.z, 1e-3);
    vec3 plate = ciPlate(s - offC, px);
    if (inRegister < 0.5) plate = vec3(plate.r, ciPlate(s - offM, px).g, ciPlate(s - offY, px).b);
    col = mix(col, mix(plate, keyLinear, max(ciKeyDots(s, px), ciKey(s))), amount);
  }
  if (lineKind > 0.5) col = mix(col, lineInk, ciLines(s, scale));
  outputColor = vec4(col, inputColor.a);
}
`;

const vec3s = (): THREE.Vector3[] => Array.from({ length: N }, () => new THREE.Vector3());

/**
 * The comic book as a post pass (story bible §舞池 美漫; todo B2 "美漫网点墨线"; the model and every knob: comicModel.ts). A scene
 * asks for it in its Look with a ComicInkLook: `{ amount: 1 }` posterises to the club's palette, shades with Ben-Day dots
 * (pitch 16), keys colour edges with 6 px K and sets the colour plates 1.5 px off register; `offsets` animate the misregistration
 * (club3 §2.3: slips on the claps, speed fringes); `levels: 1` is flat colour only; `lines` adds focus or speed lines (step
 * `seed` on the 16ths for the re-jitter); `screen` makes the dots ride the camera.
 *
 * It samples other pixels (16 keyline taps; the plates' offsets), so it is a convolution effect and needs an EffectPass of its
 * own. Integration (pipeline.ts / types.ts, not done here):
 * - Look gets `comic?: ComicInkLook`; mixLook gets `...(m ? { comic: m } : {})` with `m = mixComicInk(a.comic, b.comic, t)`.
 * - The pass goes after the TextureInputPass, before the main pass (with RisoPrintEffect's in its own pass, if both exist; they are
 *   never on together), so the look's grain lands on the page; `pass.enabled = comic.configure(look.comic)` in applyLook.
 * - The readout (screen overlay) is in the pass's input too; see RisoPrintEffect's note.
 * - The matching finishing is the club's comic look (club3 §7.6): linear, bloom 0, aberration 0 (the plates do the fringing).
 * Nothing to build lazily: the palette is a handful of uniforms. Measured with readback at about 6 ms a 1080p frame and 19 ms a
 * 4K frame (ANGLE/D3D11, RTX 5080).
 */
export class ComicInkEffect extends Effect {
  constructor() {
    super('ComicInkEffect', COMIC_FRAG, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['amount', new THREE.Uniform(0)],
        ['scale', new THREE.Uniform(1)],
        ['pitch', new THREE.Uniform(16)],
        ['levels', new THREE.Uniform(0)],
        ['outline', new THREE.Uniform(0)],
        ['edge', new THREE.Uniform(new THREE.Vector2(0.15, 0.35))],
        ['offC', new THREE.Uniform(new THREE.Vector2())],
        ['offM', new THREE.Uniform(new THREE.Vector2())],
        ['offY', new THREE.Uniform(new THREE.Vector2())],
        ['inRegister', new THREE.Uniform(1)],
        ['paperShown', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['paperLinear', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['keyShown', new THREE.Uniform(new THREE.Vector3())],
        ['keyLinear', new THREE.Uniform(new THREE.Vector3())],
        ['shadeShown', new THREE.Uniform(new THREE.Vector3())],
        ['shadeLinear', new THREE.Uniform(new THREE.Vector3())],
        ['shadeAngle', new THREE.Uniform(0)],
        ['inkCount', new THREE.Uniform(0)],
        ['inkShown', new THREE.Uniform(vec3s())],
        ['inkLinear', new THREE.Uniform(vec3s())],
        ['inkHue', new THREE.Uniform(vec3s())],
        ['inkAngle', new THREE.Uniform(new Array<number>(N).fill(0))],
        ['anchor', new THREE.Uniform(new THREE.Vector4(0, 0, 1, 0))],
        ['lineKind', new THREE.Uniform(0)],
        ['lineA', new THREE.Uniform(new THREE.Vector4())],
        ['lineB', new THREE.Uniform(new THREE.Vector4())],
        ['lineReach', new THREE.Uniform(1)],
        ['lineInk', new THREE.Uniform(new THREE.Vector3())],
      ]),
    });
  }

  /** Lengths are given at 1080p; a frame `height` device px tall scales them. */
  override setSize(_width: number, height: number): void {
    this.uniforms.get('scale')!.value = height / PRINT_HEIGHT;
  }

  /** Sets up the comic of one output frame; returns whether it draws anything (the pipeline skips the pass when not). */
  configure(look: ComicInkLook | undefined): boolean {
    const u = this.uniforms;
    if (!look || !comicActive(look)) {
      u.get('amount')!.value = 0;
      u.get('lineKind')!.value = 0;
      return false;
    }
    const st = resolveComic(look);
    const set3 = (name: string, c: readonly number[]) => (u.get(name)!.value as THREE.Vector3).set(c[0], c[1], c[2]);
    u.get('amount')!.value = st.amount;
    u.get('pitch')!.value = st.pitch;
    u.get('levels')!.value = st.levels;
    u.get('outline')!.value = st.outline;
    (u.get('edge')!.value as THREE.Vector2).set(st.edge[0], st.edge[1]);
    const { c, m, y } = st.offsets;
    (u.get('offC')!.value as THREE.Vector2).set(c[0], c[1]);
    (u.get('offM')!.value as THREE.Vector2).set(m[0], m[1]);
    (u.get('offY')!.value as THREE.Vector2).set(y[0], y[1]);
    u.get('inRegister')!.value = c[0] === m[0] && c[1] === m[1] && c[0] === y[0] && c[1] === y[1] ? 1 : 0;
    set3('paperShown', encodeRGB(st.paper));
    set3('paperLinear', st.paper);
    set3('keyShown', encodeRGB(st.key));
    set3('keyLinear', st.key);
    set3('shadeShown', encodeRGB(st.shade));
    set3('shadeLinear', st.shade);
    u.get('shadeAngle')!.value = st.shadeAngle;
    const pal = comicUniformPalette(st);
    u.get('inkCount')!.value = st.inks.length;
    const shown = u.get('inkShown')!.value as THREE.Vector3[];
    const lin = u.get('inkLinear')!.value as THREE.Vector3[];
    const hue = u.get('inkHue')!.value as THREE.Vector3[];
    const angle = u.get('inkAngle')!.value as number[];
    for (let k = 0; k < N; k++) {
      const has = k < st.inks.length;
      shown[k].set(...(has ? pal.shown[k] : ([0, 0, 0] as const)));
      lin[k].set(...(has ? pal.linear[k] : ([0, 0, 0] as const)));
      hue[k].set(...(has ? pal.hue[k] : ([0, 0, 0] as const)));
      angle[k] = has ? pal.angle[k] : 0;
    }
    (u.get('anchor')!.value as THREE.Vector4).set(st.screen.x, st.screen.y, st.screen.zoom, st.screen.roll);
    const l = st.lines;
    u.get('lineKind')!.value = l ? (l.kind === 'focus' ? 1 : 2) : 0;
    if (l) {
      (u.get('lineA')!.value as THREE.Vector4).set(l.x, l.y, l.angle ?? 0, l.count);
      (u.get('lineB')!.value as THREE.Vector4).set(l.width, l.inner, l.seed, l.amount);
      u.get('lineReach')!.value = lineReach(l);
      set3('lineInk', l.ink ?? st.key);
    }
    return true;
  }
}
