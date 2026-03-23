import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { addDefaultLights } from './lights';

describe('addDefaultLights', () => {
  it('adds exactly 3 children to the scene', () => {
    const scene = new THREE.Scene();
    addDefaultLights(scene);

    expect(scene.children).toHaveLength(3);
  });

  it('adds one AmbientLight', () => {
    const scene = new THREE.Scene();
    addDefaultLights(scene);

    const ambient = scene.children.filter((c) => c instanceof THREE.AmbientLight);
    expect(ambient).toHaveLength(1);
  });

  it('adds two DirectionalLights', () => {
    const scene = new THREE.Scene();
    addDefaultLights(scene);

    const directional = scene.children.filter((c) => c instanceof THREE.DirectionalLight);
    expect(directional).toHaveLength(2);
  });

  it('all added children are Light instances', () => {
    const scene = new THREE.Scene();
    addDefaultLights(scene);

    const nonLights = scene.children.filter((c) => !(c instanceof THREE.Light));
    expect(nonLights).toHaveLength(0);
  });

  it('positions the key light at (5, 6, 5)', () => {
    const scene = new THREE.Scene();
    addDefaultLights(scene);

    const [keyLight] = scene.children.filter(
      (c) => c instanceof THREE.DirectionalLight,
    ) as THREE.DirectionalLight[];

    expect(keyLight.position.x).toBe(5);
    expect(keyLight.position.y).toBe(6);
    expect(keyLight.position.z).toBe(5);
  });

  it('positions the fill light at (-4, 2, -4)', () => {
    const scene = new THREE.Scene();
    addDefaultLights(scene);

    const [, fillLight] = scene.children.filter(
      (c) => c instanceof THREE.DirectionalLight,
    ) as THREE.DirectionalLight[];

    expect(fillLight.position.x).toBe(-4);
    expect(fillLight.position.y).toBe(2);
    expect(fillLight.position.z).toBe(-4);
  });

  it('can be called on an already-populated scene without removing existing children', () => {
    const scene = new THREE.Scene();
    const existing = new THREE.Object3D();
    scene.add(existing);

    addDefaultLights(scene);

    expect(scene.children).toContain(existing);
    expect(scene.children).toHaveLength(4);
  });
});
