import * as THREE from 'three';

interface RotationAxes {
  x: number;
  y: number;
  z: number;
}

export interface RotationConfig {
  base?: Partial<RotationAxes>;
  hoverRangeX?: number;
  hoverRangeY?: number;
  hoverRangeZ?: number;
  lerpSpeed?: number;
}

interface ModelRotationController {
  update: () => void;
  dispose: () => void;
  /** Met à jour dynamiquement la rotation de base sur un axe (préserve le décalage hover). */
  setBaseRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
}

const DEFAULT_BASE_ROTATION: Readonly<RotationAxes> = {
  x: 0.2,
  y: 0,
  z: 0,
} as const;

const DEFAULT_HOVER_RANGE_Y = 1; // Valeur par défaut pour la rotation autour de l'axe Y (gauche-droite) | 1 = 90 degrés, 0.5 = 45 degrés, etc.
const DEFAULT_HOVER_RANGE_X = 1; // Valeur par défaut pour la rotation autour de l'axe X (haut-bas) | 1 = 90 degrés, 0.5 = 45 degrés, etc.
const DEFAULT_HOVER_RANGE_Z = 1; // Valeur par défaut pour la rotation autour de l'axe Z (inclinaison latérale) | 1 = 90 degrés, 0.5 = 45 degrés, etc.
const DEFAULT_LERP_SPEED = 0.1; // Valeur par défaut pour la vitesse de lissage (0.06 correspond à une transition douce) | 1 = transition instantanée, 0.1 = transition rapide, 0.01 = transition très lente, etc.

export const createModelRotationController = (
  container: HTMLElement,
  modelGroup: THREE.Group,
  config: RotationConfig = {},
): ModelRotationController => {
  const baseRotation: RotationAxes = {
    x: config.base?.x ?? DEFAULT_BASE_ROTATION.x,
    y: config.base?.y ?? DEFAULT_BASE_ROTATION.y,
    z: config.base?.z ?? DEFAULT_BASE_ROTATION.z,
  };
  const hoverRangeX = config.hoverRangeX ?? DEFAULT_HOVER_RANGE_X;
  const hoverRangeY = config.hoverRangeY ?? DEFAULT_HOVER_RANGE_Y;
  const hoverRangeZ = config.hoverRangeZ ?? DEFAULT_HOVER_RANGE_Z;
  const lerpSpeed = config.lerpSpeed ?? DEFAULT_LERP_SPEED;

  const targetRotation: RotationAxes = { ...baseRotation };
  const currentRotation: RotationAxes = { ...baseRotation };

  const updateTargetRotation = (normalizedX: number, normalizedY: number): void => {
    targetRotation.y = baseRotation.y + normalizedX * hoverRangeY;
    targetRotation.x = baseRotation.x + normalizedY * hoverRangeX;
    targetRotation.z = baseRotation.z - normalizedX * hoverRangeZ;
  };

  const resetTargetRotation = (): void => {
    targetRotation.x = baseRotation.x;
    targetRotation.y = baseRotation.y;
    targetRotation.z = baseRotation.z;
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

  const setBaseRotation = (axis: 'x' | 'y' | 'z', value: number): void => {
    const delta = value - baseRotation[axis];
    baseRotation[axis] = value;
    targetRotation[axis] += delta;
  };

  return {
    update: () => {
      currentRotation.x += (targetRotation.x - currentRotation.x) * lerpSpeed;
      currentRotation.y += (targetRotation.y - currentRotation.y) * lerpSpeed;
      currentRotation.z += (targetRotation.z - currentRotation.z) * lerpSpeed;

      modelGroup.rotation.x = currentRotation.x;
      modelGroup.rotation.y = currentRotation.y;
      modelGroup.rotation.z = currentRotation.z;
    },
    setBaseRotation,
    dispose: () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', resetTargetRotation);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', resetTargetRotation);
    },
  };
};
