/** Side of the dial's square viewBox. */
export const DIAL_SIZE = 300;
export const DIAL_CENTRE = DIAL_SIZE / 2;

/**
 * An SVG path for the wedge covering `fraction` of the dial, sweeping clockwise
 * from 12 o'clock. Returns an empty string when there is nothing to draw.
 */
export function wedgePath(fraction: number, radius: number, centre: number = DIAL_CENTRE): string {
	const clamped = Math.min(1, Math.max(0, fraction));
	if (clamped <= 0) return '';

	// A single 360° arc starts and ends at the same point and so draws nothing;
	// a full disc needs two half arcs.
	if (clamped >= 0.9999) {
		return [
			`M ${centre} ${centre - radius}`,
			`A ${radius} ${radius} 0 1 1 ${centre} ${centre + radius}`,
			`A ${radius} ${radius} 0 1 1 ${centre} ${centre - radius}`,
			'Z'
		].join(' ');
	}

	const theta = 2 * Math.PI * clamped;
	const x = centre + radius * Math.sin(theta);
	const y = centre - radius * Math.cos(theta);

	return [
		`M ${centre} ${centre}`,
		`L ${centre} ${centre - radius}`,
		`A ${radius} ${radius} 0 ${theta > Math.PI ? 1 : 0} 1 ${x} ${y}`,
		'Z'
	].join(' ');
}

/**
 * Whole minutes for a point on the dial, measured clockwise from 12 o'clock.
 *
 * Straight up is `maxMinutes` rather than zero: the top of the dial is a full
 * face, and snapping to zero would mean no time at all. Distance from the
 * centre is ignored, so a drag that strays off the disc still tracks.
 */
export function minutesFromPoint(
	x: number,
	y: number,
	maxMinutes: number,
	centre: number = DIAL_CENTRE
): number {
	const dx = x - centre;
	const dy = y - centre;

	// atan2(dx, -dy) puts zero at 12 o'clock and grows clockwise.
	let angle = Math.atan2(dx, -dy);
	if (angle < 0) angle += 2 * Math.PI;

	const minutes = Math.round((angle / (2 * Math.PI)) * maxMinutes);
	return minutes === 0 ? maxMinutes : minutes;
}
