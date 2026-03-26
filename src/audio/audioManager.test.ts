import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock howler ───────────────────────────────────────────────────────────────
// Howl : chaque instance expose les méthodes utilisées par audioManager.
// Howler : objet global pour le contrôle du volume maître.

const makeHowlInstance = () => ({
  play: vi.fn(),
  fade: vi.fn(),
  volume: vi.fn(() => 0),
  seek: vi.fn(),
  unload: vi.fn(),
});

// Conserve les instances créées pour les inspecter dans les tests
let howlInstances: ReturnType<typeof makeHowlInstance>[] = [];

vi.mock('howler', () => {
  const HowlMock = vi.fn(() => {
    const instance = makeHowlInstance();
    howlInstances.push(instance);
    return instance;
  });

  const HowlerMock = {
    volume: vi.fn(),
  };

  return { Howl: HowlMock, Howler: HowlerMock };
});

// Mock import.meta.env.BASE_URL (non disponible dans jsdom)
vi.stubGlobal('import', {
  meta: { env: { BASE_URL: '/' } },
});

// Import après les mocks
import { createAudioManager } from './audioManager';
import { Howler } from 'howler';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRACKS_COUNT = 6; // SAMPLE + DRUMS kick/snare/hihat + EVIL_SAMPLE + ACAP

// Réinitialise les instances Howl avant chaque test
beforeEach(() => {
  howlInstances = [];
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createAudioManager — initialisation', () => {
  it('crée exactement 7 instances Howl (6 tracks + 1 fx)', () => {
    createAudioManager();
    // 6 music layers + 1 uiFx
    expect(howlInstances).toHaveLength(TRACKS_COUNT + 1);
  });

  it('démarre en état non-muté', () => {
    const manager = createAudioManager();
    expect(manager.isMuted()).toBe(false);
  });
});

describe('createAudioManager — startExperience()', () => {
  it('appelle play() sur les 6 layers musicaux', () => {
    const manager = createAudioManager();
    manager.startExperience();

    // Les 5 premières instances sont les music layers
    for (let i = 0; i < TRACKS_COUNT; i++) {
      expect(howlInstances[i]?.play).toHaveBeenCalledOnce();
    }
  });

  it('lance un fade-in sur la première layer uniquement', () => {
    const manager = createAudioManager();
    manager.startExperience();

    expect(howlInstances[0]?.fade).toHaveBeenCalledOnce();
    expect(howlInstances[1]?.fade).not.toHaveBeenCalled();
    expect(howlInstances[2]?.fade).not.toHaveBeenCalled();
    expect(howlInstances[3]?.fade).not.toHaveBeenCalled();
    expect(howlInstances[4]?.fade).not.toHaveBeenCalled();
    expect(howlInstances[5]?.fade).not.toHaveBeenCalled();
  });

  it('est idempotent : un second appel n\'a aucun effet', () => {
    const manager = createAudioManager();
    manager.startExperience();
    manager.startExperience();

    // play ne doit être appelé qu'une seule fois par layer
    for (let i = 0; i < TRACKS_COUNT; i++) {
      expect(howlInstances[i]?.play).toHaveBeenCalledOnce();
    }
  });
});

describe('createAudioManager — unlockMusicLayer()', () => {
  it('appelle volume() sur la layer correspondante', () => {
    const manager = createAudioManager();
    manager.unlockMusicLayer(1);

    expect(howlInstances[1]?.volume).toHaveBeenCalledWith(1);
  });

  it('passe MUSIC_LAYER_VOLUME (1) comme valeur', () => {
    const manager = createAudioManager();
    manager.unlockMusicLayer(2);

    expect(howlInstances[2]?.volume).toHaveBeenCalledWith(1);
  });

  it('ne provoque aucune erreur pour un index hors-limites', () => {
    const manager = createAudioManager();
    expect(() => manager.unlockMusicLayer(99)).not.toThrow();
  });

  it('ne provoque aucune erreur pour un index négatif', () => {
    const manager = createAudioManager();
    expect(() => manager.unlockMusicLayer(-1)).not.toThrow();
  });
});

describe('createAudioManager — playUiFx()', () => {
  it('appelle play() sur le Howl fx (7e instance)', () => {
    const manager = createAudioManager();
    manager.playUiFx();

    // La 7e instance (index 6) est le son fx
    expect(howlInstances[6]?.play).toHaveBeenCalledOnce();
  });

  it('peut être appelé plusieurs fois (pooled)', () => {
    const manager = createAudioManager();
    manager.playUiFx();
    manager.playUiFx();
    manager.playUiFx();

    expect(howlInstances[6]?.play).toHaveBeenCalledTimes(3);
  });
});

