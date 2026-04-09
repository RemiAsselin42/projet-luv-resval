import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEclipseOverlay } from './eclipseOverlay';
import type { BtnLayout } from './eclipse403Canvas';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BTN_LAYOUT: BtnLayout = {
  restartXRatio: 0.3,
  seeMoreXRatio: 0.7,
  yRatio: 0.88,
  centered: true,
};

const makeScrollManager = () => ({
  start: vi.fn(),
  scrollToSection: vi.fn(),
  stop: vi.fn(),
  lock: vi.fn(),
  refresh: vi.fn(),
  getScrollY: vi.fn(() => 0),
  registerSection: vi.fn(),
  unregisterSection: vi.fn(),
  update: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
  createTrigger: vi.fn(),
  createSectionTimeline: vi.fn(() => null),
  dispose: vi.fn(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createEclipseOverlay', () => {
  let scrollManager: ReturnType<typeof makeScrollManager>;
  let onHoverChange: ReturnType<typeof vi.fn>;
  let onRestart: ReturnType<typeof vi.fn>;
  let overlay: ReturnType<typeof createEclipseOverlay>;

  beforeEach(() => {
    scrollManager = makeScrollManager();
    onHoverChange = vi.fn();
    onRestart = vi.fn();
    overlay = createEclipseOverlay(scrollManager, onHoverChange, BTN_LAYOUT, onRestart);
  });

  afterEach(() => {
    overlay.dispose();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ── Structure DOM ───────────────────────────────────────────────────────────

  it('ajoute un container .eclipse-overlay au document.body', () => {
    const container = document.body.querySelector('.eclipse-overlay');
    expect(container).not.toBeNull();
  });

  it('crée deux boutons dans le container', () => {
    const btns = document.body.querySelectorAll('.eclipse-overlay__btn');
    expect(btns).toHaveLength(2);
  });

  it('le premier bouton contient le label [RESTART]', () => {
    const btns = document.body.querySelectorAll('.eclipse-overlay__btn');
    expect(btns[0]?.textContent).toBe('[RESTART]');
  });

  it('le second bouton contient le label [SEE MORE]', () => {
    const btns = document.body.querySelectorAll('.eclipse-overlay__btn');
    expect(btns[1]?.textContent).toBe('[SEE MORE]');
  });

  it('les boutons sont initialement non-tabulables (tabIndex = -1)', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns.forEach((btn) => expect(btn.tabIndex).toBe(-1));
  });

  // ── show() ──────────────────────────────────────────────────────────────────

  it('show() ajoute la classe is-visible au container', () => {
    overlay.show();
    const container = document.body.querySelector('.eclipse-overlay');
    expect(container?.classList.contains('is-visible')).toBe(true);
  });

  it('show() rend les boutons tabulables (tabIndex = 0)', () => {
    overlay.show();
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns.forEach((btn) => expect(btn.tabIndex).toBe(0));
  });

  // ── hide() ──────────────────────────────────────────────────────────────────

  it('hide() supprime la classe is-visible du container', () => {
    overlay.show();
    overlay.hide();
    const container = document.body.querySelector('.eclipse-overlay');
    expect(container?.classList.contains('is-visible')).toBe(false);
  });

  it('hide() remet les boutons non-tabulables (tabIndex = -1)', () => {
    overlay.show();
    overlay.hide();
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns.forEach((btn) => expect(btn.tabIndex).toBe(-1));
  });

  // ── dispose() ───────────────────────────────────────────────────────────────

  it('dispose() supprime le container du DOM', () => {
    overlay.dispose();
    const container = document.body.querySelector('.eclipse-overlay');
    expect(container).toBeNull();
  });

  // ── Hover callbacks ──────────────────────────────────────────────────────────

  it('mouseenter sur [RESTART] appelle onHoverChange("restart")', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[0]?.dispatchEvent(new MouseEvent('mouseenter'));
    expect(onHoverChange).toHaveBeenCalledWith('restart');
  });

  it('mouseenter sur [SEE MORE] appelle onHoverChange("see-more")', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[1]?.dispatchEvent(new MouseEvent('mouseenter'));
    expect(onHoverChange).toHaveBeenCalledWith('see-more');
  });

  it('mouseleave sur un bouton appelle onHoverChange(null)', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[0]?.dispatchEvent(new MouseEvent('mouseleave'));
    expect(onHoverChange).toHaveBeenCalledWith(null);
  });

  it('focus sur [RESTART] appelle onHoverChange("restart")', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[0]?.dispatchEvent(new FocusEvent('focus'));
    expect(onHoverChange).toHaveBeenCalledWith('restart');
  });

  it('focus sur [SEE MORE] appelle onHoverChange("see-more")', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[1]?.dispatchEvent(new FocusEvent('focus'));
    expect(onHoverChange).toHaveBeenCalledWith('see-more');
  });

  it('blur sur un bouton appelle onHoverChange(null)', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[0]?.dispatchEvent(new FocusEvent('blur'));
    expect(onHoverChange).toHaveBeenCalledWith(null);
  });

  // ── Click [RESTART] ──────────────────────────────────────────────────────────

  it('click sur [RESTART] appelle onRestart()', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[0]?.dispatchEvent(new MouseEvent('click'));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('click sur [RESTART] appelle scrollManager.start() puis scrollManager.scrollToSection()', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[0]?.dispatchEvent(new MouseEvent('click'));
    expect(scrollManager.start).toHaveBeenCalledOnce();
    expect(scrollManager.scrollToSection).toHaveBeenCalledOnce();
  });

  it('click sur [RESTART] cache l\'overlay (retire is-visible)', () => {
    overlay.show();
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns[0]?.dispatchEvent(new MouseEvent('click'));
    const container = document.body.querySelector('.eclipse-overlay');
    expect(container?.classList.contains('is-visible')).toBe(false);
  });

  // ── onRestart optionnel ──────────────────────────────────────────────────────

  it('click sur [RESTART] sans onRestart ne lève pas d\'erreur', () => {
    const overlayNoRestart = createEclipseOverlay(scrollManager, onHoverChange, BTN_LAYOUT);
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    expect(() => btns[0]?.dispatchEvent(new MouseEvent('click'))).not.toThrow();
    overlayNoRestart.dispose();
  });

  // ── Positionnement ───────────────────────────────────────────────────────────

  it('les boutons sont positionnés en fixed', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns.forEach((btn) => expect(btn.style.position).toBe('fixed'));
  });

  it('le bouton [RESTART] est placé à left: 30% (BTN_LAYOUT.restartXRatio = 0.3)', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    expect(btns[0]?.style.left).toBe('30%');
  });

  it('le bouton [SEE MORE] est placé à left: 70% (BTN_LAYOUT.seeMoreXRatio = 0.7)', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    expect(btns[1]?.style.left).toBe('70%');
  });

  it('centered=true applique transform translateX(-50%) sur les boutons', () => {
    const btns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    btns.forEach((btn) => expect(btn.style.transform).toBe('translateX(-50%)'));
  });

  it('centered=false n\'applique pas de transform translateX', () => {
    const nonCenteredLayout: BtnLayout = { ...BTN_LAYOUT, centered: false };
    const overlayNC = createEclipseOverlay(scrollManager, onHoverChange, nonCenteredLayout);
    // Tous les boutons ajoutés au DOM (les anciens + les nouveaux)
    const allBtns = document.body.querySelectorAll<HTMLButtonElement>('.eclipse-overlay__btn');
    // Prendre les 2 derniers (ceux du nouvel overlay)
    const lastTwo = Array.from(allBtns).slice(-2);
    lastTwo.forEach((btn) => expect(btn.style.transform).not.toBe('translateX(-50%)'));
    overlayNC.dispose();
  });
});
