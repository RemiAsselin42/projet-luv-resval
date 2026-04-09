import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import * as THREE from 'three';
import { createHeroRaycaster } from './heroRaycaster';
import { CRT_MENU_CONFIG, getCrtMenuStartY } from '../../crt/crtConfig';

const mockDomElement = {
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
} as unknown as HTMLCanvasElement;

const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
const renderer = { domElement: mockDomElement } as unknown as THREE.WebGLRenderer;
const crtMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));

describe('createHeroRaycaster', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let intersectSpy: MockInstance<any>;

  beforeEach(() => {
    intersectSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObject');
  });

  afterEach(() => {
    intersectSpy.mockRestore();
  });

  // ── getHoverMenuIndexFromPointer ──────────────────────────────────────────────

  describe('getHoverMenuIndexFromPointer', () => {
    it('returns -1 when no intersection', () => {
      intersectSpy.mockReturnValue([]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getHoverMenuIndexFromPointer(400, 300, 1)).toBe(-1);
    });

    it('returns -1 when hit has no UV', () => {
      intersectSpy.mockReturnValue([{ uv: undefined }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getHoverMenuIndexFromPointer(400, 300, 1)).toBe(-1);
    });

    it('returns index 0 for UV centered on first menu item', () => {
      const menuOpacity = 1;
      const menuStartY = getCrtMenuStartY(menuOpacity);
      // Middle of item 0 in canvas space
      const targetCanvasRelY = menuStartY + CRT_MENU_CONFIG.LINE_HEIGHT * 0.5;
      const uvY = 1 - targetCanvasRelY; // canvasRelY = 1 - uv.y

      intersectSpy.mockReturnValue([{ uv: new THREE.Vector2(0.5, uvY) }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getHoverMenuIndexFromPointer(400, 300, menuOpacity)).toBe(0);
    });

    it('returns index 1 for UV centered on second menu item', () => {
      const menuOpacity = 1;
      const menuStartY = getCrtMenuStartY(menuOpacity);
      const targetCanvasRelY = menuStartY + CRT_MENU_CONFIG.LINE_HEIGHT * 1.5;
      const uvY = 1 - targetCanvasRelY;

      intersectSpy.mockReturnValue([{ uv: new THREE.Vector2(0.5, uvY) }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getHoverMenuIndexFromPointer(400, 300, menuOpacity)).toBe(1);
    });

    it('returns -1 for UV below all menu items', () => {
      const menuOpacity = 1;
      const menuStartY = getCrtMenuStartY(menuOpacity);
      const targetCanvasRelY = menuStartY + CRT_MENU_CONFIG.MENU_COUNT * CRT_MENU_CONFIG.LINE_HEIGHT + 0.01;
      const uvY = 1 - targetCanvasRelY;

      intersectSpy.mockReturnValue([{ uv: new THREE.Vector2(0.5, uvY) }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getHoverMenuIndexFromPointer(400, 300, menuOpacity)).toBe(-1);
    });

    it('returns -1 for UV above all menu items (negative relativeY)', () => {
      // relativeY < 0 means canvasRelY < menuStartY
      const menuOpacity = 1;
      const menuStartY = getCrtMenuStartY(menuOpacity);
      const targetCanvasRelY = menuStartY - 0.01;
      const uvY = 1 - targetCanvasRelY;

      intersectSpy.mockReturnValue([{ uv: new THREE.Vector2(0.5, uvY) }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getHoverMenuIndexFromPointer(400, 300, menuOpacity)).toBe(-1);
    });
  });

  // ── isClickOnCrt ─────────────────────────────────────────────────────────────

  describe('isClickOnCrt', () => {
    it('returns true when raycaster intersects the mesh', () => {
      intersectSpy.mockReturnValue([{ distance: 1 }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.isClickOnCrt(400, 300)).toBe(true);
    });

    it('returns false when no intersection', () => {
      intersectSpy.mockReturnValue([]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.isClickOnCrt(400, 300)).toBe(false);
    });
  });

  // ── getClickUV ───────────────────────────────────────────────────────────────

  describe('getClickUV', () => {
    it('returns null when no intersection', () => {
      intersectSpy.mockReturnValue([]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getClickUV(400, 300)).toBeNull();
    });

    it('returns null when hit has no UV', () => {
      intersectSpy.mockReturnValue([{ uv: undefined }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.getClickUV(400, 300)).toBeNull();
    });

    it('returns a Vector2 with correct UV coordinates on hit', () => {
      const uv = new THREE.Vector2(0.3, 0.7);
      intersectSpy.mockReturnValue([{ uv }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      const result = raycaster.getClickUV(400, 300);

      expect(result).toBeInstanceOf(THREE.Vector2);
      expect(result?.x).toBeCloseTo(0.3);
      expect(result?.y).toBeCloseTo(0.7);
    });

    it('returns a clone, not the original UV reference', () => {
      const uv = new THREE.Vector2(0.3, 0.7);
      intersectSpy.mockReturnValue([{ uv }] as unknown as THREE.Intersection[]);
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      const result = raycaster.getClickUV(400, 300);

      expect(result).not.toBe(uv);
    });
  });

  // ── isAtMenuSection ──────────────────────────────────────────────────────────

  describe('isAtMenuSection', () => {
    it('returns false when menuElement is null', () => {
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, null);

      expect(raycaster.isAtMenuSection()).toBe(false);
    });

    it('returns false when menuElement is not an HTMLElement', () => {
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, svgEl);

      expect(raycaster.isAtMenuSection()).toBe(false);
    });

    it('returns true when element is within visible viewport range', () => {
      const menuElement = document.createElement('div');
      vi.spyOn(menuElement, 'getBoundingClientRect').mockReturnValue({
        top: 100, bottom: 500, left: 0, right: 100, width: 100, height: 400,
        toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, menuElement);

      expect(raycaster.isAtMenuSection()).toBe(true);
    });

    it('returns true when element top is within 20% of viewport height (early approach margin)', () => {
      const menuElement = document.createElement('div');
      // top = 150, innerHeight = 768 → 150 <= 768 * 0.2 = 153.6 → true
      vi.spyOn(menuElement, 'getBoundingClientRect').mockReturnValue({
        top: 150, bottom: 550, left: 0, right: 100, width: 100, height: 400,
        toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, menuElement);

      expect(raycaster.isAtMenuSection()).toBe(true);
    });

    it('returns false when element top equals viewport height (menu just below hero section)', () => {
      // Régression : à scrollY=0 le menu est à rect.top = 100vh, ne doit PAS être actif
      const menuElement = document.createElement('div');
      vi.spyOn(menuElement, 'getBoundingClientRect').mockReturnValue({
        top: 768, bottom: 1168, left: 0, right: 100, width: 100, height: 400,
        toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, menuElement);

      expect(raycaster.isAtMenuSection()).toBe(false);
    });

    it('returns false when element is scrolled fully above viewport (rect.bottom <= 0)', () => {
      const menuElement = document.createElement('div');
      vi.spyOn(menuElement, 'getBoundingClientRect').mockReturnValue({
        top: -600, bottom: -10, left: 0, right: 100, width: 100, height: 400,
        toJSON: () => ({}),
      } as DOMRect);

      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, menuElement);

      expect(raycaster.isAtMenuSection()).toBe(false);
    });

    it('returns false when element is far below viewport (rect.top > viewportHeight * 0.2)', () => {
      const menuElement = document.createElement('div');
      vi.spyOn(menuElement, 'getBoundingClientRect').mockReturnValue({
        top: 2000, bottom: 2400, left: 0, right: 100, width: 100, height: 400,
        toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

      const raycaster = createHeroRaycaster(camera, renderer, crtMesh, menuElement);

      expect(raycaster.isAtMenuSection()).toBe(false);
    });
  });
});