describe('createAudioManager — setMusicVolume()', () => {
  it('applique le volume sur chaque layer musicale', () => {
    const manager = createAudioManager();
    manager.setMusicVolume(0.7);

    for (let i = 0; i < TRACKS_COUNT; i++) {
      expect(howlInstances[i]?.volume).toHaveBeenCalledWith(0.7);
    }
  });

  it('clamp à 0 pour les valeurs négatives', () => {
    const manager = createAudioManager();
    manager.setMusicVolume(-0.5);

    for (let i = 0; i < TRACKS_COUNT; i++) {
      expect(howlInstances[i]?.volume).toHaveBeenCalledWith(0);
    }
  });

  it('clamp à 1 pour les valeurs supérieures à 1', () => {
    const manager = createAudioManager();
    manager.setMusicVolume(1.5);

    for (let i = 0; i < TRACKS_COUNT; i++) {
      expect(howlInstances[i]?.volume).toHaveBeenCalledWith(1);
    }
  });

  it('accepte les valeurs limites exactes 0 et 1', () => {
    const manager = createAudioManager();
    manager.setMusicVolume(0);
    manager.setMusicVolume(1);

    for (let i = 0; i < TRACKS_COUNT; i++) {
      expect(howlInstances[i]?.volume).toHaveBeenCalledWith(0);
      expect(howlInstances[i]?.volume).toHaveBeenCalledWith(1);
    }
  });
});

describe('createAudioManager — toggleMute()', () => {
  it('passe à muté lors du premier appel', () => {
    const manager = createAudioManager();
    const result = manager.toggleMute();

    expect(result).toBe(true);
    expect(manager.isMuted()).toBe(true);
  });

  it('appelle Howler.volume(0) lors du mute', () => {
    const manager = createAudioManager();
    manager.toggleMute();

    expect(Howler.volume).toHaveBeenCalledWith(0);
  });

  it('revient à non-muté lors du second appel', () => {
    const manager = createAudioManager();
    manager.toggleMute();
    const result = manager.toggleMute();

    expect(result).toBe(false);
    expect(manager.isMuted()).toBe(false);
  });

  it('appelle Howler.volume(1) lors du démute', () => {
    const manager = createAudioManager();
    manager.toggleMute(); // mute
    manager.toggleMute(); // démute

    expect(Howler.volume).toHaveBeenCalledWith(1);
  });

  it('alterne correctement sur de multiples appels', () => {
    const manager = createAudioManager();

    expect(manager.toggleMute()).toBe(true);
    expect(manager.toggleMute()).toBe(false);
    expect(manager.toggleMute()).toBe(true);
    expect(manager.isMuted()).toBe(true);
  });
});

describe('createAudioManager — isMuted()', () => {
  it('retourne false par défaut', () => {
    const manager = createAudioManager();
    expect(manager.isMuted()).toBe(false);
  });

  it('reflète l\'état après toggleMute()', () => {
    const manager = createAudioManager();
    manager.toggleMute();
    expect(manager.isMuted()).toBe(true);
    manager.toggleMute();
    expect(manager.isMuted()).toBe(false);
  });
});

describe('createAudioManager — lockMusicLayer()', () => {
  it('appelle volume(0) sur la layer correspondante', () => {
    const manager = createAudioManager();
    manager.lockMusicLayer(0);

    expect(howlInstances[0]?.volume).toHaveBeenCalledWith(0);
  });

  it('ne provoque aucune erreur pour un index hors-limites', () => {
    const manager = createAudioManager();
    expect(() => manager.lockMusicLayer(99)).not.toThrow();
  });

  it('ne provoque aucune erreur pour un index négatif', () => {
    const manager = createAudioManager();
    expect(() => manager.lockMusicLayer(-1)).not.toThrow();
  });
});

describe('createAudioManager — seekMusicLayer()', () => {
  it('appelle seek() sur la layer correspondante avec la position en secondes', () => {
    const manager = createAudioManager();
    manager.seekMusicLayer(2, 30);

    expect(howlInstances[2]?.seek).toHaveBeenCalledWith(30);
  });

  it('ne provoque aucune erreur pour un index hors-limites', () => {
    const manager = createAudioManager();
    expect(() => manager.seekMusicLayer(99, 0)).not.toThrow();
  });

  it('ne provoque aucune erreur pour un index négatif', () => {
    const manager = createAudioManager();
    expect(() => manager.seekMusicLayer(-1, 0)).not.toThrow();
  });
});

describe('createAudioManager — dispose()', () => {
  it('appelle unload() sur les 7 instances Howl', () => {
    const manager = createAudioManager();
    manager.dispose();

    for (const instance of howlInstances) {
      expect(instance.unload).toHaveBeenCalledOnce();
    }
  });

  it('décharge toutes les instances même si startExperience n\'a pas été appelé', () => {
    const manager = createAudioManager();
    expect(() => manager.dispose()).not.toThrow();

    expect(howlInstances).toHaveLength(TRACKS_COUNT + 1);
    for (const instance of howlInstances) {
      expect(instance.unload).toHaveBeenCalledOnce();
    }
  });
});
