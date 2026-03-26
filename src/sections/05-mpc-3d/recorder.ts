export interface Recorder {
  start(): void;
  stop(): void;
  isActive(): boolean;
}

/**
 * Capture tout l'audio passant par le masterGain de Howler et l'encode en WAV.
 *
 * Branche un ScriptProcessorNode sur le masterGain (parallèle, sans couper le
 * routage existant) et collecte les samples PCM Float32 stéréo en mémoire.
 * À l'arrêt, encode un WAV PCM 16-bit et déclenche le téléchargement.
 */
export function createRecorder(ctx: AudioContext, masterGain: GainNode): Recorder {
  const BUFFER_SIZE = 4096;
  let scriptNode: ScriptProcessorNode | null = null;
  const leftSamples: Float32Array[] = [];
  const rightSamples: Float32Array[] = [];
  let _isActive = false;

  return {
    start() {
      if (_isActive) return;
      _isActive = true;
      leftSamples.length = 0;
      rightSamples.length = 0;

      scriptNode = ctx.createScriptProcessor(BUFFER_SIZE, 2, 2);
      scriptNode.onaudioprocess = (e) => {
        leftSamples.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        rightSamples.push(new Float32Array(e.inputBuffer.getChannelData(1)));
      };
      masterGain.connect(scriptNode);
      scriptNode.connect(ctx.destination);
    },

    stop() {
      if (!_isActive) return;
      _isActive = false;

      if (scriptNode) {
        masterGain.disconnect(scriptNode);
        scriptNode.disconnect();
        scriptNode.onaudioprocess = null;
        scriptNode = null;
      }

      const blob = encodeWav(leftSamples, rightSamples, ctx.sampleRate);
      downloadBlob(blob, 'recording.wav');
    },

    isActive() {
      return _isActive;
    },
  };
}

// — Helpers internes —————————————————————————————————————————————————————————

function encodeWav(left: Float32Array[], right: Float32Array[], sampleRate: number): Blob {
  const totalSamples = left.reduce((sum, chunk) => sum + chunk.length, 0);

  const leftAll = new Float32Array(totalSamples);
  const rightAll = new Float32Array(totalSamples);
  let offset = 0;
  for (let i = 0; i < left.length; i++) {
    leftAll.set(left[i]!, offset);
    rightAll.set(right[i]!, offset);
    offset += left[i]!.length;
  }

  const NUM_CHANNELS = 2;
  const BITS_PER_SAMPLE = 16;
  const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
  const dataLength = totalSamples * NUM_CHANNELS * BYTES_PER_SAMPLE;

  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(view, 8, 'WAVE');
  // fmt chunk
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);                                         // chunk size
  view.setUint16(20, 1, true);                                          // PCM format
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * NUM_CHANNELS * BYTES_PER_SAMPLE, true); // byteRate
  view.setUint16(32, NUM_CHANNELS * BYTES_PER_SAMPLE, true);            // blockAlign
  view.setUint16(34, BITS_PER_SAMPLE, true);
  // data chunk
  writeStr(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave L/R et converti Float32 → Int16
  let dataOffset = 44;
  for (let i = 0; i < totalSamples; i++) {
    view.setInt16(dataOffset, floatToInt16(leftAll[i]!), true);
    dataOffset += 2;
    view.setInt16(dataOffset, floatToInt16(rightAll[i]!), true);
    dataOffset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function floatToInt16(sample: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
}

function writeStr(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
