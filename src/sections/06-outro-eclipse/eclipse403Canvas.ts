import * as THREE from 'three';

const CANVAS_W = 1024;
const CANVAS_H = 576;

const WHITE = '#ffffff';
const WHITE_DIM = '#d9d9d9';
const BLINK_INTERVAL_MS = 500;
const CHAR_INTERVAL_MS = 35;

// true → texte centré ; false → ferré à gauche
const TEXT_CENTERED = true;
const TEXT_X = TEXT_CENTERED ? CANVAS_W / 2 : CANVAS_W * 0.1;

// Positions des boutons sur le canvas (ratios 0-1, source unique de vérité)
const BTN_RESTART_X_RATIO = TEXT_CENTERED ? 0.3 : 0.1;
const BTN_SEE_MORE_X_RATIO = TEXT_CENTERED ? 0.7 : 0.55;
const BTN_Y_RATIO = 0.88; // depuis le haut du canvas

const LINES: readonly [string, string, string] = [
  '> SIGNAL CORRUPTED',
  'ERROR 403',
  'ACCESS DENIED',
];

const TOTAL_CHARS = LINES.reduce((sum, l) => sum + l.length, 0);

/**
 * Crée un canvas 2D affichant un faux écran d'erreur terminal CRT (403).
 * - start(onComplete?) : lance l'écriture lettre par lettre, appelle onComplete à la fin
 * - stop()             : nettoie les intervalles
 * - setHovered()       : met en surbrillance un bouton (effet hover depuis l'overlay HTML)
 */
export interface BtnLayout {
  restartXRatio: number;
  seeMoreXRatio: number;
  yRatio: number;   // depuis le haut du canvas (0-1)
  centered: boolean;
}

export const BTN_LAYOUT: BtnLayout = {
  restartXRatio: BTN_RESTART_X_RATIO,
  seeMoreXRatio: BTN_SEE_MORE_X_RATIO,
  yRatio: BTN_Y_RATIO,
  centered: TEXT_CENTERED,
};

export const createError403Canvas = (): {
  texture: THREE.CanvasTexture;
  start: (onComplete?: () => void) => void;
  stop: () => void;
  reset: () => void;
  setHovered: (which: 'restart' | 'see-more' | null) => void;
} => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);

  let blinkVisible = true;
  let charsToShow = 0;
  let textComplete = false;
  let hoveredButton: 'restart' | 'see-more' | null = null;
  let blinkIntervalId: ReturnType<typeof setInterval> | null = null;
  let typingIntervalId: ReturnType<typeof setInterval> | null = null;

  // Dessine un bouton avec fond blanc inversé si hovered.
  // Le rect tient compte de textAlign : centré → ancre au milieu, gauche → ancre à gauche.
  const drawBtn = (label: string, x: number, y: number, hovered: boolean, fontSize: number) => {
    ctx.font = `500 ${fontSize}px 'Futura-Medium'`;
    if (hovered) {
      const w = ctx.measureText(label).width;
      const pad = 8;
      const rectX = TEXT_CENTERED ? x - w / 2 - pad : x - pad;
      ctx.fillStyle = WHITE;
      ctx.fillRect(rectX, y - fontSize + 2, w + pad * 2, fontSize + pad);
      ctx.fillStyle = '#000000';
    } else {
      ctx.fillStyle = WHITE;
    }
    ctx.fillText(label, x, y);
  };

  const draw = () => {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = TEXT_CENTERED ? 'center' : 'left';
    const lineH = CANVAS_H / 10;
    let y = CANVAS_H * 0.16;
    let rem = charsToShow;

    // Ligne 0 : > SIGNAL CORRUPTED
    ctx.font = `500 ${Math.round(lineH * 0.55)}px 'Futura-Medium'`;
    ctx.fillStyle = WHITE_DIM;
    ctx.fillText(LINES[0].slice(0, Math.min(rem, LINES[0].length)), TEXT_X, y);
    rem = Math.max(0, rem - LINES[0].length);
    y += lineH * 1.1;

    // Ligne 1 : ERROR 403
    ctx.font = `500 ${Math.round(lineH * 0.35)}px 'Futura-Medium'`;
    ctx.fillStyle = WHITE_DIM;
    ctx.fillText(LINES[1].slice(0, Math.min(rem, LINES[1].length)), TEXT_X, y);
    rem = Math.max(0, rem - LINES[1].length);
    y += lineH * 1.2;

    // Ligne 2 : ACCESS DENIED
    ctx.font = `500 ${Math.round(lineH * 1.1)}px 'Futura-Medium'`;
    ctx.fillStyle = WHITE;
    ctx.fillText(LINES[2].slice(0, Math.min(rem, LINES[2].length)), TEXT_X, y);
    rem = Math.max(0, rem - LINES[2].length);
    y += lineH * 1.3;

    // Curseur clignotant (apparaît uniquement après la fin du typewriter)
    if (textComplete && blinkVisible) {
      ctx.font = `500 ${Math.round(lineH * 0.45)}px 'Futura-Medium'`;
      ctx.fillStyle = WHITE;
      ctx.fillText('_', TEXT_X, y);
    }

    // Boutons (apparaissent uniquement après la fin du typewriter)
    if (textComplete) {
      const btnFontSize = Math.round(lineH * 0.55);
      const btnY = CANVAS_H * BTN_Y_RATIO;
      drawBtn(
        '[RESTART]',
        CANVAS_W * BTN_RESTART_X_RATIO,
        btnY,
        hoveredButton === 'restart',
        btnFontSize,
      );
      drawBtn(
        '[SEE MORE]',
        CANVAS_W * BTN_SEE_MORE_X_RATIO,
        btnY,
        hoveredButton === 'see-more',
        btnFontSize,
      );
    }

    texture.needsUpdate = true;
  };

  // Frame initiale vide
  draw();

  const start = (onComplete?: () => void) => {
    typingIntervalId = setInterval(() => {
      if (charsToShow < TOTAL_CHARS) {
        charsToShow++;
        draw();
      } else {
        if (typingIntervalId !== null) {
          clearInterval(typingIntervalId);
          typingIntervalId = null;
        }
        textComplete = true;
        onComplete?.();
        draw();
        blinkIntervalId = setInterval(() => {
          blinkVisible = !blinkVisible;
          draw();
        }, BLINK_INTERVAL_MS);
      }
    }, CHAR_INTERVAL_MS);
  };

  const stop = () => {
    if (typingIntervalId !== null) {
      clearInterval(typingIntervalId);
      typingIntervalId = null;
    }
    if (blinkIntervalId !== null) {
      clearInterval(blinkIntervalId);
      blinkIntervalId = null;
    }
  };

  const reset = () => {
    stop();
    charsToShow = 0;
    textComplete = false;
    blinkVisible = true;
    hoveredButton = null;
    draw();
  };

  const setHovered = (which: 'restart' | 'see-more' | null) => {
    if (!textComplete || hoveredButton === which) return;
    hoveredButton = which;
    draw();
  };

  return { texture, start, stop, reset, setHovered };
};
