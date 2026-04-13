// Câblage des contrôles interactifs de la section MPC.
// Chaque fonction setup* attache des écouteurs d'événements et retourne
// un cleanup (() => void) à appeler dans dispose().

import { Howl, Howler } from 'howler';
import { createRecorder } from './recorder';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Volume de base des pads percussifs (0–1). Suivi par le potard de volume. */
export const PAD_BASE_VOLUME = 0.9;

/** Durée du flash visuel d'un pad après frappe (ms). */
const PAD_FLASH_DURATION_MS = 150;

// ── Helpers partagés ──────────────────────────────────────────────────────────

/**
 * Déclenche un pad : ajoute la classe active, joue le son, retire la classe après le flash.
 *
 * @param padButtons - NodeList des boutons .mpc-pad-wrapper
 * @param padSounds  - Sons Howl associés à chaque pad (même index)
 * @param i          - Index du pad à déclencher
 */
export const triggerPad = (
  padButtons: NodeListOf<HTMLButtonElement>,
  padSounds: Howl[],
  i: number,
): void => {
  const btn = padButtons[i];
  if (!btn) return;
  btn.classList.add('mpc-pad-wrapper--active');
  padSounds[i]?.play();
  setTimeout(() => btn.classList.remove('mpc-pad-wrapper--active'), PAD_FLASH_DURATION_MS);
};

// ── Fonctions de câblage ──────────────────────────────────────────────────────

/** Câble les trois boutons de boucle (KICK / SNARE / HI-HAT) avec toggle audio. */
export const setupLoopButtons = (
  mpcRoot: HTMLElement,
  audioManager: { lockMusicLayer: (i: number) => void; unlockMusicLayer: (i: number) => void },
): (() => void) => {
  const cleanups: (() => void)[] = [];
  mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-loop-btn').forEach((btn) => {
    const layer = Number(btn.dataset.layer);
    const onClick = () => {
      if (btn.classList.contains('mpc-loop-btn--active')) {
        btn.classList.remove('mpc-loop-btn--active');
        audioManager.lockMusicLayer(layer);
      } else {
        btn.classList.add('mpc-loop-btn--active');
        audioManager.unlockMusicLayer(layer);
      }
    };
    btn.addEventListener('click', onClick);
    cleanups.push(() => btn.removeEventListener('click', onClick));
  });
  return () => cleanups.forEach((fn) => fn());
};

/**
 * Câble le bouton PLAY : démarre / arrête la cappella (layer 5 = ACAP-luv-resval).
 * @param acapLayer     Index de la layer a cappella dans audioManager (5 = ACAP-luv-resval)
 * @param isAcapPlayingRef  Référence partagée indiquant si la cappella est en cours de lecture
 * @param syncCrtVideo  Fonction qui synchronise la vidéo du CRT avec l'état de lecture
 */
export const setupPlayButton = (
  mpcRoot: HTMLElement,
  audioManager: { lockMusicLayer: (i: number) => void; unlockMusicLayer: (i: number) => void },
  acapLayer: number,
  isAcapPlayingRef: { value: boolean },
  syncCrtVideo: (active: boolean) => void,
): (() => void) => {
  const playBtn = mpcRoot.querySelector<HTMLButtonElement>('.mpc-play-btn');
  if (!playBtn) return () => {};

  const onPlayClick = () => {
    if (!isAcapPlayingRef.value) {
      audioManager.unlockMusicLayer(acapLayer);
      isAcapPlayingRef.value = true;
      playBtn.classList.add('mpc-play-btn--active');
      playBtn.setAttribute('aria-label', 'Arrêt');
      syncCrtVideo(true);
    } else {
      audioManager.lockMusicLayer(acapLayer);
      isAcapPlayingRef.value = false;
      playBtn.classList.remove('mpc-play-btn--active');
      playBtn.setAttribute('aria-label', 'Lecture');
      syncCrtVideo(false);
    }
  };

  playBtn.addEventListener('click', onPlayClick);
  return () => playBtn.removeEventListener('click', onPlayClick);
};

/**
 * Câble le potard de volume : drag vertical (haut = +volume) et molette.
 * @param padSounds  Sons des pads percussifs — leur volume suit également le potard
 */
