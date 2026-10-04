// Cosmos 6's picture on the GPU (renderer C; the pure shot is src/shots/cosmosHole.ts): the event horizon. A real annulus in a 3D scene,
// tilted under a perspective camera, textured in its fragment shader from the five-band strip (src/scenes/cosmosCStrip.ts) — spun
// differentially, drained inward, its innermost band the web's last frame resampled about the centre — with Doppler beaming (the
// approaching side brighter), the structure's band lines as cyan and pink tubes, the counterchange wave, the kicks' spaghettification
// and the lensed shock ring; drawn in two halves so the near side passes in front of the void; between them, in screen space, the
// shadow (VOID), the lensing (the far half re-projected as an arch over the void and a thin under-arch beneath it) and the amber photon
// ring. Under the twist (6.1, E18) the web's last frame (rendered once into a target, a deterministic cache) is wound into the spiral on
// the same tilted plane while the disc fades in. All of it is light in the HDR target the Riso print then re-prints as neon.
import * as THREE from 'three';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Shape } from '../engine/shapeField.ts';
import { FOV, FRONT, HEX } from '../shots/cosmosKit.ts';
import { HOLE, type HolePicture, holePicture, POINT_DOT, pointEye, stutterRingDots } from '../shots/cosmosHole.ts';
import { holeLights } from '../shots/cosmosWebLight.ts';
import { paintStrip } from './cosmosCStrip.ts';
import { INK_LIGHT, inkLight } from './cosmosCWeb.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const VOID: RGB = linear(HEX.VOID);

