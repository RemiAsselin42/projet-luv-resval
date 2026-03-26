import { Howl, Howler } from 'howler';
import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';
import { publicUrl } from '../../utils/publicUrl';

// Indices dans audioManager.MUSIC_TRACKS :
// 0=SAMPLE, 1=DRUMS-loop-kick, 2=DRUMS-loop-snare, 3=DRUMS-loop-hihat
const LOOP_BUTTONS = [
  { label: 'KICK', layer: 1 },
  { label: 'SNARE', layer: 2 },
  { label: 'HI-HAT', layer: 3 },
] as const;

// Row du haut en premier (indices 0-2), row du bas en second (indices 3-5)
// i/o/p → indices 0/1/2 | k/l/m → indices 3/4/5
const PADS = [
  { name: 'PAD 4 ( U )', category: 'Open-Hat', file: 'DRUMS-pad-openhat.wav' },
  { name: 'PAD 5 ( I )', category: 'Hi-Hat',   file: 'DRUMS-pad-hihat.wav'   },
  { name: 'PAD 6 ( O )', category: 'AWA Tag',  file: 'DRUMS-pad-tag.mp3'     },
  { name: 'PAD 1 ( J )', category: 'Snare',    file: 'DRUMS-pad-snare.wav'   },
  { name: 'PAD 2 ( K )', category: 'Kick 1',   file: 'DRUMS-pad-kick-1.wav'  },
  { name: 'PAD 3 ( L )', category: 'Kick 2',   file: 'DRUMS-pad-kick-2.wav'  },
] as const;

const loopButtonsHtml = LOOP_BUTTONS.map(
  ({ label, layer }) => `
    <button class="mpc-loop-btn" data-layer="${layer}" aria-label="Activer loop ${label}">
      <span class="mpc-loop-indicator"></span>
      <span class="mpc-loop-label">
        <span class="mpc-loop-top">LOOP</span>
        <span class="mpc-loop-type">${label}</span>
      </span>
    </button>`,
).join('');

const padsHtml = PADS.map(
  ({ name, category }) => `
              <button class="mpc-pad-wrapper" aria-label="${name} \u2014 ${category}">
                <div class="mpc-pad"><div class="mpc-pad-bg"></div></div>
                <div class="mpc-pad-label">
                  <span class="mpc-pad-name">${name}</span>
                  <span class="mpc-pad-category">${category}</span>
                </div>
              </button>`,
).join('');

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
                <div class="mpc-speakers" aria-hidden="true"
                     style="background-image: url(${publicUrl('mpc-part-vent.png')})"></div>
                <div class="mpc-play-btn" aria-label="Lecture">
                  <span class="mpc-rec-dot"></span>
                  <span class="mpc-rec-label">RECORD</span>
                </div>
              </div>
              <div class="mpc-loop-buttons">
                ${loopButtonsHtml}
              </div>
            </div>
            <div class="mpc-screen" aria-hidden="true">
              <canvas class="mpc-waveform-canvas"></canvas>
            </div>
          </div>

          <div class="mpc-middle-zone">
            ${padsHtml}
          </div>

          <div class="mpc-bottom-zone">
          <span class="awa-tag" aria-hidden="true">            <img src="${publicUrl('Logo-AWA.png')}" class="mpc-logo-awa-img" alt="AWA" aria-hidden="true">
</span>
            <span class="mpc-copyright"><p>&copy; 2026 Master DIMI<br>MPC Part. III</p></span>
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

/**
 * Lance une visualisation waveform temps réel sur le canvas fourni.
 *
 * Branche un AnalyserNode sur Howler.masterGain (écoute en parallèle sans couper le
 * routage audio existant) et anime la forme d'onde via requestAnimationFrame.
 *
 * Rendu : oscilloscope centré (time-domain) avec dégradé violet, lissage temporel configurable.
 * Customisation :
 *   - `fftSize`               → 512 (graineux) … 8192 (très fin)
 *   - `smoothingTimeConstant` → 0 (réactif) … 1 (très lisse)
 *   - gradient colors         → remplacer les stops rgba pour un thème différent
 *   - `getByteFrequencyData`  → passer sur un rendu barres EQ
 *
 * Remplacer SAMPLE.wav par la vraie a cappella quand elle arrive — aucun autre changement.
 *
 * @returns stop — appeler dans dispose() pour nettoyer le RAF et déconnecter l'analyser
 */
