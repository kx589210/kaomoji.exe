import {
  BloomEffect, ChromaticAberrationEffect, CopyMaterial, Effect, EffectComposer, EffectPass, Pass, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import * as THREE from 'three';
import { seedFrame } from '../score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from './fullscreen.ts';
import { ComicInkEffect } from './post/comicInk.ts';
import { CrtEffect } from './post/crt.ts';
import { GlyphFlashEffect } from './post/glyphFlash.ts';
import { KaleidoscopeEffect } from './post/kaleidoscope.ts';
import { PixelEffect } from './post/pixel.ts';
import { RisoPrintEffect } from './post/risoPrint.ts';
import { DEFAULT_TEMPORAL, temporalSamples } from './temporal.ts';
import type { FrameContext, Look, Quality, Renderable } from './types.ts';
import { IDENTITY_VIEW, type View, viewMatrix } from './view.ts';

/** Feeds our accumulated image into the composer as its input, times the look's exposure. */
class TextureInputPass extends Pass {
  private readonly source: THREE.Texture;
  /** The look's exposure: it multiplies the summed sub-frames and the screen overlay drawn over them alike. */
  exposure = 1;

  constructor(source: THREE.Texture) {
    super('TextureInputPass');
    this.source = source;
    this.fullscreenMaterial = new CopyMaterial();
    this.needsSwap = true;
  }

  override render(renderer: THREE.WebGLRenderer, _input: THREE.WebGLRenderTarget | null, output: THREE.WebGLRenderTarget | null): void {
    const copy = this.fullscreenMaterial as CopyMaterial;
    copy.inputBuffer = this.source;
    copy.uniforms.opacity.value = this.exposure;
    renderer.setRenderTarget(this.renderToScreen ? null : output);
    renderer.render(this.scene, this.camera);
  }
}

/**
 * Draws the root's screen overlay (the readout) into the composer's picture after the passes that rework the picture itself (the
 * kaleidoscope, the Riso print, the comic), so the readout stays a clean screen readout over a mirrored, printed or inked frame,
 * and still gets the rest of the look (bloom, tone mapping, flash, the 8-bit look, the character flash, the CRT). Enabled only on
 * frames where one of those passes is on; on every other frame the overlay goes into the summed sub-frames as before (renderFrame).
 * The look's exposure multiplies the overlay here too: the picture is brought to 1 / exposure, the overlay drawn over it, and the
 * whole taken back up (two copies, only when the exposure is not 1). Draws in place: no swap.
 */
class OverlayPass extends Pass {
  private readonly copy = new CopyMaterial();
  private root: Renderable | null = null;
  private frame = 0;
  private exposure = 1;

  constructor() {
    super('OverlayPass');
    this.fullscreenMaterial = this.copy;
    this.needsSwap = false;
  }

  /** The next render draws `root`'s overlay of output frame `frame`, exposed by `exposure`. */
  arm(root: Renderable, frame: number, exposure: number): void {
    this.root = root;
    this.frame = frame;
    this.exposure = exposure;
  }

  private scaled(renderer: THREE.WebGLRenderer, from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, k: number): void {
    this.copy.inputBuffer = from.texture;
    this.copy.uniforms.opacity.value = k;
    renderer.setRenderTarget(to);
    renderer.render(this.scene, this.camera);
  }

  override render(renderer: THREE.WebGLRenderer, input: THREE.WebGLRenderTarget | null, output: THREE.WebGLRenderTarget | null): void {
    const root = this.root;
    if (!root?.screenOverlay || !input) return;
    const e = this.exposure;
    if (e === 1 || !output) {
      root.screenOverlay(renderer, input, this.frame);
    } else if (e > 1e-6) {
      this.scaled(renderer, input, output, 1 / e);
      root.screenOverlay(renderer, output, this.frame);
      this.scaled(renderer, output, input, e);
    }
  }
}

/** The height (px) every look is designed and previewed at; a bigger render is the same picture, scaled. */
export const LOOK_HEIGHT = 1080;

/**
 * Film grain seeded by the frame number — its seedFrame (src/score/film.ts), so a part keeps its approved grain wherever the film's map
 * moves it — so it is animated yet reproducible.
 * An integer hash (PCG) of the pixel and the frame: a float hash of large
 * coordinates loses fp32 precision and turns into a fixed pattern, then a flat
 * offset, later in the film. Added in a square-root (roughly perceptual)
 * domain so dark areas get fine grain instead of black specks. Hashed on the
 * 1080p grid (`cell` device px a grain), so a 4K frame has the previews' grain,
 * scaled, rather than one four times finer that averages away.
 */
export class GrainEffect extends Effect {
  constructor() {
    super(
      'GrainEffect',
      /* glsl */ `
      uniform float seed;
      uniform float amount;
      uniform float cell;
      uint grainPcg(uint v) {
        uint state = v * 747796405u + 2891336453u;
        uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
        return (word >> 22u) ^ word;
      }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        uvec2 px = uvec2(gl_FragCoord.xy / cell);
        float n = float(grainPcg(px.x ^ grainPcg(px.y ^ grainPcg(uint(seed))))) / 4294967295.0 - 0.5;
        vec3 p = sqrt(max(inputColor.rgb, 0.0)) + n * amount;
        outputColor = vec4(p * p, inputColor.a);
      }`,
      { uniforms: new Map([['seed', new THREE.Uniform(0)], ['amount', new THREE.Uniform(0)], ['cell', new THREE.Uniform(1)]]) },
    );
  }

  override setSize(_width: number, height: number): void {
    this.uniforms.get('cell')!.value = height / LOOK_HEIGHT;
  }
}

/**
 * Keeps the hue of over-bright colours. A linear tone map clamps each channel
 * on its own, which turns bright amber (1.7, 0.76, 0.08) into yellow and pale
 * green text into white. Dividing by the largest channel first keeps the
 * colour at full brightness; the bloom has already seen the HDR energy.
 * `strength` is 1 for the linear tone map and 0 for AgX, which compresses
 * highlights itself.
 */
class HueClampEffect extends Effect {
  constructor() {
    super(
      'HueClampEffect',
      /* glsl */ `
      uniform float strength;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float peak = max(max(inputColor.r, inputColor.g), inputColor.b);
        outputColor = vec4(inputColor.rgb / mix(1.0, max(peak, 1.0), strength), inputColor.a);
      }`,
      { uniforms: new Map([['strength', new THREE.Uniform(1)]]) },
    );
  }
}

/**
 * The downbeat flash (spec §3.1 rule 4): mixes the tone-mapped picture towards
 * white in display space, so `amount` is how white it looks: a pop on the hit
 * whose tail darkens as fast as it decays (in linear light a small residue
 * would still lift black to a grey veil).
 */
class FlashEffect extends Effect {
  constructor() {
    super(
      'FlashEffect',
      /* glsl */ `
      uniform float amount;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 shown = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2));
        outputColor = vec4(pow(mix(shown, vec3(1.0), amount), vec3(2.2)), inputColor.a);
      }`,
      { uniforms: new Map([['amount', new THREE.Uniform(0)]]) },
    );
  }
}

/**
 * Sizes `bloom` (already sized by the composer to `width` × `height` device
 * px) so it is the 1080p bloom, scaled: the bright pass renders at 1080p (a
 * 2:1 bilinear tap is a box filter) and the mip chain is 1080p's, so the
 * widest glow covers the same share of the frame and a 4K master glows like
 * the 1x previews. At 1080p nothing changes.
 */
export function sizeBloom(bloom: BloomEffect, width: number, height: number): void {
  const k = height / LOOK_HEIGHT;
  bloom.luminancePass.resolution.scale = 1 / k;
  bloom.setSize(width, height);
  bloom.mipmapBlurPass.setSize(Math.round(width / k), Math.round(height / k));
}

export type PipelineOptions = { quality: Quality };

/** One step of an output frame (see frameSteps). */
export type FrameStep =
  | { kind: 'sub'; ctx: FrameContext; weight: number; view: View }
  | { kind: 'overlay'; frame: number }
  | { kind: 'finish'; look: Look; frame: number };

/**
 * Output frame `frame`, step by step: each sub-frame (its instant, its weight
 * in the sum, the screen-space view it is sampled through — so kick punches
 * and shakes are motion-blurred with the scene); then the root's screen
 * overlay, once, at the output frame, over the sum and unwarped (a readout
 * fixed to the screen: no punch moves it, no shutter streaks or doubles it);
 * then the finish — the look's exposure, bloom, tone mapping, flash, CRT —
 * which the overlay gets like the scene under it. The weights sum to 1: the
 * exposure is applied once, at the finish. Pure, so a test pins the order.
 */
export function frameSteps(root: Renderable, frame: number, quality: Quality, size: { width: number; height: number }): FrameStep[] {
  const out = Math.round(frame);
  const look = root.look(out);
  const spec = quality === 'final' ? (root.temporal?.(out) ?? DEFAULT_TEMPORAL) : { samples: 1, shutter: 0, persistence: 0 };
  const steps: FrameStep[] = temporalSamples(frame, spec, root.segment?.(out)).map((s) => ({
    kind: 'sub',
    ctx: { frame: s.frame, cam: s.cam, t: s.frame / FPS, beat: s.frame / FRAMES_PER_BEAT, quality, width: size.width, height: size.height },
    weight: s.weight,
    view: root.view?.(s.cam) ?? IDENTITY_VIEW,
  }));
  if (root.screenOverlay) steps.push({ kind: 'overlay', frame: out });
  steps.push({ kind: 'finish', look, frame: out });
  return steps;
}

/**
 * Renders a Renderable at the sub-frame instants it asks for (motion blur,
 * phosphor persistence) into an HDR target, sums them by weight, draws its
 * screen overlay over the sum, then finishes the image (frameSteps).
 */
export class Pipeline {
  private readonly gl: THREE.WebGLRenderer;
  private readonly quality: Quality;
  private width = 0;
  private height = 0;
  private hdr!: THREE.WebGLRenderTarget;
  private accum!: THREE.WebGLRenderTarget;
  private readonly accumQuad: FullscreenQuad;
  private readonly composer: EffectComposer;
  private input!: TextureInputPass;
  private readonly bloom: BloomEffect;
  private readonly aberration: ChromaticAberrationEffect;
  private readonly hueClamp: HueClampEffect;
  private readonly toneMapping: ToneMappingEffect;
  private readonly flash: FlashEffect;
  private readonly vignette: VignetteEffect;
  private readonly grain: GrainEffect;
  private readonly crt: CrtEffect;
  private readonly glyphs: GlyphFlashEffect;
  private glyphPass!: EffectPass;
  private readonly kaleido: KaleidoscopeEffect;
  private kaleidoPass!: EffectPass;
  private readonly riso: RisoPrintEffect;
  private risoPass!: EffectPass;
  private readonly comic: ComicInkEffect;
  private comicPass!: EffectPass;
  private readonly pixel: PixelEffect;
  private pixelPass!: EffectPass;
  private overlayPass!: OverlayPass;

  constructor(gl: THREE.WebGLRenderer, opts: PipelineOptions) {
    this.gl = gl;
    this.quality = opts.quality;
    this.accumQuad = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: null }, weight: { value: 1 }, uView: { value: new THREE.Matrix3() } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: /* glsl */ `
          uniform sampler2D map;
          uniform float weight;
          uniform mat3 uView;
          varying vec2 vUv;
          // Each sub-frame is sampled through its own screen-space view (kick punches, shakes), so those moves are motion-blurred too.
          void main() { gl_FragColor = texture2D(map, (uView * vec3(vUv, 1.0)).xy) * weight; }`,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneFactor,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }),
    );
    this.composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType });
    this.bloom = new BloomEffect({ mipmapBlur: true, intensity: 0, luminanceThreshold: 1, luminanceSmoothing: 0.1, radius: 0.7 });
    this.aberration = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: true, modulationOffset: 0.25 });
    this.hueClamp = new HueClampEffect();
    this.toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.LINEAR });
    this.flash = new FlashEffect();
    this.vignette = new VignetteEffect({ darkness: 0, offset: 0.35 });
    this.grain = new GrainEffect();
    this.crt = new CrtEffect();
    this.glyphs = new GlyphFlashEffect();
    this.kaleido = new KaleidoscopeEffect();
    this.riso = new RisoPrintEffect();
    this.comic = new ComicInkEffect();
    this.pixel = new PixelEffect();
    this.allocate();
  }

  private allocate(): void {
    const size = this.gl.getDrawingBufferSize(new THREE.Vector2());
    this.width = size.x;
    this.height = size.y;
    this.hdr?.dispose();
    this.accum?.dispose();
    this.hdr = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.quality === 'final' ? 4 : 0, depthBuffer: true });
    this.accum = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthBuffer: false });
    this.composer.removeAllPasses();
    this.input = new TextureInputPass(this.accum.texture);
    this.composer.addPass(this.input);
    // The looks that rework the picture itself (Look.kaleido, .riso, .comic) run on the exposed HDR sum, before the finishing, so the
    // bloom turns the Riso neon into glow and the vignette and grain land on the mandala, the paper and the page instead of being
    // folded or printed. Each samples other pixels (a convolution effect), so each gets its own pass, created disabled: applyLook
    // enables one only on the frames whose look asks for it; otherwise the composer skips it, and a frame without them costs and
    // looks exactly as before. The kaleidoscope folds first, so the print and the comic screen a mandala rather than mirror their dots.
    this.kaleidoPass = new EffectPass(new THREE.PerspectiveCamera(), this.kaleido);
    this.risoPass = new EffectPass(new THREE.PerspectiveCamera(), this.riso);
    this.comicPass = new EffectPass(new THREE.PerspectiveCamera(), this.comic);
    this.overlayPass = new OverlayPass();
    for (const pass of [this.kaleidoPass, this.risoPass, this.comicPass, this.overlayPass]) {
      pass.enabled = false;
      this.composer.addPass(pass);
    }
    this.composer.addPass(new EffectPass(new THREE.PerspectiveCamera(), this.bloom, this.aberration, this.hueClamp, this.toneMapping, this.flash, this.vignette, this.grain));
    // The 8-bit look (Look.pixel) snaps the finished display colours to game pixels, so it runs after the main pass and before the
    // character flash and the CRT (which take its pixels like any picture). Its own pass, enabled only when the look asks for it.
    this.pixelPass = new EffectPass(new THREE.PerspectiveCamera(), this.pixel);
    this.pixelPass.enabled = false;
    this.composer.addPass(this.pixelPass);
    // The 字符闪 character flash reads the finished display colours of whole cells, so it gets its own pass after the main one and
    // before the CRT (which bends the characters like any picture). Enabled only on the frames that flash (applyLook): otherwise the
    // composer skips it and a frame costs and looks exactly as without it.
    this.glyphPass = new EffectPass(new THREE.PerspectiveCamera(), this.glyphs);
    this.glyphPass.enabled = false;
    this.composer.addPass(this.glyphPass);
    // The CRT bends the finished image, so it gets its own pass (its UV transform
    // must not move bloom's samples). It is always enabled: amount 0 is a no-op,
    // and the last pass is the one that renders to the screen.
    const crtPass = new EffectPass(new THREE.PerspectiveCamera(), this.crt);
    crtPass.dithering = true;
    this.composer.addPass(crtPass);
    // Same CSS size as the renderer, so the canvas is left alone; the composer
    // sizes its buffers from the drawing buffer (device pixels).
    const css = this.gl.getSize(new THREE.Vector2());
    this.composer.setSize(css.x, css.y, false);
    // Bloom and grain are designed at 1080p: a bigger frame gets them scaled (the grain sizes itself in setSize).
    sizeBloom(this.bloom, size.x, size.y);
  }

  renderFrame(root: Renderable, frame: number): void {
    const gl = this.gl;
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    if (size.x !== this.width || size.y !== this.height) this.allocate();
    gl.setRenderTarget(this.accum);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, false, false);
    const material = this.accumQuad.mesh.material as THREE.ShaderMaterial;
    const steps = frameSteps(root, frame, this.quality, { width: this.width, height: this.height });
    const finish = steps[steps.length - 1] as Extract<FrameStep, { kind: 'finish' }>;
    // The look first (it only sets the passes up; nothing is drawn until the composer runs): whether a pass that reworks the picture
    // is on decides where the screen overlay goes — into the sum, as always, or after those passes (OverlayPass), so it stays clean.
    this.applyLook(finish.look, finish.frame);
    const late = !!root.screenOverlay && (this.kaleidoPass.enabled || this.risoPass.enabled || this.comicPass.enabled);
    this.overlayPass.enabled = late;
    if (late) this.overlayPass.arm(root, finish.frame, finish.look.exposure);
    for (const step of steps) {
      if (step.kind === 'sub') {
        gl.setRenderTarget(this.hdr);
        gl.setClearColor(0x000000, 1);
        gl.clear(true, true, true);
        root.render(gl, step.ctx, this.hdr);
        material.uniforms.map.value = this.hdr.texture;
        material.uniforms.weight.value = step.weight;
        (material.uniforms.uView.value as THREE.Matrix3).fromArray(viewMatrix(step.view));
        this.accumQuad.render(gl, this.accum);
      } else if (step.kind === 'overlay') {
        if (!late) root.screenOverlay!(gl, this.accum, step.frame);
      } else {
        this.composer.render(0);
      }
    }
  }

  private applyLook(look: Look, frame: number): void {
    this.input.exposure = look.exposure;
    this.bloom.intensity = look.bloom.intensity;
    this.bloom.luminanceMaterial.threshold = look.bloom.threshold;
    this.bloom.luminanceMaterial.smoothing = look.bloom.smoothing;
    this.bloom.mipmapBlurPass.radius = look.bloom.radius;
    this.aberration.offset.set(look.aberration, look.aberration * 0.6);
    const mode = look.toneMapping === 'agx' ? ToneMappingMode.AGX : ToneMappingMode.LINEAR;
    if (this.toneMapping.mode !== mode) this.toneMapping.mode = mode;
    this.hueClamp.uniforms.get('strength')!.value = look.toneMapping === 'linear' ? 1 : 0;
    this.flash.uniforms.get('amount')!.value = look.flash ?? 0;
    this.vignette.darkness = look.vignette;
    this.grain.uniforms.get('seed')!.value = Math.round(seedFrame(frame));
    this.grain.uniforms.get('amount')!.value = look.grain * 0.12;
    this.glyphPass.enabled = this.glyphs.configure(look.glyphs);
    this.kaleidoPass.enabled = this.kaleido.configure(look.kaleido);
    this.risoPass.enabled = this.riso.configure(look.riso);
    this.comicPass.enabled = this.comic.configure(look.comic);
    this.pixelPass.enabled = this.pixel.configure(look.pixel);
    this.crt.configure(look.crt);
  }

  dispose(): void {
    this.hdr.dispose();
    this.accum.dispose();
    this.accumQuad.dispose();
    this.composer.dispose();
  }
}
