import * as THREE from 'three';

export const FIXED_CANVAS_ASPECT_RATIO = 16 / 9;
export const MIN_CANVAS_HEIGHT = 180;
export const MAX_CANVAS_HEIGHT = 500;

export const getResponsiveMaxCanvasHeight = (): number => {
  // Clamp target height between 180px and 300px based on viewport width.
  return Math.round(
    Math.min(MAX_CANVAS_HEIGHT, Math.max(MIN_CANVAS_HEIGHT, window.innerWidth * 0.28)),
  );
};

export const getFixedCanvasSize = (availableWidth: number): { width: number; height: number } => {
  const maxCanvasHeight = getResponsiveMaxCanvasHeight();
  const maxWidthFromHeight = maxCanvasHeight * FIXED_CANVAS_ASPECT_RATIO;
  const width = Math.min(availableWidth, maxWidthFromHeight);
  const height = width / FIXED_CANVAS_ASPECT_RATIO;

  return { width, height };
};

interface ThreeViewport {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export const createThreeViewport = (container: HTMLElement): ThreeViewport => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(45, FIXED_CANVAS_ASPECT_RATIO, 0.1, 100); // FOV, aspect ratio, near, far
  camera.position.set(0, 1.5, 5); // Position de la caméra (x, y, z)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  const availableWidth = Math.max(container.clientWidth, window.innerWidth);
  const initialSize = getFixedCanvasSize(availableWidth);
  renderer.setSize(initialSize.width, initialSize.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  return { scene, camera, renderer };
};
