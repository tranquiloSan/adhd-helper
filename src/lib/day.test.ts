import { describe, expect, it } from 'vitest';
import {
	DayCountdown,
	hourMarks,
	resolveEndTime,
	resolveStartTime,
	type DaySnapshot
} from './day.svelte';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const T0 = 1_700_000_000_000;

function started(hours = 8) {
	const day = new DayCountdown();
	day.start(T0 + hours * HOUR, T0);
	return day;
}

describe('day countdown', () => {
	it('does nothing until started', () => {
		const day = new DayCountdown();
		expect(day.status).toBe('idle');
		expect(day.remainingMs).toBe(0);
	});

	it('refuses an end time that has already passed', () => {
		const day = new DayCountdown();
		day.start(T0 - HOUR, T0);
		expect(day.status).toBe('idle');
	});

	it('counts down to the end time', () => {
		const day = started(8);
		day.sync(T0 + 3 * HOUR);
		expect(day.remainingMs).toBe(5 * HOUR);
	});

	it('ends once the time arrives', () => {
		const day = started(8);
		day.sync(T0 + 8 * HOUR);
		expect(day.status).toBe('over');
		expect(day.remainingMs).toBe(0);
	});

	it('needs announcing when it ends, but only once', () => {
		const day = started(8);
		day.sync(T0 + 8 * HOUR);
		expect(day.needsAnnouncement).toBe(true);

		day.acknowledge();
		expect(day.needsAnnouncement).toBe(false);
	});

	it('takes an earlier start without moving the countdown', () => {
		const day = new DayCountdown();
		day.start(T0 + 8 * HOUR, T0, T0 - 3 * HOUR);

		expect(day.startedAt).toBe(T0 - 3 * HOUR);
		day.sync(T0 + 3 * HOUR);
		expect(day.remainingMs).toBe(5 * HOUR);
	});

	it('clamps a start in the future to now', () => {
		const day = new DayCountdown();
		day.start(T0 + 8 * HOUR, T0, T0 + HOUR);
		expect(day.startedAt).toBe(T0);
	});
});

describe('day countdown restore', () => {
	const roundTrip = (day: DayCountdown) =>
		JSON.parse(JSON.stringify(day.toSnapshot())) as DaySnapshot;

	it('keeps counting across a period with the tab closed', () => {
		const restored = new DayCountdown();
		restored.restore(roundTrip(started(8)), T0 + 2 * HOUR);

		expect(restored.status).toBe('running');
		expect(restored.remainingMs).toBe(6 * HOUR);
	});

	it('announces a day that ended while the tab was shut, and says how long ago', () => {
		const restored = new DayCountdown();
		restored.restore(roundTrip(started(8)), T0 + 9 * HOUR);

		expect(restored.status).toBe('over');
		expect(restored.needsAnnouncement).toBe(true);
		expect(restored.overdueMs).toBe(HOUR);
	});

	it('does not announce again if it already has', () => {
		const ended = started(8);
		ended.sync(T0 + 8 * HOUR);
		ended.acknowledge();

		const restored = new DayCountdown();
		restored.restore(roundTrip(ended), T0 + 10 * HOUR);
		expect(restored.needsAnnouncement).toBe(false);
	});

	it('stopping clears it back to idle', () => {
		const day = started(8);
		day.stop(T0 + MINUTE);
		expect(day.status).toBe('idle');
		expect(day.endsAt).toBeNull();
	});
});

