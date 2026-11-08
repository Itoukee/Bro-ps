// Pure results computation. No Expo imports, so it can be checked off-device.
// Deliberately never computes a maximum or average speed.

export type BatterySnapshot = {
  batt: number;
  charging: boolean;
  lowPower: boolean;
  battOpt: boolean;
};

export type LogRecord =
  | ({ k: 'start'; t: number; timerTest: boolean; thresholdKmh: number; notif: boolean } & BatterySnapshot)
  | ({ k: 'stop'; t: number; interrupted: boolean } & BatterySnapshot)
  | { k: 'fix'; t: number; rx: number; spd: number | null; acc: number | null; app: string }
  | { k: 'alert'; t: number; id: string; reason: string }
  | { k: 'speech'; t: number; id: string; status: string }
  | { k: 'js'; t: number }
  | { k: 'err'; t: number; msg: string };

export type Gap = { atSec: number; lengthSec: number };

export type RideResults = {
  durationSec: number;
  fixes: number;
  backgroundFixes: number;
  invalidSpeedFixes: number;
  timeToFirstFixSec: number | null;
  largestGapSec: number;
  gapsOver30: number;
  gapList: Gap[];
  maxDeliveryLagSec: number;
  batteryUsedPct: number | null;
  charged: boolean;
  batteryOptimized: boolean | null;
  lowPower: boolean | null;
  alertsRequested: number;
  alertsSpoken: number;
  speechErrors: number;
  jsRestarts: number;
  taskErrors: number;
  stopRecorded: boolean;
  interrupted: boolean;
};

const GAP_LIMIT_SEC = 30;

export function parseLog(text: string): LogRecord[] {
  const records: LogRecord[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line) as LogRecord);
    } catch {
      // A partial last line is expected if the process died mid-write.
    }
  }
  return records;
}

export function analyse(records: LogRecord[]): RideResults | null {
  const start = records.find((r) => r.k === 'start');
  if (!start || start.k !== 'start') return null;
  const stop = records.find((r) => r.k === 'stop');
  const stopRecord = stop && stop.k === 'stop' ? stop : null;

  const fixes = records
    .flatMap((r) => (r.k === 'fix' ? [r] : []))
    .sort((a, b) => a.t - b.t);

  const gapList: Gap[] = [];
  let largestGapSec = 0;
  const checkpoints = fixes.map((f) => f.t);
  // Counting up to Stop reveals tracking that died before the rider stopped it.
  if (stopRecord && checkpoints.length > 0) checkpoints.push(stopRecord.t);
  for (let i = 1; i < checkpoints.length; i += 1) {
    const lengthSec = (checkpoints[i] - checkpoints[i - 1]) / 1000;
    largestGapSec = Math.max(largestGapSec, lengthSec);
    if (lengthSec > GAP_LIMIT_SEC) {
      gapList.push({ atSec: (checkpoints[i - 1] - start.t) / 1000, lengthSec });
    }
  }

  const lastTime = stopRecord?.t ?? fixes[fixes.length - 1]?.t ?? start.t;
  const lagsMs = fixes.map((f) => f.rx - f.t);

  const alertIds = new Set(records.flatMap((r) => (r.k === 'alert' ? [r.id] : [])));
  const speech = records.flatMap((r) => (r.k === 'speech' && alertIds.has(r.id) ? [r] : []));

  const measurable = stopRecord !== null && start.batt >= 0 && stopRecord.batt >= 0;

  return {
    durationSec: (lastTime - start.t) / 1000,
    fixes: fixes.length,
    backgroundFixes: fixes.filter((f) => f.app === 'background').length,
    invalidSpeedFixes: fixes.filter((f) => f.spd === null).length,
    timeToFirstFixSec: fixes.length > 0 ? (fixes[0].t - start.t) / 1000 : null,
    largestGapSec,
    gapsOver30: gapList.length,
    gapList,
    maxDeliveryLagSec: lagsMs.length > 0 ? Math.max(...lagsMs) / 1000 : 0,
    batteryUsedPct: measurable ? Math.round((start.batt - stopRecord.batt) * 1000) / 10 : null,
    charged: start.charging || stopRecord?.charging === true,
    batteryOptimized: start.battOpt,
    lowPower: start.lowPower,
    alertsRequested: alertIds.size,
    alertsSpoken: speech.filter((s) => s.status === 'done').length,
    speechErrors: speech.filter((s) => s.status === 'error').length,
    jsRestarts: records.filter((r) => r.k === 'js').length,
    taskErrors: records.filter((r) => r.k === 'err').length,
    stopRecorded: stopRecord !== null,
    interrupted: stopRecord?.interrupted === true,
  };
}
