import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { initI18n, onLang, t } from './i18n';
import { initSheet } from './map/sheet';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.toggle('rm', reduced);

initI18n();

/* ---------------- smooth scroll ---------------- */
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: { offset: -60 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------- top margin: condense, hide on scroll down ---------------- */
const topbar = document.getElementById('topbar')!;
// Smooth scrolling eases out in tiny steps, so the bar reacts to distance travelled in one
// direction (hide after 64px down, show after 40px up), never to a single scroll event.
let lastY = window.scrollY, travel = 0, hidden = false, ticking = false;
const setHidden = (h: boolean) => { if (h !== hidden) { hidden = h; topbar.classList.toggle('is-hidden', h); } };
const onScroll = () => {
  ticking = false;
  const y = window.scrollY, d = y - lastY;
  lastY = y;
  topbar.classList.toggle('is-scrolled', y > 8);
  if (document.body.classList.contains('menu-open') || y < window.innerHeight * 0.6) { travel = 0; setHidden(false); return; }
  if (!d) return;
  if (Math.sign(d) !== Math.sign(travel)) travel = 0;
  travel += d;
  if (travel > 64) setHidden(true);
  else if (travel < -40) setHidden(false);
};
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
// keyboard focus inside the bar always brings it back
topbar.addEventListener('focusin', () => { travel = 0; setHidden(false); });

/* ---------------- section spy for the index ---------------- */
const spyLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-spy]')];
spyLinks.forEach((a) => {
  const sec = document.getElementById(a.dataset.spy!);
  if (!sec) return;
  ScrollTrigger.create({
    trigger: sec, start: 'top 45%', end: 'bottom 45%',
    onToggle: (s) => a.classList.toggle('is-active', s.isActive),
  });
});

/* ---------------- mobile menu ---------------- */
const menuBtn = document.querySelector<HTMLButtonElement>('.menu-btn')!;
const menu = document.getElementById('menu')!;
const setMenu = (open: boolean) => {
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', t(open ? 'menu.close' : 'menu.open'));
  document.body.classList.toggle('menu-open', open);
  if (open) {
    menu.hidden = false;
    lenis?.stop();
    gsap.fromTo(menu.querySelectorAll('li, .menu__phone'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.04, ease: 'expo.out' });
  } else {
    menu.hidden = true;
    lenis?.start();
  }
};
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setMenu(false); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

/* ---------------- hero ---------------- */
initSheet(reduced);

if (!reduced) {
  const lines = document.querySelectorAll('.hero__title .line > span');
  gsap.fromTo(lines, { yPercent: 112 }, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.09, delay: 0.35 });
  gsap.fromTo('.hero__lede, .hero__actions', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.75 });
  gsap.fromTo('.readout', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', delay: 1.35 });
  gsap.fromTo('.measure-hint, .sheet__foot > *', { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.06, delay: 1.5 });
  // the sheet recedes as the page is unrolled
  gsap.to('#heroMap', { scale: 1.06, yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__copy', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ---------------- lazy sections ---------------- */
const lazy = (sel: string, load: () => Promise<unknown>) => {
  const el = document.querySelector(sel);
  if (!el) return;
  let started = false;
  const go = () => { if (started) return; started = true; io.disconnect(); load(); };
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) go(); }, { rootMargin: '120% 0px' });
  io.observe(el);
  // prefetch once the page has settled, so a fast jump never lands on an empty section
  window.addEventListener('load', () => setTimeout(go, 2500), { once: true });
};
lazy('#sherbimet', () => import('./sections/legend').then((m) => m.initLegend(reduced)));
lazy('#procesi', () => import('./sections/process').then((m) => m.initProcess(reduced)));
lazy('#trafiku', () => import('./sections/sim').then((m) => m.initSim(reduced)));
lazy('#arkitekture', () => import('./sections/axo').then((m) => m.initAxo(reduced)));
import('./sections/contact').then((m) => m.initContact());

