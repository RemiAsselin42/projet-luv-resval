// Pipeline de rendu Three.js.
// Encapsule l'appel de rendu de la scène 3D en une interface simple (render / dispose).
// Point central depuis lequel la boucle d'animation dans main.ts déclenche chaque frame.

import * as THREE from 'three';

export interface RenderPipeline {
  render: () => void;
  dispose: () => void;
}

export const createRenderPipeline = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): RenderPipeline => {
  return {
    render: () => {
      renderer.render(scene, camera);
    },
    dispose: () => {
      renderer.info.reset();
    },
  };
};
