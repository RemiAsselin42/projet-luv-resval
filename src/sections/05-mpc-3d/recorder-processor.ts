// TypeScript n'a pas de lib dédiée à AudioWorkletGlobalScope — déclarations minimales.
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(name: string, processorCtor: new () => AudioWorkletProcessor): void;

/**
 * AudioWorklet processor pour la capture audio.
 * Tourne dans le thread audio dédié (AudioWorkletGlobalScope).
 * Relaie chaque buffer stéréo vers le thread principal via postMessage.
 */
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    if (input && input[0] && input[1]) {
      this.port.postMessage({
        left: input[0].slice(),
        right: input[1].slice(),
      });
    }
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
