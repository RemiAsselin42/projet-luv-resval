// Dessine l'interface 2D affichée sur l'écran CRT via un canvas HTML.
// Gère trois états visuels : l'écran de chargement (barre + bouton PLAY),
// le titre "LUV RESVAL" (hero), et le menu de navigation.
// Le canvas est ensuite utilisé comme texture Three.js sur le mesh CRT.

import * as THREE from 'three';
import { easeInOutSine } from '../utils/math';
import {
  CRT_MENU_CONFIG,
  CRT_TITLE_CONFIG,
  CRT_LOADER_CONFIG,
  getCrtMenuStartY,
  getResponsiveTextScale,
  PLAY_BUTTON_PULSE_BASE,
  PLAY_BUTTON_PULSE_AMP,
  PLAY_BUTTON_PULSE_PERIOD_MS,
} from './crtConfig';

export interface CrtCanvasTexture {
  texture: THREE.CanvasTexture;
  draw: (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress: number, playHover?: boolean, elapsedMs?: number) => void;
  dispose: () => void;
}

// ── Constantes d'animation ─────────────────────────────────────────────────────

/** Durée d'un quantum de pulse du bouton PLAY (ms). Correspond à ~24 fps. */
export const PULSE_QUANTUM_MS = 1000 / 24;

// ── Constantes de mise en page ─────────────────────────────────────────────────

// Taille minimale et de base du texte du loader (px, avant mise à l'échelle)
const LOADER_LABEL_MIN_SIZE_PX = 25;
const LOADER_LABEL_BASE_SIZE_PX = 30;
// Position du point de couleur intermédiaire dans le dégradé de la barre de progression
const BAR_GRADIENT_MID_STOP = 0.55;
// Largeur minimale de remplissage (px) avant d'afficher le reflet lumineux
const BAR_HIGHLIGHT_MIN_WIDTH_PX = 8;

// Ancrage vertical du titre au repos (0–1, espace canvas) quand scroll = 0
const TITLE_VERTICAL_ANCHOR = 0.45;
// Distance verticale parcourue par le titre pendant le scroll du héro (0–1, espace canvas)
const TITLE_SCROLL_TRAVEL = 0.65;
// Position du sous-titre exprimée en proportion de la taille de police du titre
const SUBTITLE_BASELINE_RATIO = 0.68;

// Marge gauche du menu (0–1, espace canvas)
const MENU_HORIZONTAL_MARGIN_RATIO = 0.08;
// Taille de police minimale du menu (px, avant mise à l'échelle)
const MENU_FONT_MIN_SIZE_PX = 36;
// Opacité du texte sur l'élément survolé
const HOVER_ITEM_OPACITY = 0.9;

// Police du bouton PLAY
const PLAY_BUTTON_FONT_WEIGHT = '500';
const PLAY_BUTTON_FONT_FAMILY = 'Futura-Medium';
// Espace entre le bas de la barre de chargement et le centre du bouton PLAY (ratio canvas)
const PLAY_BUTTON_GAP_RATIO = 0.022;
// Marge horizontale du fond de survol (px, avant resScale)
const PLAY_BUTTON_PAD_X_PX = 14;
// Marge verticale haut/bas du fond de survol (px, avant resScale)
const PLAY_BUTTON_PAD_Y_TOP_PX = 12;
const PLAY_BUTTON_PAD_Y_BOTTOM_PX = 6;

/**
 * Vrai quand le bouton PLAY doit pulser (barre complète, transition pas encore déclenchée).
 * Court-circuite l'optimisation dirty-flag pour que le bouton s'anime à chaque frame.
 * - loadingProgress = 1  → barre complète, en attente du clic PLAY → pulse
 * - loadingProgress > 1  → transition en cours (1→2)               → pas de pulse
 * - loadingProgress < 1  → barre encore en train de se remplir      → pas de pulse
 */
export const isPlayButtonPulsing = (loadingProgress: number): boolean => {
  const clampedLoadingProgress = Math.min(Math.max(loadingProgress, 0), 1);
  return clampedLoadingProgress >= 1 && loadingProgress <= 1;
};

// ── Colour palette ─────────────────────────────────────────────────────────────

