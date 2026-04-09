import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import * as THREE from 'three';
import { createError403Canvas, BTN_LAYOUT } from './eclipse403Canvas';

describe('BTN_LAYOUT', () => {
  it('expose les ratios des boutons comme source unique de vérité', () => {
    expect(BTN_LAYOUT).toHaveProperty('restartXRatio');
    expect(BTN_LAYOUT).toHaveProperty('seeMoreXRatio');
    expect(BTN_LAYOUT).toHaveProperty('yRatio');
    expect(BTN_LAYOUT).toHaveProperty('centered');
  });

  it('les ratios X sont dans [0, 1]', () => {
    expect(BTN_LAYOUT.restartXRatio).toBeGreaterThanOrEqual(0);
    expect(BTN_LAYOUT.restartXRatio).toBeLessThanOrEqual(1);
    expect(BTN_LAYOUT.seeMoreXRatio).toBeGreaterThanOrEqual(0);
    expect(BTN_LAYOUT.seeMoreXRatio).toBeLessThanOrEqual(1);
  });

  it('le ratio Y est dans [0, 1]', () => {
    expect(BTN_LAYOUT.yRatio).toBeGreaterThanOrEqual(0);
    expect(BTN_LAYOUT.yRatio).toBeLessThanOrEqual(1);
  });

  it('restart est à gauche de seeMore', () => {
    expect(BTN_LAYOUT.restartXRatio).toBeLessThan(BTN_LAYOUT.seeMoreXRatio);
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
//
// createError403Canvas utilise setInterval pour le typewriter et le blink.
// Pour tester de manière fiable dans jsdom, on spy setInterval/clearInterval
// et on récupère les callbacks pour les invoquer manuellement, ce qui évite
// les incohérences de vi.useFakeTimers() avec le thread jsdom.

/** Avance manuellement N ticks de l'intervalle de frappe (35 ms chacun). */
const advanceTyping = (
  spy: MockInstance,
  ticks: number,
): void => {
  // Le callback du typing est le premier setInterval enregistré après start()
  const call = (spy.mock.calls as unknown[][]).find(([, delay]) => delay === 35);
  if (!call) return;
  const cb = call[0] as () => void;
  for (let i = 0; i < ticks; i++) cb();
};

describe('createError403Canvas', () => {
  let canvas403: ReturnType<typeof createError403Canvas>;
  let setIntervalSpy: MockInstance;

  beforeEach(() => {
    setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    canvas403 = createError403Canvas();
  });

  afterEach(() => {
    canvas403.stop();
    canvas403.texture.dispose();
    vi.restoreAllMocks();
  });

  it('retourne texture, start, stop, reset, setHovered', () => {
    expect(canvas403.texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(typeof canvas403.start).toBe('function');
    expect(typeof canvas403.stop).toBe('function');
    expect(typeof canvas403.reset).toBe('function');
    expect(typeof canvas403.setHovered).toBe('function');
  });

  it('la texture est une CanvasTexture Three.js', () => {
    expect(canvas403.texture).toBeInstanceOf(THREE.CanvasTexture);
  });

  it('start() enregistre un setInterval (typewriter)', () => {
    canvas403.start();
    // Au moins un setInterval doit avoir été enregistré après start()
    expect(setIntervalSpy).toHaveBeenCalled();
  });

  it('start() appelle onComplete après la frappe de tous les caractères', () => {
    const onComplete = vi.fn();
    canvas403.start(onComplete);

    // TOTAL_CHARS = 18 + 9 + 13 = 40, chaque tick frappe 1 char
    advanceTyping(setIntervalSpy, 41); // 40 chars + 1 tick de complétion

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('start() sans callback ne lève pas d\'erreur', () => {
    expect(() => {
      canvas403.start();
      advanceTyping(setIntervalSpy, 41);
    }).not.toThrow();
  });

  it('stop() nettoie les intervalles sans erreur', () => {
    canvas403.start();
    expect(() => canvas403.stop()).not.toThrow();
  });

  it('stop() peut être appelé plusieurs fois sans erreur', () => {
    canvas403.start();
    canvas403.stop();
    expect(() => canvas403.stop()).not.toThrow();
  });

  it('reset() repart d\'un état vide après complétion', () => {
    const onComplete = vi.fn();
    canvas403.start(onComplete);
    advanceTyping(setIntervalSpy, 41);
    expect(onComplete).toHaveBeenCalledOnce();

    canvas403.reset();

    // Après reset, un nouveau start peut rappeler un nouveau onComplete
    const onComplete2 = vi.fn();
    setIntervalSpy.mockClear();
    canvas403.start(onComplete2);
    advanceTyping(setIntervalSpy, 41);

    expect(onComplete2).toHaveBeenCalledOnce();
    // L'ancien callback ne doit pas avoir été rappelé
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('setHovered() ne fait rien avant que le texte soit complet', () => {
    // Avant le typewriter, setHovered doit être un no-op
    const versionBefore = canvas403.texture.version;
    canvas403.setHovered('restart');
    // La texture ne doit pas avoir été mise à jour
    expect(canvas403.texture.version).toBe(versionBefore);
  });

  it('setHovered() met à jour la texture après la complétion du texte', () => {
    canvas403.start();
    advanceTyping(setIntervalSpy, 41); // amène textComplete = true

    const versionAfterComplete = canvas403.texture.version;
    canvas403.setHovered('restart');

    expect(canvas403.texture.version).toBeGreaterThan(versionAfterComplete);
  });

  it('setHovered() ne re-dessine pas si le même bouton est déjà hovered', () => {
    canvas403.start();
    advanceTyping(setIntervalSpy, 41);

    canvas403.setHovered('restart');
    const versionAfterFirstHover = canvas403.texture.version;

    // Même valeur → pas de redraw
    canvas403.setHovered('restart');
    expect(canvas403.texture.version).toBe(versionAfterFirstHover);
  });

  it('setHovered(null) enlève le hover et redessine', () => {
    canvas403.start();
    advanceTyping(setIntervalSpy, 41);

    canvas403.setHovered('see-more');
    const versionWithHover = canvas403.texture.version;

    canvas403.setHovered(null);
    expect(canvas403.texture.version).toBeGreaterThan(versionWithHover);
  });

  it('le clignotement du curseur enregistre un second setInterval', () => {
    const beforeCount = setIntervalSpy.mock.calls.length;
    canvas403.start();
    advanceTyping(setIntervalSpy, 41); // déclenche la fin du typewriter → blink interval

    const afterCount = setIntervalSpy.mock.calls.length;
    // Le blink interval (500ms) doit s'être ajouté
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it('reset() arrête le clignotement (clearInterval appelé)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    canvas403.start();
    advanceTyping(setIntervalSpy, 41);

    canvas403.reset();
    expect(clearSpy).toHaveBeenCalled();
  });
});
