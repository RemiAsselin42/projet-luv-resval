// Synchronise la vidéo Grünt #45 avec l'écran CRT pendant la section MPC.
// Quand l'utilisateur lance la cappella, la vidéo du rappeur apparaît sur la télévision,
// synchronisée avec la position audio. Gère aussi le flou du CRT et la restauration
// de l'écran quand on quitte ou revient dans la section.

import { DataTexture, RGBAFormat, UnsignedByteType, type VideoTexture } from 'three';
import type { ScrollManager } from '../../core/scrollManager';
import type { AudioManager } from '../../audio/types';
import type { CrtManager } from '../../crt/crtManager';
import { createGruntVideoTexture } from '../../utils/gruntVideoTexture';
import { CLIP_DURATION_SECONDS, CLIP_START_IN_SONG_SECONDS } from '../../constants/grunt';

export interface MpcCrtSync {
  /** La texture vidéo Three.js à passer à crtManager.setContentTexture(). */
  readonly videoTexture: VideoTexture;
  /**
   * Synchronise la vidéo Grünt sur le CRT quand la cappella est activée/désactivée.
   * Ne fait rien si la MPC n'est pas dans le viewport.
   */
  syncCrtVideo: (cappellaOn: boolean) => void;
  /**
   * Notifie un changement de volume global (potard MPC).
   * Si volume ≤ 0, affiche un écran noir avec bruit CRT à la place de la vidéo.
   */
  notifyVolumeChange: (volume: number) => void;
  /** Met à jour isMpcInViewport (à appeler depuis syncCrtVideo si besoin externe). */
  setInViewport: (inViewport: boolean) => void;
  /** Tue le ScrollTrigger CRT et libère la videoTexture + l'élément video. */
  dispose: () => void;
}

/**
 * Crée et gère la synchronisation vidéo Grünt ↔ CRT pour la section MPC.
 *
 * Responsabilités :
 *   - Création de l'élément <video> et de la VideoTexture Three.js
 *   - ScrollTrigger qui applique blur/fade au CRT quand la MPC est visible
 *   - syncCrtVideo() : positionne la vidéo sur la cappella et bascule la texture CRT
 *
 * @param sectionElement  L'élément HTML racine de la section MPC
 * @param scrollManager   Gestionnaire de scroll (pour createTrigger)
 * @param audioManager    Gestionnaire audio (pour getMusicLayerPosition)
 * @param crtManager      Gestionnaire CRT (pour setContentTexture, setFade, setBlur…)
 * @param acapLayer       Index de la layer cappella dans audioManager (défaut : 5)
 * @param getIsAcapPlaying  Callback pour savoir si la cappella est active (onEnterBack)
 */
export const createMpcCrtSync = (
  sectionElement: HTMLElement,
  scrollManager: ScrollManager,
  audioManager: AudioManager,
  crtManager: CrtManager,
  acapLayer: number,
  getIsAcapPlaying: () => boolean,
): MpcCrtSync => {
  // ── Vidéo Grünt (affichée floutée derrière la MPC) ────────────────────────
  const { video, videoTexture, dispose: disposeVideo } = createGruntVideoTexture();

  // Valide que CLIP_DURATION_SECONDS est cohérent avec le fichier vidéo réel.
  // Un écart > 5 s indiquerait que l'asset a changé sans que la constante soit mise à jour.
  video.addEventListener('loadedmetadata', () => {
    if (Math.abs(video.duration - CLIP_DURATION_SECONDS) > 5) {
      console.warn(
        `[MpcCrtSync] Durée vidéo inattendue : ${video.duration.toFixed(1)}s vs ${CLIP_DURATION_SECONDS}s attendu dans CLIP_DURATION_SECONDS`,
      );
    }
  }, { once: true });

  // Texture noire pour le mode "son coupé" : fond noir + bruit CRT natif du shader.
  // DataTexture 1×1 RGBA (tous octets à 0 = noir opaque) — pas de canvas ni de contexte 2D.
  const blackTexture = new DataTexture(new Uint8Array(4), 1, 1, RGBAFormat, UnsignedByteType);
  blackTexture.needsUpdate = true;

  let isMpcInViewport = false;
  let isAcapPlaying = false;
  let currentVolume = 1;

  const setInViewport = (inViewport: boolean) => {
    isMpcInViewport = inViewport;
  };

  /**
   * Décide ce qu'affiche le CRT selon l'état courant :
   *  - volume ≤ 0      → texture noire (bruit CRT natif visible)
   *  - cappella active → vidéo Grünt synchronisée
   *  - sinon           → texture noire (écran noir, bruit CRT natif)
   */
  const updateDisplay = () => {
    if (!isMpcInViewport) return;
    if (currentVolume <= 0) {
      video.pause();
      crtManager.setContentTexture(blackTexture);
    } else if (isAcapPlaying) {
      const cappellaPos = audioManager.getMusicLayerPosition(acapLayer);
      video.currentTime = CLIP_START_IN_SONG_SECONDS + (cappellaPos % CLIP_DURATION_SECONDS);
      void video.play().catch(() => undefined);
      crtManager.setContentTexture(videoTexture);
    } else {
      video.pause();
      crtManager.setContentTexture(blackTexture);
    }
  };

  /** Synchronise la vidéo Grünt sur le CRT quand la cappella est activée/désactivée. */
  const syncCrtVideo = (cappellaOn: boolean) => {
    if (!isMpcInViewport) return;
    isAcapPlaying = cappellaOn;
    updateDisplay();
  };

  /** Met à jour le volume courant et rafraîchit l'affichage CRT si nécessaire. */
  const notifyVolumeChange = (volume: number) => {
    currentVolume = volume;
    updateDisplay();
  };

  // ── ScrollTrigger : blur CRT quand la MPC est visible ─────────────────────
  const crtTrigger = scrollManager.createTrigger({
    trigger: sectionElement,
    start: 'top 80%',
    end: 'bottom top',
    onEnter: () => {
      isMpcInViewport = true;
      crtManager.resetEffects();
      crtManager.setFade(0.3);
      crtManager.setBlur(0.85);
      // z est animé par crtZParallax (voir main.ts)
      updateDisplay();
    },
    onLeaveBack: () => {
      isMpcInViewport = false;
      video.pause();
      // Remet blur + fade uniquement : on quitte la MPC vers les Reliques.
      // resetEffects() ET setContentTexture() sont évités : l'onEnterBack des Reliques
      // peut avoir déjà posé sa propre texture (ordre GSAP non garanti entre triggers adjacents).
      crtManager.setBlur(0);
      crtManager.setFade(1);
    },
    onEnterBack: () => {
      isMpcInViewport = true;
      crtManager.setFade(0.3);
      crtManager.setBlur(0.85);
      isAcapPlaying = getIsAcapPlaying();
      updateDisplay();
    },
    onLeave: () => {
      isMpcInViewport = false;
      video.pause();
      // Ne pas toucher la texture ici : crashOutro.transitionTimeline.onEnter (top 80%)
      // a déjà posé videoTexture sur le CRT avant que ce trigger (bottom top) ne se déclenche.
      // Écraser avec blackTexture provoquerait un éclair noir sur la transition.
      // crashOutro.onEnter appelle resetEffects() + setFade(1) pour nettoyer blur/fade.
    },
  });

  return {
    videoTexture,
    syncCrtVideo,
    notifyVolumeChange,
    setInViewport,
    dispose: () => {
      crtTrigger.kill();
      blackTexture.dispose();
      disposeVideo();
    },
  };
};
