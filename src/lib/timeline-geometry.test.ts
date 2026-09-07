import { describe, expect, it } from 'vitest';
import {
	DRAG_SPAN_MS,
	SNAP_MS,
	fractionForTime,
	nudgeTime,
	timeForFraction
} from './timeline-geometry';
import { resolveEndTime } from './day.svelte';
import { formatTimeOfDay } from './format';

/** Built locally, so nothing here depends on the machine's timezone. */
function at(hours: number, minutes = 0, seconds = 0): number {
	return new Date(2026, 8, 9, hours, minutes, seconds, 0).getTime();
}

/** The time nobody is ever at when they open the tool: not on a quarter hour,
 *  and part way through a second. */
const NOW = at(9, 7, 43);

describe('fractionForTime', () => {
	it('puts the track start at nothing and its reach at everything', () => {
		expect(fractionForTime(NOW, NOW)).toBe(0);
		expect(fractionForTime(NOW, NOW + DRAG_SPAN_MS)).toBe(1);
	});

	it('places a time proportionally', () => {
		expect(fractionForTime(NOW, NOW + DRAG_SPAN_MS / 4)).toBeCloseTo(0.25);
	});

	it('clamps rather than running off the end', () => {
		expect(fractionForTime(NOW, NOW - DRAG_SPAN_MS)).toBe(0);
		expect(fractionForTime(NOW, NOW + 3 * DRAG_SPAN_MS)).toBe(1);
	});
});

describe('timeForFraction', () => {
	const fractionOf = (from: number, target: number) => (target - from) / DRAG_SPAN_MS;

	/**
	 * The point of snapping absolutely rather than from the track's start. A
	 * grid measured from now would offer 09:22 and 09:37 all day, because now is
	 * never on a quarter hour.
	 */
	it('lands on a real quarter hour, whatever time it is now', () => {
		for (const fraction of [0, 0.07, 0.31, 0.5, 0.66, 0.99, 1]) {
			const landed = new Date(timeForFraction(NOW, fraction));
			expect([0, 15, 30, 45]).toContain(landed.getMinutes());
			expect(landed.getSeconds()).toBe(0);
			expect(landed.getMilliseconds()).toBe(0);
		}
	});

	it('snaps to the nearest quarter hour', () => {
		// 09:37 is seven minutes past the half hour and eight short of 09:45.
		expect(timeForFraction(NOW, fractionOf(NOW, at(9, 37)))).toBe(at(9, 30));
		expect(timeForFraction(NOW, fractionOf(NOW, at(9, 39)))).toBe(at(9, 45));
	});

	it('never lands on or before the start, because a day of no length is not a day', () => {
		expect(timeForFraction(NOW, 0)).toBe(at(9, 15));
		expect(timeForFraction(NOW, -1)).toBe(at(9, 15));
		// Even when the start is itself on the grid.
		expect(timeForFraction(at(9), 0)).toBe(at(9, 15));
	});

	it('stops at the last quarter hour inside the reach', () => {
		// Twelve hours from 09:07:43 is 21:07:43, so 21:00 is the furthest mark.
		expect(timeForFraction(NOW, 1)).toBe(at(21));
		expect(timeForFraction(NOW, 2)).toBe(at(21));
		expect(timeForFraction(at(9), 1)).toBe(at(21));
	});

	it('round-trips a time already on the grid', () => {
		expect(timeForFraction(NOW, fractionForTime(NOW, at(14, 30)))).toBe(at(14, 30));
	});
});

describe('nudgeTime', () => {
	it('moves one quarter hour at a time', () => {
		expect(nudgeTime(NOW, at(14, 30), 1)).toBe(at(14, 45));
		expect(nudgeTime(NOW, at(14, 30), -1)).toBe(at(14, 15));
	});

	it('pulls a time typed off the grid back onto it', () => {
		expect(nudgeTime(NOW, at(10, 32), 1)).toBe(at(10, 45));
		expect(nudgeTime(NOW, at(10, 32), -1)).toBe(at(10, 15));
	});

	it('stops at both ends', () => {
		expect(nudgeTime(NOW, at(9, 15), -1)).toBe(at(9, 15));
		expect(nudgeTime(NOW, at(21), 1)).toBe(at(21));
	});
});

/**
 * A drag does not set the end directly: it writes the typed field, which is
 * then resolved back into a time. That round trip crosses three modules, and
 * the awkward cases are a drag landing past midnight and a start time carrying
 * seconds the field cannot.
 */
describe('a dragged end survives the trip through the field', () => {
	const roundTrip = (now: number, fraction: number) => {
		const dragged = timeForFraction(now, fraction);
		return { dragged, resolved: resolveEndTime(formatTimeOfDay(dragged), now) };
	};

	it('holds during the day', () => {
		const { dragged, resolved } = roundTrip(at(9), 0.25);
		expect(resolved).toBe(dragged);
	});

	it('holds from a start that is part way through a second', () => {
		const { dragged, resolved } = roundTrip(NOW, 0.4);
		expect(resolved).toBe(dragged);
	});

	it('holds when the drag reaches into tomorrow', () => {
		// 22:00 plus the full twelve hours is 10:00, which today has gone.
		const { dragged, resolved } = roundTrip(at(22), 1);
		expect(resolved).toBe(dragged);
		expect(new Date(dragged).getHours()).toBe(10);
	});

	it('holds for the smallest drag across midnight', () => {
		const { dragged, resolved } = roundTrip(at(23, 50), 0);
		expect(resolved).toBe(dragged);
		expect(dragged).toBe(new Date(2026, 8, 10, 0, 0, 0, 0).getTime());
	});
});

describe('the snap is a quarter of an hour', () => {
	it('so an hour is four steps', () => {
		expect(SNAP_MS).toBe(15 * 60_000);
		expect(DRAG_SPAN_MS / SNAP_MS).toBe(48);
	});
});
