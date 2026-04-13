// Section 04 "MPC" : beatmaker interactif inspiré d'une vraie machine à rythmes.
// L'utilisateur peut activer des boucles (kick, snare, hihat), jouer des pads percussifs,
// lancer la cappella de Luv Resval, régler le volume, couper le son et enregistrer.
// Affiche aussi une visualisation de la forme d'onde audio en temps réel.

import { Howl } from 'howler';
import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';
import { publicUrl } from '../../utils/publicUrl';
import { createMpcCrtSync } from './mpcCrtSync';
import { buildMpcDom, startWaveform, PADS } from './mpcDom';
import {
  PAD_BASE_VOLUME,
  setupLoopButtons,
  setupPlayButton,
  setupVolumeKnob,
  setupMuteButton,
  setupStopButton,
  setupRecordButton,
  setupPads,
  setupKeyboardShortcuts,
} from './mpcControls';

// ── Section initializer ───────────────────────────────────────────────────────

/**
 * Initialise la section beatmaker MPC (section 04).
 *
 * Construit et monte le DOM de la MPC (boutons de boucle, pads, potard volume,
 * mute, stop, record), câble tous les contrôles et démarre la visualisation waveform.
 * La logique est entièrement event-driven : aucun traitement par frame n'est nécessaire.
 *
 * Effets de bord au montage :
 * - Injecte mpcRoot dans sectionElement
 * - Démarre un ResizeObserver pour adapter l'échelle CSS de la MPC au viewport
 * - Lance la visualisation waveform via requestAnimationFrame
 * - Précharge les sons des pads (Howl avec preload: true)
 */
const initBeatmakerSection: SectionInitializer = (context) => {
  const { audioManager, scrollManager, crtManager } = context;
  const sectionElement = document.querySelector(getSectionSelector(SECTION_IDS.MPC));

  if (!(sectionElement instanceof HTMLElement)) {
    return { update: () => {}, dispose: () => {} };
  }

  sectionElement.dataset.state = 'active';

  const ACAP_LAYER = 5;

  // ── Sync vidéo Grünt ↔ CRT (ScrollTrigger + VideoTexture) ────────────────
  const isAcapPlayingRef = { value: false };
  const crtSync = createMpcCrtSync(
    sectionElement,
    scrollManager,
    audioManager,
    crtManager,
    ACAP_LAYER,
    () => isAcapPlayingRef.value,
  );
  const { syncCrtVideo } = crtSync;

  const mpcRoot = buildMpcDom();
  sectionElement.appendChild(mpcRoot);

  // Responsive scale — ajuste la taille au viewport.
  // CSS variable utilisée dans le transform: scale() du root pour un rendu net
  // (un scale CSS est plus précis qu'un recalcul de layout en JS).
  const MPC_NATURAL_W = 388; // 372 + 2 * 8px padding body
  const MPC_NATURAL_H = 356; // hauteur naturelle approximative
  const applyScale = () => {
    const availW = sectionElement.clientWidth * 0.9;
    const availH = sectionElement.clientHeight * 0.85;
    const scale = Math.min(availW / MPC_NATURAL_W, availH / MPC_NATURAL_H, 1.8);
    mpcRoot.style.setProperty('--mpc-scale', scale.toFixed(3));
  };
  const ro = new ResizeObserver(applyScale);
  ro.observe(sectionElement);
  applyScale();

  const waveformCanvas = mpcRoot.querySelector<HTMLCanvasElement>('.mpc-waveform-canvas');
  const stopWaveform = waveformCanvas ? startWaveform(waveformCanvas) : null;

  // Sons des pads — déclarés avant setupVolumeKnob qui en a besoin
  const padSounds = PADS.map(({ file }) =>
    new Howl({ src: [publicUrl(`audio/pads/${file}`)], volume: PAD_BASE_VOLUME, pool: 2, preload: true }),
  );

  // Volume courant partagé entre setupVolumeKnob et setupStopButton
  let currentVolume = 1;

  // État stop partagé avec setupKeyboardShortcuts
  const isStopActiveRef = { value: false };

  // ── Câblage des contrôles ─────────────────────────────────────────────────
  const cleanupLoops    = setupLoopButtons(mpcRoot, audioManager);
  const cleanupPlay     = setupPlayButton(mpcRoot, audioManager, ACAP_LAYER, isAcapPlayingRef, syncCrtVideo);
  const cleanupKnob     = setupVolumeKnob(mpcRoot, { setMusicVolume: (v) => { currentVolume = v; audioManager.setMusicVolume(v); } }, padSounds);
  const cleanupMute     = setupMuteButton(mpcRoot, audioManager);
  const cleanupStop     = setupStopButton(mpcRoot, audioManager, ACAP_LAYER, isAcapPlayingRef, syncCrtVideo, () => currentVolume, isStopActiveRef);
  const cleanupRecord   = setupRecordButton(mpcRoot);
  const cleanupPads     = setupPads(mpcRoot, padSounds);
  const cleanupKeyboard = setupKeyboardShortcuts(mpcRoot, padSounds, isStopActiveRef);

  return {
    // Toute la logique est event-driven — aucun traitement nécessaire par frame.
    update: () => {},
    dispose: () => {
      crtSync.dispose();
      stopWaveform?.();
      ro.disconnect();
      cleanupLoops();
      cleanupPlay();
      cleanupKnob();
      cleanupMute();
      cleanupStop();
      cleanupRecord();
      cleanupPads();
      cleanupKeyboard();
      padSounds.forEach((s) => s.unload());
      mpcRoot.remove();
      delete sectionElement.dataset.state;
    },
  };
};

export default initBeatmakerSection;
