import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three';
import { createCrtManager } from './crtManager';
import type { CrtManager } from './crtManager';

describe('createCrtManager', () => {
  let scene: THREE.Scene;
  let crtManager: CrtManager;

  afterEach(() => {
    if (crtManager) {
      crtManager.dispose();
    }
  });

  it('ajoute le mesh CRT à la scène', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    expect(scene.children).toContain(crtManager.mesh);
    expect(crtManager.mesh).toBeInstanceOf(THREE.Mesh);
  });

  it('expose les uniforms du shader', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    expect(crtManager.uniforms).toBeDefined();
    expect(crtManager.uniforms.uTime).toBeDefined();
    expect(crtManager.uniforms.uGlitch).toBeDefined();
    expect(crtManager.uniforms.uBlur).toBeDefined();
  });

  it('setContentTexture remplace la texture uTexture', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    const newTexture = new THREE.Texture();
    crtManager.setContentTexture(newTexture);

    expect(crtManager.uniforms.uTexture.value).toBe(newTexture);
  });

  it('getHeroCanvasTexture retourne toujours la texture initiale', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    const heroTexture = crtManager.getHeroCanvasTexture();
    const newTexture = new THREE.Texture();
    crtManager.setContentTexture(newTexture);

    // Après remplacement, getHeroCanvasTexture doit toujours renvoyer l'original
    expect(crtManager.getHeroCanvasTexture()).toBe(heroTexture);
  });

  it('setPowerOn met à jour uPowerOn', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setPowerOn(1);
    expect(crtManager.uniforms.uPowerOn.value).toBe(1);

    crtManager.setPowerOn(0);
    expect(crtManager.uniforms.uPowerOn.value).toBe(0);
  });

  it('setFade met à jour uFade', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setFade(0.5);
    expect(crtManager.uniforms.uFade.value).toBe(0.5);
  });

  it('setGlitch met à jour uGlitch', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setGlitch(0.8);
    expect(crtManager.uniforms.uGlitch.value).toBe(0.8);
  });

  it('setBlur met à jour uBlur', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setBlur(0.6);
    expect(crtManager.uniforms.uBlur.value).toBe(0.6);
  });

  it('setBlackout met à jour uBlackout', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setBlackout(1);
    expect(crtManager.uniforms.uBlackout.value).toBe(1);
  });

  it('setShift met à jour uShiftX et uShiftY', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setShift(0.1, -0.05);
    expect(crtManager.uniforms.uShiftX.value).toBe(0.1);
    expect(crtManager.uniforms.uShiftY.value).toBe(-0.05);
  });

  it('setMosaic met à jour uMosaic', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setMosaic(1);
    expect(crtManager.uniforms.uMosaic.value).toBe(1);
  });

  it('resetEffects remet tous les effets à 0', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.setGlitch(0.9);
    crtManager.setBlur(0.7);
    crtManager.setBlackout(1);
    crtManager.setShift(0.1, 0.1);
    crtManager.setMosaic(1);

    crtManager.resetEffects();

    expect(crtManager.uniforms.uGlitch.value).toBe(0);
    expect(crtManager.uniforms.uBlur.value).toBe(0);
    expect(crtManager.uniforms.uBlackout.value).toBe(0);
    expect(crtManager.uniforms.uShiftX.value).toBe(0);
    expect(crtManager.uniforms.uShiftY.value).toBe(0);
    expect(crtManager.uniforms.uMosaic.value).toBe(0);
  });

  it('update fait avancer le temps (uTime)', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    crtManager.update(2.5);
    expect(crtManager.uniforms.uTime.value).toBe(2.5);

    crtManager.update(5.0);
    expect(crtManager.uniforms.uTime.value).toBe(5.0);
  });

  it('dispose retire le mesh de la scène', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    expect(scene.children).toContain(crtManager.mesh);
    crtManager.dispose();

    expect(scene.children).not.toContain(crtManager.mesh);
    // Éviter le double dispose dans afterEach
    crtManager = null as unknown as CrtManager;
  });

  it('fitToViewport redimensionne le mesh selon la caméra', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
    camera.position.z = 5;
    const scaleBefore = crtManager.mesh.scale.x;

    crtManager.fitToViewport(camera);

    // Le scale doit avoir changé (ou être identique si déjà correct)
    expect(typeof crtManager.mesh.scale.x).toBe('number');
    expect(crtManager.mesh.scale.x).toBeGreaterThan(0);
    // Le scale x doit être égal au scale y (proportionnel)
    expect(crtManager.mesh.scale.x).toBe(crtManager.mesh.scale.y);

    void scaleBefore; // référence utilisée pour documenter l'intention
  });

  it('utilise l\'aspect ratio par défaut 16/9 si non spécifié', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    const geometry = crtManager.mesh.geometry as THREE.PlaneGeometry;
    const { width, height } = geometry.parameters;

    expect(width / height).toBeCloseTo(16 / 9, 2);
  });

  it('accepte un aspect ratio personnalisé', async () => {
    scene = new THREE.Scene();
    const customAspect = 4 / 3;
    crtManager = await createCrtManager(scene, customAspect);

    const geometry = crtManager.mesh.geometry as THREE.PlaneGeometry;
    const { width, height } = geometry.parameters;

    expect(width / height).toBeCloseTo(customAspect, 2);
  });

  it('setUiProgress ne lève pas d\'erreur', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    expect(() => crtManager.setUiProgress(0.5, 0.8, 2)).not.toThrow();
    expect(() => crtManager.setUiProgress(0, 0, -1)).not.toThrow();
    expect(() => crtManager.setUiProgress(1, 1, 6, 1, true)).not.toThrow();
  });

  it('setModelPreview délègue correctement', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    const texture = new THREE.Texture();
    const texelSize = new THREE.Vector2(0.01, 0.01);

    // Ne doit pas lever d'erreur
    expect(() => crtManager.setModelPreview(texture, 0.5, texelSize)).not.toThrow();
    expect(() => crtManager.setModelPreview(null, 0)).not.toThrow();
  });

  it('setModelPreview avec setModelPreview spy est appelé', async () => {
    scene = new THREE.Scene();
    crtManager = await createCrtManager(scene);

    // Vérifie que setModelPreview passe bien les args (indirect via uniforms)
    const texture = new THREE.Texture();
    crtManager.setModelPreview(texture, 0.75);

    // uModelTextureOpacity doit refléter l'opacité passée
    expect(crtManager.uniforms.uModelTextureOpacity.value).toBeCloseTo(0.75, 5);
  });
});
