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

  // TODO: cette méthode DOIT être appelée depuis un gestionnaire d'événement
  // utilisateur (clic, touche) pour satisfaire la politique autoplay des navigateurs.
  // Sans interaction préalable, Howler ne peut pas démarrer la lecture audio.
  const startExperience = (): void => {
    if (_experienceStarted) return;
    _experienceStarted = true;
    _musicLayers.forEach((layer) => {
      layer.play();
    });
    _musicLayers[0]?.fade(0, MUSIC_LAYER_VOLUME, LAYER_FADE_DURATION_MS);
  };

  const unlockMusicLayer = (index: number): void => {
    const layer = _musicLayers[index];
    if (!layer) return;
    _lockedLayers.delete(index);
    layer.volume(MUSIC_LAYER_VOLUME);
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

  const dispose = (): void => {
    _musicLayers.forEach((layer) => layer.unload());
    _uiFx.unload();
  };

  return {
    startExperience,
    unlockMusicLayer,
    lockMusicLayer,
    playUiFx,
    setMusicVolume,
    toggleMute,
    isMuted,
    dispose,
  };
};
