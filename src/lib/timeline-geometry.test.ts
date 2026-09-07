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

const T0 = 1_700_000_000_000;

describe('fractionForTime', () => {
	it('puts the track start at nothing and its reach at everything', () => {
		expect(fractionForTime(T0, T0)).toBe(0);
		expect(fractionForTime(T0, T0 + DRAG_SPAN_MS)).toBe(1);
	});

	it('places a time proportionally', () => {
		expect(fractionForTime(T0, T0 + DRAG_SPAN_MS / 4)).toBeCloseTo(0.25);
	});

	it('clamps rather than running off the end', () => {
		expect(fractionForTime(T0, T0 - DRAG_SPAN_MS)).toBe(0);
		expect(fractionForTime(T0, T0 + 3 * DRAG_SPAN_MS)).toBe(1);
	});
});

describe('timeForFraction', () => {
	it('snaps to the nearest step', () => {
		const nudged = timeForFraction(T0, (2.4 * SNAP_MS) / DRAG_SPAN_MS);
		expect(nudged - T0).toBe(2 * SNAP_MS);
	});

	it('never lands on the start, because a day of no length is not a day', () => {
		expect(timeForFraction(T0, 0) - T0).toBe(SNAP_MS);
		expect(timeForFraction(T0, -1) - T0).toBe(SNAP_MS);
	});

	it('reaches exactly the drag span at the far end', () => {
		expect(timeForFraction(T0, 1) - T0).toBe(DRAG_SPAN_MS);
		expect(timeForFraction(T0, 2) - T0).toBe(DRAG_SPAN_MS);
	});

	it('round-trips a snapped time', () => {
		const time = T0 + 19 * SNAP_MS;
		expect(timeForFraction(T0, fractionForTime(T0, time))).toBe(time);
	});
});

describe('nudgeTime', () => {
	it('moves one step at a time', () => {
		const time = T0 + 8 * SNAP_MS;
		expect(nudgeTime(T0, time, 1) - T0).toBe(9 * SNAP_MS);
		expect(nudgeTime(T0, time, -1) - T0).toBe(7 * SNAP_MS);
	});

	it('stops at both ends', () => {
		expect(nudgeTime(T0, T0 + SNAP_MS, -1) - T0).toBe(SNAP_MS);
		expect(nudgeTime(T0, T0 + DRAG_SPAN_MS, 1) - T0).toBe(DRAG_SPAN_MS);
	});
});

/**
 * A drag does not set the end directly: it writes the typed field, which is
 * then resolved back into a time. That round trip crosses three modules, and
 * the awkward case is a drag that lands past midnight - the field only carries
 * a wall-clock time, so the rollover has to put the day back.
 */
describe('a dragged end survives the trip through the field', () => {
	function at(hours: number, minutes = 0): number {
		return new Date(2026, 8, 9, hours, minutes, 0, 0).getTime();
	}

	const roundTrip = (now: number, fraction: number) => {
		const dragged = timeForFraction(now, fraction);
		return { dragged, resolved: resolveEndTime(formatTimeOfDay(dragged), now) };
	};

	it('holds during the day', () => {
		const { dragged, resolved } = roundTrip(at(9), 0.25);
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
		expect(dragged - at(23, 50)).toBe(SNAP_MS);
	});
});
