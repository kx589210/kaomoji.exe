import opentype, { type Font } from 'opentype.js';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { nestContours, type Pt } from './contours.ts';

const fonts = new Map<string, Promise<Font>>();

export const loadOpentype = (url: string): Promise<Font> => {
  let p = fonts.get(url);
  if (!p) {
    p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => opentype.parse(buf));
    fonts.set(url, p);
  }
  return p;
};

/** Outlines of `text` at `size` units, y up, baseline at y = 0, as shapes with holes. */
export function textShapes(font: Font, text: string, size: number, curveSegments = 16): THREE.Shape[] {
  const paths: THREE.Path[] = [];
  let cur: THREE.Path | null = null;
  for (const c of font.getPath(text, 0, 0, size).commands) {
    if (c.type === 'M') {
      cur = new THREE.Path();
      cur.moveTo(c.x!, -c.y!);
      paths.push(cur);
    } else if (c.type === 'L') cur!.lineTo(c.x!, -c.y!);
    else if (c.type === 'C') cur!.bezierCurveTo(c.x1!, -c.y1!, c.x2!, -c.y2!, c.x!, -c.y!);
    else if (c.type === 'Q') cur!.quadraticCurveTo(c.x1!, -c.y1!, c.x!, -c.y!);
    else if (c.type === 'Z') cur?.closePath();
  }
  const points = paths.map((p) => p.getPoints(curveSegments));
  const flat = points.map((pts) => pts.map((v) => [v.x, v.y] as Pt));
  return nestContours(flat).map((g) => {
    const shape = new THREE.Shape(points[g.outer]);
    shape.holes = g.holes.map((h) => new THREE.Path(points[h]));
    return shape;
  });
}

export type ExtrudeOptions = { size?: number; depth?: number; bevel?: number; bevelSegments?: number; curveSegments?: number };

/** A bevelled, centered 3D solid of `text`. */
export function extrudeText(font: Font, text: string, o: ExtrudeOptions = {}): THREE.ExtrudeGeometry {
  const size = o.size ?? 1;
  const bevel = o.bevel ?? 0.04 * size;
  const geo = new THREE.ExtrudeGeometry(textShapes(font, text, size, o.curveSegments ?? 16), {
    depth: o.depth ?? 0.3 * size,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: o.bevelSegments ?? 8,
    curveSegments: o.curveSegments ?? 16,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * A glyph solid for S07's glass: finer curves, and normals smoothed across
 * every edge sharper than `crease` radians apart. ExtrudeGeometry has no
 * shared vertices, so computeVertexNormals leaves every triangle flat, and a
 * refracting, dispersing material turns those facets into jagged colour edges.
 */
export function glassText(font: Font, text: string, o: ExtrudeOptions & { crease?: number } = {}): THREE.BufferGeometry {
  return toCreasedNormals(extrudeText(font, text, { curveSegments: 48, ...o }), o.crease ?? 0.6);
}
