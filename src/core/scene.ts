import * as THREE from 'three';

interface ThreeViewport {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

const getAdaptivePixelRatioCap = (): number => {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  const cores = navigator.hardwareConcurrency ?? 4;

  if ((memory > 0 && memory <= 4) || cores <= 4) {
    return 1.25;
  }

  return 2;
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
