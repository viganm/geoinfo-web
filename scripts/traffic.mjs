import fs from 'node:fs';
const [,, SP, OUT] = process.argv;
const city = JSON.parse(fs.readFileSync(`${SP}/osm/roads.json`));
const C = { lat: 42.6548, lon: 21.1490 }, HW = 900, HH = 560; // half extents in metres
const mLat = 111320, mLon = 111320 * Math.cos(C.lat * Math.PI / 180);
const toXY = (p) => [(p.lon - C.lon) * mLon, (C.lat - p.lat) * mLat];
const keep = new Set(['trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link']);
const ways = city.elements.filter(e => e.type === 'way' && keep.has(e.tags?.highway) && e.nodes && e.geometry);
// count node usage to find intersections
const use = new Map();
for (const w of ways) w.nodes.forEach((n, i) => use.set(n, (use.get(n) || 0) + (i === 0 || i === w.nodes.length - 1 ? 2 : 1)));
const nodes = new Map(); const edges = [];
const inWin = ([x, y]) => Math.abs(x) < HW * 1.25 && Math.abs(y) < HH * 1.25;
for (const w of ways) {
  const ow = w.tags.oneway === 'yes' || w.tags.junction === 'roundabout' || w.tags.highway.endsWith('_link') && w.tags.oneway !== 'no';
  const lanes = +(w.tags.lanes || (w.tags.highway.startsWith('trunk') ? 4 : w.tags.highway.startsWith('primary') ? 2 : 2));
  let seg = [w.nodes[0]], pts = [toXY(w.geometry[0])];
  for (let i = 1; i < w.nodes.length; i++) {
    seg.push(w.nodes[i]); pts.push(toXY(w.geometry[i]));
    if ((use.get(w.nodes[i]) || 0) > 1 || i === w.nodes.length - 1) {
      if (pts.some(inWin)) {
        const a = seg[0], b = seg[seg.length - 1];
        nodes.set(a, pts[0]); nodes.set(b, pts[pts.length - 1]);
        const P = pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
        edges.push({ a, b, p: P, c: w.tags.highway.replace('_link', ''), r: w.tags.junction === 'roundabout' ? 1 : 0, l: lanes });
        if (!ow) edges.push({ a: b, b: a, p: P.slice().reverse(), c: w.tags.highway.replace('_link', ''), r: 0, l: lanes, rev: 1 });
      }
      seg = [w.nodes[i]]; pts = [toXY(w.geometry[i])];
    }
  }
}
// reindex nodes
const ids = new Map(); let k = 0; for (const id of nodes.keys()) ids.set(id, k++);
const out = { w: HW * 2, h: HH * 2, cx: C.lon, cy: C.lat, n: [...nodes.values()].map(([x, y]) => [Math.round(x), Math.round(y)]), e: edges.map(e => ({ a: ids.get(e.a), b: ids.get(e.b), p: e.p, c: ({ trunk: 'T', primary: 'P', secondary: 'S', tertiary: 't' })[e.c], r: e.r, l: e.l, v: e.rev ? 1 : 0 })) };
// names of roads in window, for labels
const names = new Map();
for (const w of ways) { const nm = w.tags.name; if (!nm) continue; const pts = w.geometry.map(toXY).filter(inWin); if (pts.length < 2) continue; const len = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0); if (!names.has(nm) || names.get(nm).len < len) names.set(nm, { len, mid: pts[Math.floor(pts.length / 2)] }); }
out.names = [...names.entries()].sort((a, b) => b[1].len - a[1].len).slice(0, 8).map(([n, v]) => ({ n, x: Math.round(v.mid[0]), y: Math.round(v.mid[1]) }));
const rb = new Map();
for (const w of ways) { if (w.tags.junction !== 'roundabout' || !w.tags.name || !w.tags.name.startsWith('Rreth')) continue; const pts = w.geometry.map(toXY); const k = w.tags.name; const cur = rb.get(k) || []; rb.set(k, cur.concat(pts)); }
out.rb = [...rb.entries()].map(([n, pts]) => ({ n, x: Math.round(pts.reduce((a, p) => a + p[0], 0) / pts.length), y: Math.round(pts.reduce((a, p) => a + p[1], 0) / pts.length) })).filter(r => inWin([r.x, r.y]));
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('nodes', out.n.length, 'edges', out.e.length, (JSON.stringify(out).length / 1024).toFixed(0) + 'KB');
console.log(out.names);
