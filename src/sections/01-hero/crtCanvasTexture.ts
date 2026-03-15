import * as THREE from 'three';
import {
  CRT_MENU_CONFIG,
  CRT_TITLE_CONFIG,
  CRT_LOADER_CONFIG,
  getCrtMenuStartY,
  getResponsiveTextScale,
} from './crtConfig';

export interface CrtCanvasTexture {
  texture: THREE.CanvasTexture;
  draw: (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress: number) => void;
  dispose: () => void;
}

// ── Layout constants ───────────────────────────────────────────────────────────

// Loader label minimum and base sizes (px, before scale)
const LOADER_LABEL_MIN_SIZE_PX = 32;
const LOADER_LABEL_BASE_SIZE_PX = 40;
// Gradient mid-stop position for the progress bar fill
const BAR_GRADIENT_MID_STOP = 0.55;
// Minimum bar fill width (px) before showing the highlight gleam
const BAR_HIGHLIGHT_MIN_WIDTH_PX = 8;

// Title resting vertical anchor (0–1, canvas space) when scroll = 0
const TITLE_VERTICAL_ANCHOR = 0.45;
// Title vertical travel distance during hero scroll (0–1, canvas space)
const TITLE_SCROLL_TRAVEL = 0.65;
// Subtitle top position as a ratio of the title font size
const SUBTITLE_BASELINE_RATIO = 0.68;

// Menu left margin (0–1, canvas space)
const MENU_HORIZONTAL_MARGIN_RATIO = 0.08;
// Menu minimum font size (px, before scale)
const MENU_FONT_MIN_SIZE_PX = 36;
// Hover item text opacity multiplier
const HOVER_ITEM_OPACITY = 0.9;

// ── Colour palette ─────────────────────────────────────────────────────────────

const COLOR_LOADER_LABEL = 'rgba(255, 215, 251, 0.95)';
const COLOR_PANEL_BORDER = 'rgba(206, 141, 255, 0.7)';
const COLOR_PANEL_BG = 'rgba(44, 22, 70, 0.7)';
const COLOR_BAR_START = '#7b2dff';
const COLOR_BAR_MID = '#d64bff';
const COLOR_BAR_END = '#ff5fa8';
const COLOR_BAR_HIGHLIGHT = 'rgba(255, 201, 241, 0.45)';
const COLOR_TITLE = '#ffffff';
const COLOR_SUBTITLE = '#d9d9d9';

// ── Draw helpers ───────────────────────────────────────────────────────────────

const drawLoaderScreen = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  resScale: number,
  textScale: number,
  clampedLoadingProgress: number,
  loaderOpacity: number,
): void => {
  ctx.globalAlpha = loaderOpacity;
  const panelWidth = Math.round(width * CRT_LOADER_CONFIG.PANEL_WIDTH_RATIO);
  const panelHeight = Math.round(Math.max(CRT_LOADER_CONFIG.PANEL_HEIGHT_MIN_PX * resScale, height * CRT_LOADER_CONFIG.PANEL_HEIGHT_RATIO));
  const panelX = Math.round((width - panelWidth) * 0.5);
  const panelY = Math.round(height * CRT_LOADER_CONFIG.PANEL_Y_RATIO);
  const fillWidth = Math.round((panelWidth - 6) * clampedLoadingProgress);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const loadingLabelSize = Math.max(LOADER_LABEL_MIN_SIZE_PX * resScale, Math.round(LOADER_LABEL_BASE_SIZE_PX * textScale * resScale));
  ctx.font = `500 ${loadingLabelSize}px Futura-Medium`;
  ctx.fillStyle = COLOR_LOADER_LABEL;
  ctx.fillText('INITIALISATION SIGNAL', width / 2, panelY - Math.round(CRT_LOADER_CONFIG.LABEL_OFFSET_PX * textScale * resScale));

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
};

const drawHeroContent = (
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  resScale: number,
  textScale: number,
  clampedTitleProgress: number,
): void => {
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
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  resScale: number,
  textScale: number,
  clampedMenuOpacity: number,
  hoverIndex: number,
): void => {
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

  const draw = (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress: number): void => {
    const clampedTitleProgress = Math.min(Math.max(titleProgress, 0), 1);
    const clampedMenuOpacity = Math.min(Math.max(menuOpacity, 0), 1);
    const clampedLoadingProgress = Math.min(Math.max(loadingProgress, 0), 1);
    const textScale = getResponsiveTextScale();
    const resScale = width / 1024;

    // Skip redraw if nothing changed significantly.
    // On compare loadingProgress brut (pas clampé) pour détecter la sentinelle > 1.
    if (
      Math.abs(clampedTitleProgress - lastTitleProgress) < 0.001 &&
      Math.abs(clampedMenuOpacity - lastMenuOpacity) < 0.001 &&
      hoverIndex === lastHoverIndex &&
      Math.abs(textScale - lastTextScale) < 0.001 &&
      Math.abs(loadingProgress - lastLoadingProgress) < 0.001
    ) {
      return;
    }

    lastTitleProgress = clampedTitleProgress;
    lastMenuOpacity = clampedMenuOpacity;
    lastHoverIndex = hoverIndex;
    lastTextScale = textScale;
    lastLoadingProgress = loadingProgress;

    // Fond noir
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Fondu croisé loader → héro : 0-1 = loader seul, 1-2 = transition (easeInOutSine), ≥2 = héro seul.
    const transitionBlend = Math.min(Math.max(loadingProgress - 1, 0), 1);
    const easedBlend = -(Math.cos(Math.PI * transitionBlend) - 1) / 2;
    const loaderOpacity = loadingProgress <= 1 ? 1 : 1 - easedBlend;
    const heroOpacity = loadingProgress <= 1 ? 0 : easedBlend;

    if (loaderOpacity > 0.001) {
      drawLoaderScreen(ctx, width, height, resScale, textScale, clampedLoadingProgress, loaderOpacity);
    }

    ctx.globalAlpha = heroOpacity;
    if (heroOpacity > 0.001) {
      drawHeroContent(ctx, text, width, height, resScale, textScale, clampedTitleProgress);
    }

    // Menu incruste dans l'ecran CRT (donc affecte par le shader)
    // ctx.globalAlpha est déjà heroOpacity, donc le menu se fond naturellement.
    if (heroOpacity > 0.02 && clampedMenuOpacity > 0.02) {
      drawMenu(ctx, width, height, resScale, textScale, clampedMenuOpacity, hoverIndex);
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
