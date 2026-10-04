// The transition's films and gates on the GPU (the part 'transition'; pure maths in src/shots/transitionGate.ts): every sheet is one
// instanced quad in real 3D, projected by the transition's camera (the Vertigo dolly zoom, the flight, the corkscrew, the reverse
// Vertigo: eye, focal, roll and the vanishing point as uniforms; a fronto-parallel sheet keeps its shape, so perspective is exact), and
// printed by one fragment shader as the design's Riso film (final.md §4 bar 13): outward from its 800 × 450 window a 14-unit rule, a
// guilloche band (u 30–110: eight interlaced curves), a strip (u 110–150) of knocked-out faces (B, P) or glints and rosettes (Y), a
// halftone falloff (tint 0.35 → 0 by u 600, the plate's screen angle, pitch 10), ⊕ marks at the window's corners, its edition number
// and (film 1) the signature slug; a gate is a 16-unit rule and two face blocks with the face knocked out (as a 3-unit outline in the
// dark). The strip and band run clockwise round the frame (text tops outward), mitred at the corners.
// Two materials, both commutative (the sheets need no sorting): 'multiply' (the inks print, output = transmittance: whole on the Riso
// paper; behind each press pass's dark front still printing on its dark paper, thinner as the plates light up, so the tunnel's bands
// stay dark) and 'light' (behind the fronts only: added over the ink).
// As light the plates are neon in the dark, not lit paint (rev1c T1 / t-haze: a continuous tube or a lit fill smears, under the
// slit-scan, into an even veil): in flight each rule is a string of hot beads (2 px across whatever the sheet's depth; smeared, each a
// radial streak, all the sheets' beads one wall of pink, cyan and cream streaks converging on the sun), the strip two faint edge tubes,
// the faces neon signs (their outline a ≤ 2 px tube, the fill a faint glow) that shine like windows on the first pass and dim as the
// speed doubles, the gates a thin rule core and their faces' outlines; only the near sheets streak hot (iLight: the shot's glowOf and
// knockGlowOf). Flattened by the reverse Vertigo (iLight.z) nothing smears, so the whole tube, the guilloche, the strip and a faint
// falloff glow: the flat frame glows to the screen's edges.
import * as THREE from 'three';
import { FILM_POSES, GATE_FACES } from '../content/castCosmos.ts';
import { GLINTS, SLUG } from '../content/cosmos.ts';
import { type RGB, linear, transmit } from '../engine/color.ts';
import { cssStack } from '../engine/fonts.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { HEX } from '../shots/cosmosKit.ts';
import { GATE, type GateCamera, type GateFilm, LIGHT as LEVELS, OUTER, SLOT, WINDOW } from '../shots/transitionGate.ts';
import { DENSITY, PLATE, SCREEN } from '../worlds/riso.ts';

/** The print atlas's keys, by index in the shader: the six film faces (pair × pose), the three gate faces, ✦, ✧. */
export const PRINT_KEYS: readonly string[] = [...FILM_POSES.flat(), ...GATE_FACES, ...GLINTS];
/** The mono atlas: every character of the slug and the edition numbers (`copy 001/∞`). */
export const MONO_KEYS: readonly string[] = [...new Set([...'0123456789', ...`${SLUG}copy/∞`])].filter((c) => c.trim() !== '');
const CAPACITY = 64;

const FILM_VERT = /* glsl */ `
  attribute vec4 iPos;   // x, y, z (world), twist
  attribute vec4 iInk;   // plate, kind (0 film, 1 gate), reach, alpha
  attribute vec4 iBand;  // scroll, hot, targets (bits), edition
  attribute vec4 iMisc;  // slug characters, gate face top, gate face bottom, n
  attribute vec4 iLight; // behind the passes: the lines' glow, the knock-outs' glow, flat (0 flight → 1 flattened), -
  uniform float uEye;
  uniform float uFocal;
  uniform vec2 uRoll;    // cos, sin
  uniform vec2 uVP;
  varying vec2 vP;       // the sheet's own plane, units, from the window's centre (untwisted)
  varying vec2 vScr;     // logical px from the frame centre
  varying float vScale;  // logical px per unit
  varying vec4 vInk;
  varying vec4 vBand;
  varying vec4 vMisc;
  varying vec3 vLight;
  void main() {
    vec2 ext = vec2(${(WINDOW.a + OUTER).toFixed(1)}, ${(WINDOW.b + OUTER).toFixed(1)});
    vec2 local = position.xy * 2.0 * ext;
    float c = cos(iPos.w);
    float s = sin(iPos.w);
    vec2 w = iPos.xy + mat2(c, s, -s, c) * local;
    float D = max(uEye - iPos.z, 1e-3);
    vec2 r = mat2(uRoll.x, uRoll.y, -uRoll.y, uRoll.x) * w;
    vec2 scr = uVP + r * (uFocal / D);
    gl_Position = vec4(scr.x / 960.0 * D, scr.y / 540.0 * D, 0.0, D);
    vP = local;
    vScr = scr;
    vScale = uFocal / D;
    vInk = iInk;
    vBand = iBand;
    vMisc = iMisc;
    vLight = iLight.xyz;
  }`;

