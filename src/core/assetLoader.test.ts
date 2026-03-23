import { describe, it, expect, vi } from 'vitest';
import { createAssetLoader } from './assetLoader';

describe('createAssetLoader', () => {
  it('returns preloadSectionOnce and dispose methods', () => {
    const loader = createAssetLoader();

    expect(typeof loader.preloadSectionOnce).toBe('function');
    expect(typeof loader.dispose).toBe('function');
  });

  it('calls importer on first request', async () => {
    const loader = createAssetLoader();
    const value = { hello: 'world' };
    const importer = vi.fn().mockResolvedValue(value);

    const result = await loader.preloadSectionOnce('key1', importer);

    expect(importer).toHaveBeenCalledTimes(1);
    expect(result).toBe(value);
  });

  it('returns cached promise on second request (cache hit)', async () => {
    const loader = createAssetLoader();
    const importer = vi.fn().mockResolvedValue({ data: 42 });

    const p1 = loader.preloadSectionOnce('key', importer);
    const p2 = loader.preloadSectionOnce('key', importer);

    expect(p1).toBe(p2);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('returns the same Promise for concurrent calls — importer called only once', async () => {
    const loader = createAssetLoader();
    let resolve!: (v: number) => void;
    const pending = new Promise<number>((r) => { resolve = r; });
    const importer = vi.fn().mockReturnValue(pending);

    const p1 = loader.preloadSectionOnce('concurrent', importer);
    const p2 = loader.preloadSectionOnce('concurrent', importer);

    resolve(99);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(99);
    expect(r2).toBe(99);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('caches different keys independently', async () => {
    const loader = createAssetLoader();
    const importerA = vi.fn().mockResolvedValue('A');
    const importerB = vi.fn().mockResolvedValue('B');

    const a = await loader.preloadSectionOnce('keyA', importerA);
    const b = await loader.preloadSectionOnce('keyB', importerB);

    expect(a).toBe('A');
    expect(b).toBe('B');
    expect(importerA).toHaveBeenCalledTimes(1);
    expect(importerB).toHaveBeenCalledTimes(1);
  });

  it('dispose() clears the cache — importer is called again after dispose', async () => {
    const loader = createAssetLoader();
    const importer = vi.fn().mockResolvedValue('value');

    await loader.preloadSectionOnce('key', importer);
    loader.dispose();
    await loader.preloadSectionOnce('key', importer);

    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('dispose() can be called multiple times without throwing', () => {
    const loader = createAssetLoader();

    expect(() => {
      loader.dispose();
      loader.dispose();
    }).not.toThrow();
  });
});