/* ---------------- headings and reveals ---------------- */
if (!reduced) {
  const splitReveal = (el: HTMLElement) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln' });
    gsap.from(split.lines, {
      yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
    return split;
  };
  let splits: SplitText[] = [];
  const runSplits = () => {
    splits.forEach((s) => s.revert());
    splits = [...document.querySelectorAll<HTMLElement>('.h-section, .intro__statement')].map(splitReveal);
  };
  document.fonts.ready.then(runSplits);
  // new copy replaces the split markup; drop the stale instances without reverting
  onLang(() => { splits = []; ScrollTrigger.refresh(); });

  gsap.utils.toArray<HTMLElement>('.value').forEach((v, i) => {
    gsap.from(v, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', delay: i * 0.08, scrollTrigger: { trigger: '.traverse', start: 'top 72%', once: true } });
    gsap.from(v.querySelector('.value__pt'), { scale: 0, rotate: -90, duration: 0.8, ease: 'back.out(2.2)', delay: 0.15 + i * 0.12, scrollTrigger: { trigger: '.traverse', start: 'top 72%', once: true } });
  });

  gsap.from('.ptv', { clipPath: 'inset(0 100% 0 0)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: '.ptv', start: 'top 82%', once: true } });
  gsap.from('.ptv__tri, .ptv__dot', { scale: 0, rotate: -90, transformOrigin: '50% 60%', duration: 0.8, ease: 'back.out(2)', delay: 0.8, stagger: 0.1, scrollTrigger: { trigger: '.ptv', start: 'top 82%', once: true } });
  gsap.from('.footer__sign', { yPercent: 30, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true } });
}

// values: a traverse strung through the three control points, legs annotated
const travSvg = document.getElementById('travSvg') as unknown as SVGSVGElement | null;
const trav = document.querySelector('.traverse') as HTMLElement | null;
if (travSvg && trav) {
  const NSS = 'http://www.w3.org/2000/svg';
  let tween: gsap.core.Tween | null = null;
  const buildTrav = () => {
    travSvg.replaceChildren();
    if (window.innerWidth <= 860) return;
    const r0 = trav.getBoundingClientRect();
    const pts = [...trav.querySelectorAll('.value__pt')].map((el) => { const r = el.getBoundingClientRect(); return [r.left - r0.left + r.width / 2, r.top - r0.top + r.height * 0.6]; });
    const path = document.createElementNS(NSS, 'path');
    path.setAttribute('d', `M${pts.map((p) => p.join(' ')).join('L')}`);
    travSvg.appendChild(path);
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      const brg = ((Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI + 360) % 360;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 9;
      const tx = document.createElementNS(NSS, 'text');
      tx.setAttribute('x', String(mx)); tx.setAttribute('y', String(my)); tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('transform', `rotate(${ang.toFixed(2)} ${mx} ${my})`);
      const d = Math.floor(brg), m = Math.round((brg - d) * 60);
      tx.textContent = `${String(d).padStart(3, '0')}°${String(m).padStart(2, '0')}′ · ${(Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.25).toFixed(2)} m`;
      travSvg.appendChild(tx);
    }
    const len = path.getTotalLength();
    const labels = travSvg.querySelectorAll('text');
    tween?.scrollTrigger?.kill(); tween?.kill();
    if (reduced) return;
    tween = gsap.fromTo(path, { strokeDasharray: `0 ${len}` }, {
      strokeDasharray: `${len} 0`, ease: 'none',
      scrollTrigger: { trigger: trav, start: 'top 78%', end: 'top 35%', scrub: 0.6 },
      onUpdate() { const p = this.progress(); labels.forEach((l, i) => { l.style.opacity = String(gsap.utils.clamp(0, 1, (p - 0.3 - i * 0.4) * 4)); }); },
    });
  };
  document.fonts.ready.then(buildTrav);
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(buildTrav, 200); });
  onLang(() => requestAnimationFrame(buildTrav));
}

document.getElementById('year')!.textContent = String(new Date().getFullYear());
