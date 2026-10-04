import * as THREE from 'three';

export const LOGICAL_WIDTH = 1920;
export const LOGICAL_HEIGHT = 1080;

/**
 * A Canvas 2D drawing surface at render resolution, exposed as a texture.
 * `paint` callbacks always draw in logical 1920×1080 units, so 4K renders
 * stay sharp without changing any drawing code.
 */
export class Layer2D {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    this.ctx = ctx;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  paint(draw: (ctx: CanvasRenderingContext2D) => void): void {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvas.width / LOGICAL_WIDTH, 0, 0, canvas.height / LOGICAL_HEIGHT, 0, 0);
    draw(ctx);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
