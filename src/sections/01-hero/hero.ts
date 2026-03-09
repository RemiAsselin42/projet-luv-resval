import * as THREE from 'three';
import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { createCrtScreen } from './crtShader';
import { clamp01 } from '../../utils/math';
import { CRT_MENU_CONFIG } from './crtConfig';
import { hasWebGLSupport, detectGpuTier, getShaderComplexity } from '../../core/gpuCapabilities';
import initHeroFallback from './heroFallback';
import { getSectionSelector, SECTION_IDS, crtMenuSectionIds } from '../definitions';

const initHeroSection: SectionInitializer = async (context) => {
  // Fallback for browsers without WebGL support
  if (!hasWebGLSupport()) {
    console.warn('WebGL not supported, using HTML fallback for hero section');
    const fallbackResult = initHeroFallback(context);
    return fallbackResult instanceof Promise ? await fallbackResult : fallbackResult;
  }

  const { scene, camera, renderer } = context;

  // Detect GPU tier for performance optimization
  const gpuTier = detectGpuTier();
  const shaderSettings = getShaderComplexity(gpuTier);

  if (gpuTier === 'low') {
    // eslint-disable-next-line no-console
    console.debug('Low-tier GPU detected, using simplified CRT effects');
  }

  // ── Écran CRT 3D ──────────────────────────────────────────────
  // Await font loading for crisp text rendering on the CRT screen
  const crt = await createCrtScreen(16 / 9, shaderSettings.textureResolution);
  crt.mesh.position.set(0, 0, 0);
  scene.add(crt.mesh);

  // ── Animation d'allumage (power-on) ───────────────────────────
  const powerOnState = { value: 0 };

  gsap.to(powerOnState, {
    value: 1,
    duration: 2.5,
    delay: 0.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      crt.setPowerOn(powerOnState.value);
    },
  });

  // ── Parallax au scroll ────────────────────────────────────────
  // La télévision reste visible pendant hero + menu (2 sections)
  const heroElement = document.querySelector(getSectionSelector(SECTION_IDS.HERO));
  const menuElement = document.querySelector(getSectionSelector(SECTION_IDS.MENU));

  const heroTimeline =
    heroElement && menuElement
      ? gsap.timeline({
        scrollTrigger: {
          trigger: heroElement,
          start: 'top top',
          endTrigger: menuElement,
          end: 'bottom top',
          scrub: true,
        },
      })
      : null;

  if (heroTimeline) {
    heroTimeline.to(crt.mesh.position, {
      z: -2.5,
      ease: 'none',
    });
  }

  // ── Détection hover menu via raycaster ─────────────────────

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  let hoverMenuIndex = -1;

  const getHoverMenuIndexFromPointer = (clientX: number, clientY: number): number => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObject(crt.mesh);

    if (hits.length === 0 || !hits[0]?.uv) {
      return -1;
    }

    // UV.y=0 en bas, UV.y=1 en haut -> canvas Y inverse
    const canvasRelY = 1 - hits[0].uv.y;
    // Le menu est centre : Y_START - (totalHeight / 2)
    const totalMenuHeight = CRT_MENU_CONFIG.MENU_COUNT * CRT_MENU_CONFIG.LINE_HEIGHT;
    const menuStartY = CRT_MENU_CONFIG.Y_START - totalMenuHeight / 2;
    const relativeY = canvasRelY - menuStartY;
    const idx = Math.floor(relativeY / CRT_MENU_CONFIG.LINE_HEIGHT);

    return idx >= 0 && idx < CRT_MENU_CONFIG.MENU_COUNT ? idx : -1;
  };

  const onMouseMove = (event: MouseEvent): void => {
    try {
      hoverMenuIndex = getHoverMenuIndexFromPointer(event.clientX, event.clientY);
    } catch (error) {
      console.warn('Raycasting hover detection failed:', error);
      hoverMenuIndex = -1;
    }
  };

  // ── Gestion du clic sur le menu ───────────────────────────

  const onClick = (event: MouseEvent): void => {
    hoverMenuIndex = getHoverMenuIndexFromPointer(event.clientX, event.clientY);

    if (hoverMenuIndex >= 0 && hoverMenuIndex < crtMenuSectionIds.length) {
      const targetSectionId = crtMenuSectionIds[hoverMenuIndex];
      if (!targetSectionId) return;

      // Utiliser le scrollManager pour bypasser les snaps
      context.scrollManager.scrollToSection(targetSectionId);
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);

  // ── Fondu de sortie TV quand face-vader arrive ─────────────────────
  const faceVaderElement = document.querySelector(getSectionSelector(SECTION_IDS.FACE_VADER));
  const fadeTvState = { fade: 1 };
  const faceVaderFadeTimeline = faceVaderElement
    ? gsap.timeline({
      scrollTrigger: {
        trigger: faceVaderElement,
        start: 'top 80%',
        end: 'top top',
        scrub: true,
      },
    })
    : null;

  if (faceVaderFadeTimeline) {
    faceVaderFadeTimeline.to(fadeTvState, {
      fade: 0,
      ease: 'none',
      onUpdate: () => {
        crt.setFade(fadeTvState.fade);
      },
    });
  }

  return {
    update: (_deltaSeconds: number, elapsedSeconds: number) => {
      crt.update(elapsedSeconds);

      const viewportHeight = Math.max(window.innerHeight, 1);
      const scrollY = context.scrollManager.getScrollY();

      // Titre : monte et sort du canvas pendant le scroll hero
      const heroProgress = clamp01(scrollY / viewportHeight);
      // Menu opacité : préchargé à 50% du hero scroll → pleinement visible à l'entrée de la section menu
      const menuOpacity = clamp01((scrollY / viewportHeight - 0.5) / 0.5);
      crt.setUiProgress(heroProgress, menuOpacity, hoverMenuIndex);
    },
    dispose: () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      heroTimeline?.kill();
      faceVaderFadeTimeline?.kill();

      scene.remove(crt.mesh);
      crt.dispose();
    },
  };
};

export default initHeroSection;