/** The disc's light at a disc point, shared by the disc and the lensing passes (GLSL; `uniform`s declared by the includer). */
const DISC_LIGHT = /* glsl */ `
  uniform sampler2D uStrip;
  uniform sampler2D uSnap;
  uniform float uSnapOn;
  uniform float uT;
  uniform float uDrain;
  uniform float uRout;
  uniform float uCC;
  uniform float uSpag;
  uniform float uPulse;
  uniform float uTubes;
  uniform float uRimTube;
  uniform float uShockR;
  uniform float uShockA;
  uniform float uBlinkBand;
  uniform float uBlinkAngle;
  uniform float uBlinkA;
  uniform float uRin;
  uniform float uLogSpan;
  uniform vec3 uAmber;
  uniform vec3 uCyan;
  uniform vec3 uPink;
  uniform vec3 uCore;
  uniform float uLens;

  float omegaOf(float r) { return min(0.2, 0.0785398 * pow(200.0 / max(r, 60.0), 1.5)); }

  // The strip's coordinates at disc point (r, th): u round the disc (turned by the differential spin), v out from the inner edge (drained).
  vec2 discUV(float r, float th) {
    return vec2((th + omegaOf(r) * uT) / 6.2831853, log(max(r, 1.0) / uRin) / uLogSpan + uDrain);
  }

  // Every screen derivative the disc's light needs, taken once per fragment in uniform control flow — before any per-pixel branch, loop,
  // early return or discard (inside those, derivatives are undefined: HLSL X3595 on ANGLE/D3D, a wrong wrap or LOD). uu is the strip's
  // u, wrap-safe: of two parameterisations, the one whose screen derivative is small (no seam where it wraps); dx/dy its and v's
  // gradients (for textureGrad), fv and fr the widths of v and r (the lines' anti-aliasing).
  struct DiscGrad { float uu; vec2 dx; vec2 dy; float fv; float fr; };
  DiscGrad discGrad(float r, vec2 uv) {
    float u1 = fract(uv.x);
    float u2 = fract(uv.x + 0.5) - 0.5;
    vec2 d1 = vec2(dFdx(u1), dFdy(u1));
    vec2 d2 = vec2(dFdx(u2), dFdy(u2));
    vec2 dv = vec2(dFdx(uv.y), dFdy(uv.y));
    bool first = abs(d1.x) + abs(d1.y) <= abs(d2.x) + abs(d2.y) + 1e-6;
    DiscGrad g;
    g.uu = first ? u1 : u2;
    g.dx = vec2(first ? d1.x : d2.x, dv.x);
    g.dy = vec2(first ? d1.y : d2.y, dv.y);
    g.fv = abs(dv.x) + abs(dv.y);
    g.fr = fwidth(r);
    return g;
  }

  // The strip at the fragment's u and row v (the spaghetti's rows share the fragment's gradients): explicit gradients, safe anywhere.
  vec3 stripAt(DiscGrad g, float v) {
    return textureGrad(uStrip, vec2(g.uu, v), g.dx, g.dy).rgb;
  }

  // Light (linear HDR) at disc point (r, th), its strip coordinates uv and their derivatives g (discUV, discGrad: taken by the caller).
  vec3 discLight(float r, float th, vec2 uv, DiscGrad g) {
    if (r < uRin * 0.92 || r > uRout + 6.0) return vec3(0.0);
    float l = log(max(r, 1.0) / uRin) / uLogSpan;
    float v = uv.y;
    float spin = omegaOf(r) * uT;
    float bandPos = fract(v) * 5.0;
    float bandIdx = floor(bandPos);
    float w = fract(bandPos);
    bool swapped = r < uCC;
    vec3 cyan = swapped ? uPink : uCyan;
    vec3 pink = swapped ? uCyan : uPink;
    vec3 col = vec3(0.0);
    // Doppler beaming (the right side approaches: the disc turns clockwise) and the heat of the inner disc.
    float beam = 1.0 + 0.45 * cos(th);
    float heat = 0.75 + 0.85 * pow(clamp(2.2 * uRin / r, 0.0, 1.0), 0.9);
    if (uTubes < 0.5) {
      vec3 ink = stripAt(g, v);
      // The spaghettifying kick: the inner disc smeared inward (rows further out pulled in over it).
      if (uSpag > 0.0 && r < uRin * 3.5) {
        float k = uSpag * (1.0 - smoothstep(uRin * 1.5, uRin * 3.5, r));
        for (int i = 1; i <= 5; i++) ink += k * 0.35 * stripAt(g, v + float(i) * 0.018);
      }
      col = (uAmber * ink.r * 1.3 + cyan * ink.g * 1.1 + pink * ink.b * 1.15) * 0.8;
      // The hot inner disc: fine filaments of gas wound round the hole (tubes once printed), white-hot amber toward the edge.
      float hotZone = (1.0 - smoothstep(uRin * 1.25, uRin * 4.0, r)) * (1.0 - uLens);
      if (hotZone > 0.0) {
        float ring = 0.5 + 0.5 * sin(r * 0.42 + 6.0 * ink.r + 3.0 * ink.g);
        float fil = pow(ring, 24.0) * smoothstep(0.1, 0.8, sin(th * 5.0 + spin * 0.7 + r * 0.04) * 0.5 + 0.5);
        col += mix(uAmber, uCore, 0.35) * fil * hotZone * 2.8;
      }
      // The web's band: its own last frame, resampled about its centre (the seam with 5.4a is invisible).
      if (uSnapOn > 0.5 && bandIdx < 0.5) {
        float rs = mix(120.0, 980.0, w);
        float ts = th + spin;
        vec2 q = vec2(cos(ts), sin(ts)) * rs;
        vec2 suv = q / vec2(1920.0, 1080.0) + 0.5;
        float inside = smoothstep(0.0, 0.03, suv.x) * smoothstep(1.0, 0.97, suv.x) * smoothstep(0.0, 0.05, suv.y) * smoothstep(1.0, 0.95, suv.y);
        float fade = smoothstep(0.0, 0.1, w) * smoothstep(1.0, 0.9, w);
        col += textureLod(uSnap, suv, 0.0).rgb * 1.25 * inside * fade;
      }
      // The spiral blink on the closed hats: one band's faces flash in a sweep.
      if (abs(bandIdx - uBlinkBand) < 0.5 && uBlinkA > 0.0) {
        float a = mod(th - uBlinkAngle - l * 9.0 + 3.14159265, 6.2831853) - 3.14159265;
        col *= 1.0 + 1.2 * uBlinkA * exp(-a * a / 0.25);
      }
      col *= beam * heat * (1.0 + 0.2 * uPulse);
      // A dark gap between the photon ring and the disc's inner edge (the last stable orbit).
      col *= smoothstep(uRin, uRin * 1.18, r);
    }
    // The structure: the band edges as tubes (cyan and pink in turn, drained with the bands).
    float gp = abs(fract(bandPos + 0.5) - 0.5) / 5.0;
    float px = gp / max(g.fv, 1e-6);
    float edgeIdx = floor(bandPos + 0.5);
    vec3 lineCol = mod(edgeIdx, 2.0) < 0.5 ? cyan : pink;
    col += lineCol * (smoothstep(1.8, 0.3, px) * 2.6 + exp(-px / 7.0) * 0.16) * (uTubes > 0.5 ? 1.4 : beam);
    // Finer structure inside each band: two thin rings a band, cyan and pink in turn (tubes once printed).
    if (uTubes < 0.5) {
      float sub = abs(fract(bandPos * 3.0 + 0.5) - 0.5) / 15.0;
      float spx = sub / max(g.fv, 1e-6);
      float subIdx = floor(bandPos * 3.0 + 0.5);
      vec3 subCol = mod(subIdx, 2.0) < 0.5 ? pink : cyan;
      float gap = 0.6 + 0.4 * sin(th * 3.0 + spin * 0.5 + subIdx * 1.7);
      col += subCol * smoothstep(1.3, 0.2, spx) * 1.5 * gap * beam * step(0.5, mod(subIdx, 3.0));
    }
    // The rim as a cyan tube (from 6.3&) and the outer edge's fade.
    float dr = (uRout - r) / max(g.fr, 1e-4);
    if (uRimTube > 0.5 || uTubes > 0.5) col += uCyan * (smoothstep(2.2, 0.4, abs(dr)) * 2.2 + exp(-abs(dr) / 9.0) * 0.3);
    col *= smoothstep(-1.0, 30.0, dr);
    // The lensed shock ring of the 6.2 clap.
    if (uShockA > 0.0) {
      float ds = abs(r - uShockR) / max(g.fr, 1e-4);
      col += uAmber * uShockA * (smoothstep(2.0, 0.5, ds) * 2.0 + exp(-ds / 22.0) * 0.35);
    }
    return col;
  }
`;

