/**
 * Where the day's end can be put by dragging, and where a drag lands.
 *
 * Kept out of the component for the same reason the dial's geometry is: it is
 * arithmetic with edges and rounding, and that should be testable without a
 * browser.
 */

const MINUTE = 60_000;

/**
 * How far along the track the handle reaches, and so the span the track draws
 * while a day is being set up.
 *
 * Beyond this you type the time instead. A drag has to stay precise enough to
 * be worth using, and twelve hours across the track is already only about
 * twelve pixels per snap; a longer day is rare enough to type.
 */
export const DRAG_SPAN_MS = 12 * 60 * MINUTE;

/** Drag granularity. Fine enough to name a real end time, coarse enough that
 *  the handle lands where you meant it to. */
export const SNAP_MS = 15 * MINUTE;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Where a time sits on a track running from `from` for `DRAG_SPAN_MS`. */
export function fractionForTime(from: number, timestamp: number): number {
	return clamp01((timestamp - from) / DRAG_SPAN_MS);
}

/**
 * The time a fraction along the track points at, snapped.
 *
 * Never the track's own start: a day of no length is not a day, and the
 * countdown refuses one anyway.
 */
export function timeForFraction(from: number, fraction: number): number {
	const offset = clamp01(fraction) * DRAG_SPAN_MS;
	const snapped = Math.round(offset / SNAP_MS) * SNAP_MS;
	return from + Math.max(SNAP_MS, snapped);
}

/** A whole number of snaps along, for the arrow keys. */
export function nudgeTime(from: number, timestamp: number, steps: number): number {
	return timeForFraction(from, fractionForTime(from, timestamp + steps * SNAP_MS));
}
