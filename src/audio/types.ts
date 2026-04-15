// Définit l'interface du gestionnaire audio.
// Décrit toutes les actions possibles sur la musique (démarrer, muter, régler le volume,
// activer une boucle...) sans détailler leur implémentation.
// Les sections du site utilisent ce contrat pour interagir avec l'audio.

export interface AudioManager {
  /** Lance les 4 layers musicaux synchronisés. Idempotent. */
  startExperience(): void;
  /** Réinitialise l'expérience audio pour permettre un redémarrage complet depuis 0. */
  resetExperienceAudio(): void;
  /** Débloque une layer musicale (index 0-6) instantanément (volume plein, sans fade). Appelé par la MPC. */
  unlockMusicLayer(index: number): void;
  /** Débloque une layer musicale avec un fade-in progressif sur durationMs ms. */
  fadeMusicLayerIn(index: number, durationMs: number): void;
  /** Fait un fade-out progressif d'une layer musicale sur durationMs ms et la verrouille. */
  fadeMusicLayerOut(index: number, durationMs: number): void;
  /** Re-mute une layer musicale (index 0-6) avec un fade-out. Appelé par la MPC. */
  lockMusicLayer(index: number): void;
  /** Joue le FX sonore universel (hover/clic sur tout bouton interactif). */
  playUiFx(): void;
  /** Joue le FX de frappe en rafale (crash typewriter) : répète le FX n fois à intervalles rapides. */
  playCrashTypingFx(count?: number, intervalMs?: number): void;
  /** Modifie le volume global de la musique (0-1). Utilisé par le potard MPC. */
  setMusicVolume(volume: number): void;
  /** Toggle le mute global. Retourne le nouvel état isMuted. */
  toggleMute(): boolean;
  isMuted(): boolean;
  /** Seek une layer musicale à la position donnée (secondes). Utilisé par le bouton stop MPC. */
  seekMusicLayer(index: number, seconds: number): void;
  /** Retourne la position de lecture actuelle d'une layer (secondes). Retourne 0 si indisponible. */
  getMusicLayerPosition(index: number): number;
  /** Retourne le volume courant d'une layer (0-1). Retourne 0 si indisponible. */
  getMusicLayerVolume(index: number): number;
  dispose(): void;
}
