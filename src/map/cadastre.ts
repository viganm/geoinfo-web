// Cadastral geometry from the real OSM footprints: oriented building boxes and parcels
// fitted around a single building, bounded halfway to its neighbours and short of the street.
import { M_PER_UNIT, type MapData } from './plates';

export type Pt = [number, number];
export interface OBB { cx: number; cy: number; ang: number; hw: number; hh: number }
export interface Bld { pts: Pt[]; cx: number; cy: number; area: number; obb: OBB; rect: number }
export interface Box { u0: number; u1: number; v0: number; v1: number }
interface Obstacle { x: number; y: number; road: boolean; b: number }

const M = M_PER_UNIT;
const m2u = (m: number) => m / M;

export function parsePaths(d: string): Pt[][] {
  const out: Pt[][] = [];
  for (const chunk of d.split('M')) {
    if (!chunk.trim()) continue;
    const nums = chunk.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    if (nums.length < 4) continue;
    let x = nums[0], y = nums[1];
    const pts: Pt[] = [[x, y]];
    for (let i = 2; i + 1 < nums.length; i += 2) { x += nums[i]; y += nums[i + 1]; pts.push([x, y]); }
    out.push(pts);
  }
  return out;
}

const shoelace = (p: Pt[]) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0) / 2);

/** Minimum-area oriented box, trying each edge direction. */
export function obb(pts: Pt[]): OBB {
  let best: OBB | null = null, bestA = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const c = Math.cos(ang), s = Math.sin(ang);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, y] of pts) { const u = x * c + y * s, v = -x * s + y * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const A = (u1 - u0) * (v1 - v0);
    if (A < bestA) {
      bestA = A;
      const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
      best = { cx: uc * c - vc * s, cy: uc * s + vc * c, ang, hw: (u1 - u0) / 2, hh: (v1 - v0) / 2 };
    }
  }
  // keep the long side on u
  if (best!.hh > best!.hw) best = { ...best!, ang: best!.ang + Math.PI / 2, hw: best!.hh, hh: best!.hw };
  return best!;
}

export const toUV = (o: OBB, x: number, y: number): Pt => {
  const c = Math.cos(o.ang), s = Math.sin(o.ang), dx = x - o.cx, dy = y - o.cy;
  return [dx * c + dy * s, -dx * s + dy * c];
};
export const fromUV = (o: OBB, u: number, v: number): Pt => {
  const c = Math.cos(o.ang), s = Math.sin(o.ang);
  return [o.cx + u * c - v * s, o.cy + u * s + v * c];
};
export const boxCorners = (o: OBB, b: Box): Pt[] => [fromUV(o, b.u0, b.v0), fromUV(o, b.u1, b.v0), fromUV(o, b.u1, b.v1), fromUV(o, b.u0, b.v1)];