const DISC_VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const DISC_FRAG = /* glsl */ `
  ${DISC_LIGHT}
  uniform float uHalf;
  uniform float uVis;
  uniform float uCosTilt;
  uniform float uQArch;
  varying vec2 vP;
  void main() {
    float r = length(vP);
    float th = atan(vP.y, vP.x);
    vec2 uv = discUV(r, th);
    DiscGrad g = discGrad(r, uv);
    if (vP.y * uHalf < 0.0) discard;
    vec3 c = discLight(r, th, uv, g) * uVis;
    // The far side right behind the void is what the lensing lifts into the arch: seen directly it is dim.
    float dim = mix(0.18, 1.0, smoothstep(uQArch, uQArch + 280.0, length(vec2(vP.x, vP.y * uCosTilt))));
    c *= mix(1.0, dim, smoothstep(0.0, 90.0, vP.y));
    gl_FragColor = vec4(c, 1.0);
  }`;

/** The twist: the web's last frame on the disc's plane, wound into a spiral (inner turns furthest), fading as the disc comes in. */
const TWIST_FRAG = /* glsl */ `
  uniform sampler2D uSnap;
  uniform float uAlpha;
  uniform float uTwist;
  varying vec2 vP;
  void main() {
    float r = length(vP);
    float a = uTwist * clamp(1.0 - 0.75 * log(max(r, 50.0) / 50.0) / log(40.0), 0.25, 1.0);
    float c = cos(a), s = sin(a);
    vec2 src = vec2(c * vP.x - s * vP.y, s * vP.x + c * vP.y);
    vec2 suv = src / vec2(1920.0, 1080.0) + 0.5;
    float inside = smoothstep(0.0, 0.02, suv.x) * smoothstep(1.0, 0.98, suv.x) * smoothstep(0.0, 0.03, suv.y) * smoothstep(1.0, 0.97, suv.y);
    gl_FragColor = vec4(texture2D(uSnap, suv).rgb * uAlpha * inside, 1.0);
  }`;

