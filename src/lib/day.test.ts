import { describe, expect, it } from 'vitest';
import { DayCountdown, endTimeToday, hourMarks, type DaySnapshot } from './day.svelte';

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
		expect(day.fraction).toBe(0);
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

	it('reports the fraction of the day left, which is what the dial draws', () => {
		const day = started(8);
		day.sync(T0 + 6 * HOUR);
		expect(day.fraction).toBeCloseTo(0.25);
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
		expect(day.totalMs).toBe(0);
	});
});

describe('endTimeToday', () => {
	it('resolves a time to that moment today', () => {
		const noon = new Date(T0);
		noon.setHours(15, 30, 0, 0);
		expect(endTimeToday('15:30', T0)).toBe(noon.getTime());
	});

	it('rejects anything that is not a time', () => {
		expect(endTimeToday('', T0)).toBeNull();
		expect(endTimeToday('5pm', T0)).toBeNull();
		expect(endTimeToday('25:00', T0)).toBeNull();
		expect(endTimeToday('12:70', T0)).toBeNull();
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
});