export const setupVolumeKnob = (
  mpcRoot: HTMLElement,
  audioManager: { setMusicVolume: (v: number) => void },
  padSounds: Howl[],
): (() => void) => {
  const knob = mpcRoot.querySelector<HTMLElement>('.mpc-knob');
  const knobRing = mpcRoot.querySelector<HTMLElement>('.mpc-knob-ring');
  if (!knob || !knobRing) return () => {};

  let isDragging = false;
  let dragStartY = 0;
  let currentVolume = 1; // 0–1

  const volumeToAngle = (vol: number) => vol * 270 - 135; // -135° (min) → +135° (max)

  const updateKnob = (vol: number) => {
    currentVolume = Math.max(0, Math.min(1, vol));
    knobRing.style.setProperty('--knob-angle', `${volumeToAngle(currentVolume)}deg`);
    audioManager.setMusicVolume(currentVolume);
    padSounds.forEach((sound) => sound.volume(currentVolume * PAD_BASE_VOLUME));
    knob.setAttribute('aria-valuenow', String(Math.round(currentVolume * 100)));
  };
  updateKnob(1);

  const onMouseDown = (e: MouseEvent) => {
    isDragging = true;
    dragStartY = e.clientY;
    e.preventDefault();
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY - e.clientY; // drag up = volume +
    dragStartY = e.clientY;
    updateKnob(currentVolume + deltaY * 0.005);
  };
  const onMouseUp = () => { isDragging = false; };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    updateKnob(currentVolume - e.deltaY * 0.001);
  };

  knob.addEventListener('mousedown', onMouseDown);
  knob.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return () => {
    knob.removeEventListener('mousedown', onMouseDown);
    knob.removeEventListener('wheel', onWheel);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
};

/** Câble le bouton MUTE et synchronise l'état avec la touche M. */
export const setupMuteButton = (
  mpcRoot: HTMLElement,
  audioManager: { isMuted: () => boolean; toggleMute: () => void },
): (() => void) => {
  const muteBtn = mpcRoot.querySelector<HTMLButtonElement>('.mpc-mute-btn');
  if (!muteBtn) return () => {};

  const syncMuteBtn = () => {
    const muted = audioManager.isMuted();
    muteBtn.classList.toggle('mpc-mute-btn--active', muted);
    muteBtn.setAttribute('aria-label', muted ? 'Activer le son' : 'Désactiver le son');
  };
  const onMuteClick = () => { audioManager.toggleMute(); syncMuteBtn(); };
  // Sync-only : main.ts a déjà appelé toggleMute() (listener window enregistré avant).
  // On écoute aussi sur window pour garantir que notre listener s'exécute après le sien
  // (les listeners window se déclenchent dans l'ordre d'enregistrement).
  const onMuteKey = (e: KeyboardEvent) => {
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) syncMuteBtn();
  };

  muteBtn.addEventListener('click', onMuteClick);
  window.addEventListener('keydown', onMuteKey);
  return () => {
    muteBtn.removeEventListener('click', onMuteClick);
    window.removeEventListener('keydown', onMuteKey);
  };
};

/**
 * Gèle toutes les boucles actives, le sample de fond (layer 0) et la cappella.
 *
 * Effets de bord :
 * - Toutes les layers de boucle visiblement actives (.mpc-loop-btn--active) sont
 *   lockées et leur index mémorisé dans frozenLayersRef pour la reprise.
 * - La layer 0 (SAMPLE de fond) est lockée explicitement car elle ne possède pas
 *   de bouton UI dédié — elle tourne en continu depuis l'entrée dans la section.
 * - Si la cappella (acapLayer) était active, elle est lockée et wasAcapPlayingRef
 *   est mémorisé pour la restaurer lors de resumePlayback.
 * - Le bouton STOP passe à l'état actif et mpcRoot.dataset.stopped est positionné
 *   à "true" pour permettre aux raccourcis clavier de détecter l'état gelé.
 *
 * @param mpcRoot           - Racine DOM de la MPC (contient les boutons de boucle)
 * @param audioManager      - Interface audio (lockMusicLayer)
 * @param acapLayer         - Index de la layer a cappella (5 = ACAP-luv-resval)
 * @param isAcapPlayingRef  - Référence partagée indiquant si la cappella joue
 * @param syncCrtVideo      - Synchronise la vidéo CRT avec l'état de lecture
 * @param frozenLayersRef   - Sortie : indices des layers gelées (pour resumePlayback)
 * @param wasAcapPlayingRef - Sortie : état de la cappella avant gel (pour resumePlayback)
 * @param stopBtn           - Bouton STOP (mis à jour visuellement)
 * @param playBtn           - Bouton PLAY (mis à jour si cappella était active)
 */
