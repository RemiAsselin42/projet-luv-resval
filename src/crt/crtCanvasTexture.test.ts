import { describe, it, expect, vi } from 'vitest';
import { createTextCanvasTexture } from './crtCanvasTexture';

describe('createTextCanvasTexture', () => {
  it('returns texture, draw and dispose', () => {
    const result = createTextCanvasTexture('LUV RESVAL', 1024, 1024);

    expect(result.texture).toBeDefined();
    expect(typeof result.draw).toBe('function');
    expect(typeof result.dispose).toBe('function');
  });

  it('texture is a THREE.CanvasTexture instance', async () => {
    const THREE = await import('three');
    const { texture } = createTextCanvasTexture('TEST', 512, 512);

    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
  });

  it('draw() increments texture.version (sets needsUpdate internally)', () => {
    const { texture, draw } = createTextCanvasTexture('TEST', 512, 512);

    // Factory calls draw(0, 0, -1, 0) once → version = 1
    const versionBefore = texture.version;

    // Change a value to bypass dirty flag
    draw(0.5, 0, -1, 0.5);

    expect(texture.version).toBeGreaterThan(versionBefore);
  });

  it('draw() does not increment version when values are identical (dirty flag)', () => {
    const { texture, draw } = createTextCanvasTexture('TEST', 512, 512);

    // Establish known state
    draw(0.5, 0.3, 1, 0.5);
    const versionAfterFirst = texture.version;

    // Same values → skipped
    draw(0.5, 0.3, 1, 0.5);

    expect(texture.version).toBe(versionAfterFirst);
  });

  it('draw() increments version when titleProgress changes beyond 0.001 threshold', () => {
    const { texture, draw } = createTextCanvasTexture('TEST', 512, 512);

    draw(0.5, 0, -1, 0);
    const v = texture.version;

    draw(0.6, 0, -1, 0); // diff = 0.1 > 0.001

    expect(texture.version).toBeGreaterThan(v);
  });

  it('draw() does not increment version when titleProgress change is below threshold (< 0.001)', () => {
    const { texture, draw } = createTextCanvasTexture('TEST', 512, 512);

    draw(0.5, 0, -1, 0);
    const v = texture.version;

    draw(0.5 + 0.0005, 0, -1, 0); // diff = 0.0005 < 0.001

    expect(texture.version).toBe(v);
  });

  it('draw() increments version when hoverIndex changes', () => {
    const { texture, draw } = createTextCanvasTexture('TEST', 512, 512);

    // Factory called draw(0, 0, -1, 0); now change hoverIndex from -1 to 0
    draw(0, 0, 0, 0);
    const v = texture.version;

    draw(0, 0, 1, 0); // hoverIndex 0 → 1

    expect(texture.version).toBeGreaterThan(v);
  });

  it('draw() increments version when playHover changes (no pulsing)', () => {
    const { texture, draw } = createTextCanvasTexture('TEST', 512, 512);

    // loadingProgress > 1: transition state, no pulsing, dirty flag active
    draw(0, 0, -1, 1.5, false);
    const v = texture.version;

    draw(0, 0, -1, 1.5, true); // playHover changed

    expect(texture.version).toBeGreaterThan(v);
  });

  it('draw() bypasses dirty flag while PLAY button is pulsing (loadingProgress = 1)', () => {
    const { texture, draw } = createTextCanvasTexture('TEST', 512, 512);

    // Establish state with loadingProgress = 1
    draw(0, 0, -1, 1);
    const v = texture.version;

    // Same values, but pulsing (loadingProgress = 1) → always redraws
    draw(0, 0, -1, 1);

    expect(texture.version).toBeGreaterThan(v);
  });

  it('dispose() calls texture.dispose()', () => {
    const { texture, dispose } = createTextCanvasTexture('TEST', 512, 512);
    const disposeSpy = vi.spyOn(texture, 'dispose');

    dispose();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('throws when canvas 2D context is unavailable', () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof original;

    expect(() => createTextCanvasTexture('TEST', 512, 512)).toThrow('Canvas 2D context unavailable');

    HTMLCanvasElement.prototype.getContext = original;
  });
});
