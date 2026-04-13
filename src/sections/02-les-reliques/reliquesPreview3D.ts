// Gère le rendu 3D des personnages dans la mini-scène dédiée à la section Reliques.
// Chaque personnage possède un groupe THREE.js persistant, chargé une seule fois.
// Les groupes ne sont jamais disposés entre les visites — seul dispose() libère les GPU buffers.
// Les modèles sont affichés avec leurs textures et matériaux d'origine.

import * as THREE from 'three';
import gsap from 'gsap';
import { loadGlbWithDracoFallback } from '../../components/3d/glbLoader';
import type { ReliquesCharacterData, ReliquesCharacterId } from './reliquesData';

// ── Constantes ─────────────────────────────────────────────────────────────────

const RENDER_TARGET_SIZE = 512;
const ROTATION_SPEED = 0.8; // rad/s
const DURATION_IN = 0.35;
const DURATION_OUT = 0.22;
const EASE_IN = 'back.out(1.3)';
const EASE_OUT = 'power2.in';

// Aspect ratio de l'aire d'affichage dans le shader CRT.
// uModelRect = (0.47, 0.26, 0.87, 0.86) → (width UV 0.40 × 16/9) / height UV 0.60
export const RELIQUES_PREVIEW_ASPECT = ((0.87 - 0.47) * (16 / 9)) / (0.86 - 0.26);

// ── Types internes ─────────────────────────────────────────────────────────────

interface ReliquesModelEntry {
  group: THREE.Group;
  proxy: { opacity: number; scale: number };
  tween: gsap.core.Tween | null;
  ready: boolean;
  failed: boolean;
  loading: Promise<void> | null;
  loadVersion: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fitModel = (model: THREE.Object3D, targetDimension: number): void => {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? targetDimension / maxDim : 1;
  model.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(center);
};

// ── Interface publique ─────────────────────────────────────────────────────────

export interface ReliquesPreview3D {
  /** Charge (si nécessaire) et affiche un personnage avec fondu. */
  loadCharacter: (character: ReliquesCharacterData) => void;
  /** Précharge tous les personnages en avance (hits le glbCache, pas de double téléchargement). */
  preloadAll: () => void;
  /** Appeler à chaque frame pour la rotation automatique. */
  update: (deltaSeconds: number) => void;
  /** Rend la mini-scène dans le render target. Appeler avant le rendu principal. */
  renderPreview: () => void;
  /** Texture du render target pour crtManager.setModelPreview(). */
  getTexture: () => THREE.Texture;
  /** Taille d'un texel UV. */
  getTexelSize: () => THREE.Vector2;
  /** Opacité maximale courante (0–1) sur toutes les entries. */
  getOpacity: () => number;
  /** Indique si le personnage courant est en cours de chargement. */
  isLoading: () => boolean;
  /** Indique si le dernier chargement du personnage courant a échoué. */
  hasFailed: () => boolean;
  dispose: () => void;
}

// ── Factory ────────────────────────────────────────────────────────────────────

export const createReliquesPreview3D = (
  renderer: THREE.WebGLRenderer,
  characters: ReliquesCharacterData[],
): ReliquesPreview3D => {
  // Mini-scène isolée, caméra locale, render target
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, RELIQUES_PREVIEW_ASPECT, 0.1, 20);
  camera.position.set(0, 0.1, 3);
  camera.lookAt(0, 0, 0);

