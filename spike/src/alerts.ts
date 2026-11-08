// Pure alert decisions. No Expo imports, so the logic can be checked off-device.

// Deliberately low: the speed path must be testable at a legal speed.
// The product threshold (130 km/h) is intentionally not available in this spike.
export const SPIKE_THRESHOLD_KMH = 30;

// Three alerts spread over the ride, to check that speech still works late,
// after long screen-off periods, not only just after Start.
export const TIMER_ALERT_OFFSETS_SEC = [120, 1800, 3300];

export type AlertReason = 'speed' | 'timer';

export type AlertState = {
  startedAt: number;
  timerTest: boolean;
  speedAlertFired: boolean;
  timerAlertsFired: number;
};

export type AlertDecision = { reasons: AlertReason[]; state: AlertState };

// Null or negative is invalid. On Android a value can also be present without
// being meaningful: expo-location does not check hasSpeed(), so 0 may mean "unknown".
export function validSpeed(speed: number | null | undefined): number | null {
  return typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null;
}

export function decideAlerts(
  state: AlertState,
  now: number,
  speedMps: number | null,
): AlertDecision {
  const reasons: AlertReason[] = [];
  let next = state;

  if (state.timerTest) {
    const elapsedSec = (now - state.startedAt) / 1000;
    const due = TIMER_ALERT_OFFSETS_SEC.filter((offset) => elapsedSec >= offset).length;
    if (due > state.timerAlertsFired) {
      // After a long gap several offsets can be due at once: speak only once.
      reasons.push('timer');
      next = { ...next, timerAlertsFired: due };
    }
  }

  if (!state.speedAlertFired && speedMps !== null && speedMps * 3.6 > SPIKE_THRESHOLD_KMH) {
    reasons.push('speed');
    next = { ...next, speedAlertFired: true };
  }

  return { reasons, state: next };
}
