interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  opacitySpeed: number;
  opacityDir: number;
}

const PARTICLE_COUNT = 45;
const CANDLE_X_RATIO = 0.5;
const CANDLE_Y_RATIO = 0.5;
const CANDLE_INFLUENCE_RADIUS = 0.35; // normalized

export interface DustCanvas {
  canvas: HTMLCanvasElement;
  update: (deltaSeconds: number) => void;
  dispose: () => void;
}

export const createDustCanvas = (container: HTMLElement): DustCanvas => {
  const canvas = document.createElement('canvas');
  canvas.className = 'grimoire__dust-canvas';

  const ctx = canvas.getContext('2d')!;
  const particles: DustParticle[] = [];

  const syncSize = (): void => {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  };
  syncSize();

  const initParticles = (): void => {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(canvas.width, canvas.height));
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    syncSize();
    initParticles();
  });
  resizeObserver.observe(container);

  initParticles();

  const update = (deltaSeconds: number): void => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const candleX = width * CANDLE_X_RATIO;
    const candleY = height * CANDLE_Y_RATIO;
    const candleRadius = Math.min(width, height) * CANDLE_INFLUENCE_RADIUS;

    for (const p of particles) {
      // Move
      p.x += p.vx * deltaSeconds * 60;
      p.y += p.vy * deltaSeconds * 60;

      // Slight drift toward candle zone (warm air convection)
      const dx = candleX - p.x;
      const dy = candleY - p.y;
      const distToCandle = Math.sqrt(dx * dx + dy * dy);
      if (distToCandle < candleRadius) {
        const pull = (1 - distToCandle / candleRadius) * 0.0002;
        p.vx += dx * pull;
        p.vy += dy * pull - 0.00015; // slight upward drift near heat
      }

      // Clamp velocity
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.25) {
        p.vx = (p.vx / speed) * 0.25;
        p.vy = (p.vy / speed) * 0.25;
      }

      // Wrap around edges (soft wrap with margin)
      const margin = 20;
      if (p.x < -margin) p.x = width + margin;
      if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      if (p.y > height + margin) p.y = -margin;

      // Opacity flicker
      p.opacity += p.opacitySpeed * p.opacityDir * deltaSeconds;
      if (p.opacity >= p.radius * 0.4 || p.opacity <= 0.02) {
        p.opacityDir *= -1;
      }

      // Brightness boost near candle
      const candleProximity = Math.max(0, 1 - distToCandle / candleRadius);
      const finalOpacity = Math.min(p.opacity + candleProximity * 0.2, 0.55);

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 180, 131, ${finalOpacity})`;
      ctx.fill();
    }
  };

  const dispose = (): void => {
    resizeObserver.disconnect();
    canvas.remove();
  };

  return { canvas, update, dispose };
};

function createParticle(width: number, height: number): DustParticle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.08 - 0.02, // slight upward bias
    radius: 0.5 + Math.random() * 1.2,
    opacity: 0.04 + Math.random() * 0.2,
    opacitySpeed: 0.01 + Math.random() * 0.04,
    opacityDir: Math.random() > 0.5 ? 1 : -1,
  };
}
