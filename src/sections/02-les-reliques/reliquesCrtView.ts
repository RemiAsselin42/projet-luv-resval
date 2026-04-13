// Dessine l'interface 2D de la section Reliques sur un canvas HTML.
// Le canvas est utilisé comme texture Three.js et injecté dans le CRT
// via crtManager.setContentTexture().
//
// Layout (canvas 1024 × 576) :
//   - Titre "LES RELIQUES" en haut
//   - Sélecteur 2×2 sur la gauche (laisse la zone droite pour le modèle 3D)
//   - Nom du personnage sélectionné
//   - Barres de stats en bas à gauche
//   - Indicateurs loading / error

import * as THREE from 'three';
import type { ReliquesCharacterData } from './reliquesData';
import { STAT_LABELS, STAT_DISPLAY } from './reliquesData';

// ── Dimensions du canvas ───────────────────────────────────────────────────────

const CANVAS_W = 1024;
const CANVAS_H = 576;

// ── Constantes de hit-testing (demi-cellule en UV) ────────────────────────────
// Exportées pour que reliques.ts puisse faire le raycast sans magic numbers.

/** Demi-largeur d'une cellule en espace UV canvas (CELL_W / 2 / CANVAS_W). */
export const CELL_HALF_U = 100 / 1024; // (200 / 2) / 1024
/** Demi-hauteur d'une cellule en espace UV canvas (CELL_H / 2 / CANVAS_H). */
export const CELL_HALF_V = 52.5 / 576; // (105 / 2) / 576

// ── Palette ────────────────────────────────────────────────────────────────────

const COLOR_BG = '#000000';
const COLOR_TITLE = '#ffffff';
const COLOR_LABEL = 'rgba(255, 255, 255, 0.85)';
const COLOR_LABEL_DIM = 'rgba(255, 255, 255, 0.45)';
const COLOR_SELECTED_BORDER = '#d64bff';
const COLOR_SELECTED_BG = 'rgba(180, 60, 255, 0.18)';
const COLOR_DEFAULT_BORDER = 'rgba(255, 255, 255, 0.3)';
const COLOR_BAR_TRACK = 'rgba(255, 255, 255, 0.12)';
const COLOR_BAR_FILL_START = '#7b2dff';
const COLOR_BAR_FILL_END = '#ff5fa8';
const COLOR_STAT_LABEL = 'rgba(255, 255, 255, 0.6)';
const COLOR_ERROR = '#ff5f5f';
const COLOR_LOADING = 'rgba(255, 255, 255, 0.5)';
const COLOR_LYRICS = 'rgba(255, 255, 255, 0.72)';
const COLOR_KEYWORD = '#ff5fa8';

// ── Polices (mêmes que le reste du CRT) ───────────────────────────────────────

const FONT_TITLE = '500 38px Futura-CondensedExtraBold, Futura, sans-serif';
const FONT_LABEL_LG = '500 22px Futura-Medium, Futura, sans-serif';
const FONT_LABEL_SM = '500 16px Futura-Medium, Futura, sans-serif';
const FONT_STAT = '500 15px Futura-Medium, Futura, sans-serif';
const FONT_STATUS = '500 18px Futura-Medium, Futura, sans-serif';
const FONT_TICKER = 'italic 500 28px Futura-Medium, Futura, sans-serif';
const FONT_TICKER_BOLD = 'italic 700 28px Futura-Medium, Futura, sans-serif';

// ── Layout (px, coordonnées canvas 1024×576) ──────────────────────────────────

// Zone sélecteur : 4 boutons 2×2 sur la partie gauche
// La zone droite du CRT (UV x 0.47–0.87) est occupée par le modèle 3D.
// On garde la colonne gauche (0–460px) pour le 2D.

const SELECTOR_X = 28;
const SELECTOR_Y = 90;
const CELL_W = 200;
const CELL_H = 105;
const CELL_GAP = 14;

// Position du nom du personnage sélectionné
const NAME_X = SELECTOR_X;
const NAME_Y = SELECTOR_Y + 2 * (CELL_H + CELL_GAP) + 22;

// Stats : en dessous du nom
const STATS_X = SELECTOR_X;
const STATS_Y = NAME_Y + 32;
const STATS_BAR_W = 300;
const STATS_BAR_H = 10;
const STATS_ROW_H = 28;

