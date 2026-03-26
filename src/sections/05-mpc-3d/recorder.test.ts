import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRecorder } from './recorder';

// ── Mocks Web Audio API ───────────────────────────────────────────────────────

const makeScriptProcessorNode = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  onaudioprocess: null as ((e: AudioProcessingEvent) => void) | null,
});

type ScriptProcessorMock = ReturnType<typeof makeScriptProcessorNode>;

let scriptNodeMock: ScriptProcessorMock;

const makeAudioContext = () => ({
  sampleRate: 44100,
  destination: {},
  createScriptProcessor: vi.fn(() => {
    scriptNodeMock = makeScriptProcessorNode();
    return scriptNodeMock;
  }),
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
  it('crée un ScriptProcessorNode stéréo de 4096 samples', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    expect(ctx.createScriptProcessor).toHaveBeenCalledWith(4096, 2, 2);
  });

  it('connecte masterGain → scriptNode → destination', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    expect(masterGain.connect).toHaveBeenCalledWith(scriptNodeMock);
    expect(scriptNodeMock.connect).toHaveBeenCalledWith(ctx.destination);
  });

  it('est idempotent — un second start() est ignoré', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    recorder.start();
    expect(ctx.createScriptProcessor).toHaveBeenCalledTimes(1);
  });
});

describe('createRecorder — stop()', () => {
  it('déconnecte le scriptNode du masterGain', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    const nodeAtStart = scriptNodeMock;
    recorder.stop();
    expect(masterGain.disconnect).toHaveBeenCalledWith(nodeAtStart);
    expect(nodeAtStart.disconnect).toHaveBeenCalled();
  });

  it('déclenche un téléchargement avec le nom recording.wav', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    recorder.stop();
    expect(anchorMock.download).toBe('recording.wav');
    expect(anchorMock.click).toHaveBeenCalled();
  });

  it('est idempotent — un second stop() est ignoré', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();
    recorder.stop();
    recorder.stop();
    expect(anchorMock.click).toHaveBeenCalledTimes(1);
  });

  it('ne télécharge rien si stop() est appelé sans start()', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.stop();
    expect(anchorMock.click).not.toHaveBeenCalled();
  });
});

describe('createRecorder — encodage WAV', () => {
  it('produit un Blob de type audio/wav', () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();

    // Simule un événement onaudioprocess avec des samples silencieux
    const silentBuffer = {
      getChannelData: vi.fn(() => new Float32Array(4096)),
    };
    scriptNodeMock.onaudioprocess?.({
      inputBuffer: silentBuffer,
    } as unknown as AudioProcessingEvent);

    recorder.stop();

    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('audio/wav');
  });

  it('le header WAV commence par RIFF', async () => {
    const recorder = createRecorder(ctx as unknown as AudioContext, masterGain as unknown as GainNode);
    recorder.start();

    const silentBuffer = { getChannelData: vi.fn(() => new Float32Array(4096)) };
    scriptNodeMock.onaudioprocess?.({ inputBuffer: silentBuffer } as unknown as AudioProcessingEvent);
    recorder.stop();

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer, 0, 4);
    const riff = String.fromCharCode(...bytes);
    expect(riff).toBe('RIFF');
  });
});
