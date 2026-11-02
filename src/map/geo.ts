// Geodesy helpers: web-mercator map units <-> WGS84 <-> KOSOVAREF01 / Balkans zone 7.

export interface Proj { cx0: number; cy0: number; S: number; n12: number }
export interface Elev { w: number; h: number; sx: number; ox: number; oy: number; v: number[] }

export function unitToLL(p: Proj, x: number, y: number): [number, number] {
  const px = x / p.S + p.cx0, py = y / p.S + p.cy0;
  const lon = (px / p.n12) * 360 - 180;
  const k = Math.PI * (1 - (2 * py) / p.n12);
  return [(Math.atan(Math.sinh(k)) * 180) / Math.PI, lon];
}

export function llToUnit(p: Proj, lat: number, lon: number): [number, number] {
  const r = (lat * Math.PI) / 180;
  const px = ((lon + 180) / 360) * p.n12;
  const py = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * p.n12;
  return [(px - p.cx0) * p.S, (py - p.cy0) * p.S];
}

// Transverse Mercator, GRS80, lon0 21°, k0 0.9999, FE 7 500 000 (KOSOVAREF01 / Balkans zone 7)
export function gk(lat: number, lon: number): [number, number] {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9999, lon0 = (21 * Math.PI) / 180;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const phi = (lat * Math.PI) / 180, lam = (lon * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = (lam - lon0) * Math.cos(phi);
  const M = a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi
    - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi)
    + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi)
    - ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const E = 7500000 + k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120);
  const Nn = k0 * (M + N * Math.tan(phi) * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  return [E, Nn];
}

export function unitToGK(p: Proj, x: number, y: number): [number, number] {
  const [la, lo] = unitToLL(p, x, y);
  return gk(la, lo);
}

export function elevAt(e: Elev, x: number, y: number): number {
  const fx = (x - e.ox) / e.sx, fy = (y - e.oy) / e.sx;
  const x0 = Math.max(0, Math.min(e.w - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(e.h - 2, Math.floor(fy)));
  const tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0));
  const v = (i: number, j: number) => e.v[j * e.w + i];
  return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty;
}

/** Grid bearing from a to b in degrees (0 = grid north, clockwise). */
export function bearing(a: [number, number], b: [number, number]): number {
  const d = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
  return (d + 360) % 360;
}

export function dms(deg: number, padDeg = 3): string {
  let d = Math.floor(deg), mf = (deg - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60);
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  return `${String(d).padStart(padDeg, '0')}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`;
}

/** 7 513 642.12 style grouping, with a fixed number of decimals. */
export function group(v: number, dec = 2): string {
  const [i, f] = v.toFixed(dec).split('.');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return f ? `${g}.${f}` : g;
}

export function fmtDist(m: number, lang: string): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 1 : 2).replace('.', lang === 'sq' ? ',' : '.')} km`;
  return `${m.toFixed(m < 100 ? 1 : 0).replace('.', lang === 'sq' ? ',' : '.')} m`;
}
