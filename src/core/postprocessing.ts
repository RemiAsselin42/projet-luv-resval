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
