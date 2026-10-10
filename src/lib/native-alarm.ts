import { Capacitor, registerPlugin } from '@capacitor/core';
import type { TimerStatus } from './timer.svelte';

type TimerAlarmPlugin = {
	schedule(options: { at: number; title: string; body: string }): Promise<void>;
	cancel(): Promise<void>;
	requestNotifications(): Promise<void>;
	batteryStatus(): Promise<{ restricted: boolean }>;
	openBatterySettings(): Promise<void>;
};

/** What the Android alarm should be doing for a given timer. */
export type NativeAlarmAction =
	{ kind: 'schedule'; at: number } | { kind: 'cancel' } | { kind: 'keep' };

/**
 * A running timer holds an alarm at its end. A finished one keeps whatever is
 * ringing - cancelling there would silence the alarm the moment the page
 * noticed the timer had run out. Anything else, paused included, holds none.
 */
export function nativeAlarmAction(status: TimerStatus, endsAt: number | null): NativeAlarmAction {
	if (status === 'running' && endsAt !== null) return { kind: 'schedule', at: endsAt };
	if (status === 'finished') return { kind: 'keep' };
	return { kind: 'cancel' };
}

const plugin = registerPlugin<TimerAlarmPlugin>('TimerAlarm');

/**
 * The timer's alarm on Android, held by the system rather than by the page.
 * See docs/adr/0010-on-android-the-alarm-is-the-systems.md.
 *
 * Every call is best-effort: a failure leaves the page's own alarm, which still
 * rings while the app is on screen.
 */
export const nativeAlarm = {
	available: Capacitor.getPlatform() === 'android',

	apply(action: NativeAlarmAction): void {
		if (!this.available) return;
		if (action.kind === 'schedule') {
			void plugin
				.schedule({ at: action.at, title: 'Time is up', body: 'Your timer has finished.' })
				.catch(() => {});
		} else if (action.kind === 'cancel') {
			void plugin.cancel().catch(() => {});
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