const FILM_FRAG = /* glsl */ `
  #define PI 3.14159265
  uniform sampler2D uPrint;
  uniform sampler2D uMono;
  uniform vec4 uPrintBox[${PRINT_KEYS.length}];
  uniform vec4 uPrintFit[${PRINT_KEYS.length}];   // aspect, strip em, gate em, -
  uniform vec4 uPrintAtlas;                         // cell (ems), atlas px, radius px, font px
  uniform vec4 uMonoBox[${MONO_KEYS.length}];
  uniform float uMonoAspect[${MONO_KEYS.length}];
  uniform vec4 uMonoAtlas;                          // cell (ems), atlas px, radius px, advance (ems)
  uniform float uSlug[${[...SLUG].length}];         // the slug's characters (mono indices; −1 a space)
  uniform float uEdition[10];                       // 'copy ' + 3 digits + '/∞': the fixed characters' indices (digits: −2)
  uniform vec4 uDigits;                             // mono index of '0' (the digits are consecutive keys), -
  uniform vec3 uInkT[3];                            // the plates' transmittance (multiply)
  uniform vec3 uInkPrint[3];                        // the plates as light, print hue
  uniform vec3 uInkNeon[3];                         // … neon hue (full power)
  uniform vec3 uPaper;                              // the paper as light
  uniform vec4 uFront;                              // radius (px), inner level, outer level, -
  uniform vec4 uGain;                               // light: rule, guilloche (in flight), the faces on the first pass, -
  uniform vec4 uGain2;                              // light: knock-outs, marks (⊕, type), gate rule, gate face
  uniform vec4 uGain3;                              // light, flattened: the rule's body, guilloche, strip fill, falloff
  uniform vec4 uGain4;                              // light, in flight: the rule's beads, the strip's edges, the unlit faces, the faces from pass 2
  uniform vec4 uHat;                                // last hat index, its age (frames), pose, device px per logical px
  uniform vec2 uVPf;
  varying vec2 vP;
  varying vec2 vScr;
  varying float vScale;
  varying vec4 vInk;
  varying vec4 vBand;
  varying vec4 vMisc;
  varying vec3 vLight;

  float hash1(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  // An anti-aliased box [a, b] along x, px = units per screen px.
  float span(float x, float a, float b, float px) {
    return clamp((x - a) / px + 0.5, 0.0, 1.0) * clamp((b - x) / px + 0.5, 0.0, 1.0);
  }
  // A line of half-width hw at distance d: never thinner than a pixel (thinner lines keep their ink as a fainter pixel line).
  float line(float d, float hw, float px) {
    float h = max(hw, 0.5 * px);
    return clamp((h - d) / px + 0.5, 0.0, 1.0) * (hw / h);
  }
  // A neon tube's hot core at distance d from its axis: a gaussian of half-width hw units, never wider than 1.6 device px (a near sheet's
  // tube is a thin hot line, not a wide band, so the slit-scan smears it into a streak instead of a veil), its light kept under a pixel.
  float tubeCore(float d, float hw, float px) {
    float w = min(hw, 1.6 * px);
    float s = max(w, 0.7 * px);
    return exp(-(d / s) * (d / s)) * (w / s);
  }
  // A glyph of the print atlas: g in units from its quad's centre, em units an em.
  float printGlyph(int k, vec2 g, float em, float px) {
    vec4 box = uPrintBox[k];
    float h = uPrintAtlas.x * em;
    float w = h * uPrintFit[k].x;
    vec2 t = vec2(g.x / w + 0.5, g.y / h + 0.5);
    float inside = step(0.0, t.x) * step(t.x, 1.0) * step(0.0, t.y) * step(t.y, 1.0);
    vec2 uv = vec2(mix(box.x, box.z, clamp(t.x, 0.0, 1.0)), mix(box.w, box.y, clamp(t.y, 0.0, 1.0)));
    float texelsPerPx = (uPrintAtlas.x * uPrintAtlas.w) / (h / px);
    float d = textureLod(uPrint, uv, max(0.0, log2(texelsPerPx))).r * inside;
    float aa = max(0.7 * texelsPerPx / uPrintAtlas.z, 1e-3);
    return smoothstep(0.75 - aa, 0.75 + aa, d);
  }
  // Its outline (a band width units wide round the edge).
  float printOutline(int k, vec2 g, float em, float px, float width) {
    vec4 box = uPrintBox[k];
    float h = uPrintAtlas.x * em;
    float w = h * uPrintFit[k].x;
    vec2 t = vec2(g.x / w + 0.5, g.y / h + 0.5);
    float inside = step(0.0, t.x) * step(t.x, 1.0) * step(0.0, t.y) * step(t.y, 1.0);
    vec2 uv = vec2(mix(box.x, box.z, clamp(t.x, 0.0, 1.0)), mix(box.w, box.y, clamp(t.y, 0.0, 1.0)));
    float texelsPerPx = (uPrintAtlas.x * uPrintAtlas.w) / (h / px);
    float d = textureLod(uPrint, uv, max(0.0, log2(texelsPerPx))).r * inside;
    // SDF value per unit: (font px per em / em units) / radius.
    float perUnit = (uPrintAtlas.w / em) / uPrintAtlas.z;
    float dist = abs(d - 0.75) / perUnit;
    return line(dist, 0.5 * width, px) * inside;
  }
  float monoGlyph(int k, vec2 g, float em, float px) {
    vec4 box = uMonoBox[k];
    float h = uMonoAtlas.x * em;
    float w = h * uMonoAspect[k];
    vec2 t = vec2(g.x / w + 0.5, g.y / h + 0.5);
    float inside = step(0.0, t.x) * step(t.x, 1.0) * step(0.0, t.y) * step(t.y, 1.0);
    vec2 uv = vec2(mix(box.x, box.z, clamp(t.x, 0.0, 1.0)), mix(box.w, box.y, clamp(t.y, 0.0, 1.0)));
    float fontPx = uMonoAtlas.y;
    float texelsPerPx = (uMonoAtlas.x * fontPx) / (h / px);
    float d = textureLod(uMono, uv, max(0.0, log2(texelsPerPx))).r * inside;
    float aa = max(0.7 * texelsPerPx / uMonoAtlas.z, 1e-3);
    return smoothstep(0.75 - aa, 0.75 + aa, d);
  }
  // A monospaced string of mono indices along x from 0 (cells of advance × em), the middle line at y = 0.
  float digitAt(float edition, int i) {
    float p = i == 5 ? 100.0 : i == 6 ? 10.0 : 1.0;
    return mod(floor(edition / p), 10.0);
  }
  float edition(vec2 g, float em, float ed, float px) {
    float adv = uMonoAtlas.w * em;
    float ci = floor(g.x / adv);
    if (ci < 0.0 || ci > 9.0) return 0.0;
    int i = int(ci);
    float code = uEdition[i];
    if (code < -1.5) code = uDigits.x + digitAt(ed, i);
    if (code < 0.0) return 0.0;
    return monoGlyph(int(code), vec2(g.x - (ci + 0.5) * adv, g.y), em, px);
  }
  float slug(vec2 g, float em, float chars, float px) {
    float adv = uMonoAtlas.w * em;
    float ci = floor(g.x / adv);
    if (ci < 0.0 || ci >= chars) return 0.0;
    float code = uSlug[int(ci)];
    if (code < 0.0) return 0.0;
    return monoGlyph(int(code), vec2(g.x - (ci + 0.5) * adv, g.y), em, px);
  }
  // A halftone screen of tint at pitch units, turned angle: dot coverage (flat tint once the pitch is under 10 px).
  float halftone(vec2 p, float tint, float pitch, float angle, float px) {
    if (tint <= 0.0) return 0.0;
    float c = cos(angle);
    float s = sin(angle);
    vec2 q = mat2(c, -s, s, c) * p / pitch;
    vec2 cell = fract(q) - 0.5;
    float r = sqrt(tint / PI);
    float dots = clamp((r - length(cell)) * pitch / px + 0.5, 0.0, 1.0);
    float pitchPx = pitch / px;
    return mix(dots, tint, clamp((12.0 - pitchPx) / 6.0, 0.0, 1.0));
  }

  void main() {
    float a = ${WINDOW.a.toFixed(1)};
    float b = ${WINDOW.b.toFixed(1)};
    float px = 1.0 / max(vScale * uHat.w, 1e-4);   // units per device px
    float plateF = vInk.x;
    int plate = int(plateF + 0.5);
    bool gate = vInk.y > 0.5;
    float reach = vInk.z;
    vec2 p = vP;
    vec2 q = abs(p);
    float dx = q.x - a;
    float dy = q.y - b;
    float u = max(dx, dy);
    if (u < -2.0 * px) discard;
    // The press state here: inside the front the newer pass.
    float level = length(vScr - uVPf) < uFront.x ? uFront.y : uFront.z;
    #ifndef MULTIPLY
      if (level <= 0.0) discard;
    #endif
    float flatK = vLight.z;
    // Along the frame, clockwise (top left → right, right top → bottom …); text tops point outward.
    bool horiz = dy >= dx;
    float s;
    if (horiz) s = p.y > 0.0 ? p.x + a : 2.0 * a + 2.0 * b + (a - p.x);
    else s = p.x > 0.0 ? 2.0 * a + (b - p.y) : 4.0 * a + 2.0 * b + (p.y + b);
    float along = s + vBand.x;
    float printed = clamp((reach - u) / px + 0.5, 0.0, 1.0);

    float ink = 0.0;      // ink coverage (multiply) / its light (× gains)
    float inkL = 0.0;
    float knock = 0.0;    // knock-outs (paper)
    float hotRule = 0.0;
    if (!gate) {
      // The rule; a chase light runs through it as a 6-unit paper line.
      float rule = span(u, 0.0, 14.0, px);
      hotRule = vBand.y * line(abs(u - 7.0), 3.0, px);
      ink = max(ink, rule * (1.0 - hotRule));
      // As light the rule is a neon tube. In flight it is a string of hot beads along its core (a marquee: 6 units lit every 31.25, a thin
      // line whatever the sheet's depth): smeared by the slit-scan each bead is a radial streak, the beads of all the sheets one wall of
      // streaks converging on the sun (2001's slit-scan), the dark between them dark — a continuous tube would smear into an even veil.
      // Flattened (no smear) the whole tube glows, its core hottest. The Y plate carries light only in its glints: half the B and P neon.
      float bp = ${(SLOT / 2).toFixed(4)};
      float bead = clamp((min(3.0, 1.5 * px) - abs(fract(along / bp) - 0.5) * bp) / px + 0.5, 0.0, 1.0) * exp(-pow((u - 7.0) / 2.5, 2.0));
      float body = rule * (0.3 + 0.7 * exp(-pow((u - 7.0) / 4.0, 2.0))) * uGain3.x;
      inkL += mix(bead * uGain4.x, body * (plate == 2 ? 0.5 : 1.0), flatK) * uGain.x;
      // The guilloche band (u 30–110): eight interlaced curves, 2 units, periods dividing the perimeter (seamless), phases per film.
      float v = u - 30.0;
      if (v > -4.0 && v < 84.0) {
        float g = 0.0;
        float gL = 0.0;
        float ph = vMisc.w * 1.7;
        for (int j = 0; j < 8; j++) {
          float fj = float(j);
          float k1 = 2.0 * PI / ${(SLOT).toFixed(4)};
          float k2 = 2.0 * PI / ${(SLOT * (2 / 3)).toFixed(4)};
          float y = 40.0 + 22.0 * sin(k1 * along + fj * PI / 4.0 + ph) + 12.0 * sin(k2 * along - fj * PI / 3.0 - ph * 0.6);
          float dydx = 22.0 * k1 * cos(k1 * along + fj * PI / 4.0 + ph) + 12.0 * k2 * cos(k2 * along - fj * PI / 3.0 - ph * 0.6);
          float dist = abs(v - y) / sqrt(1.0 + dydx * dydx);
          g = max(g, line(dist, 1.0, px));
          gL = max(gL, tubeCore(dist, 1.0, px));
        }
        g *= span(v, 0.0, 80.0, px);
        gL *= span(v, 0.0, 80.0, px);
        ink = max(ink, g);
        inkL += mix(gL * uGain.y, g * uGain3.y, flatK);
      }
      // The strip (u 110–150): solid at 0.85 with its marks knocked out, a slot each.
      float strip = span(u, 110.0, 150.0, px);
      if (strip > 0.0) {
        float slot = floor(along / ${SLOT.toFixed(4)});
        float i = mod(slot, 20.0);
        vec2 g = vec2(along - (slot + 0.5) * ${SLOT.toFixed(4)}, u - 130.0);
        float m = 0.0;
        float mL = 0.0;
        if (plate < 2) {
          float pair = mod(i + plateF, 3.0);
          float pose = mod(uHat.z + i, 2.0);
          int k = int(pair * 2.0 + pose + 0.5);
          m = printGlyph(k, g, uPrintFit[k].y, px);
          #ifndef MULTIPLY
            // As light a face is a neon sign: its outline a tube (≤ 2 px wide: smeared by the slit-scan, a bundle of streaks, not a grey
            // ghost), its fill a faint glow; flattened, the fill shines whole.
            float o = printOutline(k, g, uPrintFit[k].y, px, min(3.0, 2.0 * px));
            mL = mix(0.1 * m + o, m, flatK);
          #endif
        } else if (mod(i, 2.0) > 0.5) {
          int k = mod(i + uHat.z, 4.0) == 1.0 ? ${PRINT_KEYS.length - 2} : ${PRINT_KEYS.length - 1};
          m = printGlyph(k, g, uPrintFit[k].y, px);
        } else {
          // A rosette: six dots round the slot's centre, turned by the pose.
          for (int d = 0; d < 6; d++) {
            float an = float(d) * PI / 3.0 + uHat.z;
            m = max(m, clamp((3.5 - length(g - 11.0 * vec2(cos(an), sin(an)))) / px + 0.5, 0.0, 1.0));
          }
        }
        if (plate == 2) mL = m;
        // Behind the passes the faces are windows at night: a third of them lit, the rest dim; 4 % twinkle on each closed hat.
        float lit = hash1(vec3(slot, vMisc.w, 7.0)) < 0.25 ? 1.0 : uGain4.z;
        float tw = hash1(vec3(slot, vMisc.w, uHat.x)) < 0.04 ? 2.5 * max(0.0, 1.0 - uHat.y / 4.0) : 0.0;
        knock = max(knock, mL * strip * (lit + tw));
        ink = max(ink, strip * 0.85 * (1.0 - m));
        // As light the strip is two thin tubes along its edges round its lit marks (flattened, its fill glows too).
        float edges = max(tubeCore(abs(u - 111.0), 1.2, px), tubeCore(abs(u - 149.0), 1.2, px));
        inkL += strip * (1.0 - m) * flatK * uGain3.z + edges * mix(uGain4.y, 0.3, flatK) * uGain.x;
      }
      // The halftone falloff (u 150 → 600: tint 0.35 → 0), the plate's screen.
      float fall = span(u, 150.0, ${OUTER.toFixed(1)}, px);
      if (fall > 0.0) {
        float tint = 0.25 * (1.0 - clamp((u - 150.0) / ${(OUTER - 150).toFixed(1)}, 0.0, 1.0));
        float ang = plate == 0 ? ${SCREEN.angle.blue.toFixed(5)} : plate == 1 ? ${SCREEN.angle.pink.toFixed(5)} : ${SCREEN.angle.yellow.toFixed(5)};
        float h = halftone(p, tint, ${SCREEN.pitch.toFixed(1)}, ang, px) * fall;
        ink = max(ink, h);
        // In flight the falloff is ink only (the dark between the tubes stays dark: neon, not haze); flattened, it glows out to the frame's edges.
        inkL += h * flatK * uGain3.w;
      }
      // ⊕ at the window's corners (solid while its target prints), drawn once the ink reaches them.
      if (reach > 120.0 && vScale < 6.0) {
        vec2 c = vec2(sign(p.x) * (a + 84.0), sign(p.y) * (b + 84.0));
        vec2 d = p - c;
        float bit = p.x > 0.0 ? (p.y > 0.0 ? 1.0 : 2.0) : (p.y < 0.0 ? 4.0 : 0.0);
        float solid = bit > 0.0 && mod(floor(vBand.z / bit), 2.0) > 0.5 ? 1.0 : 0.0;
        float ring = solid > 0.5 ? clamp((23.0 - length(d)) / px + 0.5, 0.0, 1.0) : line(abs(length(d) - 23.0), 1.5, px);
        float cross = max(line(abs(d.x), 1.5, px) * step(abs(d.y), 36.0), line(abs(d.y), 1.5, px) * step(abs(d.x), 36.0));
        float t = max(ring, cross);
        ink = max(ink, t);
        inkL += t * uGain2.y;
      }
      // The edition number (mono 11), bottom-right outside the window; the slug (mono 13) up film 1's left edge.
      if (reach > 210.0) {
        float e = edition(vec2(p.x - (a + 40.0), p.y + b + 196.0), 11.0, vBand.w, px);
        ink = max(ink, e);
        inkL += e * uGain2.y;
      }
      if (vMisc.x > 0.0) {
        float sl = slug(vec2(p.y + b - 10.0, -(p.x + a + 30.0) - 4.5), 13.0, vMisc.x, px);
        ink = max(ink, sl);
        inkL += sl * uGain2.y;
      }
    } else {
      // A gate: a 16-unit rule and two face blocks (380 × 140, 170 above and below the window) with the face knocked out.
      float rule = span(u, 0.0, ${GATE.rule.toFixed(1)}, px);
      ink = max(ink, rule);
      inkL += tubeCore(abs(u - ${(GATE.rule / 2).toFixed(1)}), 3.0, px) * uGain2.z;
      for (int side = 0; side < 2; side++) {
        float sy = side == 0 ? 1.0 : -1.0;
        vec2 c = vec2(0.0, sy * (b + ${GATE.offset.toFixed(1)}));
        vec2 d = p - c;
        int k = 6 + int((side == 0 ? vMisc.y : vMisc.z) + 0.5);
        float em = uPrintFit[k].z;
        #ifdef MULTIPLY
          float block = span(d.x, -${(GATE.blockW / 2).toFixed(1)}, ${(GATE.blockW / 2).toFixed(1)}, px) * span(d.y, -${(GATE.blockH / 2).toFixed(1)}, ${(GATE.blockH / 2).toFixed(1)}, px);
          float face = printGlyph(k, d, em, px);
          ink = max(ink, block * (1.0 - face));
        #else
          float o = printOutline(k, d, em, px, 3.0);
          knock = max(knock, o * uGain2.w);
        #endif
      }
    }
    ink *= printed;
    inkL *= printed;
    knock *= printed;
    float alpha = vInk.w;
    #ifdef MULTIPLY
      // On the paper the inks print whole; behind a pass they still print on its dark paper (the bands stay dark, the tubes light over
      // them), thinner as the plates light up (1 − 0.5 · light).
      float density = level > 0.0 ? 1.0 - 0.05 * level : 1.0;
      vec3 T = mix(vec3(1.0), uInkT[plate], clamp(ink, 0.0, 1.0) * alpha * density);
      gl_FragColor = vec4(T, 1.0);
    #else
      float lit = level;
      // Behind a pass the plate is a neon tube from the first pass on (its print hue only tints it while the paper is still violet); the
      // passes step its light 35 → 70 → 100 % (the inks thinning, the hue going neon), the tubes themselves near full power from the first
      // pass: each pass lights them only a little hotter while its paper goes much darker, so every pass darkens the frame.
      vec3 col = mix(uInkPrint[plate], uInkNeon[plate], 0.75 + 0.25 * smoothstep(0.35, 1.0, lit));
      float power = 0.85 + 0.15 * lit;
      // The knock-outs are the brightest marks: on the first pass the faces shine like windows (HDR, they streak white); from the second
      // (24 units a frame: smeared over hundreds of px a face is only a grey ghost) they dim and the beads carry the light.
      float windows = lit > 0.5 ? uGain4.w : uGain.z;
      vec3 L = (col * inkL * power + uPaper * hotRule * 0.9) * vLight.x + uPaper * knock * uGain2.x * (0.6 + 0.4 * lit) * windows * vLight.y;
      gl_FragColor = vec4(L * alpha, 0.0);
    #endif
  }`;

