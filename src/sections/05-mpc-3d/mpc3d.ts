import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';

// Indices dans audioManager.MUSIC_TRACKS :
// 0=SAMPLE, 1=DRUMS-loop-kick, 2=DRUMS-loop-snare, 3=DRUMS-loop-hihat
const LOOP_BUTTONS = [
  { label: 'KICK', layer: 1 },
  { label: 'SNARE', layer: 2 },
  { label: 'HI-HAT', layer: 3 },
] as const;

const PADS = [
  { name: 'PAD 1', category: 'Snare' },
  { name: 'PAD 2', category: 'Kick 1' },
  { name: 'PAD 3', category: 'Kick 2' },
  { name: 'PAD 4', category: 'Open-Hat' },
  { name: 'PAD 5', category: 'Hi-Hat' },
  { name: 'PAD 6', category: 'AWA Tag' },
] as const;

const buildMpcDom = (): HTMLElement => {
  const root = document.createElement('div');
  root.className = 'mpc-root';
  root.innerHTML = `
    <div class="mpc-body">
      <div class="mpc-frame">
        <div class="mpc-zones">

          <div class="mpc-top-zone">
            <div class="mpc-table">
              <div class="mpc-top-row">
                <div class="mpc-speakers" aria-hidden="true"></div>
                <div class="mpc-loop-buttons">
                  ${LOOP_BUTTONS.map(
                    ({ label, layer }) =>
                      `<button class="mpc-loop-btn" data-layer="${layer}" aria-label="Activer loop ${label}">${label}</button>`,
                  ).join('')}
                </div>
              </div>
              <button class="mpc-play-btn" aria-label="Lecture">&#9654; PLAY</button>
            </div>
            <div class="mpc-screen">
              <canvas class="mpc-waveform" aria-hidden="true"></canvas>
            </div>
          </div>

          <div class="mpc-middle-zone">
            ${PADS.map(
              ({ name, category }) => `
              <button class="mpc-pad-wrapper" aria-label="${name} \u2014 ${category}">
                <div class="mpc-pad"><div class="mpc-pad-bg"></div></div>
                <div class="mpc-pad-label">
                  <span class="mpc-pad-name">${name}</span>
                  <span class="mpc-pad-category">${category}</span>
                </div>
              </button>`,
            ).join('')}
          </div>

          <div class="mpc-bottom-zone">
            <div class="mpc-logo-awa" aria-hidden="true"></div>
            <p class="mpc-copyright">&copy; 2026 Master DIMI<br>MPC Part. III</p>
            <div class="mpc-record-btn" aria-hidden="true">
              <span class="mpc-rec-dot"></span>
              <span class="mpc-rec-label">RECORD</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
  return root;
};

const startWaveform = (canvas: HTMLCanvasElement): (() => void) => {
  canvas.width = canvas.offsetWidth || 166;
  canvas.height = canvas.offsetHeight || 83;

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let rafId: number;

  const waves = [
    { amp: 0.45, freq: 1.3, phase: 0, alpha: 0.9 },
    { amp: 0.28, freq: 2.5, phase: Math.PI * 0.4, alpha: 0.5 },
    { amp: 0.15, freq: 4.1, phase: Math.PI * 0.8, alpha: 0.25 },
  ];

  const draw = (ts: number) => {
    const t = ts * 0.001;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    for (const { amp, freq, phase, alpha } of waves) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(161, 84, 242, ${alpha})`;
      ctx.lineWidth = 1.5;

      for (let x = 0; x <= width; x++) {
        const normalized = (x / width) * Math.PI * 2;
        const y =
          height / 2 + Math.sin(normalized * freq + t * 2.5 + phase) * height * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(rafId);
};

const initBeatmakerSection: SectionInitializer = (context) => {
  const { audioManager } = context;
  const sectionElement = document.querySelector(getSectionSelector(SECTION_IDS.MPC));

  if (!(sectionElement instanceof HTMLElement)) {
    return { update: () => {}, dispose: () => {} };
  }

  sectionElement.dataset.state = 'active';

  const mpcRoot = buildMpcDom();
  sectionElement.appendChild(mpcRoot);

  const canvas = mpcRoot.querySelector<HTMLCanvasElement>('.mpc-waveform');
  const stopWaveform = canvas ? startWaveform(canvas) : () => {};

  const cleanupFns: (() => void)[] = [];

  // Loop buttons — débloque la layer une seule fois (fade-in)
  const unlockedLayers = new Set<number>();
  mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-loop-btn').forEach((btn) => {
    const layer = Number(btn.dataset.layer);
    const onClick = () => {
      if (unlockedLayers.has(layer)) return;
      unlockedLayers.add(layer);
      audioManager.unlockMusicLayer(layer);
      btn.classList.add('mpc-loop-btn--active');
      audioManager.playUiFx();
    };
    btn.addEventListener('click', onClick);
    cleanupFns.push(() => btn.removeEventListener('click', onClick));
  });

  // Pads — feedback visuel + FX son
  mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-pad-wrapper').forEach((btn) => {
    const onClick = () => {
      btn.classList.add('mpc-pad-wrapper--active');
      audioManager.playUiFx();
      setTimeout(() => btn.classList.remove('mpc-pad-wrapper--active'), 150);
    };
    btn.addEventListener('click', onClick);
    cleanupFns.push(() => btn.removeEventListener('click', onClick));
  });

  return {
    update: () => {},
    dispose: () => {
      stopWaveform();
      cleanupFns.forEach((fn) => fn());
      mpcRoot.remove();
      delete sectionElement.dataset.state;
    },
  };
};

export default initBeatmakerSection;
