import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Reset module-level state (isFontsPreloaded, fontPreloadPromise) between tests.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ensureFontsLoaded', () => {
  it('creates a FontFace for each of the 4 expected fonts', async () => {
    const FontFaceSpy = vi.fn().mockImplementation(() => ({
      load: vi.fn().mockResolvedValue({}),
    }));
    vi.stubGlobal('FontFace', FontFaceSpy);

    const { ensureFontsLoaded } = await import('./crtFonts');
    await ensureFontsLoaded();

    expect(FontFaceSpy).toHaveBeenCalledTimes(4);
  });

  it('creates fonts with expected family names', async () => {
    const FontFaceSpy = vi.fn().mockImplementation(() => ({
      load: vi.fn().mockResolvedValue({}),
    }));
    vi.stubGlobal('FontFace', FontFaceSpy);

    const { ensureFontsLoaded } = await import('./crtFonts');
    await ensureFontsLoaded();

    const families = FontFaceSpy.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(families).toContain('Silvermist-Italic');
    expect(families).toContain('Silvermist-Regular');
    expect(families).toContain('Futura-CondensedExtraBold');
    expect(families).toContain('Futura-Medium');
  });

  it('adds loaded fonts to document.fonts', async () => {
    const mockFont = { family: 'Test' };
    const FontFaceSpy = vi.fn().mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(mockFont),
    }));
    vi.stubGlobal('FontFace', FontFaceSpy);
    const addSpy = vi.spyOn(document.fonts, 'add');

    const { ensureFontsLoaded } = await import('./crtFonts');
    await ensureFontsLoaded();

    expect(addSpy).toHaveBeenCalledTimes(4);
  });

  it('is idempotent — FontFace not reconstructed on subsequent calls', async () => {
    const FontFaceSpy = vi.fn().mockImplementation(() => ({
      load: vi.fn().mockResolvedValue({}),
    }));
    vi.stubGlobal('FontFace', FontFaceSpy);

    const { ensureFontsLoaded } = await import('./crtFonts');
    await ensureFontsLoaded();
    await ensureFontsLoaded();

    expect(FontFaceSpy).toHaveBeenCalledTimes(4);
  });

  it('concurrent calls share the same Promise and only load fonts once', async () => {
    const FontFaceSpy = vi.fn().mockImplementation(() => ({
      load: vi.fn().mockResolvedValue({}),
    }));
    vi.stubGlobal('FontFace', FontFaceSpy);

    const { ensureFontsLoaded } = await import('./crtFonts');
    await Promise.all([ensureFontsLoaded(), ensureFontsLoaded()]);

    expect(FontFaceSpy).toHaveBeenCalledTimes(4);
  });

  it('resets fontPreloadPromise on failure — allows retry on next call', async () => {
    let callCount = 0;
    const FontFaceSpy = vi.fn().mockImplementation(() => ({
      load: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 4) return Promise.reject(new Error('load failed'));
        return Promise.resolve({});
      }),
    }));
    vi.stubGlobal('FontFace', FontFaceSpy);

    const { ensureFontsLoaded } = await import('./crtFonts');

    await expect(ensureFontsLoaded()).rejects.toThrow('load failed');
    await expect(ensureFontsLoaded()).resolves.toBeUndefined();
  });
});
