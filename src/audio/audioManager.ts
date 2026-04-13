// Gère toute la musique du site.
// Six pistes audio jouent en boucle de façon synchronisée.
// La piste de base est toujours active ; les autres (kick, snare, hihat, cappella)
// se débloquent progressivement via les boutons de la MPC.
// Gère aussi le volume global, le mute (touche M) et les effets sonores de l'interface.

import { Howl, Howler } from 'howler';
import type { AudioManager } from './types';
import { publicUrl } from '../utils/publicUrl';

const MUSIC_BASE_PATH = publicUrl('audio/music/');
const FX_BASE_PATH = publicUrl('audio/fx/');

// Volume cible de chaque layer une fois débloquée
const MUSIC_LAYER_VOLUME = 1;
// Durée du fade-in lors du débloquage d'une layer (ms)
const LAYER_FADE_DURATION_MS = 1200;

const MUSIC_TRACKS = [
  `${MUSIC_BASE_PATH}SAMPLE.wav`,
  `${MUSIC_BASE_PATH}DRUMS-loop-kick.wav`,
  `${MUSIC_BASE_PATH}DRUMS-loop-snare.wav`,
  `${MUSIC_BASE_PATH}DRUMS-loop-hihat.wav`,
  `${MUSIC_BASE_PATH}EVIL_SAMPLE.wav`,
  `${MUSIC_BASE_PATH}ACAP-luv-resval.wav`,
] as const;

/**
 * Crée le gestionnaire audio central du site.
 *
 * Démarre six pistes synchronisées (sample de fond, kick, snare, hihat, evil sample,
 * a cappella). La piste de base (layer 0) est toujours active ; les autres se débloquent
 * via lockMusicLayer / unlockMusicLayer (boutons MPC, progression de l'expérience).
 * Gère aussi le volume global, le mute (touche M) et les effets sonores de l'interface.
 *
 * @returns Interface AudioManager pour piloter la lecture, le volume et le mute
 */
export const createAudioManager = (): AudioManager => {
  let _isMuted = false;
  let _experienceStarted = false;
  const _lockedLayers = new Set<number>();

  const _musicLayers = MUSIC_TRACKS.map((src) =>
    new Howl({
      src: [src],
      loop: true,
      volume: 0,
      preload: true,
    }),
  );

  const _uiFx = new Howl({
    src: [`${FX_BASE_PATH}SFX-hover-link.wav`],
    volume: 0.5,
    pool: 4,
    preload: true,
  });

  // Note : cette méthode doit être appelée depuis un gestionnaire d'événement utilisateur
  // (clic, touche) pour respecter la politique autoplay des navigateurs modernes.
  // Sans interaction préalable de l'utilisateur, Howler ne peut pas démarrer la lecture audio.
  const startExperience = (): void => {
    if (_experienceStarted) return;
    _experienceStarted = true;
    // Layers 1-5 sont verrouillées au départ : seul le débloquage explicite (loop/play buttons)
    // les rend audibles. Sans ça, setMusicVolume les passerait à volume 1 dès l'init du potard.
    _musicLayers.forEach((layer, i) => {
      layer.play();
      if (i !== 0) _lockedLayers.add(i);
    });
    _musicLayers[0]?.fade(0, MUSIC_LAYER_VOLUME, LAYER_FADE_DURATION_MS);
  };

  const resetExperienceAudio = (): void => {
    _musicLayers.forEach((layer, index) => {
      layer.stop();
      layer.seek(0);
      layer.volume(0);
      if (index !== 0) {
        _lockedLayers.add(index);
      }
    });
    _lockedLayers.delete(0);
    _experienceStarted = false;
  };

  const unlockMusicLayer = (index: number): void => {
    const layer = _musicLayers[index];
    if (!layer) return;
    _lockedLayers.delete(index);
    layer.volume(MUSIC_LAYER_VOLUME);
  };

  const fadeMusicLayerIn = (index: number, durationMs: number): void => {
    const layer = _musicLayers[index];
    if (!layer) return;
    _lockedLayers.delete(index);
    // Partir du volume courant pour éviter une coupure brutale si la layer
    // est déjà active (ex. : re-entrée dans la section crash outro après un
    // onLeaveBack). Howl.volume() retourne la valeur courante sans argument.
    const currentVol = layer.volume() as number;
    if (currentVol >= MUSIC_LAYER_VOLUME) return; // déjà au max, rien à faire
    layer.fade(currentVol, MUSIC_LAYER_VOLUME, durationMs);
  };

  const lockMusicLayer = (index: number): void => {
    const layer = _musicLayers[index];
    if (!layer) return;
    _lockedLayers.add(index);
    layer.volume(0);
  };

  const playUiFx = (): void => {
    _uiFx.play();
  };

  const setMusicVolume = (volume: number): void => {
    const clamped = Math.max(0, Math.min(1, volume));
    _musicLayers.forEach((layer, index) => {
      if (!_lockedLayers.has(index)) layer.volume(clamped);
    });
  };

  const toggleMute = (): boolean => {
    _isMuted = !_isMuted;
    Howler.volume(_isMuted ? 0 : 1);
    return _isMuted;
  };

  const isMuted = (): boolean => _isMuted;

  const seekMusicLayer = (index: number, seconds: number): void => {
    const layer = _musicLayers[index];
    if (!layer) return;
    layer.seek(seconds);
  };

  const getMusicLayerPosition = (index: number): number => {
    const layer = _musicLayers[index];
    if (!layer) return 0;
    const pos = layer.seek();
    return typeof pos === 'number' ? pos : 0;
  };

  const dispose = (): void => {
    _musicLayers.forEach((layer) => layer.unload());
    _uiFx.unload();
  };

  return {
    startExperience,
    resetExperienceAudio,
    unlockMusicLayer,
    fadeMusicLayerIn,
    lockMusicLayer,
    playUiFx,
    setMusicVolume,
    toggleMute,
    isMuted,
    seekMusicLayer,
    getMusicLayerPosition,
    dispose,
  };
};
