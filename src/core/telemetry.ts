// Système de mesure interne de l'application.
// Émet des événements (CustomEvent) pour signaler qu'une section s'est chargée,
// qu'une erreur est survenue, ou qu'une opération a pris du temps.
// Ces données peuvent être captées par des outils de debug ou d'analyse.

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