/** The atlases' entries the shader reads (boxes and fits). */
function printFits(atlas: GlyphAtlas): { box: THREE.Vector4[]; fit: THREE.Vector4[] } {
  const box: THREE.Vector4[] = [];
  const fit: THREE.Vector4[] = [];
  PRINT_KEYS.forEach((key, i) => {
    const e = atlas.entries.get(key);
    if (!e) throw new Error(`transition: "${key}" is not in the print atlas`);
    box.push(new THREE.Vector4(e.u0, e.v0, e.u1, e.v1));
    const glint = i >= PRINT_KEYS.length - 2;
    // Strip faces: em 26, narrowed to fit 105 units of the 125-unit slot; gate faces: 320 units wide.
    fit.push(new THREE.Vector4(e.aspect, glint ? 30 : Math.min(26, 105 / e.advance), GATE.faceW / e.advance, 0));
  });
  return { box, fit };
}

export class FilmField {
  readonly multiply: THREE.Mesh;
  readonly light: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly materials: THREE.ShaderMaterial[];
  private readonly attrs: Record<'iPos' | 'iInk' | 'iBand' | 'iMisc' | 'iLight', THREE.InstancedBufferAttribute>;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly print: GlyphAtlas;
  private readonly mono: GlyphAtlas;

  constructor() {
    this.print = buildGlyphAtlas(PRINT_KEYS, (px) => `900 ${px}px ${cssStack('jp')}`, { fontPx: 128, radius: 16, size: 2048 });
    this.mono = buildGlyphAtlas(MONO_KEYS, (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 64, radius: 8, size: 1024 });
    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.instanceCount = 0;
    const attr = () => new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.attrs = { iPos: attr(), iInk: attr(), iBand: attr(), iMisc: attr(), iLight: attr() };
    for (const [k, a] of Object.entries(this.attrs)) this.geo.setAttribute(k, a);
    const { box, fit } = printFits(this.print);
    const monoIndex = (c: string): number => (c === ' ' ? -1 : MONO_KEYS.indexOf(c));
    const monoBox = MONO_KEYS.map((c) => {
      const e = this.mono.entries.get(c)!;
      return new THREE.Vector4(e.u0, e.v0, e.u1, e.v1);
    });
    const monoAspect = MONO_KEYS.map((c) => this.mono.entries.get(c)!.aspect);
    const advance = this.mono.entries.get('0')!.advance;
    const editionCodes = [...'copy '].map(monoIndex).concat([-2, -2, -2, monoIndex('/'), monoIndex('∞')]);
    const ink = (hex: string): THREE.Vector3 => new THREE.Vector3(...(transmit(linear(hex), DENSITY) as [number, number, number]));
    const light = (c: RGB): THREE.Vector3 => new THREE.Vector3(...(c as [number, number, number]));
    const uniforms = (): Record<string, THREE.IUniform> => ({
      uPrint: { value: this.print.texture },
      uMono: { value: this.mono.texture },
      uPrintBox: { value: box },
      uPrintFit: { value: fit },
      uPrintAtlas: { value: new THREE.Vector4(this.print.cellH / this.print.fontPx, this.print.texture.image.width, this.print.radius, this.print.fontPx) },
      uMonoBox: { value: monoBox },
      uMonoAspect: { value: monoAspect },
      uMonoAtlas: { value: new THREE.Vector4(this.mono.cellH / this.mono.fontPx, this.mono.fontPx, this.mono.radius, advance) },
      uSlug: { value: [...SLUG].map(monoIndex) },
      uEdition: { value: editionCodes },
      uDigits: { value: new THREE.Vector4(monoIndex('0'), 0, 0, 0) },
      uInkT: { value: [new THREE.Vector3(...(PLATE.blue as [number, number, number])), new THREE.Vector3(...(PLATE.pink as [number, number, number])), ink(HEX.FILM_YELLOW)] },
      uInkPrint: { value: [light(linear(HEX.PRINT_BLUE)), light(linear(HEX.PRINT_PINK)), light(linear(HEX.FILM_YELLOW))] },
      uInkNeon: { value: [light(linear(HEX.CYAN)), light(linear(HEX.NEON_PINK)), light(linear(HEX.CORE))] },
      uPaper: { value: light(linear(HEX.PAPER)) },
      uFront: { value: new THREE.Vector4(1e9, 0, 0, 0) },
      uGain: { value: new THREE.Vector4(1.15, 0.01, 1.9, 0) },
      uGain2: { value: new THREE.Vector4(0.9, 0.5, 1.1, 1.2) },
      uGain3: { value: new THREE.Vector4(1, 0.5, 0.25, 0.04) },
      uGain4: { value: new THREE.Vector4(27, 0.05, 0.03, 0.1) },
      uHat: { value: new THREE.Vector4(-1, 99, 0, 1) },
      uVPf: { value: new THREE.Vector2() },
      uEye: { value: 1000 },
      uFocal: { value: 1000 },
      uRoll: { value: new THREE.Vector2(1, 0) },
      uVP: { value: new THREE.Vector2() },
    });
    if (monoBox.length !== MONO_KEYS.length || advance <= 0) throw new Error('transition: the mono atlas is incomplete');
    const make = (multiply: boolean): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        uniforms: uniforms(),
        vertexShader: FILM_VERT,
        fragmentShader: FILM_FRAG,
        defines: multiply ? { MULTIPLY: '' } : {},
        blending: THREE.CustomBlending,
        // multiply: dst × the sheet's transmittance; light: dst + its light. Alpha is kept.
        blendSrc: multiply ? THREE.ZeroFactor : THREE.OneFactor,
        blendDst: multiply ? THREE.SrcColorFactor : THREE.OneFactor,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.OneFactor,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
    this.materials = [make(true), make(false)];
    this.multiply = new THREE.Mesh(this.geo, this.materials[0]);
    this.light = new THREE.Mesh(this.geo, this.materials[1]);
    for (const m of [this.multiply, this.light]) {
      m.frustumCulled = false;
      this.scene.add(m);
    }
    base.dispose();
  }