export const freezePlayback = (
  mpcRoot: HTMLElement,
  audioManager: { lockMusicLayer: (i: number) => void },
  acapLayer: number,
  isAcapPlayingRef: { value: boolean },
  syncCrtVideo: (active: boolean) => void,
  frozenLayersRef: { value: number[] },
  wasAcapPlayingRef: { value: boolean },
  stopBtn: HTMLButtonElement,
  playBtn: HTMLButtonElement | null,
) => {
  frozenLayersRef.value = [];
  mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-loop-btn--active').forEach((btn) => {
    const layer = Number(btn.dataset.layer);
    frozenLayersRef.value.push(layer);
    btn.classList.remove('mpc-loop-btn--active');
    audioManager.lockMusicLayer(layer);
  });
  // Layer 0 = SAMPLE de fond : sans bouton UI dédié, elle doit être gelée explicitement.
  audioManager.lockMusicLayer(0);
  wasAcapPlayingRef.value = isAcapPlayingRef.value;
  if (isAcapPlayingRef.value) {
    audioManager.lockMusicLayer(acapLayer);
    isAcapPlayingRef.value = false;
    playBtn?.classList.remove('mpc-play-btn--active');
    playBtn?.setAttribute('aria-label', 'Lecture');
    syncCrtVideo(false);
  }
  stopBtn.classList.add('mpc-stop-btn--active');
  stopBtn.setAttribute('aria-label', 'Relancer les boucles');
  mpcRoot.dataset.stopped = 'true';
};

/**
 * Reprend les boucles gelées par freezePlayback depuis le début (seek à 0).
 *
 * Effets de bord :
 * - Chaque layer mémorisée dans frozenLayersRef est seekée à 0 puis déverrouillée ;
 *   son bouton UI est remis à l'état actif.
 * - La layer 0 (SAMPLE de fond) est seekée à 0 et déverrouillée explicitement,
 *   symétrique de son traitement dans freezePlayback.
 * - Si wasAcapPlayingRef indique que la cappella jouait avant le gel, elle est
 *   également seekée à 0 et relancée, et le bouton PLAY est restauré.
 * - Le volume du potard est réappliqué via setMusicVolume car lockMusicLayer peut
 *   remettre le volume interne à zéro selon l'implémentation de l'audioManager.
 * - Le bouton STOP repasse à l'état inactif et mpcRoot.dataset.stopped est supprimé.
 *
 * @param mpcRoot           - Racine DOM de la MPC
 * @param audioManager      - Interface audio (seek, unlock, setVolume)
 * @param acapLayer         - Index de la layer a cappella (5 = ACAP-luv-resval)
 * @param currentVolume     - Volume courant du potard à réappliquer (0–1)
 * @param isAcapPlayingRef  - Référence partagée indiquant si la cappella joue
 * @param syncCrtVideo      - Synchronise la vidéo CRT avec l'état de lecture
 * @param frozenLayersRef   - Entrée : indices des layers à reprendre (rempli par freezePlayback)
 * @param wasAcapPlayingRef - Entrée : état de la cappella avant gel (rempli par freezePlayback)
 * @param stopBtn           - Bouton STOP (mis à jour visuellement)
 * @param playBtn           - Bouton PLAY (mis à jour si cappella doit reprendre)
 */
export const resumePlayback = (
  mpcRoot: HTMLElement,
  audioManager: {
    seekMusicLayer: (i: number, t: number) => void;
    unlockMusicLayer: (i: number) => void;
    setMusicVolume: (v: number) => void;
  },
  acapLayer: number,
  currentVolume: number,
  isAcapPlayingRef: { value: boolean },
  syncCrtVideo: (active: boolean) => void,
  frozenLayersRef: { value: number[] },
  wasAcapPlayingRef: { value: boolean },
  stopBtn: HTMLButtonElement,
  playBtn: HTMLButtonElement | null,
) => {
  frozenLayersRef.value.forEach((layer) => {
    const btn = mpcRoot.querySelector<HTMLButtonElement>(`.mpc-loop-btn[data-layer="${layer}"]`);
    btn?.classList.add('mpc-loop-btn--active');
    audioManager.seekMusicLayer(layer, 0);
    audioManager.unlockMusicLayer(layer);
  });
  audioManager.seekMusicLayer(0, 0);
  // Layer 0 = SAMPLE de fond : déverrouillée explicitement, symétrique de freezePlayback.
  audioManager.unlockMusicLayer(0);
  if (wasAcapPlayingRef.value) {
    audioManager.seekMusicLayer(acapLayer, 0);
    audioManager.unlockMusicLayer(acapLayer);
    isAcapPlayingRef.value = true;
    playBtn?.classList.add('mpc-play-btn--active');
    playBtn?.setAttribute('aria-label', 'Arrêt');
    syncCrtVideo(true);
  }
  audioManager.setMusicVolume(currentVolume); // ré-applique le volume du potard
  stopBtn.classList.remove('mpc-stop-btn--active');
  stopBtn.setAttribute('aria-label', 'Arrêt des boucles');
  delete mpcRoot.dataset.stopped;
};

/**
 * Câble le bouton STOP : alterne entre gel et reprise de toutes les boucles + cappella.
 * @param isStopActiveRef  Référence partagée indiquant si le STOP est actif (partagée avec setupKeyboardShortcuts)
 * @param getVolume        Fonction qui lit le volume courant du potard, pour le réappliquer à la reprise
 */
