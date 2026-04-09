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
    (gsap.timeline as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      to: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    }));
  });

  it('returns heroTimeline property', () => {
    const result = createHeroScrollTimelines(
      document.createElement('div'),
      document.createElement('div'),
      makeCrt(),
    );

    expect(result).toHaveProperty('heroTimeline');
  });

  it('heroTimeline is null when heroElement is null', () => {
    const { heroTimeline } = createHeroScrollTimelines(
      null,
      document.createElement('div'),
      makeCrt(),
    );

    expect(heroTimeline).toBeNull();
  });

  it('heroTimeline is null when menuElement is null', () => {
    const { heroTimeline } = createHeroScrollTimelines(
      document.createElement('div'),
      null,
      makeCrt(),
    );

    expect(heroTimeline).toBeNull();
  });

  it('heroTimeline is null when both heroElement and menuElement are null', () => {
    const { heroTimeline } = createHeroScrollTimelines(null, null, makeCrt());

    expect(heroTimeline).toBeNull();
  });

  it('heroTimeline is non-null when both heroElement and menuElement are provided', () => {
    const { heroTimeline } = createHeroScrollTimelines(
      document.createElement('div'),
      document.createElement('div'),
      makeCrt(),
    );

    expect(heroTimeline).not.toBeNull();
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
      crt,
    );

    expect(toSpy).toHaveBeenCalledWith(
      crt.mesh.position,
      expect.objectContaining({ z: -2.5 }),
    );
  });
});