const COLOR_PANEL_BORDER = 'rgba(206, 141, 255, 0.7)';
const COLOR_PANEL_BG = 'rgba(44, 22, 70, 0.7)';
const COLOR_BAR_START = '#7b2dff';
const COLOR_BAR_MID = '#d64bff';
const COLOR_BAR_END = '#ff5fa8';
const COLOR_BAR_HIGHLIGHT = 'rgba(255, 201, 241, 0.45)';
const COLOR_TITLE = '#ffffff';
const COLOR_SUBTITLE = '#d9d9d9';
const COLOR_PLAY_TEXT = '#ffffff';
const COLOR_PLAY_HOVER_BG = '#ffffff';
const COLOR_PLAY_HOVER_TEXT = '#000000';

// ── Draw helpers ───────────────────────────────────────────────────────────────

interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  resScale: number;
  textScale: number;
}

const drawLoaderScreen = (
  dc: DrawCtx,
  clampedLoadingProgress: number,
  loaderOpacity: number,
  playHover: boolean,
  elapsedMs: number,
): void => {
  const { ctx, width, height, resScale, textScale } = dc;
  ctx.globalAlpha = loaderOpacity;
  const panelWidth = Math.round(width * CRT_LOADER_CONFIG.PANEL_WIDTH_RATIO);
  const panelHeight = Math.round(Math.max(CRT_LOADER_CONFIG.PANEL_HEIGHT_MIN_PX * resScale, height * CRT_LOADER_CONFIG.PANEL_HEIGHT_RATIO));
  const panelX = Math.round((width - panelWidth) * 0.5);
  const panelY = Math.round(height * CRT_LOADER_CONFIG.PANEL_Y_RATIO);
  const fillWidth = Math.round((panelWidth - 6) * clampedLoadingProgress);

  ctx.fillStyle = COLOR_PANEL_BORDER;
  ctx.fillRect(panelX, panelY, panelWidth, 2);
  ctx.fillRect(panelX, panelY + panelHeight - 2, panelWidth, 2);
  ctx.fillRect(panelX, panelY, 2, panelHeight);
  ctx.fillRect(panelX + panelWidth - 2, panelY, 2, panelHeight);

  ctx.fillStyle = COLOR_PANEL_BG;
  ctx.fillRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);

  if (typeof ctx.createLinearGradient === 'function') {
    const gradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY);
    gradient.addColorStop(0, COLOR_BAR_START);
    gradient.addColorStop(BAR_GRADIENT_MID_STOP, COLOR_BAR_MID);
    gradient.addColorStop(1, COLOR_BAR_END);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = COLOR_BAR_MID;
  }
  ctx.fillRect(panelX + 3, panelY + 3, fillWidth, panelHeight - 6);

  if (fillWidth > BAR_HIGHLIGHT_MIN_WIDTH_PX) {
    ctx.fillStyle = COLOR_BAR_HIGHLIGHT;
    ctx.fillRect(panelX + 3 + fillWidth - 6, panelY + 3, 6, panelHeight - 6);
  }

  // Bouton PLAY — style menu : texte seul, hover = fond blanc fit-content + "> PLAY"
  if (clampedLoadingProgress >= 1) {
    const gap = Math.round(height * PLAY_BUTTON_GAP_RATIO);
    const labelSize = Math.max(
      LOADER_LABEL_MIN_SIZE_PX * resScale,
      Math.round(LOADER_LABEL_BASE_SIZE_PX * textScale * resScale),
    );
    const btnTextCenterY = panelY + panelHeight + gap + labelSize;

    ctx.font = `${PLAY_BUTTON_FONT_WEIGHT} ${labelSize}px ${PLAY_BUTTON_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const pulse = PLAY_BUTTON_PULSE_BASE + PLAY_BUTTON_PULSE_AMP * Math.sin(elapsedMs / PLAY_BUTTON_PULSE_PERIOD_MS);
    ctx.globalAlpha = loaderOpacity * pulse;

    if (playHover) {
      const displayText = '> PLAY';
      const metrics = ctx.measureText(displayText);
      const textW = metrics.width;
      const textH =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || labelSize;
      const padX = Math.round(PLAY_BUTTON_PAD_X_PX * resScale);
      const padYTop = Math.round(PLAY_BUTTON_PAD_Y_TOP_PX * resScale);
      const padYBottom = Math.round(PLAY_BUTTON_PAD_Y_BOTTOM_PX * resScale);
      ctx.fillStyle = COLOR_PLAY_HOVER_BG;
      ctx.fillRect(
        width / 2 - textW / 2 - padX,
        btnTextCenterY - textH / 2 - padYTop,
        textW + padX * 2,
        textH + padYTop + padYBottom,
      );
      ctx.fillStyle = COLOR_PLAY_HOVER_TEXT;
      ctx.fillText(displayText, width / 2, btnTextCenterY);
    } else {
      ctx.fillStyle = COLOR_PLAY_TEXT;
      ctx.fillText('PLAY', width / 2, btnTextCenterY);
    }

    ctx.globalAlpha = loaderOpacity;
  }
};

const drawHeroContent = (
  dc: DrawCtx,
  text: string,
  clampedTitleProgress: number,
): void => {
  const { ctx, width, height, resScale, textScale } = dc;
  const fontSize = Math.round(CRT_TITLE_CONFIG.TITLE_FONT_SIZE * textScale * resScale);
  const titleY = height * (TITLE_VERTICAL_ANCHOR - clampedTitleProgress * TITLE_SCROLL_TRAVEL);
  ctx.font = `${CRT_TITLE_CONFIG.FONT_WEIGHT} ${fontSize}px ${CRT_TITLE_CONFIG.FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLOR_TITLE;
  ctx.fillText(text, width / 2, titleY);

  const subtitleSize = Math.round(CRT_TITLE_CONFIG.SUBTITLE_FONT_SIZE * textScale * resScale);
  const subtitleY = titleY + fontSize * SUBTITLE_BASELINE_RATIO;
  ctx.font = `${CRT_TITLE_CONFIG.SUBTITLE_FONT_WEIGHT} ${subtitleSize}px ${CRT_TITLE_CONFIG.SUBTITLE_FONT_FAMILY}`;
  ctx.fillStyle = COLOR_SUBTITLE;
  ctx.fillText(CRT_TITLE_CONFIG.SUBTITLE_TEXT, width / 2, subtitleY);

  const dateSize = Math.max(resScale, Math.round(CRT_TITLE_CONFIG.DATE_FONT_SIZE * textScale * resScale));
  const dateY = subtitleY + subtitleSize;
  ctx.font = `${CRT_TITLE_CONFIG.DATE_FONT_WEIGHT} ${dateSize}px ${CRT_TITLE_CONFIG.DATE_FONT_FAMILY}`;
  ctx.fillStyle = COLOR_SUBTITLE;
  ctx.fillText(CRT_TITLE_CONFIG.DATE_TEXT, width / 2, dateY);
};

const drawMenu = (
  dc: DrawCtx,
  clampedMenuOpacity: number,
  hoverIndex: number,
): void => {
  const { ctx, width, height, resScale, textScale } = dc;
  const menuX = width * MENU_HORIZONTAL_MARGIN_RATIO;
  const menuY = height * getCrtMenuStartY(clampedMenuOpacity);
  const menuLineHeight = Math.round(height * CRT_MENU_CONFIG.LINE_HEIGHT);
  const menuFontSize = Math.max(
    Math.floor(width * CRT_MENU_CONFIG.FONT_SIZE_RATIO * textScale),
    Math.round(MENU_FONT_MIN_SIZE_PX * textScale * resScale),
  );

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${CRT_MENU_CONFIG.FONT_WEIGHT} ${menuFontSize}px ${CRT_MENU_CONFIG.FONT_FAMILY}`;

  for (const [index, item] of CRT_MENU_CONFIG.ITEMS.entries()) {
    const lineCenterY = menuY + index * menuLineHeight + menuLineHeight * 0.5;
    const isHovered = index === hoverIndex;
    const prefix = isHovered ? '> ' : '  ';
    const labelMetrics = ctx.measureText(prefix + item);
    const textWidth = labelMetrics.width;
    const textHeight =
      labelMetrics.actualBoundingBoxAscent + labelMetrics.actualBoundingBoxDescent || menuFontSize;
    const prefixWidth = ctx.measureText(prefix).width;
    const itemVerticalOffset = Math.round(CRT_MENU_CONFIG.ITEM_VERTICAL_OFFSET * textScale * resScale);

    if (isHovered) {
      ctx.fillStyle = `rgba(255, 255, 255, ${HOVER_ITEM_OPACITY * clampedMenuOpacity})`;
      const highlightPaddingX = Math.round(CRT_MENU_CONFIG.HIGHLIGHT_PADDING_X * textScale * resScale);
      const highlightPaddingY = Math.round(CRT_MENU_CONFIG.HIGHLIGHT_PADDING_Y * textScale * resScale);
      const highlightHeight = textHeight + highlightPaddingY * 2;
      ctx.fillRect(
        menuX - highlightPaddingX,
        lineCenterY - highlightHeight / 2,
        textWidth + highlightPaddingX * 2,
        highlightHeight,
      );
      ctx.fillStyle = `rgba(0, 0, 0, ${clampedMenuOpacity})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${clampedMenuOpacity})`;
    }

    ctx.fillText(prefix, menuX, lineCenterY);
    ctx.fillText(item, menuX + prefixWidth, lineCenterY + itemVerticalOffset);
  }
};

// ── Factory ────────────────────────────────────────────────────────────────────

export const createTextCanvasTexture = (
  text: string,
  width: number,
  height: number,
): CrtCanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Dirty flag optimization: only redraw if values changed significantly
  let lastTitleProgress = -1;
  let lastMenuOpacity = -1;
  let lastHoverIndex = -2;
  let lastTextScale = -1;
  let lastLoadingProgress = -1;
  let lastPlayHover = false;
  let lastPulseQuantum = -1;

  const draw = (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress: number, playHover = false, elapsedMs = 0): void => {
    const clampedTitleProgress = Math.min(Math.max(titleProgress, 0), 1);
    const clampedMenuOpacity = Math.min(Math.max(menuOpacity, 0), 1);
    const clampedLoadingProgress = Math.min(Math.max(loadingProgress, 0), 1);
    const textScale = getResponsiveTextScale();
    const resScale = width / 1024;

    // Quantum ~24fps : le pulse du bouton PLAY n'a besoin de se redessiner
    // qu'à cette cadence — évite le GPU stall à 60fps quand le bouton est visible.
    const pulseQuantum = Math.floor(elapsedMs / PULSE_QUANTUM_MS);

    if (
      Math.abs(clampedTitleProgress - lastTitleProgress) < 0.001 &&
      Math.abs(clampedMenuOpacity - lastMenuOpacity) < 0.001 &&
      hoverIndex === lastHoverIndex &&
      Math.abs(textScale - lastTextScale) < 0.001 &&
      Math.abs(loadingProgress - lastLoadingProgress) < 0.001 &&
      playHover === lastPlayHover &&
      pulseQuantum === lastPulseQuantum
    ) {
      return;
    }

    lastTitleProgress = clampedTitleProgress;
    lastMenuOpacity = clampedMenuOpacity;
    lastHoverIndex = hoverIndex;
    lastTextScale = textScale;
    lastLoadingProgress = loadingProgress;
    lastPlayHover = playHover;
    lastPulseQuantum = pulseQuantum;

    // Fond noir
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Fondu croisé loader → héro : 0-1 = loader seul, 1-2 = transition (easeInOutSine), ≥2 = héro seul.
    const transitionBlend = Math.min(Math.max(loadingProgress - 1, 0), 1);
    const easedBlend = easeInOutSine(transitionBlend);
    const loaderOpacity = loadingProgress <= 1 ? 1 : 1 - easedBlend;
    const heroOpacity = loadingProgress <= 1 ? 0 : easedBlend;

    const dc: DrawCtx = { ctx, width, height, resScale, textScale };

    if (loaderOpacity > 0.001) {
      drawLoaderScreen(dc, clampedLoadingProgress, loaderOpacity, playHover, elapsedMs);
    }

    ctx.globalAlpha = heroOpacity;
    if (heroOpacity > 0.001) {
      drawHeroContent(dc, text, clampedTitleProgress);
    }

    // Menu incruste dans l'ecran CRT (donc affecte par le shader)
    // ctx.globalAlpha est déjà heroOpacity, donc le menu se fond naturellement.
    if (heroOpacity > 0.02 && clampedMenuOpacity > 0.02) {
      drawMenu(dc, clampedMenuOpacity, hoverIndex);
    }

    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  };

  draw(0, 0, -1, 0);

  return {
    texture,
    draw,
    dispose: () => {
      texture.dispose();
    },
  };
};
