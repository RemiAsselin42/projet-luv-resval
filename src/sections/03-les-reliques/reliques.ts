import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';
import { RELIQUES } from './data/reliques-data';
import { createParchmentShader } from './grimoire/parchmentShader';
import { createDustCanvas } from './grimoire/dustCanvas';
import { createTextReveal } from './grimoire/textReveal';
import { createObjectSelector } from './grimoire/objectSelector';

// ── SVG de la rune (symbole décoratif affiché sous l'objet sélectionné) ─────────
const RUNE_SVG = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="40" cy="40" r="36"/>
  <circle cx="40" cy="40" r="24"/>
  <path d="M40 4 L40 16 M40 64 L40 76 M4 40 L16 40 M64 40 L76 40"/>
  <path d="M17 17 L25 25 M55 55 L63 63 M17 63 L25 55 M55 25 L63 17"/>
  <circle cx="40" cy="40" r="4"/>
</svg>`;

// ── SVG ornemental (en-tête et pied de la page droite du grimoire) ───────────
const ORNAMENT_SVG = `<svg viewBox="0 0 200 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M0 10 Q50 2 100 10 Q150 18 200 10"/>
  <circle cx="100" cy="10" r="3"/>
  <circle cx="60" cy="8" r="1.5"/>
  <circle cx="140" cy="12" r="1.5"/>
  <path d="M10 10 L30 5 M170 10 L190 15"/>
