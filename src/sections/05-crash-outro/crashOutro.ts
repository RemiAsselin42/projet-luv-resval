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
const EVIL_SAMPLE_LAYER = 4;
const ACAP_CURSED_LAYER = 6;
const GLITCH_RAMP_SECONDS = 20; // durée du glitch progressif avant le crash total
const AUDIO_CROSSFADE_MS = 3000;
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

// ── Seuils de scroll ─────────────────────────────────────────────────────────
const TRANSITION_START  = 'top 80%';  // début du scrub blur/fade/z
const TRANSITION_END    = 'top 20%';  // fin du scrub → début de la zone glitch
const SECTION_END       = 'bottom top'; // bas de section (sortie vers le bas)

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

  /** Positionne la vidéo en synchronie avec la cappella (loop-aware). */
  const seekVideoToAudioPosition = () => {
    const cappellaPos = audioManager.getMusicLayerPosition(CAPPELLA_LAYER);
    video.currentTime = CLIP_START_IN_SONG_SECONDS + (cappellaPos % CLIP_DURATION_SECONDS);
  };

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
    // Restaure immédiatement la texture hero pour éviter que l'écran reste noir
    // (errorCanvas vidé = canvas noir) pendant toute la durée de l'animation de scroll.
    // Les callbacks des sections intermédiaires (mpc, reliques) prendront le relai
    // au fil du défilement — reliques.onLeaveBack garantit fade=1 à l'arrivée.
    crtManager.setContentTexture(crtManager.getHeroCanvasTexture());
    audioManager.resetExperienceAudio();
    audioManager.startExperience();
    // Notifie les sections (ex : MPC) qu'elles doivent remettre leur UI à zéro.
    window.dispatchEvent(new CustomEvent('experience-restart'));
  };

  const overlay = createCrashOutroOverlay(scrollManager, errorCanvas.setHovered, BTN_LAYOUT, handleRestart, () => audioManager.playUiFx());

  // ── État du glitch ────────────────────────────────────────────────────────
  type GlitchPhase = 'idle' | 'ramping' | 'crashed';
  let glitchPhase: GlitchPhase = 'idle';
  let glitchAccum = 0;
  let spikeAccum = 0;
  let isInViewport = false;
  // Indique si la cappella était active (volume > 0) au moment de l'entrée dans l'outro,
  // pour savoir si on doit la restaurer lors du onLeaveBack.
  let cappellaWasActive = false;
  // Mémorise quels drums (layers 1-3) étaient actifs à l'entrée dans l'outro.
  // Les drums sont fade-in à l'entrée pour accompagner les versions "cursed" ;
  // au retour arrière on les remet exactement à leur état pré-outro (actifs ou silencieux).
  const drumsWereActive: boolean[] = [false, false, false]; // indices relatifs aux layers 1,2,3

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
      start: TRANSITION_START,
      end: TRANSITION_END,
      scrub: true,
      onEnter: () => {
        // Positionner la vidéo dès le début de la transition (top 80%).
        // Contrainte d'ordre ScrollTrigger : ce trigger (top 80%) se déclenche AVANT
        // le onLeave de mpcCrtSync (bottom top). mpcCrtSync.onLeave ne touche pas la
        // texture pour cette raison — écraser avec blackTexture après ce point
        // provoquerait un éclair noir. Symétrie du commentaire dans mpcCrtSync.onLeave.
        if (glitchPhase === 'idle') {
          seekVideoToAudioPosition();
          crtManager.setContentTexture(videoTexture);
          // Si le crossfade des Reliques a été interrompu (saut depuis le menu),
          // uBlend peut rester à 0 et masquer videoTexture derrière le canvas hero.
          crtManager.setCrossfade(1);
          crtManager.setPowerOn(1);
          void video.play().catch(() => undefined);
        }
      },
      onLeaveBack: () => {
        // Retour en arrière : pause vidéo uniquement.
        // Le scrub inverse automatiquement blur/fade/z vers les valeurs MPC.
        // La MPC onEnterBack se charge de restaurer sa propre texture CRT.
        video.pause();
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
    start: TRANSITION_END,
    end: SECTION_END,
    onEnter: () => {
      isInViewport = true;

      // Garantie : quelle que soit la section précédente, la vidéo est toujours
      // affichée sur le CRT quand le scroll entre pleinement dans l'outro.
      // Nettoie les effets MPC résiduels (blur=0.85, fade=0.3) en cas de saut direct
      // depuis le menu sans passer par Reliques (cf. mpcCrtSync.ts — promesse non tenue).
      crtManager.resetEffects();
      crtManager.setFade(1);
      crtManager.setCrossfade(1);
      crtManager.setContentTexture(videoTexture);
      if (video.paused) {
        seekVideoToAudioPosition();
        void video.play().catch(() => undefined);
      }

      if (glitchPhase !== 'idle') return;

      // Cross-fade vers les versions "cursed" : EVIL_SAMPLE remplace SAMPLE,
      // ACAP-CURSED remplace ACAP-luv-resval. Les drums sont forcés actifs pour
      // accompagner le crash même si l'utilisateur ne les avait pas débloqués sur la MPC.
      // On mémorise l'état pré-outro (cappella + drums) pour l'éventuel retour arrière.
      cappellaWasActive = audioManager.getMusicLayerVolume(CAPPELLA_LAYER) > 0;
      [1, 2, 3].forEach((i) => {
        drumsWereActive[i - 1] = audioManager.getMusicLayerVolume(i) > 0;
      });
      audioManager.fadeMusicLayerOut(0, AUDIO_CROSSFADE_MS);                // SAMPLE → 0
      audioManager.fadeMusicLayerIn(EVIL_SAMPLE_LAYER, AUDIO_CROSSFADE_MS); // EVIL_SAMPLE ↑
      audioManager.fadeMusicLayerOut(CAPPELLA_LAYER, AUDIO_CROSSFADE_MS);   // ACAP → 0
      audioManager.fadeMusicLayerIn(ACAP_CURSED_LAYER, AUDIO_CROSSFADE_MS); // ACAP-CURSED ↑
      [1, 2, 3].forEach((i) => audioManager.fadeMusicLayerIn(i, AUDIO_CROSSFADE_MS));

      glitchPhase = 'ramping';
      glitchAccum = 0;
      spikeAccum = 0;
    },
    onLeaveBack: () => {
      isInViewport = false;
      if (glitchPhase === 'ramping' || glitchPhase === 'crashed') {
        // Inverse le cross-fade : remet SAMPLE en place, coupe les versions cursed.
        // La cappella et les drums ne sont restaurés que s'ils étaient actifs à l'entrée.
        audioManager.fadeMusicLayerIn(0, AUDIO_CROSSFADE_MS);                 // SAMPLE ↑
        audioManager.fadeMusicLayerOut(EVIL_SAMPLE_LAYER, AUDIO_CROSSFADE_MS); // EVIL_SAMPLE → 0
        if (cappellaWasActive) audioManager.fadeMusicLayerIn(CAPPELLA_LAYER, AUDIO_CROSSFADE_MS);
        audioManager.fadeMusicLayerOut(ACAP_CURSED_LAYER, AUDIO_CROSSFADE_MS); // ACAP-CURSED → 0
        [1, 2, 3].forEach((i) => {
          if (!drumsWereActive[i - 1]) audioManager.fadeMusicLayerOut(i, AUDIO_CROSSFADE_MS);
        });
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
          for (let i = 0; i < 7; i++) audioManager.lockMusicLayer(i);
          audioManager.playCrashTypingFx();
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
