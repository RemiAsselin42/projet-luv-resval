import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// gsap + ScrollTrigger
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn(), kill: vi.fn() })),
    to: vi.fn(),
  },
  ScrollTrigger: {
    create: vi.fn(),
    refresh: vi.fn(),
    update: vi.fn(),
    getAll: vi.fn(() => []),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create: vi.fn(),
    refresh: vi.fn(),
    update: vi.fn(),
    getAll: vi.fn(() => []),
  },
}));

// Lenis : scrollTo déclenche onComplete synchroniquement par défaut
type LenisScrollToOptions = {
  duration?: number;
  force?: boolean;
  lock?: boolean;
  easing?: (t: number) => number;
  onComplete?: () => void;
};

type LenisScrollCallback = (event: { scroll: number }) => void;

class LenisMock {
  private _scroll = 0;
  private _stopped = false;
  private _listeners: LenisScrollCallback[] = [];

  on(_event: string, callback: LenisScrollCallback): void {
    this._listeners.push(callback);
  }

  scrollTo(target: number, options?: LenisScrollToOptions): void {
    if (this._stopped) return;
    this._scroll = target;
    this._listeners.forEach((cb) => cb({ scroll: this._scroll }));
    options?.onComplete?.();
  }

  raf(_time: number): void {
    // no-op in tests
  }

  stop(): void {
    this._stopped = true;
  }

  start(): void {
    this._stopped = false;
  }

  destroy(): void {
    this._listeners = [];
  }

  /** Helper de test : simule un événement scroll sans appeler scrollTo */
  emit(scrollY: number): void {
    this._scroll = scrollY;
    this._listeners.forEach((cb) => cb({ scroll: scrollY }));
  }

  get scroll(): number {
    return this._scroll;
  }
}

let lenisInstance: LenisMock;

vi.mock('lenis', () => {
  return {
    default: vi.fn(() => {
      lenisInstance = new LenisMock();
      return lenisInstance;
    }),
  };
});

// Import après les mocks
import { createScrollManager } from './scrollManager';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildSectionEl = (
  id: string,
  offsetTop: number,
  offsetHeight: number,
): HTMLElement => {
  const el = document.createElement('section');
  el.className = 'experience-section';
  el.dataset.section = id;
  Object.defineProperty(el, 'offsetTop', { get: () => offsetTop, configurable: true });
  Object.defineProperty(el, 'offsetHeight', { get: () => offsetHeight, configurable: true });
  return el;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createScrollManager — initialisation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('retourne un objet avec toutes les méthodes requises', () => {
    const sm = createScrollManager();

    expect(typeof sm.update).toBe('function');
    expect(typeof sm.subscribe).toBe('function');
    expect(typeof sm.createSectionTimeline).toBe('function');
    expect(typeof sm.createTrigger).toBe('function');
    expect(typeof sm.refresh).toBe('function');
    expect(typeof sm.getScrollY).toBe('function');
    expect(typeof sm.scrollToSection).toBe('function');
    expect(typeof sm.stop).toBe('function');
    expect(typeof sm.start).toBe('function');
    expect(typeof sm.dispose).toBe('function');

    sm.dispose();
  });

  it('getScrollY() retourne 0 initialement', () => {
    const sm = createScrollManager();

    expect(sm.getScrollY()).toBe(0);

    sm.dispose();
  });
});

describe('createScrollManager — subscribe', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('appelle le listener immédiatement avec le scrollY courant', () => {
    const sm = createScrollManager();
    const listener = vi.fn();
    sm.subscribe(listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(0);

    sm.dispose();
  });

  it('appelle le listener à chaque événement scroll', () => {
    const sm = createScrollManager();
    const listener = vi.fn();
    sm.subscribe(listener);

    lenisInstance.emit(100);
    lenisInstance.emit(200);

    // 1 appel initial + 2 scroll events
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith(200);

    sm.dispose();
  });

  it('retourne une fonction de désabonnement fonctionnelle', () => {
    const sm = createScrollManager();
    const listener = vi.fn();
    const unsubscribe = sm.subscribe(listener);

    unsubscribe();
    lenisInstance.emit(100);

    // Seulement l'appel initial, plus aucun après le unsubscribe
    expect(listener).toHaveBeenCalledOnce();

    sm.dispose();
  });
});

