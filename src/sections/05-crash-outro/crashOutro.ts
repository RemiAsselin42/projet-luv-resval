// Section 05 "Crash Outro" : conclusion de l'expérience.
// La vidéo Grünt #45 s'affiche sur le CRT, puis le glitch s'intensifie progressivement
// sur ~20 secondes jusqu'au "crash" de l'écran avec un message d'erreur 403.
// L'utilisateur peut ensuite redémarrer l'expérience ou voir plus de contenu.

import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';
import { createError403Canvas, BTN_LAYOUT } from './crashOutro403Canvas';
import { createCrashOutroOverlay } from './crashOutroOverlay';
import { createGruntVideoTexture } from '../../utils/gruntVideoTexture';
import { CLIP_DURATION_SECONDS, CLIP_START_IN_SONG_SECONDS } from '../../constants/grunt';
import { CRT_Z } from '../../crt/crtZParallax';

const CAPPELLA_LAYER = 5;
const GLITCH_RAMP_SECONDS = 20; // durée du glitch progressif avant le crash total
const AUDIO_FADE_IN_MS = 3000;
const SPIKE_CHECK_INTERVAL = 0.016; // ~1 frame à 60fps
const SPIKE_PROBABILITY = 0.05;
const SPIKE_MAX_MAGNITUDE = 0.4;
const CRASHED_GLITCH_LEVEL = 0.12;
const EFFECT_DURATION = 0.1;   // durée de chaque flash d'effet (s)
// Probabilités par seconde (frame-rate independent) : multiplier par deltaSeconds avant le test.
// Équivalent à ≈0.010/frame, 0.012/frame, 0.006/frame à 60 fps (×60).
const BLACKOUT_PROB   = 0.60; // probabilité/s × t²
const SHIFT_PROB      = 0.72;
const MOSAIC_PROB     = 0.36;
const SHIFT_X_MAX     = 0.15;
const SHIFT_Y_MAX     = 0.10;

