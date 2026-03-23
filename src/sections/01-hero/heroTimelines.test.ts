import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
  },
}));

import { createHeroScrollTimelines } from './heroTimelines';
import gsap from 'gsap';
import * as THREE from 'three';

const makeCrt = () => ({
  mesh: { position: new THREE.Vector3() },
  setFade: vi.fn(),
});

describe('createHeroScrollTimelines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock return value after each test
    (gsap.timeline as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      to: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    }));
  });

  it('returns heroTimeline and faceVaderFadeTimeline properties', () => {
    const result = createHeroScrollTimelines(
      document.createElement('div'),
      document.createElement('div'),
      document.createElement('div'),
      makeCrt(),
    );

    expect(result).toHaveProperty('heroTimeline');
    expect(result).toHaveProperty('faceVaderFadeTimeline');
  });

  it('heroTimeline is null when heroElement is null', () => {
    const { heroTimeline } = createHeroScrollTimelines(
      null,
      document.createElement('div'),
      document.createElement('div'),
      makeCrt(),
    );

    expect(heroTimeline).toBeNull();
  });

  it('heroTimeline is null when menuElement is null', () => {
    const { heroTimeline } = createHeroScrollTimelines(
      document.createElement('div'),
      null,
      document.createElement('div'),
      makeCrt(),
    );

    expect(heroTimeline).toBeNull();
  });

  it('heroTimeline is null when both heroElement and menuElement are null', () => {
    const { heroTimeline } = createHeroScrollTimelines(null, null, null, makeCrt());

    expect(heroTimeline).toBeNull();
  });

  it('heroTimeline is non-null when both heroElement and menuElement are provided', () => {
    const { heroTimeline } = createHeroScrollTimelines(
      document.createElement('div'),
      document.createElement('div'),
      null,
      makeCrt(),
    );

    expect(heroTimeline).not.toBeNull();
  });

  it('faceVaderFadeTimeline is null when faceVaderElement is null', () => {
    const { faceVaderFadeTimeline } = createHeroScrollTimelines(
      document.createElement('div'),
      document.createElement('div'),
      null,
      makeCrt(),
    );

    expect(faceVaderFadeTimeline).toBeNull();
  });

  it('faceVaderFadeTimeline is non-null when faceVaderElement is provided', () => {
    const { faceVaderFadeTimeline } = createHeroScrollTimelines(
      null,
      null,
      document.createElement('div'),
      makeCrt(),
    );

    expect(faceVaderFadeTimeline).not.toBeNull();
  });

  it('heroTimeline animates crt.mesh.position with z: -2.5', () => {
    const toSpy = vi.fn().mockReturnThis();
    (gsap.timeline as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      to: toSpy,
      kill: vi.fn(),
    });

    const crt = makeCrt();
    createHeroScrollTimelines(
      document.createElement('div'),
      document.createElement('div'),
      null,
      crt,
    );

    expect(toSpy).toHaveBeenCalledWith(
      crt.mesh.position,
      expect.objectContaining({ z: -2.5 }),
    );
  });

  it('faceVaderFadeTimeline calls crt.setFade via onUpdate', () => {
    const toSpy = vi.fn().mockImplementation((_target: unknown, vars: { onUpdate?: () => void }) => {
      vars.onUpdate?.();
      return { to: toSpy, kill: vi.fn() };
    });

    // Only mock the second timeline call (faceVaderFadeTimeline)
    let callIndex = 0;
    (gsap.timeline as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callIndex++;
      if (callIndex === 2) {
        return { to: toSpy, kill: vi.fn() };
      }
      return { to: vi.fn().mockReturnThis(), kill: vi.fn() };
    });

    const crt = makeCrt();
    createHeroScrollTimelines(
      document.createElement('div'),
      document.createElement('div'),
      document.createElement('div'),
      crt,
    );

    expect(crt.setFade).toHaveBeenCalled();
  });
});
