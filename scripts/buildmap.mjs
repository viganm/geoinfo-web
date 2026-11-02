import fs from 'node:fs';
import { contours } from 'd3-contour';
const [,, SP, OUTDIR] = process.argv;
const g = JSON.parse(fs.readFileSync(`${SP}/dem-grid.json`));
const elev = new Float32Array(fs.readFileSync(`${SP}/dem-grid.bin`).buffer.slice(0));
const { W, H, x0, y0, z } = g.meta;
const n12 = 2 ** z * 256;
// mercator helpers in z12 global px
const lon2px = (lon) => (lon + 180) / 360 * n12;
const lat2py = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n12; };
// crop
const C = { lonW: 21.02, lonE: 21.30, latN: 42.728, latS: 42.592 };
const S = 4; // output units per z12 px (= z14 px, ~7 m)
const cx0 = lon2px(C.lonW), cy0 = lat2py(C.latN);
const VW = Math.round((lon2px(C.lonE) - cx0) * S), VH = Math.round((lat2py(C.latS) - cy0) * S);
const P = (lat, lon) => [(lon2px(lon) - cx0) * S, (lat2py(lat) - cy0) * S];
const r1 = (v) => Math.round(v * 10) / 10;
// --- contours on sub grid
const gx0 = Math.floor(cx0 - x0 * 256) - 2, gy0 = Math.floor(cy0 - y0 * 256) - 2;
const gw = Math.ceil(VW / S) + 5, gh = Math.ceil(VH / S) + 5;
const sub = new Float64Array(gw * gh);
let mn = Infinity, mx = -Infinity;
for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const v = elev[(gy0 + y) * W + gx0 + x]; sub[y * gw + x] = v; mn = Math.min(mn, v); mx = Math.max(mx, v); }
console.log('crop elev', mn.toFixed(0), mx.toFixed(0), 'view', VW, VH);
const offX = (gx0 + x0 * 256 - cx0) * S, offY = (gy0 + y0 * 256 - cy0) * S;
function dp(pts, eps) { // douglas-peucker; closed rings are split at the farthest vertex
  if (pts.length < 3) return pts;
  const f = pts[0], l = pts[pts.length - 1];
  if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-6) {
    let far = 1, fd = 0; for (let i = 1; i < pts.length - 1; i++) { const d = Math.hypot(pts[i][0] - f[0], pts[i][1] - f[1]); if (d > fd) { fd = d; far = i; } }
    if (fd < 1e-6) return [f];
    const a = dp(pts.slice(0, far + 1), eps), b = dp(pts.slice(far), eps); return a.slice(0, -1).concat(b);
  }
  let dmax = 0, idx = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const L = Math.hypot(bx - ax, by - ay) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > dmax) { dmax = d; idx = i; } }
  if (dmax > eps) { const a = dp(pts.slice(0, idx + 1), eps), b = dp(pts.slice(idx), eps); return a.slice(0, -1).concat(b); }
  return [pts[0], pts[pts.length - 1]];
}
function chaikin(pts, closed) {
  const out = []; const N = pts.length;
  for (let i = 0; i < (closed ? N : N - 1); i++) { const a = pts[i], b = pts[(i + 1) % N]; out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
  if (!closed) { out.unshift(pts[0]); out.push(pts[N - 1]); }
  return out;
}
function enc(pts, closed, prec = 0) {
  const m = 10 ** prec; let px = Math.round(pts[0][0] * m), py = Math.round(pts[0][1] * m);
  let out = 'M' + px / m + ' ' + py / m + 'l';
  const parts = [];
  for (let i = 1; i < pts.length; i++) { const x = Math.round(pts[i][0] * m), y = Math.round(pts[i][1] * m); const dx = x - px, dy = y - py; if (!dx && !dy) continue; parts.push(dx / m + ' ' + dy / m); px = x; py = y; }
  out += parts.join(' ').replace(/ -/g, '-');
  return out.replace('l', parts.length ? 'l' : '') + (closed ? 'z' : '');
}
const inView = ([x, y]) => x > -40 && y > -40 && x < VW + 40 && y < VH + 40;
function ringsToD(rings, closed = true) {
  let d = '';
  for (let ring of rings) {
    if (ring.length < 3) continue;
    ring = dp(ring, 2.2);
    if (ring.length < 4) continue;
    ring = chaikin(ring, closed);
    if (!ring.some(inView)) continue;
    d += enc(ring, closed, 0);
  }
  return d;
}
const step = 20; const levels = [];
for (let v = Math.ceil(mn / step) * step; v <= mx; v += step) levels.push(v);
const cs = contours().size([gw, gh]).thresholds(levels).smooth(true)(sub);
const contourOut = [];
for (const c of cs) {
  const rings = [];
  for (const poly of c.coordinates) for (const ring of poly) rings.push(ring.map(([x, y]) => [x * S + offX, y * S + offY]));
  // drop the frame edge segments of rings hugging the grid border: keep as is (clipped visually)
  const d = ringsToD(rings);
  if (d) contourOut.push({ z: c.value, i: c.value % 100 === 0 ? 1 : 0, d });
}
// spot heights: local maxima in 15px window, highest few, separated
const peaks = [];
const R = 14;
for (let y = R; y < gh - R; y++) for (let x = R; x < gw - R; x++) {
  const v = sub[y * gw + x]; let ok = true;
  for (let j = -R; j <= R && ok; j += 2) for (let i = -R; i <= R; i += 2) if (sub[(y + j) * gw + x + i] > v) { ok = false; break; }
  if (ok && v > 640) peaks.push({ x: r1(x * S + offX), y: r1(y * S + offY), h: Math.round(v) });
}
peaks.sort((a, b) => b.h - a.h);
const spots = [];
for (const p of peaks) { if (p.x < 60 || p.y < 60 || p.x > VW - 60 || p.y > VH - 60) continue; if (spots.every(s => Math.hypot(s.x - p.x, s.y - p.y) > 260)) spots.push(p); if (spots.length >= 9) break; }
// --- OSM
const wide = JSON.parse(fs.readFileSync(`${SP}/osm/wide.json`));
const city = JSON.parse(fs.readFileSync(`${SP}/osm/roads.json`));
const lines = { motorway: [], trunk: [], primary: [], secondary: [], minor: [], rail: [], river: [], stream: [] };
const fills = { water: [], forest: [], building: [] };
const seen = new Set();
function geomPts(geom) { return geom.map(p => P(p.lat, p.lon)); }
function addLine(key, geom) { let pts = geomPts(geom); if (!pts.some(inView)) return; pts = dp(pts, key === 'minor' ? 0.9 : 0.6); lines[key].push(enc(pts, false, key === 'minor' ? 0 : 1)); }
function addFill(key, geom) { let pts = geomPts(geom); if (!pts.some(inView)) return; pts = dp(pts, key === 'building' ? 0.25 : 1.2); if (pts.length < 3) return; if (pts.length > 3 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 1e-6) pts = pts.slice(0, -1); fills[key].push(enc(pts, true, key === 'building' ? 1 : 0)); }
for (const src of [wide, city]) for (const e of src.elements) {
  if (seen.has(e.type + e.id)) continue; seen.add(e.type + e.id);
  const t = e.tags || {};
  if (e.type === 'way' && e.geometry) {
    const hw = t.highway;
    if (hw === 'motorway' || hw === 'motorway_link') addLine('motorway', e.geometry);
    else if (hw === 'trunk' || hw === 'trunk_link') addLine('trunk', e.geometry);
    else if (hw === 'primary' || hw === 'primary_link') addLine('primary', e.geometry);
    else if (hw === 'secondary' || hw === 'secondary_link') addLine('secondary', e.geometry);
    else if (hw === 'tertiary' || hw === 'residential') addLine('minor', e.geometry);
    else if (t.railway === 'rail') addLine('rail', e.geometry);
    else if (t.waterway === 'river') addLine('river', e.geometry);
    else if (t.waterway === 'stream') addLine('stream', e.geometry);
    else if (t.natural === 'water') addFill('water', e.geometry);
    else if (t.landuse === 'forest' || t.natural === 'wood') addFill('forest', e.geometry);
    else if (t.building) addFill('building', e.geometry);
  } else if (e.type === 'relation' && t.natural === 'water' && e.members) {
    for (const m of e.members) if (m.role === 'outer' && m.geometry) addFill('water', m.geometry);
  }
}
const hydroLabels = [];
{
  const best = new Map();
  for (const e of wide.elements) {
    const t = e.tags || {};
    if (e.type !== 'way' || !e.geometry || !t.name) continue;
    if (t.waterway !== 'river' && t.natural !== 'water') continue;
    const pts = e.geometry.map(q => P(q.lat, q.lon)).filter(inView);
    if (pts.length < 2) continue;
    const len = pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    const key = t.name;
    if (!best.has(key) || best.get(key).len < len) {
      let mid, ang = 0;
      if (t.natural === 'water') { mid = [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length]; }
      else { const i = Math.floor(pts.length / 2); mid = pts[i]; const a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)]; ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180; }
      best.set(key, { len, x: r1(mid[0]), y: r1(mid[1]), a: Math.round(ang), w: t.natural === 'water' ? 1 : 0 });
    }
  }
  for (const [n, v] of best) if (v.len > 120) hydroLabels.push({ n, ...v });
}
const places = [];
for (const e of wide.elements) if (e.type === 'node' && e.tags?.place) {
  const [x, y] = P(e.lat, e.lon); if (!inView([x, y])) continue;
  places.push({ n: e.tags['name:sq'] || e.tags.name, k: e.tags.place, x: r1(x), y: r1(y) });
}
// --- GK (KOSOVAREF01 / Balkans zone 7): TM, GRS80, lon0 21, k0 .9999, FE 7 500 000
function gk(lat, lon) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9999, lon0 = 21 * Math.PI / 180;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, Cc = ep2 * Math.cos(phi) ** 2, A = (lam - lon0) * Math.cos(phi);
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi) + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  const E = 7500000 + k0 * N * (A + (1 - T + Cc) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * Cc - 58 * ep2) * A ** 5 / 120);
  const Nn = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * Cc + 4 * Cc * Cc) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * Cc - 330 * ep2) * A ** 6 / 720));
  return [E, Nn];
}
// inverse mercator for unit coords
const unit2ll = (x, y) => { const px = x / S + cx0, py = y / S + cy0; const lon = px / n12 * 360 - 180; const k = Math.PI * (1 - 2 * py / n12); return [Math.atan(Math.sinh(k)) * 180 / Math.PI, lon]; };
const corners = { nw: gk(...unit2ll(0, 0)), ne: gk(...unit2ll(VW, 0)), sw: gk(...unit2ll(0, VH)), se: gk(...unit2ll(VW, VH)) };
console.log('GK corners', corners);
// elevation sampler grid (coarse, for cursor H readout): 1 value per 4 z12 px
const ES = 4, ew = Math.ceil(gw / ES), eh = Math.ceil(gh / ES); const eg = [];
for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) eg.push(Math.round(sub[Math.min(gh - 1, y * ES) * gw + Math.min(gw - 1, x * ES)]));
const data = {
  view: [VW, VH], step,
  contours: contourOut,
  lines: Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, v.join('')])),
  fills: Object.fromEntries(Object.entries(fills).map(([k, v]) => [k, v.join('')])),
  places, spots, corners, hydroLabels,
  elev: { w: ew, h: eh, sx: ES * S, ox: offX, oy: offY, v: eg },
  ll: { lonW: C.lonW, lonE: C.lonE, latN: C.latN, latS: C.latS },
  proj: { cx0, cy0, S, n12 },
};
const proj = { cx0, cy0, S };
fs.writeFileSync(`${OUTDIR}/map-data.json`, JSON.stringify(data));
fs.writeFileSync(`${SP}/proj.json`, JSON.stringify(proj));
const sz = (s) => (s.length / 1024).toFixed(0) + 'KB';
console.log('contours', contourOut.length, sz(contourOut.map(c => c.d).join('')));
for (const [k, v] of Object.entries(data.lines)) console.log(k, sz(v)); for (const [k, v] of Object.entries(data.fills)) console.log(k, sz(v));
console.log('spots', spots, 'places', places.length);
console.log('total', sz(JSON.stringify(data)));
