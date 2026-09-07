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
 * The time a fraction along the track points at, snapped to the clock.
 *
 * Snapped absolutely rather than relative to the track's start, so the marks
 * are real quarter hours - 08:00, 10:30 - and not whatever offset now happens
 * to carry. Every timezone offset in use is a whole number of quarter hours, so
 * a timestamp on a `SNAP_MS` boundary is on one locally too, seconds included.
 *
 * Never the track's own start: a day of no length is not a day, and the
 * countdown refuses one anyway.
 */
export function timeForFraction(from: number, fraction: number): number {
	const target = from + clamp01(fraction) * DRAG_SPAN_MS;
	const snapped = Math.round(target / SNAP_MS) * SNAP_MS;

	// The nearest mark can fall behind the start, and the last one inside the
	// reach can fall beyond it. Both ends stay on the grid.
	if (snapped <= from) return Math.floor(from / SNAP_MS) * SNAP_MS + SNAP_MS;
	const reach = Math.floor((from + DRAG_SPAN_MS) / SNAP_MS) * SNAP_MS;
	return Math.min(snapped, reach);
}

/** A whole number of snaps along, for the arrow keys. Pulls a time typed off
 *  the grid onto it, since it snaps like any other move. */
export function nudgeTime(from: number, timestamp: number, steps: number): number {
	const target = timestamp + steps * SNAP_MS;
	return timeForFraction(from, (target - from) / DRAG_SPAN_MS);
}