// Ticker lyrics : banderole défilante sous le modèle 3D
// uModelRect = (0.47, 0.26, 0.87, 0.86)
//   → x canvas : 0.47×1024=481  à  0.87×1024=891  (centre 686, largeur 410)
//   → bottom modèle : (1−0.26)×576 = 426px
const TICKER_X = 481;          // bord gauche aligné avec le modèle
const TICKER_W = 410;          // largeur égale à celle du modèle
const TICKER_Y = 436;          // 10px sous le bottom du modèle (426+10)
const TICKER_H = 38;           // hauteur de la banderole
const TICKER_SPEED = 75;       // px/s
const TICKER_SEPARATOR = '   ·   ';
const TICKER_FADE_W = 70;
const COLOR_TICKER_BG = 'rgba(0, 0, 0, 0.55)';

// ── Helpers ────────────────────────────────────────────────────────────────────

const getCellPosition = (index: number): { x: number; y: number } => {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: SELECTOR_X + col * (CELL_W + CELL_GAP),
    y: SELECTOR_Y + row * (CELL_H + CELL_GAP),
  };
};

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// ── État de la vue ─────────────────────────────────────────────────────────────

export interface ReliquesViewState {
  characters: ReliquesCharacterData[];
  selectedIndex: number;
  /** 0–1, avancement de l'animation des jauges (1 = jauges complètes). */
  statsProgress: number;
  isLoading: boolean;
  hasFailed: boolean;
  /** Temps écoulé depuis la dernière frame, pour animer le ticker lyrics. */
  deltaSeconds: number;
}

// ── Factory ────────────────────────────────────────────────────────────────────

export interface ReliquesCrtView {
  /** Redessine le canvas selon l'état fourni. */
  draw: (state: ReliquesViewState) => void;
  /** Texture Three.js à passer à crtManager.setContentTexture(). */
  getTexture: () => THREE.Texture;
  /** Coordonnées UV du centre de chaque cellule du sélecteur (pour raycast). */
  getCellUVs: () => Array<{ u: number; v: number }>;
  dispose: () => void;
}

