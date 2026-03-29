import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRecorder } from './recorder';

// Mock the AudioWorklet processor URL (Vite ?worker&url transform)
vi.mock('./recorder-processor.ts?worker&url', () => ({ default: 'blob:mock-processor-url' }));

// ── Mocks Web Audio API ───────────────────────────────────────────────────────

const makeWorkletPort = () => ({
  onmessage: null as ((e: MessageEvent) => void) | null,
  postMessage: vi.fn(),
});

const makeWorkletNode = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  port: makeWorkletPort(),
});

type WorkletNodeMock = ReturnType<typeof makeWorkletNode>;
let workletNodeMock!: WorkletNodeMock;

const AudioWorkletNodeMock = vi.fn().mockImplementation(() => {
  workletNodeMock = makeWorkletNode();
  return workletNodeMock;
});
vi.stubGlobal('AudioWorkletNode', AudioWorkletNodeMock);

const makeAudioContext = () => ({
  sampleRate: 44100,
  destination: {},
  audioWorklet: {
    addModule: vi.fn(() => Promise.resolve()),
  },
});

const makeMasterGain = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
});

// Mock URL.createObjectURL / revokeObjectURL
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
});

// Mock createElement pour intercepter le <a> de téléchargement
const anchorMock = { href: '', download: '', click: vi.fn() };
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'a') return anchorMock as unknown as HTMLElement;
  return document.createElement(tag);
});

// ── Setup ─────────────────────────────────────────────────────────────────────

let ctx: ReturnType<typeof makeAudioContext>;
let masterGain: ReturnType<typeof makeMasterGain>;

beforeEach(() => {
  ctx = makeAudioContext();
  masterGain = makeMasterGain();
  anchorMock.click.mockClear();
  AudioWorkletNodeMock.mockClear();
  (URL.createObjectURL as ReturnType<typeof vi.fn>).mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createRecorder — isActive', () => {
  it('démarre inactif', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    expect(recorder.isActive()).toBe(false);
  });

  it('devient actif après start()', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    expect(recorder.isActive()).toBe(true);
  });

  it('redevient inactif après stop()', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    recorder.stop();
    expect(recorder.isActive()).toBe(false);
  });
});

describe('createRecorder — start()', () => {
  it('crée un AudioWorkletNode après résolution du module', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    await Promise.resolve();
    expect(AudioWorkletNodeMock).toHaveBeenCalledWith(ctx, 'recorder-processor', expect.any(Object));
  });

  it('connecte masterGain → workletNode → destination', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    await Promise.resolve();
    expect(masterGain.connect).toHaveBeenCalledWith(workletNodeMock);
    expect(workletNodeMock.connect).toHaveBeenCalledWith(ctx.destination);
  });

  it('est idempotent — un second start() est ignoré', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    recorder.start();
    await Promise.resolve();
    expect(AudioWorkletNodeMock).toHaveBeenCalledTimes(1);
  });
});

describe('createRecorder — stop()', () => {
  it('déconnecte le workletNode du masterGain', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    await Promise.resolve();
    const nodeAtStart = workletNodeMock;
    recorder.stop();
    expect(masterGain.disconnect).toHaveBeenCalledWith(nodeAtStart);
    expect(nodeAtStart.disconnect).toHaveBeenCalled();
  });

  it('déclenche un téléchargement avec le nom recording.wav', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    await Promise.resolve();
    workletNodeMock.port.onmessage?.({
      data: { left: new Float32Array(128), right: new Float32Array(128) },
    } as unknown as MessageEvent);
    recorder.stop();
    expect(anchorMock.download).toBe('recording.wav');
    expect(anchorMock.click).toHaveBeenCalled();
  });

  it('est idempotent — un second stop() est ignoré', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    await Promise.resolve();
    workletNodeMock.port.onmessage?.({
      data: { left: new Float32Array(128), right: new Float32Array(128) },
    } as unknown as MessageEvent);
    recorder.stop();
    recorder.stop();
    expect(anchorMock.click).toHaveBeenCalledTimes(1);
  });

  it('ne télécharge rien si arrêté avant la collecte de données', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    recorder.stop();
    await Promise.resolve();
    expect(anchorMock.click).not.toHaveBeenCalled();
  });

  it('ne télécharge rien si stop() est appelé sans start()', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.stop();
    expect(anchorMock.click).not.toHaveBeenCalled();
  });
});

describe('createRecorder — encodage WAV', () => {
  it('produit un Blob de type audio/wav', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    await Promise.resolve();

    workletNodeMock.port.onmessage?.({
      data: { left: new Float32Array(128), right: new Float32Array(128) },
    } as unknown as MessageEvent);

    recorder.stop();

    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('audio/wav');
  });

  it('le header WAV commence par RIFF', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    await Promise.resolve();

    const silentBuffer = new Float32Array(128);
    workletNodeMock.port.onmessage?.({
      data: { left: silentBuffer, right: silentBuffer },
    } as unknown as MessageEvent);

    recorder.stop();

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer, 0, 4);
    const riff = String.fromCharCode(...bytes);
    expect(riff).toBe('RIFF');
  });
});
