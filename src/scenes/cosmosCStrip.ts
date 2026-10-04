// The accretion disc's strip (renderer C, cosmos 6; build sheet notes/bcos/sheet.md §4.6, §10.1): five bands of every level's light,
// inner → outer — the web's arcs and filament type · the warp's star streaks · the orbits' guilloche ribbons and planet names · Earth's
// lamps and flip cards · the bang's confetti, splats and halftone domes — painted once, deterministically, into a log-polar canvas: u
// (across) is the angle round the disc, v (down) its log radius (cosmosHole.ts logRadius), so a mark keeps its shape wherever it is wound
// (the map is conformal: the strip's aspect is 2π over the disc's log span). The channels are inks, not colours, so the disc's shader
// can swap the structure's two on the counterchange: R amber (his: every face, lamp and fuse), G cyan, B pink. The web band is mostly
// the web's own last frame, resampled by the disc's shader (cosmosCHole.ts); here it carries filament type and fuses under it.
import { CROWDS, EARTH_HOSTS, GALAXY_STARS, PLANETS, REAM_FACES, WEB_NODES, WINKS, BANG_PARTS } from '../content/castCosmos.ts';
import { PLANET_NAMES, SIGNATURE } from '../content/cosmos.ts';
import { cssStack } from '../engine/fonts.ts';
import { hash } from '../engine/random.ts';
import { HOLE } from '../shots/cosmosHole.ts';

/** The strip's size (px): 4096 round the disc; its height keeps the map conformal (2π ↔ ln(rout / rin)). */
export const STRIP_W = 4096;
export const STRIP_H = 2048;

const ink = (k: number, a: number): string => `rgba(${k === 0 ? 255 : 0},${k === 1 ? 255 : 0},${k === 2 ? 255 : 0},${a})`;

/** Every face the strip draws (each infected: they are his now). */
export const STRIP_FACES: readonly string[] = [
  ...new Set([...WEB_NODES.map((n) => n.infected ?? n.host), ...WINKS, ...GALAXY_STARS.flatMap((g) => (g.infected ? [g.infected] : [])), ...CROWDS.galaxy.map((c) => c.infected), ...PLANETS.map((p) => p.infected), ...EARTH_HOSTS.flatMap((e) => (e.infected ? [e.infected] : [])), ...CROWDS.earth.map((c) => c.infected), ...REAM_FACES]),
];