  const renderTarget = new THREE.WebGLRenderTarget(RENDER_TARGET_SIZE, RENDER_TARGET_SIZE, {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const texelSize = new THREE.Vector2(1 / RENDER_TARGET_SIZE, 1 / RENDER_TARGET_SIZE);

  // Éclairage de la mini-scène
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(2, 4, 3);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-2, 1, -2);
  scene.add(fillLight);

  // Un groupe par personnage, persistant entre les visites
  const entries = new Map<ReliquesCharacterId, ReliquesModelEntry>();
  let currentCharacterId: ReliquesCharacterId | null = null;
  let isDisposed = false;

  // ── Helpers internes ──────────────────────────────────────────────────────────

  const showEntry = (entry: ReliquesModelEntry): void => {
    entry.group.visible = true;
    entry.tween?.kill();
    entry.tween = gsap.to(entry.proxy, {
      opacity: 1,
      scale: 1,
      duration: DURATION_IN,
      ease: EASE_IN,
      onUpdate: () => {
        entry.group.scale.setScalar(entry.proxy.scale);
      },
    });
  };

  const hideEntry = (entry: ReliquesModelEntry, onComplete?: () => void): void => {
    entry.tween?.kill();
    entry.tween = gsap.to(entry.proxy, {
      opacity: 0,
      scale: 0,
      duration: DURATION_OUT,
      ease: EASE_OUT,
      onUpdate: () => {
        entry.group.scale.setScalar(entry.proxy.scale);
      },
      onComplete: () => {
        entry.group.visible = false;
        onComplete?.();
      },
    });
  };

  const startLoading = (entry: ReliquesModelEntry, character: ReliquesCharacterData): void => {
    entry.loadVersion += 1;
    const version = entry.loadVersion;

    entry.loading = loadGlbWithDracoFallback(character.modelUrl)
      .then((gltf) => {
        // Stale ou disposed : NE PAS disposer gltf.scene — il est référencé par le glbCache
        if (isDisposed || version !== entry.loadVersion) return;

        // Vider le groupe avant d'ajouter la scène pour éviter les doublons
        // (retry après échec, ou chargement concurrent résolu hors ordre).
        // NE PAS disposer les enfants existants — ils sont gérés par le glbCache.
        while (entry.group.children.length > 0) {
          entry.group.remove(entry.group.children[0]!);
        }

        fitModel(gltf.scene, character.targetDimension);
        entry.group.add(gltf.scene);
        entry.ready = true;
        entry.failed = false;
        entry.loading = null;
      })
      .catch((err: unknown) => {
        if (isDisposed || version !== entry.loadVersion) return;
        entry.failed = true;
        entry.loading = null;
        // eslint-disable-next-line no-console
        console.error(`[ReliquesPreview3D] Échec chargement ${character.id}:`, err);
      });
  };

  const ensureLoaded = (character: ReliquesCharacterData): ReliquesModelEntry => {
    const existing = entries.get(character.id);
    if (existing) {
      // Retry automatique si le chargement précédent a échoué
      if (existing.failed && !existing.loading) startLoading(existing, character);
      return existing;
    }

    const group = new THREE.Group();
    group.visible = false;
    group.scale.setScalar(0);
    scene.add(group);

    const entry: ReliquesModelEntry = {
      group,
      proxy: { opacity: 0, scale: 0 },
      tween: null,
      ready: false,
      failed: false,
      loading: null,
      loadVersion: 0,
    };
    entries.set(character.id, entry);
    startLoading(entry, character);
    return entry;
  };

  // ── API ───────────────────────────────────────────────────────────────────────

  const loadCharacter = (character: ReliquesCharacterData): void => {
    if (isDisposed) return;

    // Cacher l'entry précédente via fondu
    if (currentCharacterId && currentCharacterId !== character.id) {
      const prev = entries.get(currentCharacterId);
      if (prev && prev.proxy.opacity > 0) hideEntry(prev);
    }

    currentCharacterId = character.id;
    const entry = ensureLoaded(character);

    if (entry.ready) {
      showEntry(entry);
    } else if (entry.loading) {
      void entry.loading.then(() => {
        if (isDisposed || currentCharacterId !== character.id) return;
        if (entry.ready) showEntry(entry);
      });
    }
  };

  const preloadAll = (): void => {
    for (const c of characters) ensureLoaded(c);
  };

  const update = (deltaSeconds: number): void => {
    if (isDisposed) return;
    for (const [, entry] of entries) {
      if (entry.group.visible && entry.proxy.opacity > 0) {
        entry.group.rotation.y += ROTATION_SPEED * deltaSeconds;
      }
    }
  };

  const renderPreview = (): void => {
    if (isDisposed) return;
    const hasVisible = [...entries.values()].some((e) => e.proxy.opacity > 0);
    if (!hasVisible) return;

    const prevTarget = renderer.getRenderTarget();
    const prevClearColor = new THREE.Color();
    const prevClearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(prevClearColor);

    renderer.setRenderTarget(renderTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClearColor, prevClearAlpha);
  };

  const getOpacity = (): number => {
    let max = 0;
    for (const [, entry] of entries) {
      if (entry.proxy.opacity > max) max = entry.proxy.opacity;
    }
    return max;
  };

  const isLoading = (): boolean => {
    if (!currentCharacterId) return false;
    const entry = entries.get(currentCharacterId);
    return entry ? !!entry.loading : false;
  };

  const hasFailed = (): boolean => {
    if (!currentCharacterId) return false;
    const entry = entries.get(currentCharacterId);
    return entry ? entry.failed : false;
  };

  const dispose = (): void => {
    isDisposed = true;
    for (const [, entry] of entries) {
      entry.tween?.kill();
      entry.group.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry?.dispose();
        const mats: THREE.Material[] = Array.isArray(node.material)
          ? node.material
          : [node.material];
        mats.forEach((m) => m.dispose());
      });
      scene.remove(entry.group);
    }
    entries.clear();
    renderTarget.dispose();
  };

  return {
    loadCharacter,
    preloadAll,
    update,
    renderPreview,
    getTexture: () => renderTarget.texture,
    getTexelSize: () => texelSize,
    getOpacity,
    isLoading,
    hasFailed,
    dispose,
  };
};
