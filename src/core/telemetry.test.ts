import { describe, it, expect, vi, afterEach } from 'vitest';
import { emitTelemetry } from './telemetry';
import type { TelemetryEvent } from './telemetry';

describe('emitTelemetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches a CustomEvent on window', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitTelemetry({ category: 'test', name: 'event', status: 'success' });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const event = dispatchSpy.mock.calls[0]![0];
    expect(event).toBeInstanceOf(CustomEvent);
  });

  it('dispatches the event with the correct type name', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitTelemetry({ category: 'test', name: 'event', status: 'success' });

    const event = dispatchSpy.mock.calls[0]![0] as CustomEvent<TelemetryEvent>;
    expect(event.type).toBe('luvresval:telemetry');
  });

  it('includes category, name and status in the event detail', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitTelemetry({ category: 'audio', name: 'startExperience', status: 'success' });

    const event = dispatchSpy.mock.calls[0]![0] as CustomEvent<TelemetryEvent>;
    expect(event.detail.category).toBe('audio');
    expect(event.detail.name).toBe('startExperience');
    expect(event.detail.status).toBe('success');
  });

  it('includes optional durationMs when provided', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitTelemetry({ category: 'load', name: 'assets', status: 'info', durationMs: 1500 });

    const event = dispatchSpy.mock.calls[0]![0] as CustomEvent<TelemetryEvent>;
    expect(event.detail.durationMs).toBe(1500);
  });

  it('includes optional meta when provided', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitTelemetry({
      category: 'section',
      name: 'init',
      status: 'info',
      meta: { section: 'hero', attempt: 1 },
    });

    const event = dispatchSpy.mock.calls[0]![0] as CustomEvent<TelemetryEvent>;
    expect(event.detail.meta).toEqual({ section: 'hero', attempt: 1 });
  });

  it('works without optional fields', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    expect(() => {
      emitTelemetry({ category: 'test', name: 'noop', status: 'error' });
    }).not.toThrow();

    const event = dispatchSpy.mock.calls[0]![0] as CustomEvent<TelemetryEvent>;
    expect(event.detail.meta).toBeUndefined();
    expect(event.detail.durationMs).toBeUndefined();
  });

  it('handles error status', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitTelemetry({ category: 'gpu', name: 'init', status: 'error' });

    const event = dispatchSpy.mock.calls[0]![0] as CustomEvent<TelemetryEvent>;
    expect(event.detail.status).toBe('error');
  });

  it('handles info status', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitTelemetry({ category: 'perf', name: 'fps', status: 'info' });

    const event = dispatchSpy.mock.calls[0]![0] as CustomEvent<TelemetryEvent>;
    expect(event.detail.status).toBe('info');
  });
});
