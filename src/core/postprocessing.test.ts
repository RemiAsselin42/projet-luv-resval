import { describe, it, expect, vi } from 'vitest';
import { createRenderPipeline } from './postprocessing';
import type * as THREE from 'three';

const makeRenderer = () =>
  ({
    render: vi.fn(),
    info: { reset: vi.fn() },
  }) as unknown as THREE.WebGLRenderer;

const makeScene = () => ({}) as THREE.Scene;
const makeCamera = () => ({}) as THREE.PerspectiveCamera;

describe('createRenderPipeline', () => {
  it('returns an object with render and dispose methods', () => {
    const pipeline = createRenderPipeline(makeRenderer(), makeScene(), makeCamera());

    expect(typeof pipeline.render).toBe('function');
    expect(typeof pipeline.dispose).toBe('function');
  });

  it('render() calls renderer.render(scene, camera)', () => {
    const renderer = makeRenderer();
    const scene = makeScene();
    const camera = makeCamera();
    const pipeline = createRenderPipeline(renderer, scene, camera);

    pipeline.render();

    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(renderer.render).toHaveBeenCalledWith(scene, camera);
  });

  it('render() can be called multiple times', () => {
    const renderer = makeRenderer();
    const pipeline = createRenderPipeline(renderer, makeScene(), makeCamera());

    pipeline.render();
    pipeline.render();
    pipeline.render();

    expect(renderer.render).toHaveBeenCalledTimes(3);
  });

  it('dispose() calls renderer.info.reset()', () => {
    const renderer = makeRenderer();
    const pipeline = createRenderPipeline(renderer, makeScene(), makeCamera());

    pipeline.dispose();

    expect(renderer.info.reset).toHaveBeenCalledTimes(1);
  });

  it('dispose() does not throw when called multiple times', () => {
    const renderer = makeRenderer();
    const pipeline = createRenderPipeline(renderer, makeScene(), makeCamera());

    expect(() => {
      pipeline.dispose();
      pipeline.dispose();
    }).not.toThrow();
  });
});
