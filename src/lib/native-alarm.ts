import { Capacitor, registerPlugin } from '@capacitor/core';
import type { DayStatus } from './day.svelte';
import type { TimerStatus } from './timer.svelte';

/** The timer rings until stopped; the end of the day chimes once. */
export type AlarmKind = 'timer' | 'day';

type AlarmsPlugin = {
	schedule(options: { kind: AlarmKind; at: number; title: string; body: string }): Promise<void>;
	cancel(options: { kind: AlarmKind }): Promise<void>;
	requestNotifications(): Promise<void>;
	batteryStatus(): Promise<{ restricted: boolean }>;
	openBatterySettings(): Promise<void>;
};

/** What an Android alarm should be doing for a given tool. */
export type NativeAlarmAction =
	{ kind: 'schedule'; at: number } | { kind: 'cancel' } | { kind: 'keep' };

/**
 * A running timer holds an alarm at its end. A finished one keeps whatever is
 * ringing - cancelling there would silence the alarm the moment the page
 * noticed the timer had run out. Anything else, paused included, holds none.
 */
export function timerAlarmAction(status: TimerStatus, endsAt: number | null): NativeAlarmAction {
	if (status === 'running' && endsAt !== null) return { kind: 'schedule', at: endsAt };
	if (status === 'finished') return { kind: 'keep' };
	return { kind: 'cancel' };
}

/** The same for the day: a day that is over keeps its notice until it is
 *  stopped, and stopping clears it. */
export function dayAlarmAction(status: DayStatus, endsAt: number | null): NativeAlarmAction {
	if (status === 'running' && endsAt !== null) return { kind: 'schedule', at: endsAt };
	if (status === 'over') return { kind: 'keep' };
	return { kind: 'cancel' };
}

const MESSAGES: Record<AlarmKind, { title: string; body: string }> = {
	timer: { title: 'Time is up', body: 'Your timer has finished.' },
	day: { title: 'Day over', body: 'Your day is done.' }
};

const plugin = registerPlugin<AlarmsPlugin>('Alarms');

/**
 * The Android app's alarms, held by the system rather than by the page, so
 * they go off with the app closed. See
 * docs/adr/0010-on-android-the-alarm-is-the-systems.md.
 *
 * Every call is best-effort: a failure leaves only the page's own notice,
 * which still works while the app is on screen.
 */
export const nativeAlarm = {
	available: Capacitor.getPlatform() === 'android',

	apply(alarm: AlarmKind, action: NativeAlarmAction): void {
		if (!this.available) return;
		// Logged rather than swallowed: Capacitor forwards the console to logcat,
		// and a rejection here once left every alarm unset with nothing to show.
		const failed = (error: unknown) => console.error(`Could not update the ${alarm} alarm`, error);
		if (action.kind === 'schedule') {
			void plugin
				.schedule({ kind: alarm, at: Math.round(action.at), ...MESSAGES[alarm] })
				.catch(failed);
		} else if (action.kind === 'cancel') {
			void plugin.cancel({ kind: alarm }).catch(failed);
		}
	},

	async requestNotifications(): Promise<void> {
		if (!this.available) return;
		await plugin.requestNotifications().catch(() => {});
	},

	async batteryRestricted(): Promise<boolean> {
		if (!this.available) return false;
		try {
			return (await plugin.batteryStatus()).restricted;
		} catch {
			return false;
		}
	},

	openBatterySettings(): void {
		if (!this.available) return;
		void plugin.openBatterySettings().catch(() => {});
	}
};
