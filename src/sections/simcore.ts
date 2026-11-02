// Microscopic traffic model on the real OSM network around Rrethi i Madh:
// IDM car-following, signals, roundabout yielding. Illustrative only, no DOM.

export type Pt = [number, number];
export interface NetData { w: number; h: number; n: number[][]; e: { a: number; b: number; p: number[][]; c: string; r: number; l: number; v: number }[] }
export interface Edge { a: number; b: number; p: Pt[]; c: string; r: number; l: number; v: number; len: number; cum: number[]; vmax: number; out: number[]; sig: number; grp: number; two: boolean }
export interface Veh { e: number; s: number; v: number; next: number; v0: number; wait: number }
interface Sig { cycle: number; off: number; appr: number[][]; green: number; timer: number; amber: number }
export type Scenario = 'now' | 'opt';

const VMAX: Record<string, number> = { T: 60, P: 50, S: 40, t: 35 };
const W: Record<string, number> = { T: 3, P: 2.4, S: 1.6, t: 1 };

export function createSim(net: NetData, rnd: () => number = Math.random) {
  const edges: Edge[] = net.e.map((e) => {
    const p = e.p as Pt[];
    const cum = [0];
    for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    return { ...e, p, len: cum[cum.length - 1], cum, vmax: (e.r ? 25 : VMAX[e.c] ?? 35) / 3.6, out: [], sig: -1, grp: 0, two: false };
  }).filter((e) => e.len > 1);
  const keys = new Set(edges.map((e) => `${e.a}-${e.b}-${e.p.length}`));
  edges.forEach((e) => { e.two = keys.has(`${e.b}-${e.a}-${e.p.length}`); });
  const outBy = new Map<number, number[]>(), inBy = new Map<number, number[]>();
  edges.forEach((e, i) => { (outBy.get(e.a) ?? outBy.set(e.a, []).get(e.a)!).push(i); (inBy.get(e.b) ?? inBy.set(e.b, []).get(e.b)!).push(i); });
  edges.forEach((e) => { e.out = (outBy.get(e.b) ?? []).filter((j) => !(edges[j].b === e.a && edges[j].p.length === e.p.length && !edges[j].r)); });

  // signals at junctions of three or more approaches off the roundabouts
  const sigs: Sig[] = [];
  inBy.forEach((ins, node) => {
    const approaches = ins.filter((i) => !edges[i].r);
    const onRb = ins.some((i) => edges[i].r) || (outBy.get(node) ?? []).some((i) => edges[i].r);
    const major = approaches.filter((i) => 'TPS'.includes(edges[i].c)).length >= 1 && approaches.length >= 3;
    if (approaches.length < 3 || onRb || !major) return;
    const sig: Sig = { cycle: 120, off: 0, appr: [[], []], green: 0, timer: 0, amber: 0 };
    approaches.forEach((i) => {
      const e = edges[i], p = e.p, n = p.length;
      const ang = ((Math.atan2(p[n - 1][1] - p[n - 2][1], p[n - 1][0] - p[n - 2][0]) * 180) / Math.PI + 360) % 180;
      e.sig = sigs.length; e.grp = ang > 45 && ang < 135 ? 1 : 0;
      sig.appr[e.grp].push(i);
    });
    if (!sig.appr[0].length || !sig.appr[1].length) { approaches.forEach((i) => { edges[i].sig = -1; }); return; }
    sig.off = rnd() * 120;
    sigs.push(sig);
  });
  const entries = edges.map((_, i) => i).filter((i) => {
    const [x, y] = net.n[edges[i].a];
    return Math.abs(x) > net.w * 0.42 || Math.abs(y) > net.h * 0.42 || !(inBy.get(edges[i].a)?.length);
  });

  let scn: Scenario = 'now';
  let time = 0;
  let demand = 330;
  let vehs: Veh[] = [];
  let byEdge = new Map<number, Veh[]>();

  const queueOf = (s: Sig, g: number) => {
    let q = 0;
    for (const i of s.appr[g]) for (const v of byEdge.get(i) ?? []) if (v.v < 3 && edges[i].len - v.s < 90) q++;
    return q;
  };
  // fixed time (now) vs. queue-responsive control with coordinated minimum greens (opt)
  const updateSignals = (dt: number) => {
    if (scn === 'now') return;
    for (const s of sigs) {
      if (s.amber > 0) { s.amber -= dt; if (s.amber <= 0) { s.green = 1 - s.green; s.timer = 0; } continue; }
      s.timer += dt;
      const mine = queueOf(s, s.green), other = queueOf(s, 1 - s.green);
      if ((s.timer > 7 && other > mine * 1.2 + 1) || s.timer > 40) s.amber = 2.5;
    }
  };
  const sigState = (e: Edge): 'g' | 'r' => {
    const s = sigs[e.sig];
    if (scn === 'opt') return s.amber <= 0 && s.green === e.grp ? 'g' : 'r';
    const ph = (time + s.off) % s.cycle, half = s.cycle / 2, allRed = 8;
    const green = e.grp === 0 ? ph < half - allRed : ph >= half && ph < s.cycle - allRed;
    return green ? 'g' : 'r';
  };

  // with route guidance on (opt), drivers steer away from links that are already queued
  const weight = (j: number) => {
    let w = W[edges[j].c] * (edges[j].r ? 2 : 1);
    if (scn === 'opt') { let q = 0; for (const v of byEdge.get(j) ?? []) if (v.v < 3) q++; w /= 1 + q * 0.8; }
    return w;
  };
  const pickNext = (e: Edge) => {
    const o = e.out; if (!o.length) return -1;
    if (o.length === 1) return o[0];
    const ws = o.map(weight);
    let r = rnd() * ws.reduce((a, b) => a + b, 0);
    for (let k = 0; k < o.length; k++) { r -= ws[k]; if (r <= 0) return o[k]; }
    return o[o.length - 1];
  };
  const spawn = (ei: number, s = 0) => {
    const e = edges[ei];
    for (const v of byEdge.get(ei) ?? []) if (Math.abs(v.s - s) < 9) return;
    if (vehs.some((v) => v.e === ei && Math.abs(v.s - s) < 9)) return;
    const v0 = e.vmax * (0.85 + rnd() * 0.25);
    vehs.push({ e: ei, s, v: v0 * 0.6, next: pickNext(e), v0, wait: 0 });
  };
  const seed = () => {
    vehs = []; byEdge = new Map();
    let guard = 0;
    while (vehs.length < demand * 0.85 && guard++ < 5000) {
      const ei = (rnd() * edges.length) | 0;
      spawn(ei, rnd() * edges[ei].len);
    }
  };

  const step = (dt: number) => {
    time += dt;
    byEdge = new Map();
    for (const v of vehs) (byEdge.get(v.e) ?? byEdge.set(v.e, []).get(v.e)!).push(v);
    byEdge.forEach((l) => l.sort((a, b) => a.s - b.s));
    updateSignals(dt);
    const remove = new Set<Veh>();
    for (const v of vehs) {
      const e = edges[v.e];
      const list = byEdge.get(v.e)!;
      const lead = list[list.indexOf(v) + 1];
      let gap = 1e4, dv = 0;
      if (lead) { gap = lead.s - v.s - 4.8; dv = v.v - lead.v; }
      else if (v.next >= 0) {
        const nl = byEdge.get(v.next);
        if (nl && nl.length) { gap = e.len - v.s + nl[0].s - 4.8; dv = v.v - nl[0].v; }
      }
      const toEnd = e.len - v.s - 1.5;
      if (e.sig >= 0 && toEnd > 0.5 && toEnd < 90 && toEnd < gap && sigState(e) === 'r') { gap = toEnd; dv = v.v; }
      if (v.next >= 0 && edges[v.next].r && !e.r && toEnd < 30 && toEnd > 0.3 && toEnd < gap) {
        const nb = edges[v.next];
        // yield to moving circulating traffic about to pass the entry
        const busy = (inBy.get(nb.a) ?? []).some((i) => edges[i].r && (byEdge.get(i) ?? []).some((o) => o.v > 2 && edges[i].len - o.s < 12));
        if (busy) { gap = Math.max(0.1, toEnd); dv = v.v; }
      }
      const a = 1.6, b = 2.4, s0 = 2, T = 1.1;
      const sStar = s0 + Math.max(0, v.v * T + (v.v * dv) / (2 * Math.sqrt(a * b)));
      const acc = a * (1 - (v.v / v.v0) ** 4 - (sStar / Math.max(0.1, gap)) ** 2);
      v.v = Math.max(0, Math.min(v.v0, v.v + acc * dt));
      v.s += v.v * dt;
      // like Vissim's diffusion time: a vehicle stuck in spillback for a minute leaves the network
      v.wait = v.v < 0.3 ? v.wait + dt : 0;
      if (v.wait > 60) { remove.add(v); continue; }
      if (v.s >= e.len) {
        if (v.next < 0) { remove.add(v); continue; }
        v.s -= e.len; v.e = v.next; v.next = pickNext(edges[v.e]);
        v.v0 = edges[v.e].vmax * (0.85 + rnd() * 0.25);
      }
    }
    if (remove.size) vehs = vehs.filter((v) => !remove.has(v));
    for (let k = 0; k < 3 && vehs.length < demand; k++) spawn(entries[(rnd() * entries.length) | 0]);
  };

  return {
    edges,
    get vehs() { return vehs; },
    get time() { return time; },
    sigState,
    step,
    seed,
    setScenario(k: Scenario) { scn = k; sigs.forEach((s) => { s.green = 0; s.timer = 0; s.amber = 0; }); },
    setDemand(n: number) { demand = n; },
  };
}
export type Sim = ReturnType<typeof createSim>;
