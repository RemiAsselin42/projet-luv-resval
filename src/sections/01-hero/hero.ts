import * as THREE from 'three';
import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { createCrtScreen } from './crtShader';
import { clamp01 } from '../../utils/math';
import { CRT_MENU_CONFIG } from './crtConfig';
import { hasWebGLSupport, detectGpuTier, getShaderComplexity } from '../../core/gpuCapabilities';
import initHeroFallback from './heroFallback';

const initHeroSection: SectionInitializer = (context) => {
  // Fallback for browsers without WebGL support
  if (!hasWebGLSupport()) {
    console.warn('WebGL not supported, using HTML fallback for hero section');
    return initHeroFallback(context);
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
  const crt = createCrtScreen(16 / 9, shaderSettings.textureResolution);
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
  const heroElement = document.querySelector('[data-section="hero"]');
  const menuElement = document.querySelector('[data-section="menu"]');

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

  const onMouseMove = (event: MouseEvent): void => {
    try {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObject(crt.mesh);

      if (hits.length > 0 && hits[0]?.uv) {
        // UV.y=0 en bas, UV.y=1 en haut → canvas Y inversé
        const canvasRelY = 1 - hits[0].uv.y;
        const idx = Math.floor(
          (canvasRelY - CRT_MENU_CONFIG.Y_START) / CRT_MENU_CONFIG.LINE_HEIGHT,
        );
        hoverMenuIndex = idx >= 0 && idx < CRT_MENU_CONFIG.MENU_COUNT ? idx : -1;
      } else {
        hoverMenuIndex = -1;
      }
    } catch (error) {
      console.warn('Raycasting hover detection failed:', error);
      hoverMenuIndex = -1;
    }
  };

  window.addEventListener('mousemove', onMouseMove);

  // ── Fondu de sortie TV quand face-vader arrive ─────────────────────
  const faceVaderElement = document.querySelector('[data-section="face-vader"]');
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
      heroTimeline?.kill();
      faceVaderFadeTimeline?.kill();

      scene.remove(crt.mesh);
      crt.dispose();
    },
  };
};

export default initHeroSection;
