import * as THREE from 'three';
import type { ScrollManager } from '../core/scrollManager';
import type { AssetLoader } from '../core/assetLoader';
import type { AudioManager } from '../audio/types';
import type { CrtManager } from '../crt/crtManager';

export interface SectionContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  canvasContainer: HTMLElement;
  scrollManager: ScrollManager;
  assetLoader: AssetLoader;
  audioManager: AudioManager;
  crtManager: CrtManager;
  /** Données additionnelles passées par le bloc loading (ex : menuPreview). */
  extras?: Record<string, unknown>;
}

export interface SectionLifecycle {
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  dispose: () => void;
}

export type SectionInitializer = (
  context: SectionContext,
) => Promise<SectionLifecycle> | SectionLifecycle;

export interface SectionLoader {
  id: string;
  load: () => Promise<SectionInitializer>;
}
