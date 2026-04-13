// Ajoute les lumières par défaut à la scène 3D.
// Trois sources de lumière (ambiante + deux directionnelles) éclairent
// les modèles 3D de façon réaliste depuis différents angles.

import * as THREE from 'three';

// Éclairage de la scène principale — ajuster ici pour tous les modèles à la fois.
// Intensités calibrées pour les matériaux PBR de la scène hero (mesh CRT, modèles menu).
/** Lumière de remplissage globale (évite les zones complètement noires sur les matériaux PBR). */
const LIGHT_AMBIENT_INTENSITY = 1.1;
/** Source principale (avant-droite, angle 3/4) — éclaire les faces exposées. */
const LIGHT_KEY_INTENSITY     = 1.7;
/** Contre-lumière gauche-arrière — adoucit les ombres dures de la key light. */
const LIGHT_FILL_INTENSITY    = 0.7;

/**
 * Ajoute les trois lumières par défaut à la scène 3D principale.
 *
 * Composition :
 * - Ambiante (1.1) : remplissage global, évite les zones noires sur les matériaux PBR.
 * - Key light (1.7) : source principale avant-droite, angle 3/4 haut.
 * - Fill light (0.7) : contre-lumière gauche-arrière, adoucit les ombres dures.
 *
 * @param scene - Scène THREE.js à laquelle ajouter les lumières
 */
export const addDefaultLights = (scene: THREE.Scene): void => {
  const ambientLight = new THREE.AmbientLight(0xffffff, LIGHT_AMBIENT_INTENSITY);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, LIGHT_KEY_INTENSITY);
  keyLight.position.set(5, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, LIGHT_FILL_INTENSITY);
  fillLight.position.set(-4, 2, -4);
  scene.add(fillLight);
};