describe('resolveEndTime', () => {
	/** 22:00, so a small-hours end time is in the past today. */
	function tenPm(): number {
		const d = new Date(T0);
		d.setHours(22, 0, 0, 0);
		return d.getTime();
	}

	it('resolves a time still to come today', () => {
		const at = new Date(T0);
		at.setHours(15, 30, 0, 0);
		const morning = new Date(T0);
		morning.setHours(9, 0, 0, 0);
		expect(resolveEndTime('15:30', morning.getTime())).toBe(at.getTime());
	});

	it('means tomorrow when the time has already gone', () => {
		const night = tenPm();
		const end = resolveEndTime('03:00', night);
		expect(end).not.toBeNull();
		expect(end! - night).toBe(5 * HOUR);
		expect(new Date(end!).getHours()).toBe(3);
	});

	it('accepts a time without the colon', () => {
		const morning = new Date(T0);
		morning.setHours(9, 0, 0, 0);
		expect(resolveEndTime('1730', morning.getTime())).toBe(
			resolveEndTime('17:30', morning.getTime())
		);
		expect(resolveEndTime('930', morning.getTime())).toBe(
			resolveEndTime('09:30', morning.getTime())
		);
	});

	it('rejects anything that is not a time', () => {
		expect(resolveEndTime('', T0)).toBeNull();
		expect(resolveEndTime('5pm', T0)).toBeNull();
		expect(resolveEndTime('25:00', T0)).toBeNull();
		expect(resolveEndTime('12:70', T0)).toBeNull();
	});
});

describe('resolveStartTime', () => {
	/** 15:00, so morning times are in the past and evening ones are not. */
	function threePm(): number {
		const d = new Date(T0);
		d.setHours(15, 0, 0, 0);
		return d.getTime();
	}

	it('resolves a time already gone today', () => {
		const now = threePm();
		const start = resolveStartTime('09:00', now);
		expect(start).not.toBeNull();
		expect(now - start!).toBe(6 * HOUR);
		expect(new Date(start!).getHours()).toBe(9);
	});

	it('means yesterday when the time is still to come today', () => {
		const now = threePm();
		const start = resolveStartTime('22:00', now);
		expect(start).not.toBeNull();
		expect(now - start!).toBe(17 * HOUR);
		expect(new Date(start!).getHours()).toBe(22);
	});

	it('accepts a time without the colon', () => {
		const now = threePm();
		expect(resolveStartTime('900', now)).toBe(resolveStartTime('09:00', now));
	});

	it('rejects anything that is not a time', () => {
		expect(resolveStartTime('', T0)).toBeNull();
		expect(resolveStartTime('9am', T0)).toBeNull();
		expect(resolveStartTime('25:00', T0)).toBeNull();
		expect(resolveStartTime('9:70', T0)).toBeNull();
	});
});

describe('hourMarks', () => {
	/** 09:00 on an arbitrary day, so the labels are predictable. */
	function nineAm(): number {
		const d = new Date(T0);
		d.setHours(9, 0, 0, 0);
		return d.getTime();
	}

	it('labels every whole hour between start and end', () => {
		const start = nineAm();
		const marks = hourMarks(start, start + 6 * HOUR);
		expect(marks.map((m) => m.label)).toEqual(['10', '11', '12', '13', '14']);
	});

	it('places them proportionally along the span', () => {
		const start = nineAm();
		const marks = hourMarks(start, start + 6 * HOUR);
		// 10:00 is one hour into a six hour day.
		expect(marks[0].fraction).toBeCloseTo(1 / 6);
		expect(marks[4].fraction).toBeCloseTo(5 / 6);
	});

	it('excludes the end itself, which is already the edge of the span', () => {
		const start = nineAm();
		const marks = hourMarks(start, start + 2 * HOUR);
		expect(marks.map((m) => m.label)).toEqual(['10']);
	});

	it('handles a start that is not on the hour', () => {
		const start = nineAm() + 20 * MINUTE;
		const marks = hourMarks(start, start + 2 * HOUR);
		expect(marks.map((m) => m.label)).toEqual(['10', '11']);
	});

	it('returns nothing for an empty span', () => {
		expect(hourMarks(T0, T0)).toEqual([]);
	});

	it('carries on into tomorrow across midnight, padded so 00 reads as an hour', () => {
		const d = new Date(T0);
		d.setHours(22, 0, 0, 0);
		const marks = hourMarks(d.getTime(), d.getTime() + 5 * HOUR);
		expect(marks.map((m) => m.label)).toEqual(['23', '00', '01', '02']);
	});
});