export const setupStopButton = (
  mpcRoot: HTMLElement,
  audioManager: {
    lockMusicLayer: (i: number) => void;
    seekMusicLayer: (i: number, t: number) => void;
    unlockMusicLayer: (i: number) => void;
    setMusicVolume: (v: number) => void;
  },
  acapLayer: number,
  isAcapPlayingRef: { value: boolean },
  syncCrtVideo: (active: boolean) => void,
  getVolume: () => number,
  isStopActiveRef: { value: boolean },
): (() => void) => {
  const stopBtn = mpcRoot.querySelector<HTMLButtonElement>('.mpc-stop-btn');
  if (!stopBtn) return () => {};

  const playBtn = mpcRoot.querySelector<HTMLButtonElement>('.mpc-play-btn');
  const frozenLayersRef = { value: [] as number[] };
  const wasAcapPlayingRef = { value: false };

  const onStopClick = () => {
    if (!isStopActiveRef.value) {
      isStopActiveRef.value = true;
      freezePlayback(mpcRoot, audioManager, acapLayer, isAcapPlayingRef, syncCrtVideo, frozenLayersRef, wasAcapPlayingRef, stopBtn, playBtn);
    } else {
      isStopActiveRef.value = false;
      resumePlayback(mpcRoot, audioManager, acapLayer, getVolume(), isAcapPlayingRef, syncCrtVideo, frozenLayersRef, wasAcapPlayingRef, stopBtn, playBtn);
    }
  };

  stopBtn.addEventListener('click', onStopClick);
  return () => stopBtn.removeEventListener('click', onStopClick);
};

/** Câble le bouton RECORD : capture audio → téléchargement .wav. */
export const setupRecordButton = (
  mpcRoot: HTMLElement,
): (() => void) => {
  const recordBtn = mpcRoot.querySelector<HTMLButtonElement>('.mpc-record-btn');
  if (!recordBtn) return () => {};

  const recorder = createRecorder(Howler.ctx as AudioContext, Howler.masterGain as GainNode);
  const onRecordClick = () => {
    if (!recorder.isActive()) {
      recorder.start();
      recordBtn.classList.add('is-recording');
      recordBtn.setAttribute('aria-label', "Arrêter l'enregistrement");
    } else {
      recorder.stop();
      recordBtn.classList.remove('is-recording');
      recordBtn.setAttribute('aria-label', "Démarrer l'enregistrement");
    }
  };
  recordBtn.addEventListener('click', onRecordClick);
  return () => {
    recordBtn.removeEventListener('click', onRecordClick);
    if (recorder.isActive()) recorder.stop();
  };
};

/** Câble les 6 pads : feedback visuel + son dédié au clic. */
export const setupPads = (
  mpcRoot: HTMLElement,
  padSounds: Howl[],
): (() => void) => {
  const padButtons = mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-pad-wrapper');
  const cleanups: (() => void)[] = [];

  padButtons.forEach((btn, i) => {
    const onClick = () => triggerPad(padButtons, padSounds, i);
    btn.addEventListener('click', onClick);
    cleanups.push(() => btn.removeEventListener('click', onClick));
  });

  return () => cleanups.forEach((fn) => fn());
};

/**
 * Câble les raccourcis clavier : R/T/Y → loops (via click), U/I/O / J/K/L → pads.
 * @param isStopActiveRef  Référence partagée avec setupStopButton — désactive les touches quand STOP est actif
 */
export const setupKeyboardShortcuts = (
  mpcRoot: HTMLElement,
  padSounds: Howl[],
  isStopActiveRef: { value: boolean },
): (() => void) => {
  const padButtons = mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-pad-wrapper');

  // Mapping clavier → loops (R/T/Y + Numpad7/8/9)
  const KEY_LOOP_MAP: Record<string, number> = {
    KeyR: 1, KeyT: 2, KeyY: 3,
    Numpad7: 1, Numpad8: 2, Numpad9: 3,
  };

  // Mapping clavier → pads
  // U/I/O → row du haut (PAD 4/5/6, indices 0/1/2)
  // J/K/L → row du bas  (PAD 1/2/3, indices 3/4/5)
  const KEY_PAD_MAP: Record<string, number> = {
    KeyU: 0, KeyI: 1, KeyO: 2,
    KeyJ: 3, KeyK: 4, KeyL: 5,
    Numpad4: 0, Numpad5: 1, Numpad6: 2,
    Numpad1: 3, Numpad2: 4, Numpad3: 5,
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const loopLayer = KEY_LOOP_MAP[e.code];
    if (loopLayer !== undefined && !isStopActiveRef.value) {
      const btn = mpcRoot.querySelector<HTMLButtonElement>(`.mpc-loop-btn[data-layer="${loopLayer}"]`);
      btn?.click();
      return;
    }
    const idx = KEY_PAD_MAP[e.code];
    if (idx !== undefined && !isStopActiveRef.value) triggerPad(padButtons, padSounds, idx);
  };

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
};
