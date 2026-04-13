// Construction du DOM et visualisation waveform de la section MPC.
// Centralise les données des pads/boucles, le template HTML complet
// et la visualisation oscilloscope temps réel via AnalyserNode.

import { Howler } from 'howler';
import { publicUrl } from '../../utils/publicUrl';

// ── Données statiques ─────────────────────────────────────────────────────────

// Indices dans audioManager.MUSIC_TRACKS :
// 0=SAMPLE, 1=DRUMS-loop-kick, 2=DRUMS-loop-snare, 3=DRUMS-loop-hihat, 4=EVIL_SAMPLE, 5=ACAP-luv-resval
export const LOOP_BUTTONS = [
  { label: 'KICK', layer: 1 },
  { label: 'SNARE', layer: 2 },
  { label: 'HI-HAT', layer: 3 },
] as const;

// Row du haut en premier (indices 0-2), row du bas en second (indices 3-5)
// U/I/O → indices 0/1/2 | J/K/L → indices 3/4/5
export const PADS = [
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

// ── Construction du DOM ───────────────────────────────────────────────────────

/**
 * Construit le DOM complet de la MPC :
 * - Zone haute : bouton play, boucles (kick/snare/hihat), écran waveform, potard volume, mute, stop
 * - Zone milieu : 6 pads percussifs
 * - Zone basse : logo AWA, copyright, bouton record
 */
export const buildMpcDom = (): HTMLElement => {
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
                     style="background-image: url(${publicUrl('mpc-part-vent.png')})">
                </div>
                <button class="mpc-play-btn" aria-label="Lecture">
                  <span class="mpc-play-dot"></span>
                  <span class="mpc-play-label">PLAY</span>
                </button>
              </div>
              <div class="mpc-loop-buttons">
                ${loopButtonsHtml}
              </div>
            </div>
            <div class="mpc-screen-container" aria-hidden="true">
              <div class="mpc-screen" aria-hidden="true">
                <canvas class="mpc-waveform-canvas"></canvas>
              </div>
              <div class="mpc-options-btns">
                <div class="mpc-options-volume">
                  <div class="mpc-knob" role="slider" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" tabindex="0">
                    <div class="mpc-knob-wheel">
                      <div class="mpc-knob-ring">
                        <div class="mpc-knob-dot"></div>
                      </div>
                    </div>
                    <span class="mpc-knob-label">VOL</span>
                  </div>
                </div>
                <div class="mpc-options-mute">
                  <button class="mpc-mute-btn" aria-label="Désactiver le son">
                    <span class="mpc-toggle-indicator"></span>
                    <span class="mpc-toggle-label"><span class="mpc-toggle-top">MUTE</span></span>
                  </button>
                </div>
                <div class="mpc-options-stop">
                  <button class="mpc-stop-btn" aria-label="Arrêt des boucles">
                    <span class="mpc-toggle-indicator"></span>
                    <span class="mpc-toggle-label"><span class="mpc-toggle-top">STOP</span></span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mpc-middle-zone">
            ${padsHtml}
          </div>

          <div class="mpc-bottom-zone">
          <span class="awa-tag" aria-hidden="true">            <img src="${publicUrl('Logo-AWA.png')}" class="mpc-logo-awa-img" alt="AWA" aria-hidden="true">
</span>
            <span class="mpc-copyright"><p>&copy; 2026 Master DIMI<br>MPC Part. III</p></span>
            <button class="mpc-record-btn" aria-label="Démarrer l'enregistrement">
              <span class="mpc-rec-dot"></span>
              <span class="mpc-rec-label">RECORD</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  `;
  return root;
};

// ── Visualisation waveform ────────────────────────────────────────────────────

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
 * @returns stop — appeler dans dispose() pour nettoyer le RAF et déconnecter l'analyser
 */
export const startWaveform = (canvas: HTMLCanvasElement): (() => void) => {
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
