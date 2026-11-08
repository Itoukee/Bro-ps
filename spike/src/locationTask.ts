import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import type { LocationObject } from 'expo-location';

import { decideAlerts, validSpeed, type AlertReason } from './alerts';
import { appendRecord, loadSession, saveSession } from './rideLog';

export const LOCATION_TASK = 'brops-spike-location';

const ALERT_TEXT: Record<AlertReason, string> = {
  // "Attention" is a lead-in: Bluetooth audio often clips the first syllables.
  speed: 'Attention. Speed alert.',
  timer: 'Attention. BroPS voice test.',
};

export function speak(id: string, text: string): void {
  const log = (status: string) => appendRecord({ k: 'speech', t: Date.now(), id, status });
  Speech.speak(text, {
    language: 'en',
    onStart: () => log('started'),
    onDone: () => log('done'),
    onStopped: () => log('stopped'),
    onError: () => log('error'),
  });
}

function speakAlert(reason: AlertReason): void {
  const id = `${reason}-${Date.now()}`;
  appendRecord({ k: 'alert', t: Date.now(), id, reason });
  speak(id, ALERT_TEXT[reason]);
}

function handleFixes(locations: LocationObject[]): void {
  let session = loadSession();
  if (!session) return;

  const rx = Date.now();
  const app = AppState.currentState ?? 'unknown';
  for (const { timestamp, coords } of locations) {
    // Coordinates are deliberately not logged: the analysis does not need them.
    const spd = validSpeed(coords.speed);
    appendRecord({ k: 'fix', t: timestamp, rx, spd, acc: coords.accuracy, app });

    // Alerts are driven by incoming fixes, not setTimeout: React Native pauses
    // JS timers while the app is in the background.
    const decision = decideAlerts(session, rx, spd);
    if (decision.state !== session) {
      session = { ...session, ...decision.state };
      saveSession(session);
    }
    decision.reasons.forEach(speakAlert);
  }
}

// A session already open while this module loads means the JS runtime
// restarted during a ride, which is evidence the analysis needs.
if (loadSession()) appendRecord({ k: 'js', t: Date.now() });

TaskManager.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  try {
    if (error) {
      appendRecord({ k: 'err', t: Date.now(), msg: error.message });
      return;
    }
    handleFixes(data.locations);
  } catch (e) {
    appendRecord({ k: 'err', t: Date.now(), msg: e instanceof Error ? e.message : 'unknown' });
  }
});
