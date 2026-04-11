// Synchronise la vidéo Grünt #45 avec l'écran CRT pendant la section MPC.
// Quand l'utilisateur lance la cappella, la vidéo du rappeur apparaît sur la télévision,
// synchronisée avec la position audio. Gère aussi le flou du CRT et la restauration
// de l'écran quand on quitte ou revient dans la section.

import type { VideoTexture } from 'three';
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

  let isMpcInViewport = false;

  const setInViewport = (inViewport: boolean) => {
    isMpcInViewport = inViewport;
  };

  /** Synchronise la vidéo Grünt sur le CRT quand la cappella est activée/désactivée. */
  const syncCrtVideo = (cappellaOn: boolean) => {
    if (!isMpcInViewport) return;
    if (cappellaOn) {
      const cappellaPos = audioManager.getMusicLayerPosition(acapLayer);
      video.currentTime = CLIP_START_IN_SONG_SECONDS + cappellaPos % CLIP_DURATION_SECONDS;
      void video.play().catch(() => undefined);
      crtManager.setContentTexture(videoTexture);
    } else {
      video.pause();
      // Écran noir : on remet la texture hero (invisible car blur=0.85)
      crtManager.setContentTexture(crtManager.getHeroCanvasTexture());
    }
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
      // z reste à -2.5 (hérité du parallax hero→hub) — crash outro le ramènera à 0
    },
    onLeaveBack: () => {
      isMpcInViewport = false;
      crtManager.resetEffects();
      crtManager.setFade(1);
      crtManager.setContentTexture(crtManager.getHeroCanvasTexture());
      video.pause();
    },
    onEnterBack: () => {
      isMpcInViewport = true;
      crtManager.setFade(0.3);
      crtManager.setBlur(0.85);
      // Restaurer la vidéo si la cappella était active
      if (getIsAcapPlaying()) {
        syncCrtVideo(true);
      }
    },
    onLeave: () => {
      isMpcInViewport = false;
      // Note : on ne reset pas le blur ici — crashOutro.onEnter fera resetEffects()
    },
  });

  return {
    videoTexture,
    syncCrtVideo,
    setInViewport,
    dispose: () => {
      crtTrigger.kill();
      disposeVideo();
    },
  };
};
