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

    // ── Écran de chargement ───────────────────────────────────────
    if (loaderOpacity > 0.001) {
      ctx.globalAlpha = loaderOpacity;
      const panelWidth = Math.round(width * CRT_LOADER_CONFIG.PANEL_WIDTH_RATIO);
      const panelHeight = Math.round(Math.max(CRT_LOADER_CONFIG.PANEL_HEIGHT_MIN_PX, height * CRT_LOADER_CONFIG.PANEL_HEIGHT_RATIO));
      const panelX = Math.round((width - panelWidth) * 0.5);
      const panelY = Math.round(height * CRT_LOADER_CONFIG.PANEL_Y_RATIO);
      const fillWidth = Math.round((panelWidth - 6) * clampedLoadingProgress);

      // Texte de chargement
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const loadingLabelSize = Math.max(16, Math.round(20 * textScale));
      ctx.font = `500 ${loadingLabelSize}px Futura-Medium`;
      ctx.fillStyle = 'rgba(255, 215, 251, 0.95)';
      ctx.fillText('INITIALISATION SIGNAL', width / 2, panelY - Math.round(CRT_LOADER_CONFIG.LABEL_OFFSET_PX * textScale));

      // Cadre de barre
      ctx.fillStyle = 'rgba(206, 141, 255, 0.7)';
      ctx.fillRect(panelX, panelY, panelWidth, 2);
      ctx.fillRect(panelX, panelY + panelHeight - 2, panelWidth, 2);
      ctx.fillRect(panelX, panelY, 2, panelHeight);
      ctx.fillRect(panelX + panelWidth - 2, panelY, 2, panelHeight);

      // Fond interne
      ctx.fillStyle = 'rgba(44, 22, 70, 0.7)';
      ctx.fillRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);

      // Remplissage violet/rose
      if (typeof ctx.createLinearGradient === 'function') {
        const gradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY);
        gradient.addColorStop(0, '#7b2dff');
        gradient.addColorStop(0.55, '#d64bff');
        gradient.addColorStop(1, '#ff5fa8');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#d64bff';
      }
      ctx.fillRect(panelX + 3, panelY + 3, fillWidth, panelHeight - 6);

      // Halo du front de progression
      if (fillWidth > 8) {
        ctx.fillStyle = 'rgba(255, 201, 241, 0.45)';
        ctx.fillRect(panelX + 3 + fillWidth - 6, panelY + 3, 6, panelHeight - 6);
      }
    }

    // ── Contenu héro (titre, sous-titre, date) ───────────────────
    ctx.globalAlpha = heroOpacity;
    if (heroOpacity > 0.001) {
      // Titre + sous-titre qui sortent par le haut au scroll
      const fontSize = Math.round(CRT_TITLE_CONFIG.TITLE_FONT_SIZE * textScale);
      const titleY = height * (0.45 - clampedTitleProgress * 0.65);
      ctx.font = `${CRT_TITLE_CONFIG.FONT_WEIGHT} ${fontSize}px ${CRT_TITLE_CONFIG.FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, width / 2, titleY);

      const subtitleSize = Math.round(CRT_TITLE_CONFIG.SUBTITLE_FONT_SIZE * textScale);
      const subtitleY = titleY + fontSize * 0.68;
      ctx.font = `${CRT_TITLE_CONFIG.SUBTITLE_FONT_WEIGHT} ${subtitleSize}px ${CRT_TITLE_CONFIG.SUBTITLE_FONT_FAMILY}`;
      ctx.fillStyle = '#d9d9d9';
      ctx.fillText(CRT_TITLE_CONFIG.SUBTITLE_TEXT, width / 2, subtitleY);

      // Date sous le sous-titre
      const dateSize = Math.max(1, Math.round(CRT_TITLE_CONFIG.DATE_FONT_SIZE * textScale));
      const dateY = subtitleY + subtitleSize * 1;
      ctx.font = `${CRT_TITLE_CONFIG.DATE_FONT_WEIGHT} ${dateSize}px ${CRT_TITLE_CONFIG.DATE_FONT_FAMILY}`;
      ctx.fillStyle = '#d9d9d9';
      ctx.fillText(CRT_TITLE_CONFIG.DATE_TEXT, width / 2, dateY);
    }

    // Menu incruste dans l'ecran CRT (donc affecte par le shader)
    // ctx.globalAlpha est déjà heroOpacity, donc le menu se fond naturellement.
    if (heroOpacity > 0.02 && clampedMenuOpacity > 0.02) {
      const menuX = width * 0.08;
      const menuY = height * getCrtMenuStartY(clampedMenuOpacity);
      const menuLineHeight = Math.round(height * CRT_MENU_CONFIG.LINE_HEIGHT);
      const menuFontSize = Math.max(
        Math.floor(width * CRT_MENU_CONFIG.FONT_SIZE_RATIO * textScale),
        Math.round(18 * textScale),
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
        const itemVerticalOffset = Math.round(CRT_MENU_CONFIG.ITEM_VERTICAL_OFFSET * textScale);

        if (isHovered) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * clampedMenuOpacity})`;
          const highlightPaddingX = Math.round(CRT_MENU_CONFIG.HIGHLIGHT_PADDING_X * textScale);
          const highlightPaddingY = Math.round(CRT_MENU_CONFIG.HIGHLIGHT_PADDING_Y * textScale);
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
