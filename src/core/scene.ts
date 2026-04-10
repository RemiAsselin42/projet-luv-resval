// Initialise la scène 3D Three.js : caméra, renderer et scène principale.
// Adapte automatiquement la résolution de rendu selon les capacités du matériel
// (smartphones peu puissants vs ordinateurs de bureau).

import * as THREE from 'three';

interface ThreeViewport {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

// Seuils matériels considérés comme "appareils à faible capacité"
const LOW_DEVICE_MEMORY_GB = 4;
const LOW_CPU_CORE_COUNT = 4;
// DPR maximal sur appareils faibles (évite le surcoût de rendu)
const PIXEL_RATIO_CAP_LOW = 1.25;
// DPR maximal sur appareils performants
const PIXEL_RATIO_CAP_DEFAULT = 2;

const getAdaptivePixelRatioCap = (): number => {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  const cores = navigator.hardwareConcurrency ?? LOW_CPU_CORE_COUNT;

  if ((memory > 0 && memory <= LOW_DEVICE_MEMORY_GB) || cores <= LOW_CPU_CORE_COUNT) {
    return PIXEL_RATIO_CAP_LOW;
  }

  return PIXEL_RATIO_CAP_DEFAULT;
};

export const getRecommendedPixelRatio = (): number => {
  return Math.min(window.devicePixelRatio, getAdaptivePixelRatioCap());
};

export const createThreeViewport = (container: HTMLElement): ThreeViewport => {
  const scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 4);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(getRecommendedPixelRatio());
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  return { scene, camera, renderer };
};