/** The lensing and the photon ring, in screen space about the void (px, y up; the camera's zoom and turn undone first). */
const LENS_FRAG = /* glsl */ `
  ${DISC_LIGHT}
  uniform float uZoom;
  uniform float uTurn;
  uniform float uArch;
  uniform float uPhoton;
  uniform float uPhotonGain;
  uniform float uShadow;
  uniform float uQArch;
  uniform float uQUnder;
  varying vec2 vP;
  void main() {
    float c = cos(-uTurn), s = sin(-uTurn);
    vec2 p = vec2(c * vP.x - s * vP.y, s * vP.x + c * vP.y) / max(uZoom, 1e-4);
    float q = length(p);
    vec3 col = vec3(0.0);
    float q0 = uQArch;
    // Pass B lifts the far half over the void (disc r from the inner edge out, compressed toward the photon ring); pass C is the thin
    // under-arch hugging the void beneath. Both mappings are chosen without a branch and differentiated here, in uniform control flow
    // (the seam between them, at p.y = 0, is where both fade to nothing).
    bool above = p.y > 0.0;
    float Y = -p.y / 0.6;
    float qq = length(vec2(p.x, Y));
    float r = above ? uRin + (q - q0) / 0.24 : uRin + (qq - uQUnder) / 0.06;
    float th = above ? atan(p.y, p.x) : atan(Y, p.x);
    vec2 uv = discUV(r, th);
    DiscGrad g = discGrad(r, uv);
    if (uArch > 0.0) {
      float a = above
        ? smoothstep(q0, q0 + 4.0, q) * (1.0 - smoothstep(q0 + 110.0, q0 + 230.0, q)) * smoothstep(0.0, 46.0, p.y)
        : smoothstep(uQUnder, uQUnder + 2.0, qq) * (1.0 - smoothstep(uQUnder + 26.0, uQUnder + 48.0, qq)) * smoothstep(0.0, 24.0, -p.y);
      if (a > 0.0) col += discLight(r, th, uv, g) * a * (above ? 1.7 : 0.6);
      col *= uArch;
    }
    // The photon ring: a thin amber line and its glow, pulsing on the kicks.
    float d = abs(q - uPhoton) * uZoom;
    col += mix(uAmber, uCore, 0.5) * uPhotonGain * (smoothstep(2.6, 0.6, d) * 5.0 + exp(-d / 5.0) * 0.3) * step(0.5, uPhoton);
    // Nothing inside the void.
    col *= smoothstep(uShadow - 1.0, uShadow + 1.0, q);
    gl_FragColor = vec4(col, 1.0);
  }`;

const LENS_VERT = DISC_VERT;

