// Turns a glyph's closed contours into outlines with holes by containment
// depth (even = solid, odd = hole). This works for TrueType and CFF fonts,
// whose outer contours wind in opposite directions.
export type Pt = readonly [number, number];

export const signedArea = (poly: readonly Pt[]): number => {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a / 2;
};

export const pointInPolygon = (p: Pt, poly: readonly Pt[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const nestContours = (contours: readonly (readonly Pt[])[]): { outer: number; holes: number[] }[] => {
  const probe = (c: readonly Pt[]): Pt => [(c[0][0] + c[1][0]) / 2, (c[0][1] + c[1][1]) / 2];
  const depth = contours.map((c, i) => contours.reduce((d, other, j) => (j !== i && pointInPolygon(probe(c), other) ? d + 1 : d), 0));
  const groups = contours.flatMap((_, i) => (depth[i] % 2 === 0 ? [{ outer: i, holes: [] as number[] }] : []));
  contours.forEach((c, i) => {
    if (depth[i] % 2 === 0) return;
    let parent = -1;
    let parentArea = Infinity;
    contours.forEach((o, j) => {
      if (j === i || depth[j] !== depth[i] - 1 || !pointInPolygon(probe(c), o)) return;
      const area = Math.abs(signedArea(o));
      if (area < parentArea) {
        parentArea = area;
        parent = j;
      }
    });
    groups.find((g) => g.outer === parent)?.holes.push(i);
  });
  return groups;
};
