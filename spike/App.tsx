import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';

import { SPIKE_THRESHOLD_KMH, TIMER_ALERT_OFFSETS_SEC } from './src/alerts';
import { analyse, parseLog, type BatterySnapshot, type RideResults } from './src/analysis';
import { LOCATION_TASK, speak } from './src/locationTask';
import { closeSession, latestLogFile, loadSession, openSession } from './src/rideLog';

type Status = 'idle' | 'running' | 'interrupted';

async function batterySnapshot(): Promise<BatterySnapshot> {
  const [batt, state, lowPower, battOpt] = await Promise.all([
    Battery.getBatteryLevelAsync(),
    Battery.getBatteryStateAsync(),
    Battery.isLowPowerModeEnabledAsync(),
    Battery.isBatteryOptimizationEnabledAsync(),
  ]);
  const charging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
  return { batt, charging, lowPower, battOpt };
}

function latestResults(): RideResults | null {
  const file = latestLogFile();
  return file ? analyse(parseLog(file.textSync())) : null;
}

const minutes = (sec: number) => `${(sec / 60).toFixed(1)} min`;
const seconds = (sec: number) => `${sec.toFixed(1)} s`;
const yesNo = (value: boolean | null) => (value === null ? 'unknown' : value ? 'yes' : 'no');

function ResultsView({ results }: { results: RideResults }) {
  const rows: [string, string][] = [
    ['Duration', minutes(results.durationSec)],
    ['Fixes', String(results.fixes)],
    ['Fixes with app in background', String(results.backgroundFixes)],
    ['Largest gap between fixes', seconds(results.largestGapSec)],
    ['Gaps over 30 s', String(results.gapsOver30)],
    ['Battery used', results.batteryUsedPct === null ? 'unknown' : `${results.batteryUsedPct} %`],
    ['Phone was charging', yesNo(results.charged)],
    ['Battery optimization on', yesNo(results.batteryOptimized)],
    ['Battery saver on', yesNo(results.lowPower)],
    ['Time to first fix', results.timeToFirstFixSec === null ? 'none' : seconds(results.timeToFirstFixSec)],
    ['Invalid speed fixes', String(results.invalidSpeedFixes)],
    ['Largest delivery delay', seconds(results.maxDeliveryLagSec)],
    ['Alerts requested', String(results.alertsRequested)],
    ['Alerts reported finished', String(results.alertsSpoken)],
    ['Speech errors', String(results.speechErrors)],
    ['JS runtime restarts', String(results.jsRestarts)],
    ['Task errors', String(results.taskErrors)],
    ['Stop recorded', yesNo(results.stopRecorded)],
    ['Ended after interruption', yesNo(results.interrupted)],
  ];
  return (
    <View accessibilityLabel="Ride results">
      <Text style={styles.heading}>Results of the last ride</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.text}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
      {results.gapList.map((gap) => (
        <Text key={gap.atSec} style={styles.text}>
          Gap at {minutes(gap.atSec)}: {seconds(gap.lengthSec)}
        </Text>
      ))}
    </View>
  );
}

function Button(props: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={[styles.button, props.disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [timerTest, setTimerTest] = useState(true);
  const [results, setResults] = useState<RideResults | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    setStatus(running ? 'running' : loadSession() ? 'interrupted' : 'idle');
    setResults(latestResults());
  }, []);

  useEffect(() => {
    refresh().catch((e: Error) => setMessage(e.message));
  }, [refresh]);

  const start = async () => {
    setMessage('');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setMessage('Location permission is required. Choose "While using the app".');
      return;
    }
    if (permission.android?.accuracy !== 'fine') {
      setMessage('Precise location is required for GPS speed. Enable it in the app permissions.');
      return;
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      setMessage('Turn on device location, then press Start again.');
      return;
    }

    // Not required for tracking: without it the tracking notification is hidden.
    const notification = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    openSession(timerTest, SPIKE_THRESHOLD_KMH, notification === 'granted', await batterySnapshot());
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 0,
        foregroundService: {
          notificationTitle: 'BroPS spike',
          notificationBody: 'Recording a GPS test on this phone only.',
          killServiceOnDestroy: false,
        },
      });
    } catch (e) {
      closeSession(true, await batterySnapshot());
      setMessage(`Could not start tracking: ${(e as Error).message}`);
      return;
    }
    // Also starts the speech engine while the app is visible.
    speak(`warmup-${Date.now()}`, 'Tracking started.');
    setStatus('running');
  };

  const stop = async () => {
    const interrupted = status === 'interrupted';
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
    closeSession(interrupted, await batterySnapshot());
    await refresh();
  };

  const share = async () => {
    const file = latestLogFile();
    if (!file) {
      setMessage('No log to export yet.');
      return;
    }
    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Export ride log' });
  };

  const idle = status === 'idle';
  const timerSummary = TIMER_ALERT_OFFSETS_SEC.map((s) => `${s / 60} min`).join(', ');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>BroPS spike</Text>
      <Text style={styles.text} accessibilityLiveRegion="polite">
        Status: {status === 'running' ? 'recording' : status === 'interrupted' ? 'interrupted, press Stop' : 'stopped'}
      </Text>
      <Button label="Start" onPress={() => start().catch((e: Error) => setMessage(e.message))} disabled={!idle} />
      <Button label="Stop" onPress={() => stop().catch((e: Error) => setMessage(e.message))} disabled={idle} />
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Timer test alerts"
        accessibilityState={{ checked: timerTest, disabled: !idle }}
        disabled={!idle}
        onPress={() => setTimerTest((value) => !value)}
        style={[styles.button, styles.secondary, !idle && styles.disabled]}
      >
        <Text style={styles.secondaryText}>
          Timer test alerts: {timerTest ? 'ON' : 'OFF'} ({timerSummary})
        </Text>
      </Pressable>
      <Text style={styles.text}>Speed alert: once per ride, above {SPIKE_THRESHOLD_KMH} km/h.</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {results && idle ? <ResultsView results={results} /> : null}
      <Button label="Share log" onPress={() => share().catch((e: Error) => setMessage(e.message))} disabled={!idle} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 56, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700', marginVertical: 4 },
  text: { fontSize: 16, flexShrink: 1 },
  value: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  message: { fontSize: 16, color: '#B00020' },
  button: {
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondary: { backgroundColor: '#E0E0E0' },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  secondaryText: { fontSize: 16, fontWeight: '600', color: '#000000', textAlign: 'center' },
});