export class HoleRenderer {
  private discScene = new THREE.Scene();
  private lensScene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(20, 16 / 9, 10, 40000);
  private readonly ortho = new THREE.OrthographicCamera(-960, 960, 540, -540, -10, 10);
  private disc: THREE.Mesh | null = null;
  private twist: THREE.Mesh | null = null;
  private lens: THREE.Mesh | null = null;
  private discMat: THREE.ShaderMaterial | null = null;
  private twistMat: THREE.ShaderMaterial | null = null;
  private lensMat: THREE.ShaderMaterial | null = null;
  private strip: THREE.CanvasTexture | null = null;
  private snapTarget: THREE.WebGLRenderTarget | null = null;
  private snapReady = false;
  private snapshot: ((target: THREE.WebGLRenderTarget) => void) | null = null;
  private dark: FlatLayer | null = null;
  private light: FlatLayer | null = null;
  private readonly owned: { dispose(): void }[] = [];

  /** `snapshot` draws the web's last frame (cosmos 6.1 − ε) into a target: called once, on first need. */
  init(atlases: { face: GlyphAtlas }, size: { width: number; height: number }, snapshot: (target: THREE.WebGLRenderTarget) => void): void {
    this.snapshot = snapshot;
    this.strip = new THREE.CanvasTexture(paintStrip());
    this.strip.wrapS = THREE.RepeatWrapping;
    this.strip.wrapT = THREE.RepeatWrapping;
    this.strip.generateMipmaps = true;
    this.strip.minFilter = THREE.LinearMipmapLinearFilter;
    this.strip.anisotropy = 16;
    this.strip.colorSpace = THREE.NoColorSpace;
    // Row 0 of the canvas is the inner edge (v 0): faces stand with their heads toward the hole, upright on the near side.
    this.strip.flipY = false;
    this.snapTarget = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    const uniforms = () => ({
      uStrip: { value: this.strip },
      uSnap: { value: this.snapTarget!.texture },
      uSnapOn: { value: 1 },
      uT: { value: 0 },
      uDrain: { value: 0 },
      uRout: { value: HOLE.rout },
      uCC: { value: 0 },
      uSpag: { value: 0 },
      uPulse: { value: 0 },
      uTubes: { value: 0 },
      uRimTube: { value: 0 },
      uShockR: { value: 0 },
      uShockA: { value: 0 },
      uBlinkBand: { value: 0 },
      uBlinkAngle: { value: 0 },
      uBlinkA: { value: 0 },
      uRin: { value: HOLE.rin },
      uLogSpan: { value: Math.log(HOLE.rout / HOLE.rin) },
      uAmber: { value: new THREE.Vector3(...INK_LIGHT.amber) },
      uCyan: { value: new THREE.Vector3(...INK_LIGHT.cyan) },
      uPink: { value: new THREE.Vector3(...scaleRGB(INK_LIGHT.pink, 1.05)) },
      uCore: { value: new THREE.Vector3(...INK_LIGHT.core) },
      uLens: { value: 0 },
    });
    const additive = { blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, premultipliedAlpha: true } as const;
    this.discMat = new THREE.ShaderMaterial({ uniforms: { ...uniforms(), uHalf: { value: 1 }, uVis: { value: 1 }, uCosTilt: { value: 1 }, uQArch: { value: HOLE.photon + 10 } }, vertexShader: DISC_VERT, fragmentShader: DISC_FRAG, ...additive, side: THREE.DoubleSide });
    this.disc = new THREE.Mesh(new THREE.RingGeometry(HOLE.rin * 0.92, HOLE.rout * 1.02, 720, 96), this.discMat);
    this.disc.frustumCulled = false;
    this.twistMat = new THREE.ShaderMaterial({ uniforms: { uSnap: { value: this.snapTarget.texture }, uAlpha: { value: 0 }, uTwist: { value: 0 } }, vertexShader: DISC_VERT, fragmentShader: TWIST_FRAG, ...additive, side: THREE.DoubleSide });
    this.twist = new THREE.Mesh(new THREE.PlaneGeometry(3200, 2400, 1, 1), this.twistMat);
    this.twist.frustumCulled = false;
    this.discScene.add(this.disc, this.twist);
    this.lensMat = new THREE.ShaderMaterial({
      uniforms: { ...uniforms(), uZoom: { value: 1 }, uTurn: { value: 0 }, uArch: { value: 0 }, uPhoton: { value: HOLE.photon }, uPhotonGain: { value: 1 }, uShadow: { value: HOLE.shadow }, uQArch: { value: HOLE.photon + 10 }, uQUnder: { value: HOLE.shadow + 3 }, uLens: { value: 1 } },
      vertexShader: LENS_VERT,
      fragmentShader: LENS_FRAG,
      ...additive,
    });
    this.lens = new THREE.Mesh(new THREE.PlaneGeometry(1920, 1080), this.lensMat);
    this.lens.frustumCulled = false;
    this.lensScene.add(this.lens);
    this.dark = new FlatLayer({ atlases: {}, blend: 'normal', aspect: size.width / size.height, shapes: 64, glyphs: 1 });
    this.light = new FlatLayer({ atlases: { face: atlases.face }, blend: 'add', aspect: size.width / size.height, shapes: 2048, glyphs: 512 });
    this.owned.push(this.strip, this.snapTarget, this.discMat, this.twistMat, this.lensMat, this.disc.geometry, this.twist.geometry, this.lens.geometry, this.dark, this.light);
  }