</svg>`;

// ── Construction du DOM ───────────────────────────────────────────────────────
const buildGrimoireDom = (): HTMLElement => {
  const grimoire = document.createElement('div');
  grimoire.className = 'grimoire';
  grimoire.setAttribute('role', 'region');
  grimoire.setAttribute('aria-label', 'Grimoire des Reliques');

  // Voile de bougie (animé par GSAP)
  const candleOverlay = document.createElement('div');
  candleOverlay.className = 'grimoire__candle-overlay';
  grimoire.appendChild(candleOverlay);

  // Book
  const book = document.createElement('div');
  book.className = 'grimoire__book';

  // ── Left page ──
  const leftPage = document.createElement('div');
  leftPage.className = 'grimoire__page grimoire__page--left';

  const objectsGrid = document.createElement('div');
  objectsGrid.className = 'grimoire__objects-grid';
  objectsGrid.setAttribute('role', 'listbox');
  objectsGrid.setAttribute('aria-label', 'Choisir un objet');

  RELIQUES.forEach((relique, index) => {
    const slot = document.createElement('div');
    slot.className = 'grimoire__object-slot';
    slot.setAttribute('role', 'option');
    slot.setAttribute('aria-selected', 'false');
    slot.setAttribute('tabindex', index === 0 ? '0' : '-1');
    slot.setAttribute('data-relique-id', relique.id);
    slot.setAttribute('aria-label', relique.name);

    const runeEl = document.createElement('div');
    runeEl.className = 'grimoire__rune';
    runeEl.innerHTML = RUNE_SVG;

    const svgWrapper = document.createElement('svg');
    svgWrapper.setAttribute('viewBox', '0 0 120 120');
    svgWrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgWrapper.setAttribute('aria-hidden', 'true');
    svgWrapper.innerHTML = relique.svgPaths;

    const nameEl = document.createElement('span');
    nameEl.className = 'grimoire__object-name';
    nameEl.textContent = relique.name;

    slot.appendChild(runeEl);
    slot.appendChild(svgWrapper);
    slot.appendChild(nameEl);
    objectsGrid.appendChild(slot);
  });

  leftPage.appendChild(objectsGrid);
  leftPage.insertAdjacentHTML('beforeend', '<div class="grimoire__page-footer">I</div>');

  // ── Spine ──
  const spine = document.createElement('div');
  spine.className = 'grimoire__spine';
  spine.setAttribute('aria-hidden', 'true');

  // ── Right page ──
  const rightPage = document.createElement('div');
  rightPage.className = 'grimoire__page grimoire__page--right';

  const topOrnament = document.createElement('div');
  topOrnament.className = 'grimoire__page-ornament';
  topOrnament.innerHTML = ORNAMENT_SVG;

  const textContent = document.createElement('div');
  textContent.className = 'grimoire__text-content';

  const titleEl = document.createElement('h2');
  titleEl.className = 'grimoire__text-title';
  titleEl.textContent = RELIQUES[0]?.name ?? '';

  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'grimoire__text-subtitle';
  subtitleEl.textContent = RELIQUES[0]?.subtitle ?? '';

  const bodyEl = document.createElement('div');
  bodyEl.className = 'grimoire__text-body';
  bodyEl.innerHTML = RELIQUES[0]?.description ?? '';

  textContent.appendChild(titleEl);
  textContent.appendChild(subtitleEl);
  textContent.appendChild(bodyEl);

  const bottomOrnament = document.createElement('div');
  bottomOrnament.className = 'grimoire__page-ornament';
  bottomOrnament.innerHTML = ORNAMENT_SVG;

  rightPage.appendChild(topOrnament);
  rightPage.appendChild(textContent);
  rightPage.appendChild(bottomOrnament);
  rightPage.insertAdjacentHTML('beforeend', '<div class="grimoire__page-footer">II</div>');

  book.appendChild(leftPage);
  book.appendChild(spine);
  book.appendChild(rightPage);
  grimoire.appendChild(book);

  return grimoire;
};

// ── Animation de scintillement de bougie ──────────────────────────────────────
const startCandleFlicker = (overlayEl: HTMLElement): gsap.core.Tween => {
  // Anime le voile avec des variations légères de taille et de position
  return gsap.to(overlayEl, {
    scale: 1.06,
    x: '+=4',
    y: '-=3',
    opacity: 0.8,
    duration: 2.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    repeatRefresh: true, // à chaque répétition, recalcule les deltas aléatoires via les modifiers
    modifiers: {
      x: () => `${(Math.random() - 0.5) * 8}px`,
      y: () => `${(Math.random() - 0.5) * 6}px`,
      scale: () => `${1 + (Math.random() - 0.5) * 0.08}`,
    },
  });
};

// ── Animation d'entrée (tournage de page) ────────────────────────────────────
const playPageTurnEntry = (rightPage: HTMLElement): Promise<void> => {
  return new Promise((resolve) => {
    rightPage.classList.add('is-page-turn');
    gsap.fromTo(
      rightPage,
      { rotateY: -95, opacity: 0.2 },
      {
        rotateY: -3, // final resting angle (matches CSS default)
        opacity: 1,
        duration: 1.4,
        ease: 'power3.out',
        onComplete: () => {
          rightPage.classList.remove('is-page-turn');
          resolve();
        },
      },
    );
  });
};

// ── Initialisation de la section ─────────────────────────────────────────────
const initThematicObjectsSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector(getSectionSelector(SECTION_IDS.RELIQUES));
  if (!(sectionElement instanceof HTMLElement)) {
    return {
      update: () => undefined,
      dispose: () => undefined,
    };
  }

  // Construction et insertion du DOM
  const grimoire = buildGrimoireDom();
  sectionElement.appendChild(grimoire);

  const grimoireBook = grimoire.querySelector<HTMLElement>('.grimoire__book')!;
  const rightPage = grimoire.querySelector<HTMLElement>('.grimoire__page--right')!;
  const objectsGrid = grimoire.querySelector<HTMLElement>('.grimoire__objects-grid')!;
  const titleEl = grimoire.querySelector<HTMLElement>('.grimoire__text-title')!;
  const subtitleEl = grimoire.querySelector<HTMLElement>('.grimoire__text-subtitle')!;
  const bodyEl = grimoire.querySelector<HTMLElement>('.grimoire__text-body')!;
  const candleOverlay = grimoire.querySelector<HTMLElement>('.grimoire__candle-overlay')!;

  // ── Parchment shader (WebGL, rendered to canvas inside grimoire) ──
  const parchment = createParchmentShader({ x: 0.5, y: 0.5 });
  parchment.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;border-radius:inherit;';
  grimoireBook.style.position = 'relative';
  grimoireBook.insertBefore(parchment.canvas, grimoireBook.firstChild);

  // ── Dust canvas ──
  const dust = createDustCanvas(sectionElement);
  dust.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:20;pointer-events:none;';
  grimoire.style.position = 'relative';
  grimoire.appendChild(dust.canvas);

  // ── Text reveal ──
  const textReveal = createTextReveal(titleEl, subtitleEl, bodyEl);

  // ── Object selector ──
  const selector = createObjectSelector(objectsGrid, RELIQUES, (relique) => {
    textReveal.reveal(relique);
  });

  // ── Candle flicker ──
  const candleTween = startCandleFlicker(candleOverlay);

  // ── Animations d'entrée ──
  // Fondu + remontée du grimoire depuis le bas
  gsap.fromTo(
    grimoireBook,
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' },
  );

  // Tournage de la page droite à l'entrée
  playPageTurnEntry(rightPage);

  // Sélectionne le premier objet une fois les animations d'entrée terminées
  const initTimer = setTimeout(() => {
    selector.selectById(RELIQUES[0]?.id ?? '');
  }, 600);

  // ── Synchronisation du shader parchemin au redimensionnement ──
  const resizeObserver = new ResizeObserver(() => {
    const w = grimoireBook.offsetWidth;
    const h = grimoireBook.offsetHeight;
    if (w > 0 && h > 0) parchment.resize(w, h);
  });
  resizeObserver.observe(grimoireBook);

  return {
    update: (deltaSeconds: number, elapsedSeconds: number) => {
      parchment.update(elapsedSeconds);
      dust.update(deltaSeconds);
    },
    dispose: () => {
      clearTimeout(initTimer);
      candleTween.kill();
      selector.dispose();
      textReveal.dispose();
      parchment.dispose();
      dust.dispose();
      resizeObserver.disconnect();
      grimoire.remove();
    },
  };
};

export default initThematicObjectsSection;