  /** Writes the sheets and the camera for one instant. */
  set(films: readonly GateFilm[], cam: GateCamera, o: { front: { radius: number; inner: number; outer: number }; pose: number; hat: { index: number; age: number }; devicePerLogical: number }): void {
    const n = Math.min(CAPACITY, films.length);
    const { iPos, iInk, iBand, iMisc, iLight } = this.attrs;
    for (let i = 0; i < n; i++) {
      const f = films[i];
      iPos.setXYZW(i, f.x, f.y, f.z, f.rot);
      iInk.setXYZW(i, f.plate, f.kind === 'gate' ? 1 : 0, f.reach, f.alpha);
      iBand.setXYZW(i, f.scroll, f.hot, f.targets, f.edition);
      iMisc.setXYZW(i, f.slug, f.faces[0], f.faces[1], f.n);
      iLight.setXYZW(i, f.glow, f.knockGlow, f.flat, 0);
    }
    for (const a of Object.values(this.attrs)) a.needsUpdate = true;
    this.geo.instanceCount = n;
    for (const m of this.materials) {
      const u = m.uniforms;
      u.uEye.value = cam.eye;
      u.uFocal.value = cam.focal;
      (u.uRoll.value as THREE.Vector2).set(Math.cos(cam.roll), Math.sin(cam.roll));
      (u.uVP.value as THREE.Vector2).set(cam.vp[0], cam.vp[1]);
      (u.uVPf.value as THREE.Vector2).set(cam.vp[0], cam.vp[1]);
      (u.uFront.value as THREE.Vector4).set(Number.isFinite(o.front.radius) ? o.front.radius : 1e9, o.front.inner === 0 ? 0 : LEVELS[o.front.inner], o.front.outer === 0 ? 0 : LEVELS[o.front.outer], 0);
      (u.uHat.value as THREE.Vector4).set(o.hat.index, o.hat.age, o.pose, o.devicePerLogical);
    }
  }

  /** Draws the sheets: their ink where the paper still takes ink (multiply), their light behind the press passes' fronts. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, which: { multiply: boolean; light: boolean }): void {
    this.multiply.visible = which.multiply;
    this.light.visible = which.light;
    if (!which.multiply && !which.light) return;
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.geo.dispose();
    for (const m of this.materials) m.dispose();
    this.print.texture.dispose();
    this.mono.texture.dispose();
  }
}