const startWaveform = (canvas: HTMLCanvasElement): (() => void) => {
  const audioCtx = Howler.ctx as AudioContext;
  const masterGain = Howler.masterGain as GainNode;

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;               // 1024 bins — waveform fine
  analyser.smoothingTimeConstant = 0.82; // lissage temporel (0 = réactif, 1 = très lisse)
  masterGain.connect(analyser);          // connexion parallèle, pas de rupture du routage

  const bufferLength = analyser.frequencyBinCount; // 1024
  const dataArray = new Uint8Array(bufferLength);
  const ctx2d = canvas.getContext('2d')!;
  let rafId = 0;

  const draw = () => {
    rafId = requestAnimationFrame(draw);

    const W = (canvas.width = canvas.offsetWidth);
    const H = (canvas.height = canvas.offsetHeight);
    const mid = H / 2;

    analyser.getByteTimeDomainData(dataArray); // 0–255, 128 = silence

    ctx2d.clearRect(0, 0, W, H);

    // Dégradé vertical : transparent aux bords → violet vif au centre
    const grad = ctx2d.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    'rgba(161, 84, 242, 0)');
    grad.addColorStop(0.35, 'rgba(161, 84, 242, 0.65)');
    grad.addColorStop(0.5,  'rgba(161, 84, 242, 0.9)');
    grad.addColorStop(0.65, 'rgba(161, 84, 242, 0.65)');
    grad.addColorStop(1,    'rgba(161, 84, 242, 0)');

    ctx2d.beginPath();
    const sliceW = W / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i]! / 128) - 1; // normalise -1 → +1
      const y = mid + v * mid * 0.85;       // 0.85 = marge haute/basse
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
      x += sliceW;
    }
    ctx2d.lineTo(W, mid);
    ctx2d.strokeStyle = grad;
    ctx2d.lineWidth = 3.5;
    ctx2d.stroke();

    // Ligne centrale (repère de silence)
    ctx2d.beginPath();
    ctx2d.moveTo(0, mid);
    ctx2d.lineTo(W, mid);
    ctx2d.strokeStyle = 'rgba(161, 84, 242, 0.15)';
    ctx2d.lineWidth = 1;
    ctx2d.stroke();
  };

  draw();

  return () => {
    cancelAnimationFrame(rafId);
    analyser.disconnect();
  };
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

  // Responsive scale — ajuste la taille au viewport
  const MPC_NATURAL_W = 388; // 372 + 2 * 8px padding body
  const MPC_NATURAL_H = 356; // hauteur naturelle approximative
  const applyScale = () => {
    const availW = sectionElement.clientWidth * 0.9;
    const availH = sectionElement.clientHeight * 0.85;
    const scale = Math.min(availW / MPC_NATURAL_W, availH / MPC_NATURAL_H, 1.8); // cap à 180% pour éviter un agrandissement excessif sur très grand écran
    mpcRoot.style.setProperty('--mpc-scale', scale.toFixed(3)); // CSS variable utilisée dans le transform: scale() du root pour un rendu net (vs scale calculé dans JS qui serait plus flou)
  };
  const ro = new ResizeObserver(applyScale);
  ro.observe(sectionElement);
  applyScale();

  const waveformCanvas = mpcRoot.querySelector<HTMLCanvasElement>('.mpc-waveform-canvas');
  const stopWaveform = waveformCanvas ? startWaveform(waveformCanvas) : null;

  const cleanupFns: (() => void)[] = [];

  // Loop buttons — toggle on/off avec fade-in/fade-out audio
  mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-loop-btn').forEach((btn) => {
    const layer = Number(btn.dataset.layer);
    const onClick = () => {
      if (btn.classList.contains('mpc-loop-btn--active')) {
        btn.classList.remove('mpc-loop-btn--active');
        audioManager.lockMusicLayer(layer);
      } else {
        btn.classList.add('mpc-loop-btn--active');
        audioManager.unlockMusicLayer(layer);
      }
    };
    btn.addEventListener('click', onClick);
    cleanupFns.push(() => btn.removeEventListener('click', onClick));
  });

  // Pads — feedback visuel + son dédié
  const padSounds = PADS.map(({ file }) =>
    new Howl({ src: [publicUrl(`audio/pads/${file}`)], volume: 0.9, pool: 2, preload: true }),
  );

  const padButtons = mpcRoot.querySelectorAll<HTMLButtonElement>('.mpc-pad-wrapper');

  const triggerPad = (i: number) => {
    const btn = padButtons[i];
    if (!btn) return;
    btn.classList.add('mpc-pad-wrapper--active');
    padSounds[i]?.play();
    setTimeout(() => btn.classList.remove('mpc-pad-wrapper--active'), 150);
  };

  padButtons.forEach((btn, i) => {
    const onClick = () => triggerPad(i);
    btn.addEventListener('click', onClick);
    cleanupFns.push(() => btn.removeEventListener('click', onClick));
  });

  // Mapping clavier → pads
  // i/o/p → row du haut (PAD 4/5/6, indices 0/1/2)
  // k/l/m → row du bas  (PAD 1/2/3, indices 3/4/5)
  const KEY_PAD_MAP: Record<string, number> = {
    KeyU: 0, KeyI: 1, KeyO: 2,
    KeyJ: 3, KeyK: 4, KeyL: 5,
    Numpad4: 0, Numpad5: 1, Numpad6: 2,
    Numpad1: 3, Numpad2: 4, Numpad3: 5,
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const idx = KEY_PAD_MAP[e.code];
    if (idx !== undefined) triggerPad(idx);
  };
  document.addEventListener('keydown', onKeyDown);
  cleanupFns.push(() => document.removeEventListener('keydown', onKeyDown));

  return {
    update: () => {},
    dispose: () => {
      stopWaveform?.();
      ro.disconnect();
      cleanupFns.forEach((fn) => fn());
      padSounds.forEach((s) => s.unload());
      mpcRoot.remove();
      delete sectionElement.dataset.state;
    },
  };
};

export default initBeatmakerSection;