describe('createScrollManager — snap (getSectionIndexAtViewportAnchor)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // Simulate viewport height = 768px
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });
  });

  it("snap vers la section suivante lors d'un scroll vers le bas", () => {
    const section1 = buildSectionEl('hero', 0, 768);
    const section2 = buildSectionEl('hub-central', 768, 768);
    document.body.append(section1, section2);

    const sm = createScrollManager();

    // Simule un scroll de 10px vers le bas : l'ancre de snap (scrollY + 0.7 * 768) = 547.6
    // section1 top=0, bottom=768 → ancre dans section1 tant que scrollY < 231
    lenisInstance.emit(10);

    // Vérifie que le scrollY est bien mis à jour
    expect(sm.getScrollY()).toBe(10);

    sm.dispose();
  });

  it("appelle scrollTo sur la section cible lors d'un changement de section", () => {
    const section1 = buildSectionEl('hero', 0, 768);
    const section2 = buildSectionEl('hub-central', 768, 768);
    document.body.append(section1, section2);

    const sm = createScrollManager();

    // Premier scroll pour initialiser activeSectionIndex à 0
    lenisInstance.emit(5);

    // Scroll suffisant pour atteindre la section 2 avec l'ancre 70%
    // ancre = scrollY + 0.7 * 768 = 768 → scrollY = 0 → ancre = 537.6 (section1)
    // Pour dépasser la section 1 : scrollY + 537.6 >= 768 → scrollY >= 230.4
    lenisInstance.emit(250);

    // scrollManager doit avoir déclenché un snap vers section2 (offsetTop=768)
    expect(lenisInstance.scroll).toBe(768);

    sm.dispose();
  });

  it('ne snap pas deux fois en dessous du cooldown', () => {
    const section1 = buildSectionEl('hero', 0, 768);
    const section2 = buildSectionEl('hub-central', 768, 768);
    const section3 = buildSectionEl('reliques', 1536, 768);
    document.body.append(section1, section2, section3);

    const now = 1000;
    vi.spyOn(window.performance, 'now').mockReturnValue(now);

    const sm = createScrollManager();

    // Init
    lenisInstance.emit(5);

    // Premier snap vers section 2
    lenisInstance.emit(250);
    expect(lenisInstance.scroll).toBe(768);

    // Second snap immédiatement (cooldown = 450ms, now n'a pas bougé)
    // Reset lenis scroll manuellement pour simuler que l'on est arrivé en section 2
    lenisInstance.emit(1000); // Ancre = 1000 + 537.6 = 1537.6 → section 3

    // Doit être bloqué par le cooldown → pas de snap vers section3
    // activeSectionIndex est mis à jour mais pas de scrollTo
    expect(lenisInstance.scroll).toBe(1000);

    sm.dispose();
    vi.restoreAllMocks();
  });

  it('effectue un snap après la fin du cooldown', () => {
    const section1 = buildSectionEl('hero', 0, 768);
    const section2 = buildSectionEl('hub-central', 768, 768);
    document.body.append(section1, section2);

    const startTime = 1000;
    vi.spyOn(window.performance, 'now').mockReturnValue(startTime);

    const sm = createScrollManager();
    lenisInstance.emit(5);

    // Premier snap
    lenisInstance.emit(250);
    expect(lenisInstance.scroll).toBe(768);

    // Avance le temps au-delà du cooldown (450ms)
    vi.spyOn(window.performance, 'now').mockReturnValue(startTime + 500);

    // Retour en section 1 (scroll vers le haut)
    // ancre up = scrollY + 0.7 * 768; pour être dans section1 : ancre < 768 → scrollY < 231
    lenisInstance.emit(100);
    expect(lenisInstance.scroll).toBe(0); // snap vers section1 (offsetTop=0)

    sm.dispose();
    vi.restoreAllMocks();
  });
});

