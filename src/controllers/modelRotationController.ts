import * as THREE from 'three';

interface RotationAxes {
  x: number;
  y: number;
  z: number;
}

interface ModelRotationController {
  update: () => void;
  dispose: () => void;
}

const BASE_ROTATION: Readonly<RotationAxes> = {
  x: 0.35,
  y: 0,
  z: 0,
} as const;

const HOVER_RANGE_Y = 0.08;
const HOVER_RANGE_X = 0.15;
const HOVER_RANGE_Z = 0.2;
const LERP_SPEED = 0.06;

export const createModelRotationController = (
  container: HTMLElement,
  modelGroup: THREE.Group,
): ModelRotationController => {
  const targetRotation: RotationAxes = { ...BASE_ROTATION };
  const currentRotation: RotationAxes = { ...BASE_ROTATION };

  const updateTargetRotation = (normalizedX: number, normalizedY: number): void => {
    targetRotation.y = BASE_ROTATION.y + normalizedX * HOVER_RANGE_Y;
    targetRotation.x = BASE_ROTATION.x + normalizedY * HOVER_RANGE_X;
    targetRotation.z = BASE_ROTATION.z - normalizedX * HOVER_RANGE_Z;
  };

  const resetTargetRotation = (): void => {
    targetRotation.x = BASE_ROTATION.x;
    targetRotation.y = BASE_ROTATION.y;
    targetRotation.z = BASE_ROTATION.z;
  };

  const onMouseMove = (event: MouseEvent): void => {
    const rect = container.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    updateTargetRotation(normalizedX, normalizedY);
  };

  const onTouchMove = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const normalizedX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((touch.clientY - rect.top) / rect.height) * 2 - 1;
    updateTargetRotation(normalizedX, normalizedY);
  };

  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mouseleave', resetTargetRotation);
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('touchend', resetTargetRotation);

  return {
    update: () => {
      currentRotation.x += (targetRotation.x - currentRotation.x) * LERP_SPEED;
      currentRotation.y += (targetRotation.y - currentRotation.y) * LERP_SPEED;
      currentRotation.z += (targetRotation.z - currentRotation.z) * LERP_SPEED;

      modelGroup.rotation.x = currentRotation.x;
      modelGroup.rotation.y = currentRotation.y;
      modelGroup.rotation.z = currentRotation.z;
    },
    dispose: () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', resetTargetRotation);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', resetTargetRotation);
    },
  };
};