export function createCadastre(d: MapData) {
  const blds: Bld[] = parsePaths(d.fills.building).filter((p) => p.length >= 3).map((pts) => {
    const area = shoelace(pts) * M * M;
    const o = obb(pts);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return { pts, cx, cy, area, obb: o, rect: area / (4 * o.hw * o.hh * M * M) };
  });
  // obstacles: building outlines and street centrelines, densified to ~2 m
  const obs: Obstacle[] = [];
  const densify = (pts: Pt[], closed: boolean, road: boolean, b: number) => {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]) * M, k = Math.max(1, Math.ceil(L / 2));
      for (let j = 0; j < k; j++) obs.push({ x: p[0] + ((q[0] - p[0]) * j) / k, y: p[1] + ((q[1] - p[1]) * j) / k, road, b });
    }
  };
  blds.forEach((b, i) => densify(b.pts, true, false, i));
  for (const key of ['minor', 'secondary', 'primary', 'trunk'] as const) for (const pl of parsePaths(d.lines[key])) densify(pl, false, true, -1);
  // coarse grid index
  const CELL = m2u(40);
  const grid = new Map<string, Obstacle[]>();
  for (const o of obs) { const k = `${Math.floor(o.x / CELL)},${Math.floor(o.y / CELL)}`; (grid.get(k) ?? grid.set(k, []).get(k)!).push(o); }
  const near = (x: number, y: number, r: number) => {
    const out: Obstacle[] = [];
    const n = Math.ceil(r / CELL);
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (const o of grid.get(`${gx + i},${gy + j}`) ?? []) out.push(o);
    return out;
  };

  /** Parcel around building `bi`: boundary halfway to neighbours, 4 m short of street centrelines. */
  const fitParcel = (bi: number, wantM = 9): Box => {
    const o = blds[bi].obb;
    const want = m2u(wantM), roadOff = m2u(4.5);
    const m = { u1: want, u0: want, v1: want, v0: want };
    const pts = near(o.cx, o.cy, m2u(wantM * 2 + Math.max(o.hw, o.hh) * M)).filter((p) => p.b !== bi).map((p) => ({ uv: toUV(o, p.x, p.y), road: p.road }));
    for (let pass = 0; pass < 2; pass++) {
      for (const { uv: [u, v], road } of pts) {
        const lim = (gap: number) => (road ? gap - roadOff : gap / 2);
        if (Math.abs(v) <= o.hh + Math.max(m.v0, m.v1)) {
          if (u > o.hw) m.u1 = Math.min(m.u1, lim(u - o.hw));
          if (u < -o.hw) m.u0 = Math.min(m.u0, lim(-o.hw - u));
        }
        if (Math.abs(u) <= o.hw + Math.max(m.u0, m.u1)) {
          if (v > o.hh) m.v1 = Math.min(m.v1, lim(v - o.hh));
          if (v < -o.hh) m.v0 = Math.min(m.v0, lim(-o.hh - v));
        }
      }
    }
    return { u0: -o.hw - Math.max(0, m.u0), u1: o.hw + Math.max(0, m.u1), v0: -o.hh - Math.max(0, m.v0), v1: o.hh + Math.max(0, m.v1) };
  };

  const minMargin = (bi: number, b: Box) => { const o = blds[bi].obb; return Math.min(b.u1 - o.hw, -o.hw - b.u0, b.v1 - o.hh, -o.hh - b.v0) * M; };
  const boxArea = (b: Box) => (b.u1 - b.u0) * (b.v1 - b.v0) * M * M;

  /** Best single building near a target for a property parcel. */
  const pickParcel = (tx: number, ty: number, opts: { minA: number; maxA: number; minRect: number; minMargin: number; skip?: Set<number> }) => {
    let best = -1, bestS = Infinity, bestBox: Box | null = null;
    blds.forEach((b, i) => {
      if (opts.skip?.has(i) || b.area < opts.minA || b.area > opts.maxA || b.rect < opts.minRect) return;
      const asp = b.obb.hw / b.obb.hh; if (asp > 3) return;
      const dist = Math.hypot(b.cx - tx, b.cy - ty) * M; if (dist > 700) return;
      const box = fitParcel(i);
      const mm = minMargin(i, box); if (mm < opts.minMargin) return;
      const score = dist - mm * 6;
      if (score < bestS) { bestS = score; best = i; bestBox = box; }
    });
    return best < 0 ? null : { bi: best, b: blds[best], box: bestBox!, area: boxArea(bestBox!) };
  };

  /** Two parallel neighbours with a yard between them, for a boundary dispute. */
  const pickPair = (tx: number, ty: number, skip: Set<number>) => {
    type Pair = { a: number; b: number; axis: 'u' | 'v'; mid: number; s0: number; s1: number };
    let best = null as Pair | null, bestS = Infinity;
    blds.forEach((A, ia) => {
      if (skip.has(ia) || A.area < 120 || A.area > 900 || A.rect < 0.8) return;
      const dist = Math.hypot(A.cx - tx, A.cy - ty) * M; if (dist > 600) return;
      const o = A.obb;
      for (const ob of near(o.cx, o.cy, m2u(45))) {
        if (ob.road || ob.b === ia || ob.b < 0) continue;
        const B = blds[ob.b];
        let dAng = Math.abs(((B.obb.ang - o.ang) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2)); dAng = Math.min(dAng, Math.PI / 2 - dAng);
        if (dAng > 0.14) continue;
        const pts = B.pts.map(([x, y]) => toUV(o, x, y));
        for (const axis of ['u', 'v'] as const) {
          const k = axis === 'u' ? 0 : 1, half = axis === 'u' ? o.hw : o.hh, other = axis === 'u' ? o.hh : o.hw;
          const along = pts.map((p) => p[k]), across = pts.map((p) => p[1 - k]);
          const near0 = Math.min(...along);
          if (near0 <= half) continue;
          const gap = (near0 - half) * M;
          if (gap < 12 || gap > 26) continue;
          const s0 = Math.max(-other, Math.min(...across)), s1 = Math.min(other, Math.max(...across));
          if ((s1 - s0) < other * 1.1) continue;
          // the yard between them must be clear of streets and other buildings
          const mid = half + (near0 - half) / 2;
          const blocked = near(o.cx, o.cy, m2u(60)).some((q) => {
            if (q.b === ia || q.b === ob.b) return false;
            const [qu, qv] = toUV(o, q.x, q.y); const a = axis === 'u' ? qu : qv, c = axis === 'u' ? qv : qu;
            return a > half && a < near0 && c > s0 - m2u(4) && c < s1 + m2u(4);
          });
          if (blocked) continue;
          const score = dist - (s1 - s0) * M;
          if (score < bestS) { bestS = score; best = { a: ia, b: ob.b, axis, mid, s0, s1 }; }
        }
      }
    });
    const found = best as Pair | null;
    return found ? { ...found, o: blds[found.a].obb } : null;
  };

  /** Open ground for a subdivision: a w x h metre lot with no buildings or streets on it. */
  const pickOpen = (tx: number, ty: number, wM: number, hM: number) => {
    // align with the local street grid: the dominant footprint direction nearby
    const local = blds.filter((b) => Math.hypot(b.cx - tx, b.cy - ty) * M < 400 && b.rect > 0.8);
    const angs = local.map((b) => ((b.obb.ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)).sort((a, b) => a - b);
    const ang = angs.length ? angs[angs.length >> 1] : 0;
    const hw = m2u(wM / 2), hh = m2u(hM / 2), pad = m2u(3), step = m2u(12);
    let best: OBB | null = null, bestD = Infinity;
    for (let i = -45; i <= 45; i++) for (let j = -45; j <= 45; j++) {
      const cx = tx + i * step, cy = ty + j * step;
      const dd = Math.hypot(cx - tx, cy - ty); if (dd >= bestD) continue;
      const o: OBB = { cx, cy, ang, hw, hh };
      const around = near(cx, cy, m2u(Math.max(wM, hM)));
      let hit = false, front = 0;
      for (const q of around) {
        const [u, v] = toUV(o, q.x, q.y);
        if (Math.abs(u) < hw + pad && Math.abs(v) < hh + pad) { hit = true; break; }
        // a street running along at least one edge, so the lots have frontage
        if (q.road && Math.abs(u) < hw && Math.abs(Math.abs(v) - hh) < m2u(14)) front++;
      }
      if (!hit && front > 12) { bestD = dd; best = o; }
    }
    return best;
  };

  return { blds, fitParcel, pickParcel, pickPair, pickOpen, boxArea, near: (x: number, y: number, rM: number) => blds.filter((b) => Math.hypot(b.cx - x, b.cy - y) * M < rM) };
}
export type Cadastre = ReturnType<typeof createCadastre>;
export { m2u, M as M_UNIT };