// ── Section initializer ──────────────────────────────────────────────────────
const initGruntSection: SectionInitializer = (context) => {
  const { audioManager, scrollManager, crtManager } = context;

  const sectionElement = document.querySelector(
    getSectionSelector(SECTION_IDS.CRASH_OUTRO),
  );
  if (!(sectionElement instanceof HTMLElement)) {
    return { update: () => {}, dispose: () => {} };
  }

  // ── Vidéo ─────────────────────────────────────────────────────────────────
  const { video, videoTexture, dispose: disposeVideo } = createGruntVideoTexture();

  // ── Canvas 403 + overlay ──────────────────────────────────────────────────
  const errorCanvas = createError403Canvas();

  const resetState = () => {
    glitchPhase = 'idle';
    glitchAccum = 0;
    spikeAccum = 0;
    blackoutTimer = 0;
    shiftTimer = 0;
    mosaicTimer = 0;
    crtManager.setGlitch(0);
    crtManager.setBlackout(0);
    crtManager.setShift(0, 0);
    crtManager.setMosaic(0);
    errorCanvas.reset();
    // L'overlay se cache lui-même avant d'appeler ce callback
  };

  const handleRestart = () => {
    resetState();
    audioManager.resetExperienceAudio();
    audioManager.startExperience();
  };

  const overlay = createCrashOutroOverlay(scrollManager, errorCanvas.setHovered, BTN_LAYOUT, handleRestart);

  // ── État du glitch ────────────────────────────────────────────────────────
  type GlitchPhase = 'idle' | 'ramping' | 'crashed';
  let glitchPhase: GlitchPhase = 'idle';
  let glitchAccum = 0;
  let spikeAccum = 0;
  let isInViewport = false;

  // Timers des effets ponctuels (0.1s chacun)
  let blackoutTimer = 0;
  let shiftTimer = 0;
  let mosaicTimer = 0;

  // ── Timeline scrubée : blur 0.85→0, fade 0.3→1 ──────────────────────────
  // La vidéo est chargée dès le début de la transition (top 80%) pour qu'on
  // voit la vidéo (et non le canvas hero) pendant que blur/fade s'animent.
  // z part de CRT_Z.FAR (-2.0) et rejoint NEAR (0) en même temps que blur/fade.
  // Ce scrub est créé après mpcZTimeline (dans crtZParallax) → il écrit
  // mesh.position.z en dernier et l'emporte sur le dezoom MPC pendant toute
  // la plage 'top 80%' → 'top 20%'. La mpcZTimeline est limitée à
  // 'bottom 80%' pour ne plus écrire après ce point.
  const transitionState = { blur: 0.85, fade: 0.3, z: CRT_Z.FAR };
  const transitionTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: sectionElement,
      start: 'top 80%',
      end: 'top 20%',
      scrub: true,
      onEnter: () => {
        // Positionner la vidéo dès le début de la transition
        if (glitchPhase === 'idle') {
          const cappellaPos = audioManager.getMusicLayerPosition(CAPPELLA_LAYER);
          video.currentTime = CLIP_START_IN_SONG_SECONDS + cappellaPos % CLIP_DURATION_SECONDS;
          crtManager.setContentTexture(videoTexture);
          crtManager.setPowerOn(1);
          void video.play().catch(() => undefined);
        }
      },
      onLeaveBack: () => {
        // Retour en arrière : pause vidéo, restaurer la texture hero,
        // puis naviguer directement vers les reliques (bypass de la MPC).
        video.pause();
        crtManager.setContentTexture(crtManager.getHeroCanvasTexture());
        scrollManager.scrollToSection(SECTION_IDS.RELIQUES);
      },
    },
  });
  transitionTimeline
    .to(transitionState, {
      blur: 0,
      fade: 1,
      z: 0,
      ease: 'none',
      onUpdate: () => {
        crtManager.setBlur(transitionState.blur);
        crtManager.setFade(transitionState.fade);
        crtManager.mesh.position.z = transitionState.z;
      },
    });

  // ── Trigger lifecycle : glitch + audio (déclenché quand transition terminée) ─
  const trigger = scrollManager.createTrigger({
    trigger: sectionElement,
    start: 'top 20%',
    end: 'bottom top',
    onEnter: () => {
      isInViewport = true;
      if (glitchPhase !== 'idle') return;

      // Fade-in progressif de toutes les layers audio
      [0, 1, 2, 3, CAPPELLA_LAYER].forEach((i) =>
        audioManager.fadeMusicLayerIn(i, AUDIO_FADE_IN_MS),
      );

      glitchPhase = 'ramping';
      glitchAccum = 0;
      spikeAccum = 0;
    },
    onLeaveBack: () => {
      isInViewport = false;
      if (glitchPhase === 'ramping' || glitchPhase === 'crashed') {
        resetState();
      }
    },
    onEnterBack: () => {
      isInViewport = true;
      if (glitchPhase === 'ramping') {
        void video.play().catch(() => undefined);
      }
    },
    onLeave: () => {
      isInViewport = false;
    },
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  return {
    update: (deltaSeconds: number, _elapsedSeconds: number) => {
      // crtManager.update() est appelé centralement dans main.ts — ne pas le rappeler ici.
      if (glitchPhase === 'ramping' && isInViewport) {
        glitchAccum += deltaSeconds;
        const t = Math.min(glitchAccum / GLITCH_RAMP_SECONDS, 1);

        // Rampe ease-in² + spikes aléatoires (frame-rate independent)
        const trend = t * t;
        spikeAccum += deltaSeconds;
        let spike = 0;
        if (spikeAccum > SPIKE_CHECK_INTERVAL) {
          spike = Math.random() < SPIKE_PROBABILITY ? Math.random() * SPIKE_MAX_MAGNITUDE : 0;
          spikeAccum = 0;
        }
        crtManager.setGlitch(Math.min(trend + spike, 1.0));

        // ── Effets ponctuels (0.1s) déclenchés aléatoirement, intensité ∝ t² ──
        const effectScale = trend;

        if (blackoutTimer > 0) {
          blackoutTimer -= deltaSeconds;
          if (blackoutTimer <= 0) { crtManager.setBlackout(0); blackoutTimer = 0; }
        }
        if (shiftTimer > 0) {
          shiftTimer -= deltaSeconds;
          if (shiftTimer <= 0) { crtManager.setShift(0, 0); shiftTimer = 0; }
        }
        if (mosaicTimer > 0) {
          mosaicTimer -= deltaSeconds;
          if (mosaicTimer <= 0) { crtManager.setMosaic(0); mosaicTimer = 0; }
        }

        if (t > 0.15) {
          // Les probabilités sont en prob/s → multiplier par deltaSeconds pour être
          // frame-rate independent (même fréquence moyenne à 30, 60 ou 144 fps).
          if (blackoutTimer <= 0 && Math.random() < BLACKOUT_PROB * effectScale * deltaSeconds) {
            blackoutTimer = EFFECT_DURATION;
            crtManager.setBlackout(1);
          }
          if (shiftTimer <= 0 && Math.random() < SHIFT_PROB * effectScale * deltaSeconds) {
            shiftTimer = EFFECT_DURATION;
            crtManager.setShift(
              (Math.random() * 2 - 1) * SHIFT_X_MAX,
              (Math.random() * 2 - 1) * SHIFT_Y_MAX,
            );
          }
          if (mosaicTimer <= 0 && Math.random() < MOSAIC_PROB * effectScale * deltaSeconds) {
            mosaicTimer = EFFECT_DURATION;
            crtManager.setMosaic(1);
          }
        }

        if (t >= 1) {
          glitchPhase = 'crashed';
          crtManager.setBlackout(0);
          crtManager.setShift(0, 0);
          crtManager.setMosaic(0);
          crtManager.setContentTexture(errorCanvas.texture);
          crtManager.setGlitch(CRASHED_GLITCH_LEVEL);
          video.pause();
          for (let i = 0; i < 6; i++) audioManager.lockMusicLayer(i);
          scrollManager.lock();
          errorCanvas.start(() => overlay.show());
        }
      }
    },

    dispose: () => {
      transitionTimeline.kill();
      trigger.kill();
      errorCanvas.stop();
      overlay.dispose();
      disposeVideo();
      errorCanvas.texture.dispose();
      // Déverrouille le scroll si la section est détruite alors que le crash était actif
      scrollManager.start();
      // Note : le CRT mesh n'est PAS disposé ici — il est global et géré par main.ts
    },
  };
};

export default initGruntSection;