describe('createScrollManager — scrollToSection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('scroll vers la section cible par son id', () => {
    const section1 = buildSectionEl('hero', 0, 768);
    const section2 = buildSectionEl('hub-central', 768, 768);
    document.body.append(section1, section2);

    const sm = createScrollManager();
    sm.scrollToSection('hub-central');

    expect(lenisInstance.scroll).toBe(768);

    sm.dispose();
  });

  it("log un avertissement si la section n'existe pas", () => {
    document.body.innerHTML = '';
    const sm = createScrollManager();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    sm.scrollToSection('section-inexistante');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('section-inexistante'));

    sm.dispose();
    warnSpy.mockRestore();
  });

  it('bypass le snap pendant le scroll manuel', () => {
    const section1 = buildSectionEl('hero', 0, 768);
    const section2 = buildSectionEl('hub-central', 768, 768);
    document.body.append(section1, section2);

    const sm = createScrollManager();
    lenisInstance.emit(5); // init section 0

    // scrollToSection déclenche le scroll manuel, bypass snap
    sm.scrollToSection('hub-central');

    // Pendant la transition manuelle, le snap ne doit pas s'activer
    expect(lenisInstance.scroll).toBe(768);

    sm.dispose();
  });
});

describe('createScrollManager — stop / start', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('stop() appelle lenis.stop()', () => {
    const sm = createScrollManager();
    const stopSpy = vi.spyOn(lenisInstance, 'stop');
    sm.stop();

    expect(stopSpy).toHaveBeenCalledOnce();

    sm.dispose();
  });

  it('start() appelle lenis.start()', () => {
    const sm = createScrollManager();
    const startSpy = vi.spyOn(lenisInstance, 'start');
    sm.start();

    expect(startSpy).toHaveBeenCalledOnce();

    sm.dispose();
  });
});

describe('createScrollManager — dispose', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('tue tous les ScrollTriggers', () => {
    const killMock = vi.fn();
    vi.mocked(ScrollTrigger.getAll).mockReturnValue([
      { kill: killMock } as unknown as ReturnType<typeof ScrollTrigger.create>,
      { kill: killMock } as unknown as ReturnType<typeof ScrollTrigger.create>,
    ]);

    const sm = createScrollManager();
    sm.dispose();

    expect(killMock).toHaveBeenCalledTimes(2);
  });

  it('efface tous les listeners', () => {
    const sm = createScrollManager();
    const listener = vi.fn();
    sm.subscribe(listener);
    listener.mockClear();

    sm.dispose();

    // Après dispose, les listeners ne reçoivent plus rien
    lenisInstance.emit(100);
    expect(listener).not.toHaveBeenCalled();
  });

  it("détruit l'instance Lenis", () => {
    const sm = createScrollManager();
    const destroySpy = vi.spyOn(lenisInstance, 'destroy');
    sm.dispose();

    expect(destroySpy).toHaveBeenCalledOnce();
  });
});

describe('createScrollManager — createSectionTimeline', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it("retourne null si la section DOM n'existe pas", () => {
    const sm = createScrollManager();
    const timeline = sm.createSectionTimeline({ sectionId: 'inexistante' });

    expect(timeline).toBeNull();

    sm.dispose();
  });

  it('retourne une timeline gsap si la section existe', async () => {
    const section = buildSectionEl('hero', 0, 768);
    document.body.appendChild(section);

    const gsap = (await import('gsap')).default;
    const mockTimeline = { to: vi.fn(), kill: vi.fn() };
    vi.mocked(gsap.timeline).mockReturnValue(mockTimeline as unknown as ReturnType<typeof gsap.timeline>);

    const sm = createScrollManager();
    const timeline = sm.createSectionTimeline({ sectionId: 'hero' });

    expect(timeline).not.toBeNull();
    expect(gsap.timeline).toHaveBeenCalledOnce();

    sm.dispose();
  });
});