  private setUniforms(m: THREE.ShaderMaterial, pic: HolePicture): void {
    const u = m.uniforms;
    const d = pic.disc;
    u.uT.value = d.t;
    u.uDrain.value = d.drain;
    u.uRout.value = d.rout;
    u.uCC.value = d.cc;
    u.uSpag.value = d.spaghetti;
    u.uPulse.value = d.pulse;
    u.uTubes.value = d.tubes ? 1 : 0;
    u.uRimTube.value = d.rimTube ? 1 : 0;
    u.uShockR.value = d.shock?.r ?? 0;
    u.uShockA.value = d.shock?.a ?? 0;
    u.uBlinkBand.value = d.blink.band;
    u.uBlinkAngle.value = d.blink.angle;
    u.uBlinkA.value = d.blink.a;
    u.uSnapOn.value = this.snapReady ? 1 : 0;
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number): void {
    const pic = holePicture(f);
    const dark = this.dark!;
    const light = this.light!;
    dark.draw(gl, target, SCREEN, { under: [], glyphs: {}, over: [] }, { color: VOID, grain: 0 });
    if (pic.point) {
      // Continuity plan v07 §2.3 (WP1): the point as the club's eye — halftone glow, the amber disc, its highlight, the K keyline — and the
      // stutter's Ben-Day rings held round it.
      light.draw(gl, target, SCREEN, { under: pointShapes(f), glyphs: {}, over: [] }, null);
      const e = pointEye(f);
      dark.draw(gl, target, SCREEN, { under: [{ kind: 'ring', x: 0, y: 0, w: 2 * e.r + e.keyline, h: 2 * e.r + e.keyline, r: e.keyline, color: VOID }], glyphs: {}, over: [] }, null);
      return;
    }
    if (!this.snapReady) {
      this.snapshot!(this.snapTarget!);
      this.snapReady = true;
    }
    // The camera: tilted over the plane, zoomed (the push and the stutter's slice) and turned about the view axis.
    const D = HOLE.distance;
    const t = pic.cam.tilt;
    const cam = this.camera;
    cam.position.set(0, -D * Math.sin(t), D * Math.cos(t));
    const up = new THREE.Vector3(0, Math.cos(t), Math.sin(t));
    const right = new THREE.Vector3(1, 0, 0);
    cam.up.copy(up.multiplyScalar(Math.cos(pic.cam.turn)).add(right.multiplyScalar(Math.sin(pic.cam.turn))));
    cam.lookAt(0, 0, 0);
    cam.fov = (2 * Math.atan(540 / (D * Math.max(pic.cam.zoom, 1e-4))) * 180) / Math.PI;
    cam.aspect = 16 / 9;
    cam.updateProjectionMatrix();
    const dm = this.discMat!;
    this.setUniforms(dm, pic);
    dm.uniforms.uVis.value = pic.disc.vis;
    dm.uniforms.uCosTilt.value = Math.cos(t);
    const tm = this.twistMat!;
    tm.uniforms.uAlpha.value = pic.snapshot.alpha;
    tm.uniforms.uTwist.value = pic.snapshot.twist;
    this.twist!.visible = pic.snapshot.alpha > 0.002;
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    // 1. The far half of the disc (and the web being wound into it).
    dm.uniforms.uHalf.value = 1;
    this.disc!.visible = pic.disc.vis > 0.002 || pic.disc.tubes;
    gl.render(this.discScene, cam);
    gl.autoClear = auto;
    // 2. The void.
    dark.draw(gl, target, SCREEN, { under: pic.shadow > 0.5 ? [{ kind: 'ellipse', x: 0, y: 0, w: 2 * pic.shadow, h: 2 * pic.shadow, color: VOID }] : [], glyphs: {}, over: [] }, null);
    // 3. The lensing (arch, under-arch) and the photon ring, in screen space.
    const lm = this.lensMat!;
    this.setUniforms(lm, pic);
    lm.uniforms.uZoom.value = pic.cam.zoom;
    lm.uniforms.uTurn.value = pic.cam.turn;
    lm.uniforms.uArch.value = pic.arch;
    lm.uniforms.uPhoton.value = pic.photon / Math.max(pic.cam.zoom, 1e-4);
    lm.uniforms.uPhotonGain.value = pic.photonGain;
    lm.uniforms.uShadow.value = pic.shadow / Math.max(pic.cam.zoom, 1e-4);
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.lensScene, this.ortho);
    // 4. The near half, in front of the void.
    dm.uniforms.uHalf.value = -1;
    this.twist!.visible = false;
    gl.render(this.discScene, cam);
    gl.autoClear = auto;
    // 5. His backing, then the light on top: him, the Defender at his post, the stardust, the glints, the flare, the spaghetti.
    const lights = holeLights(f, pic);
    if (lights.backing.length) dark.draw(gl, target, SCREEN, { under: lights.backing, glyphs: {}, over: [] }, null);
    const faces: Glyph[] = lights.faces.map((x) => ({ ch: x.text, x: x.x, y: x.y, size: x.em, color: inkLight(x.ink, x.glow), alpha: x.alpha, ...(x.rot ? { rot: x.rot } : {}) }));
    const under: Shape[] = lights.shapes.map((s) => ({ ...s.shape, color: inkLight(s.ink, s.gain) }));
    light.draw(gl, target, SCREEN, { under, glyphs: { face: faces }, over: [] }, null);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}

/** The club's dot as its eye (continuity plan v07 §2.3; cosmosHole.ts pointEye): exact colours (no HDR, the print is off). */
function pointShapes(f: number): Shape[] {
  const e = pointEye(f);
  void POINT_DOT;
  return [
    ...stutterRingDots(f).map((d): Shape => ({ kind: 'ellipse', x: d.x, y: d.y, w: d.d, h: d.d, color: linear('#FDF3D8', 0.8), soft: 0.8 })),
    ...e.glow.map((d): Shape => ({ kind: 'ellipse', x: d.x, y: d.y, w: d.d, h: d.d, color: linear(HEX.AMBER, 0.55), soft: 0.6 })),
    { kind: 'ellipse', x: 0, y: 0, w: 2 * e.r, h: 2 * e.r, color: linear(HEX.AMBER, 0.85), soft: 1 },
    { kind: 'ellipse', x: e.highlight.x, y: e.highlight.y, w: 2 * e.highlight.w, h: 2 * e.highlight.h, rot: e.highlight.rot, color: linear('#FDF3D8', 0.6), soft: 0.6 },
  ];
}