export const createReliquesCrtView = (): ReliquesCrtView => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[ReliquesCrtView] Canvas 2D context unavailable');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // ── État scroll du ticker ────────────────────────────────────────────────────

  let tickerOffset = 0;
  let prevSelectedIndex = -1;

  // ── Helper : texte avec mot-clé mis en évidence ───────────────────────────

  const drawTickerText = (text: string, keyword: string, startX: number, y: number): void => {
    if (!keyword) {
      ctx.font = FONT_TICKER;
      ctx.fillStyle = COLOR_LYRICS;
      ctx.fillText(text, startX, y);
      return;
    }

    const lower = text.toLowerCase();
    const lowerKw = keyword.toLowerCase();
    let x = startX;
    let from = 0;

    while (from <= text.length) {
      const idx = lower.indexOf(lowerKw, from);

      // Segment avant le mot-clé (ou reste si absent)
      const endOfNormal = idx === -1 ? text.length : idx;
      if (endOfNormal > from) {
        ctx.font = FONT_TICKER;
        ctx.fillStyle = COLOR_LYRICS;
        const segment = text.slice(from, endOfNormal);
        ctx.fillText(segment, x, y);
        x += ctx.measureText(segment).width;
      }

      if (idx === -1) break;

      // Mot-clé mis en évidence
      ctx.font = FONT_TICKER_BOLD;
      ctx.fillStyle = COLOR_KEYWORD;
      const kw = text.slice(idx, idx + keyword.length);
      ctx.fillText(kw, x, y);
      x += ctx.measureText(kw).width;

      from = idx + keyword.length;
    }
  };

  // ── Draw ────────────────────────────────────────────────────────────────────

  const draw = (state: ReliquesViewState): void => {
    const { characters, selectedIndex, statsProgress, isLoading, hasFailed, deltaSeconds } = state;

    // Fond noir
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Titre ─────────────────────────────────────────────────────────────────
    ctx.font = FONT_TITLE;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLOR_TITLE;
    ctx.fillText('LES RELIQUES', SELECTOR_X, 32);

    // ── Sélecteur 2×2 ────────────────────────────────────────────────────────
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i]!;
      const { x, y } = getCellPosition(i);
      const isSelected = i === selectedIndex;

      // Fond de la cellule
      drawRoundRect(ctx, x, y, CELL_W, CELL_H, 6);
      ctx.fillStyle = isSelected ? COLOR_SELECTED_BG : 'rgba(255,255,255,0.04)';
      ctx.fill();

      // Bordure de la cellule
      ctx.strokeStyle = isSelected ? COLOR_SELECTED_BORDER : COLOR_DEFAULT_BORDER;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Label du personnage
      ctx.font = FONT_LABEL_SM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelected ? COLOR_LABEL : COLOR_LABEL_DIM;
      ctx.fillText(char.label, x + CELL_W / 2, y + CELL_H / 2);
    }

    // ── Nom du personnage sélectionné ─────────────────────────────────────────
    const selected = characters[selectedIndex];
    if (selected) {
      ctx.font = FONT_LABEL_LG;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLOR_TITLE;
      ctx.fillText(selected.label, NAME_X, NAME_Y);
    }

    // ── Stats (jauges animées) ────────────────────────────────────────────────
    if (selected && !isLoading && !hasFailed) {
      const p = Math.max(0, Math.min(1, statsProgress));

      for (let s = 0; s < STAT_LABELS.length; s++) {
        const key = STAT_LABELS[s]!;
        const rawValue = selected.stats[key];
        const value = (rawValue / 100) * p;
        const rowY = STATS_Y + s * STATS_ROW_H;

        // Label stat
        ctx.font = FONT_STAT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLOR_STAT_LABEL;
        ctx.fillText(STAT_DISPLAY[key], STATS_X, rowY + STATS_BAR_H / 2);

        const barX = STATS_X + 90;
        const barY = rowY;

        // Track (fond)
        ctx.fillStyle = COLOR_BAR_TRACK;
        ctx.fillRect(barX, barY, STATS_BAR_W, STATS_BAR_H);

        // Remplissage avec dégradé violet → rose
        if (value > 0) {
          const fillW = Math.round(STATS_BAR_W * value);
          const gradient = ctx.createLinearGradient(barX, barY, barX + STATS_BAR_W, barY);
          gradient.addColorStop(0, COLOR_BAR_FILL_START);
          gradient.addColorStop(1, COLOR_BAR_FILL_END);
          ctx.fillStyle = gradient;
          ctx.fillRect(barX, barY, fillW, STATS_BAR_H);
        }
      }
    }

    // ── États loading / error ─────────────────────────────────────────────────
    if (isLoading) {
      ctx.font = FONT_STATUS;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLOR_LOADING;
      ctx.fillText('CHARGEMENT...', STATS_X, STATS_Y);
    } else if (hasFailed) {
      ctx.font = FONT_STATUS;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLOR_ERROR;
      ctx.fillText('ERREUR DE CHARGEMENT', STATS_X, STATS_Y);
    }

    // ── Ticker lyrics (banderole défilante sous le modèle 3D) ───────────────
    if (selected && selected.lyrics) {
      // Réinitialiser le scroll au changement de personnage
      if (selectedIndex !== prevSelectedIndex) {
        tickerOffset = 0;
        prevSelectedIndex = selectedIndex;
      }

      ctx.font = FONT_TICKER;
      const loopedText = selected.lyrics + TICKER_SEPARATOR;
      const textWidth = ctx.measureText(loopedText).width;

      // Avancer l'offset et boucler
      tickerOffset = (tickerOffset + TICKER_SPEED * deltaSeconds) % textWidth;

      // Fond de la banderole
      ctx.fillStyle = COLOR_TICKER_BG;
      ctx.fillRect(TICKER_X, TICKER_Y, TICKER_W, TICKER_H);

      // Texte défilant avec clip
      ctx.save();
      ctx.beginPath();
      ctx.rect(TICKER_X, TICKER_Y, TICKER_W, TICKER_H);
      ctx.clip();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textY = TICKER_Y + TICKER_H / 2;
      const keyword = selected.tickerKeyword;
      const startX = TICKER_X - tickerOffset;
      drawTickerText(loopedText, keyword, startX, textY);
      drawTickerText(loopedText, keyword, startX + textWidth, textY);

      ctx.restore();

      // Fondu de bords (dégradé vers le fond noir)
      const leftGrad = ctx.createLinearGradient(TICKER_X, 0, TICKER_X + TICKER_FADE_W, 0);
      leftGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(TICKER_X, TICKER_Y, TICKER_FADE_W, TICKER_H);

      const rightGrad = ctx.createLinearGradient(TICKER_X + TICKER_W - TICKER_FADE_W, 0, TICKER_X + TICKER_W, 0);
      rightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(TICKER_X + TICKER_W - TICKER_FADE_W, TICKER_Y, TICKER_FADE_W, TICKER_H);
    }

    texture.needsUpdate = true;
  };

  // ── UV des cellules (pour hit-testing avec le raycaster) ──────────────────

  const getCellUVs = (): Array<{ u: number; v: number }> =>
    [0, 1, 2, 3].map((i) => {
      const { x, y } = getCellPosition(i);
      return {
        u: (x + CELL_W / 2) / CANVAS_W,
        // UV y=0 en bas du canvas dans Three.js
        v: 1 - (y + CELL_H / 2) / CANVAS_H,
      };
    });

  return {
    draw,
    getTexture: () => texture,
    getCellUVs,
    dispose: () => texture.dispose(),
  };
};
