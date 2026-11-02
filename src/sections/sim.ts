import net from '../data/traffic-net.json';
import { M_PER_UNIT, type MapData } from '../map/plates';
import { llToUnit } from '../map/geo';
import { onLang, lang } from '../i18n';
import { createSim, type Edge, type NetData, type Pt, type Scenario } from './simcore';

// Canvas view of the traffic model (simcore.ts). Illustrative only.
export async function initSim(reduced: boolean) {
  const canvas = document.getElementById('simCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const md = (await import('../data/map-data.json')).default as unknown as MapData;
  const stats = { veh: document.getElementById('stVeh')!, spd: document.getElementById('stSpd')!, del: document.getElementById('stDel')!, los: document.getElementById('stLos')! };

  const sim = createSim(net as unknown as NetData);
  sim.setDemand(420);
  sim.seed();
  const { edges } = sim;

  /* ---------- drawing ---------- */
  let cw = 0, ch = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  const bg = document.createElement('canvas');
  const focus: Pt = [-215, 30];
  const [cux, cuy] = llToUnit(md.proj, net.cy, net.cx);
  const minor = new Path2D(md.lines.minor), bld = new Path2D(md.fills.building);
  const pos = (e: Edge, s: number): [number, number, number] => {
    const c = e.cum; let i = 1;
    while (i < c.length - 1 && c[i] < s) i++;
    const t = (s - c[i - 1]) / (c[i] - c[i - 1] || 1);
    const p = e.p[i - 1], q = e.p[i];
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    let x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
    if (e.two) { const off = Math.min(4, e.l * 0.8); x += -Math.sin(ang) * -off; y += Math.cos(ang) * -off; }
    return [x, y, ang];
  };
  const X = (x: number) => ox + x * sc, Y = (y: number) => oy + y * sc;

  const layout = () => {
    const r = canvas.getBoundingClientRect();
    cw = r.width; ch = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    const half = cw < 600 ? 330 : 560;
    sc = cw < 600 ? ch / (half * 2.6) : Math.max(cw / (half * 2), ch / (half * 1.05));
    ox = cw / 2 - focus[0] * sc; oy = ch / 2 - focus[1] * sc;
    bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0c0e0c'; g.fillRect(0, 0, cw, ch);
    // context from the map plates, in map units
    const k = sc * M_PER_UNIT;
    g.save();
    g.setTransform(k * dpr, 0, 0, k * dpr, (ox - cux * k) * dpr, (oy - cuy * k) * dpr);
    g.fillStyle = '#1a1f1a'; g.fill(bld);
    g.strokeStyle = '#232923'; g.lineWidth = 1.1 / k; g.stroke(minor);
    g.restore();
    // grid every 100 m
    g.strokeStyle = 'rgba(233,236,230,0.045)'; g.lineWidth = 1;
    for (let x = Math.floor(-ox / sc / 100) * 100; X(x) < cw; x += 100) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), ch); g.stroke(); }
    for (let y = Math.floor(-oy / sc / 100) * 100; Y(y) < ch; y += 100) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(cw, Y(y)); g.stroke(); }
    // links
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const pass of [0, 1]) for (const e of edges) {
      if (e.v) continue;
      const lanes = e.two ? Math.max(2, e.l) : Math.max(1, e.l);
      g.beginPath(); e.p.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
      if (pass === 0) { g.strokeStyle = '#323932'; g.lineWidth = Math.max(3, lanes * 2.9 * sc + 1.5); g.stroke(); }
      else { g.strokeStyle = '#1f241f'; g.lineWidth = Math.max(2, lanes * 2.9 * sc); g.stroke();
        if (e.two) { g.setLineDash([6, 7]); g.strokeStyle = 'rgba(233,236,230,0.16)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]); } }
    }
    // names
    g.font = '600 10.5px "Archivo Variable", sans-serif';
    g.fillStyle = 'rgba(233,236,230,0.38)';
    g.textAlign = 'center';
    for (const r of net.rb) { g.fillText(r.n.toUpperCase().replace(/ \(.*/, ''), X(r.x), Y(r.y) + 4); }
    g.font = 'italic 10px "Archivo Variable", sans-serif';
    for (const n of net.names.slice(0, 6)) g.fillText(n.n, X(n.x), Y(n.y) - 10);
    // scale
    g.fillStyle = 'rgba(233,236,230,0.6)'; g.fillRect(cw - 24 - 100 * sc, ch - 26, 100 * sc, 2);
    g.font = '10px "Martian Mono Variable", monospace'; g.textAlign = 'right';
    g.fillText('100 m', cw - 24, ch - 32);
  };

  const ramp = (r: number) => {
    // free flow -> queue
    const stops: [number, number[]][] = [[0, [239, 91, 79]], [0.45, [233, 210, 90]], [1, [95, 211, 154]]];
    r = Math.max(0, Math.min(1, r));
    for (let i = 1; i < stops.length; i++) if (r <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], k = (r - t0) / (t1 - t0);
      return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * k)).join(',')})`;
    }
    return 'rgb(95,211,154)';
  };

  const render = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // signal heads
    for (const e of edges) {
      if (e.sig < 0) continue;
      const [x, y] = pos(e, e.len - 1);
      ctx.fillStyle = sim.sigState(e) === 'g' ? '#5fd39a' : '#ef5b4f';
      ctx.beginPath(); ctx.arc(X(x), Y(y), 2.4, 0, Math.PI * 2); ctx.fill();
    }
    const L = Math.max(5, 4.6 * sc), Wd = Math.max(2.4, 1.9 * sc);
    for (const v of sim.vehs) {
      const e = edges[v.e];
      const [x, y, a] = pos(e, Math.min(v.s, e.len));
      ctx.save();
      ctx.translate(X(x), Y(y)); ctx.rotate(a);
      ctx.fillStyle = ramp(v.v / v.v0);
      ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
      ctx.restore();
    }
  };

  /* ---------- loop ---------- */
  let running = false, last = 0, acc = 0, statT = 0;
  const loop = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt * 2.2;
    while (acc > 0.05) { sim.step(0.05); acc -= 0.05; }
    render();
    statT += dt;
    if (statT > 0.5) { statT = 0; updateStats(); }
    requestAnimationFrame(loop);
  };
  // share of vehicles crawling below 7 km/h, smoothed; LOS bands are illustrative
  let qShare = 0;
  const losOf = (q: number) => (q < 6 ? 'A' : q < 12 ? 'B' : q < 20 ? 'C' : q < 29 ? 'D' : q < 40 ? 'E' : 'F');
  const losCol: Record<string, string> = { A: '#7ee2a8', B: '#7ee2a8', C: '#e9d25a', D: '#f2a65a', E: '#ef7b5f', F: '#ef5b4f' };
  const updateStats = () => {
    const vehs = sim.vehs;
    const n = vehs.length;
    const spd = n ? (vehs.reduce((a, v) => a + v.v, 0) / n) * 3.6 : 0;
    const q = n ? (vehs.filter((v) => v.v < 2).length / n) * 100 : 0;
    qShare = qShare ? qShare * 0.75 + q * 0.25 : q;
    stats.veh.textContent = String(n);
    stats.spd.textContent = spd.toFixed(1).replace('.', lang() === 'sq' ? ',' : '.');
    stats.del.textContent = qShare.toFixed(0);
    const los = losOf(qShare);
    stats.los.textContent = los;
    (stats.los as HTMLElement).style.color = losCol[los];
  };

  layout();
  // warm up so the first frame already shows queues forming
  for (let i = 0; i < 1200; i++) sim.step(0.05);
  render(); updateStats();
  new ResizeObserver(() => { layout(); render(); }).observe(canvas);
  document.fonts.ready.then(() => { layout(); render(); });

  if (!reduced) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
      else if (!en.isIntersecting) running = false;
    }, { threshold: 0.05 }).observe(canvas);
  }

  document.querySelectorAll<HTMLButtonElement>('.seg').forEach((b) => b.addEventListener('click', () => {
    sim.setScenario(b.dataset.scn as Scenario);
    document.querySelectorAll<HTMLButtonElement>('.seg').forEach((o) => { const on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', String(on)); });
    if (reduced) { for (let i = 0; i < 1200; i++) sim.step(0.05); qShare = 0; render(); updateStats(); }
  }));
  onLang(updateStats);
}
