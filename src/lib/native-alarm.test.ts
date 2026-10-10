import { describe, expect, it } from 'vitest';
import { dayAlarmAction, timerAlarmAction } from './native-alarm';
import { DayCountdown } from './day.svelte';
import { Timer } from './timer.svelte';

const START = 1_000_000;

function action(timer: Timer) {
	return timerAlarmAction(timer.status, timer.endsAt);
}

describe('timerAlarmAction', () => {
	it('holds no alarm for an idle timer', () => {
		expect(action(new Timer())).toEqual({ kind: 'cancel' });
	});

	it('sets the alarm at the end of a running timer', () => {
		const timer = new Timer();
		timer.setDurationMs(60_000, START);
		timer.start(START);
		expect(action(timer)).toEqual({ kind: 'schedule', at: START + 60_000 });
	});

	it('drops the alarm while paused, and sets it at the new end on resume', () => {
		const timer = new Timer();
		timer.setDurationMs(60_000, START);
		timer.start(START);
		timer.pause(START + 10_000);
		expect(action(timer)).toEqual({ kind: 'cancel' });

		timer.resume(START + 40_000);
		expect(action(timer)).toEqual({ kind: 'schedule', at: START + 90_000 });
	});

	it('leaves a finished timer ringing until it is dismissed', () => {
		const timer = new Timer();
		timer.setDurationMs(60_000, START);
		timer.start(START);
		timer.sync(START + 60_000);
		expect(action(timer)).toEqual({ kind: 'keep' });

		timer.reset(START + 70_000);
		expect(action(timer)).toEqual({ kind: 'cancel' });
	});
});

describe('dayAlarmAction', () => {
	const action = (day: DayCountdown) => dayAlarmAction(day.status, day.endsAt);

	it('sets the alarm at the end of a running day, and drops it when stopped', () => {
		const day = new DayCountdown();
		expect(action(day)).toEqual({ kind: 'cancel' });

		day.start(START + 3_600_000, START);
		expect(action(day)).toEqual({ kind: 'schedule', at: START + 3_600_000 });

		day.stop(START + 60_000);
		expect(action(day)).toEqual({ kind: 'cancel' });
	});

	it('leaves the notice of a day that is over until the day is stopped', () => {
		const day = new DayCountdown();
		day.start(START + 3_600_000, START);
		day.sync(START + 3_600_000);
		expect(action(day)).toEqual({ kind: 'keep' });
	});
});
