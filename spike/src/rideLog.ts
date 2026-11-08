import { Directory, File, Paths } from 'expo-file-system';

import type { AlertState } from './alerts';
import type { BatterySnapshot, LogRecord } from './analysis';

// Local only. This app has no network code and never sends this data anywhere.
// Never console.log fixes or speeds, and never commit an exported log.

export type Session = AlertState & { fileName: string };

const logDir = new Directory(Paths.document, 'ride-logs');
const sessionFile = new File(Paths.document, 'session.json');

function appendLine(fileName: string, record: LogRecord): void {
  // Synchronous on purpose: records stay in order and survive a sudden process death.
  new File(logDir, fileName).writeSync(`${JSON.stringify(record)}\n`, { append: true });
}

export function appendRecord(record: LogRecord): void {
  const session = loadSession();
  if (session) appendLine(session.fileName, record);
}

export function saveSession(session: Session): void {
  sessionFile.writeSync(JSON.stringify(session));
}

export function loadSession(): Session | null {
  try {
    return sessionFile.exists ? (JSON.parse(sessionFile.textSync()) as Session) : null;
  } catch {
    return null;
  }
}

export function openSession(timerTest: boolean, thresholdKmh: number, notif: boolean, battery: BatterySnapshot): void {
  const startedAt = Date.now();
  const fileName = `ride-${startedAt}.jsonl`;
  logDir.create({ intermediates: true, idempotent: true });
  new File(logDir, fileName).create();
  saveSession({ fileName, startedAt, timerTest, speedAlertFired: false, timerAlertsFired: 0 });
  appendLine(fileName, { k: 'start', t: startedAt, timerTest, thresholdKmh, notif, ...battery });
}

export function closeSession(interrupted: boolean, battery: BatterySnapshot): void {
  const session = loadSession();
  if (!session) return;
  appendLine(session.fileName, { k: 'stop', t: Date.now(), interrupted, ...battery });
  sessionFile.delete();
}

export function latestLogFile(): File | null {
  if (!logDir.exists) return null;
  const logs = logDir
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.jsonl'))
    .sort((a, b) => b.name.localeCompare(a.name));
  return logs[0] ?? null;
}
