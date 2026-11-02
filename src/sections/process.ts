import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { svgEl } from '../map/plates';
import { dms } from '../map/geo';
import { lang, onLang } from '../i18n';

// The process is drawn as a closed traverse: five stations, legs annotated
// with bearing and length (0.5 m per px of the drawing), closing back on ST-1.
export function initProcess(reduced: boolean) {
  const section = document.getElementById('procesi')!;
  const pin = section.querySelector<HTMLElement>('.process__pin')!;
  const track = document.getElementById('processTrack')!;
  const svg = document.getElementById('processSvg') as unknown as SVGSVGElement;
  const steps = [...track.querySelectorAll<HTMLElement>('.step')];
  let legs: SVGPathElement[] = [];
  let legLabels: SVGTextElement[] = [];
  let closeLeg: SVGPathElement | null = null;
  let closeTxt: SVGTextElement | null = null;
  const closeLabel = () => (lang() === 'sq' ? 'Mbyllja e poligonit, kthim në ST-1' : 'Traverse closure, back to ST-1');

  const build = () => {
    svg.replaceChildren();
    const w = track.scrollWidth, h = track.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    const pts = steps.map((s) => [s.offsetLeft + 20, s.offsetTop + s.parentElement!.offsetTop + 26] as [number, number]);
    legs = [];
    legLabels = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      // run level past the station's text, then turn in the gap toward the next station
      const turn = steps[i].offsetLeft + steps[i].offsetWidth + 16;
      const p = svgEl('path', { class: 'leg', d: `M${a[0] + 26} ${a[1]}H${turn}L${b[0] - 26} ${b[1]}` }, svg);
      legs.push(p);
      const brg = (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.5;
      const t = svgEl('text', { x: (a[0] + 60 + turn) / 2, y: a[1] - 9, 'text-anchor': 'middle' }, svg);
      t.textContent = `${dms((brg + 360) % 360)} · ${len.toFixed(2)} m`;
      legLabels.push(t);
    }
    // closing leg runs below the stations, back to the start
    const last = pts[pts.length - 1], first = pts[0];
    const yb = h - 18;
    closeLeg = svgEl('path', { class: 'leg-close', d: `M${last[0]} ${last[1] + 26}V${yb}H${first[0]}V${first[1] + 26}` }, svg);
    closeTxt = svgEl('text', { x: (first[0] + last[0]) / 2, y: yb - 8, 'text-anchor': 'middle' }, svg);
    closeTxt.textContent = closeLabel();
  };

  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    build();
    if (reduced) return;
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 40);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${dist() + window.innerHeight * 0.4}`, pin, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    tl.to(track, { x: () => -dist(), ease: 'none', duration: 1 }, 0);
    legs.forEach((l, i) => {
      const len = l.getTotalLength();
      tl.fromTo(l, { strokeDasharray: `0 ${len}` }, { strokeDasharray: `${len} 0`, ease: 'none', duration: 0.16 }, 0.04 + i * 0.19);
      tl.fromTo(legLabels[i], { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.1 + i * 0.19);
    });
    if (closeLeg) {
      const len = closeLeg.getTotalLength();
      tl.fromTo(closeLeg, { strokeDasharray: `0 ${len}` }, { strokeDasharray: `${len} 0`, ease: 'none', duration: 0.18 }, 0.82);
    }
    steps.forEach((s, i) => { if (i) tl.from(s, { opacity: 0.15, y: 24, duration: 0.08, ease: 'power2.out' }, i * 0.19 - 0.04); });
    return () => { gsap.set(track, { x: 0 }); };
  });
  mm.add('(max-width: 860px)', () => {
    if (reduced) return;
    steps.forEach((s) => gsap.from(s, { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 85%', once: true } }));
  });
  onLang(() => { if (closeTxt) closeTxt.textContent = closeLabel(); requestAnimationFrame(() => ScrollTrigger.refresh()); });
}
