export type TelemetryStatus = 'success' | 'error' | 'info';

export interface TelemetryEvent {
  category: string;
  name: string;
  status: TelemetryStatus;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

const TELEMETRY_EVENT_NAME = 'luvresval:telemetry';

export const emitTelemetry = (event: TelemetryEvent): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<TelemetryEvent>(TELEMETRY_EVENT_NAME, { detail: event }));
  }
};
