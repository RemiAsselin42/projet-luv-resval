import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAccessibilityMenu } from './heroAccessibility';
import { CRT_MENU_CONFIG } from './crt/crtConfig';

describe('createAccessibilityMenu', () => {
  let onItemClick: ReturnType<typeof vi.fn>;
  let onHoverChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onItemClick = vi.fn();
    onHoverChange = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ── Structure ─────────────────────────────────────────────────────────────────

  it('creates a nav container with correct ARIA label', () => {
    const menu = createAccessibilityMenu(onItemClick, onHoverChange);

    expect(menu.container.tagName).toBe('NAV');
    expect(menu.container.getAttribute('aria-label')).toBe('Menu de navigation CRT');
    menu.dispose();
  });

  it('creates one button per menu item', () => {
    const menu = createAccessibilityMenu(onItemClick, onHoverChange);

    expect(menu.buttons).toHaveLength(CRT_MENU_CONFIG.MENU_COUNT);
    expect(menu.buttons).toHaveLength(CRT_MENU_CONFIG.ITEMS.length);
    menu.dispose();
  });

  it('sets button text to the corresponding menu item label', () => {
    const menu = createAccessibilityMenu(onItemClick, onHoverChange);

    CRT_MENU_CONFIG.ITEMS.forEach((item, i) => {
      expect(menu.buttons[i]?.textContent).toBe(item);
    });
    menu.dispose();
  });

  it('initializes all buttons with tabIndex -1 (not keyboard-reachable by default)', () => {
    const menu = createAccessibilityMenu(onItemClick, onHoverChange);

    menu.buttons.forEach((btn) => {
      expect(btn.tabIndex).toBe(-1);
    });
    menu.dispose();
  });

  it('appends the container to document.body', () => {
    const menu = createAccessibilityMenu(onItemClick, onHoverChange);

    expect(document.body.contains(menu.container)).toBe(true);
    menu.dispose();
  });

  // ── updateVisibility ──────────────────────────────────────────────────────────

  describe('updateVisibility', () => {
    it('shows container and enables pointer events when menuOpacity > 0.3 and isAtMenu is true', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.updateVisibility(0.8, true);

      expect(menu.container.style.display).toBe('flex');
      menu.buttons.forEach((btn) => {
        expect(btn.tabIndex).toBe(0);
        expect(btn.style.pointerEvents).toBe('auto');
      });
      menu.dispose();
    });

    it('sets container opacity to the given menuOpacity when visible', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.updateVisibility(0.65, true);

      expect(menu.container.style.opacity).toBe('0.65');
      menu.dispose();
    });

    it('hides container when menuOpacity <= 0.3', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.updateVisibility(0.8, true);
      menu.updateVisibility(0.3, true);

      expect(menu.container.style.display).toBe('none');
      menu.buttons.forEach((btn) => {
        expect(btn.tabIndex).toBe(-1);
        expect(btn.style.pointerEvents).toBe('none');
      });
      menu.dispose();
    });

    it('hides container when isAtMenu is false regardless of opacity', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.updateVisibility(1, true);
      menu.updateVisibility(1, false);

      expect(menu.container.style.display).toBe('none');
      menu.buttons.forEach((btn) => {
        expect(btn.tabIndex).toBe(-1);
      });
      menu.dispose();
    });

    it('hides on opacity = 0 and isAtMenu = false (both hidden conditions)', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.updateVisibility(0, false);

      expect(menu.container.style.display).toBe('none');
      menu.dispose();
    });
  });

  // ── Button event handlers ─────────────────────────────────────────────────────

  describe('button event handlers', () => {
    it('calls onItemClick with the button index on click', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.buttons[0]?.dispatchEvent(new MouseEvent('click'));

      expect(onItemClick).toHaveBeenCalledWith(0);
      menu.dispose();
    });

    it('calls onItemClick with the correct index for each button', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.buttons.forEach((btn) => btn.dispatchEvent(new MouseEvent('click')));

      menu.buttons.forEach((_, i) => {
        expect(onItemClick).toHaveBeenCalledWith(i);
      });
      menu.dispose();
    });

    it('calls onHoverChange with the button index on focus', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.buttons[1]?.dispatchEvent(new FocusEvent('focus'));

      expect(onHoverChange).toHaveBeenCalledWith(1);
      menu.dispose();
    });

    it('calls onHoverChange(-1) on blur', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.buttons[0]?.dispatchEvent(new FocusEvent('blur'));

      expect(onHoverChange).toHaveBeenCalledWith(-1);
      menu.dispose();
    });
  });

  // ── dispose ───────────────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('removes the container from the DOM', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      expect(document.body.contains(menu.container)).toBe(true);

      menu.dispose();

      expect(document.body.contains(menu.container)).toBe(false);
    });

    it('is safe to call twice (idempotent)', () => {
      const menu = createAccessibilityMenu(onItemClick, onHoverChange);
      menu.dispose();

      expect(() => menu.dispose()).not.toThrow();
    });
  });
});