export function paintStrip(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = STRIP_W;
  c.height = STRIP_H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, STRIP_W, STRIP_H);
  x.globalCompositeOperation = 'lighter';
  const band = STRIP_H / HOLE.bands;
  // Every mark is painted at u and again one strip-width away when it straddles an edge, so the disc has no seam.
  const wrap = (u: number, paint: (u: number) => void, reach = 400) => {
    paint(u);
    if (u < reach) paint(u + STRIP_W);
    if (u > STRIP_W - reach) paint(u - STRIP_W);
  };
  const face = (s: string, u: number, v: number, px: number, a = 1, rot = 0) => {
    wrap(u, (uu) => {
      x.save();
      x.translate(uu, v);
      x.rotate(rot);
      x.font = `800 ${px}px ${cssStack('rounded')}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = ink(0, a);
      x.fillText(s, 0, 0);
      x.restore();
    });
  };
  const mono = (s: string, u: number, v: number, px: number, k: number, a: number) => {
    wrap(
      u,
      (uu) => {
        x.font = `500 ${px}px ${cssStack('mono')}`;
        x.textAlign = 'left';
        x.textBaseline = 'middle';
        x.fillStyle = ink(k, a);
        x.fillText(s, uu, v);
      },
      1400,
    );
  };
  const line = (pts: readonly (readonly [number, number])[], w: number, k: number, a: number) => {
    const u0 = pts[0][0];
    wrap(
      u0,
      (uu) => {
        const d = uu - u0;
        x.beginPath();
        pts.forEach(([pu, pv], i) => (i ? x.lineTo(pu + d, pv) : x.moveTo(pu + d, pv)));
        x.lineWidth = w;
        x.lineCap = 'round';
        x.lineJoin = 'round';
        x.strokeStyle = ink(k, a);
        x.stroke();
      },
      900,
    );
  };
  const dot = (u: number, v: number, r: number, k: number, a: number) => {
    wrap(u, (uu) => {
      x.beginPath();
      x.arc(uu, v, r, 0, Math.PI * 2);
      x.fillStyle = ink(k, a);
      x.fill();
    }, 60);
  };

  // ——— Band 0, the web (v 0 … 1/5): filament type and burning fuses under the web's own last frame ——————————————————————————————
  {
    const v0 = 0;
    for (let i = 0; i < 22; i++) {
      const v = v0 + band * (0.08 + 0.84 * hash(i, 401));
      const k = hash(i, 402) < 0.5 ? 1 : 2;
      const lit = hash(i, 403) < 0.55;
      mono(`${SIGNATURE} ${SIGNATURE}`, STRIP_W * hash(i, 404), v, 13 + 14 * hash(i, 405), lit ? 0 : k, lit ? 0.9 : 0.55);
    }
    for (let i = 0; i < 14; i++) {
      // A fuse of lightning: a jagged amber run along the band.
      const u = STRIP_W * hash(i, 411);
      const v = v0 + band * (0.1 + 0.8 * hash(i, 412));
      const pts: [number, number][] = [];
      const n = 10 + Math.floor(10 * hash(i, 413));
      for (let j = 0; j <= n; j++) pts.push([u + j * 26, v + (hash(i, j, 414) - 0.5) * 38]);
      line(pts, 3, 0, 0.95);
      line(pts, 9, 0, 0.25);
    }
    for (let i = 0; i < 12; i++) face(WEB_NODES[i % WEB_NODES.length].infected ?? '(•ω•)', STRIP_W * hash(i, 421), v0 + band * (0.15 + 0.7 * hash(i, 422)), 36 + 24 * hash(i, 423), 0.9);
  }

  // ——— Band 1, the warp (1/5 … 2/5): star streaks round the disc, a face at each head ————————————————————————————————————————
  {
    const v0 = band;
    const stars = [...GALAXY_STARS.flatMap((g) => (g.infected ? [g.infected] : [])), ...CROWDS.galaxy.map((c) => c.infected)];
    for (let i = 0; i < 130; i++) {
      const u = STRIP_W * hash(i, 501);
      const v = v0 + band * (0.04 + 0.92 * hash(i, 502));
      const len = 60 + 360 * hash(i, 503) ** 2;
      const k = hash(i, 504) < 0.5 ? 1 : 2;
      const w = 1.6 + 1.8 * hash(i, 505);
      line([[u - len, v], [u, v]], w, k, 0.85);
      if (hash(i, 506) < 0.42) face(stars[i % stars.length], u + 26, v, 22 + 16 * hash(i, 507), 0.95);
      else dot(u, v, 3 + 2 * hash(i, 508), 0, 0.95);
    }
  }

  // ——— Band 2, the orbits (2/5 … 3/5): guilloche ribbons (epitrochoids) round the disc and the planets' names ——————————————————
  {
    const v0 = band * 2;
    for (let r = 0; r < 6; r++) {
      const vc = v0 + band * (0.14 + 0.72 * (r / 5));
      const amp = band * (0.05 + 0.06 * hash(r, 601));
      const p = 3 + (r % 4);
      const q = 0.22 + 0.1 * hash(r, 602);
      const pts: [number, number][] = [];
      // An epitrochoid unrolled along u: a loop every STRIP_W / (p · 8).
      const loops = p * 8;
      for (let s = 0; s <= 3200; s++) {
        const t = (s / 3200) * Math.PI * 2 * loops;
        pts.push([(s / 3200) * STRIP_W + amp * q * 3 * Math.sin(t), vc + amp * (Math.cos(t / p) + q * Math.cos(t))]);
      }
      line(pts, 2.4, r % 3 === 0 ? 1 : r % 3 === 1 ? 0 : 2, 0.9);
    }
    PLANET_NAMES.forEach((name, i) => {
      for (let rep = 0; rep < 2; rep++) {
        const u = STRIP_W * ((i + rep * 8 + 0.5) / 16) + 40 * hash(i, rep, 611);
        wrap(u, (uu) => {
          x.font = `900 ${40 + 16 * hash(i, 612)}px ${cssStack('display')}`;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillStyle = ink(0, 0.75);
          x.fillText(name, uu, v0 + band * (0.2 + 0.6 * hash(i, rep, 613)));
        });
      }
    });
    PLANETS.forEach((p, i) => face(p.infected, STRIP_W * ((i + 0.5) / 8) + 260, v0 + band * (0.25 + 0.5 * hash(i, 621)), 60, 1));
  }

  // ——— Band 3, Earth (3/5 … 4/5): a lattice of amber lamps, flip cards between them, a cream cloud band —————————————————————————
  {
    const v0 = band * 3;
    const pitch = 50;
    for (let j = 0; j * pitch * 0.87 < band; j++) {
      for (let i = 0; i * pitch < STRIP_W; i++) {
        const u = i * pitch + (j % 2) * pitch * 0.5;
        const v = v0 + j * pitch * 0.87 + 10;
        if (hash(i, j, 701) < 0.45) continue;
        dot(u, v, 2.5 + 3 * hash(i, j, 702) ** 2, 0, 0.9);
      }
    }
    const cards = [...EARTH_HOSTS.flatMap((e) => (e.infected ? [e.infected] : [])), ...CROWDS.earth.map((c) => c.infected)];
    for (let i = 0; i < 34; i++) face(cards[i % cards.length], STRIP_W * hash(i, 711), v0 + band * (0.08 + 0.84 * hash(i, 712)), 26 + 20 * hash(i, 713), 0.9);
  }

  // ——— Band 4, the bang (4/5 … 1): confetti of face parts, pink and blue splats, halftone domes —————————————————————————————————
  {
    const v0 = band * 4;
    for (let i = 0; i < 14; i++) {
      // A halftone dome: dots shrinking from its middle.
      const uc = STRIP_W * hash(i, 801);
      const vc = v0 + band * (0.1 + 0.8 * hash(i, 802));
      const R = 40 + 40 * hash(i, 803);
      const k = hash(i, 804) < 0.5 ? 1 : 2;
      for (let a = -R; a <= R; a += 16) {
        for (let b = -R; b <= R; b += 16) {
          const d = Math.hypot(a, b) / R;
          if (d >= 1) continue;
          dot(uc + a, vc + b, 4 * (1 - d), k, 0.75);
        }
      }
    }
    for (let i = 0; i < 30; i++) {
      // A splat: a blob and its droplets.
      const uc = STRIP_W * hash(i, 811);
      const vc = v0 + band * (0.05 + 0.9 * hash(i, 812));
      const k = hash(i, 813) < 0.5 ? 1 : 2;
      dot(uc, vc, 6 + 8 * hash(i, 814), k, 0.5);
      for (let d = 0; d < 5; d++) dot(uc + (hash(i, d, 815) - 0.5) * 90, vc + (hash(i, d, 816) - 0.5) * 90, 2 + 4 * hash(i, d, 817), k, 0.7);
    }
    for (let i = 0; i < 110; i++) {
      const s = BANG_PARTS[i % BANG_PARTS.length];
      face(s, STRIP_W * hash(i, 821), v0 + band * (0.04 + 0.92 * hash(i, 822)), 24 + 30 * hash(i, 823), 0.85, (hash(i, 824) - 0.5) * 2.4);
    }
  }

  // The gas: thin streaks of light orbiting through every band (they print as the neon's finest tubes).
  for (let i = 0; i < 480; i++) {
    const u = STRIP_W * hash(i, 901);
    const v = STRIP_H * hash(i, 902);
    const len = 80 + 620 * hash(i, 903) ** 1.5;
    const k = hash(i, 904) < 0.15 ? 0 : hash(i, 905) < 0.5 ? 1 : 2;
    line([[u - len, v], [u, v]], 1.2 + 1.0 * hash(i, 906), k, 0.6 + 0.35 * hash(i, 907));
  }

  // The band's edges fade into each other, so no band ends on a hard line.
  x.globalCompositeOperation = 'multiply';
  for (let k = 1; k < HOLE.bands; k++) {
    const g = x.createLinearGradient(0, k * band - 26, 0, k * band + 26);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.5, '#404040');
    g.addColorStop(1, '#fff');
    x.fillStyle = g;
    x.fillRect(0, k * band - 26, STRIP_W, 52);
  }
  x.globalCompositeOperation = 'source-over';
  return c;
}
