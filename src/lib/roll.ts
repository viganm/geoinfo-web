// Instrument-display update: each digit settles in its own fixed cell,
// left to right, the way a total station resolves a reading.
const running = new WeakMap<HTMLElement, number>();

export function roll(el: HTMLElement, target: string, duration = 700, reduced = false) {
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (reduced) { el.textContent = target; return; }
  const start = performance.now();
  const chars = [...target];
  const digitIdx = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
  const settle = new Map<number, number>();
  digitIdx.forEach((i, k) => settle.set(i, 0.25 + 0.75 * (k / Math.max(1, digitIdx.length - 1))));
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const s = settle.get(i);
      out += s === undefined || p >= s ? chars[i] : String((Math.random() * 10) | 0);
    }
    el.textContent = out;
    if (p < 1) running.set(el, requestAnimationFrame(tick));
    else running.delete(el);
  };
  running.set(el, requestAnimationFrame(tick));
}
