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

/** The dial's minute range. Drag cannot reach past it. */
export const FACE_OPTIONS = [30, 60] as const;
export type FaceMinutes = (typeof FACE_OPTIONS)[number];

export type FaceMark = { minutes: number; degrees: number; major: boolean };
export type FaceNumber = { minutes: number; degrees: number; label: string };

/** Numbers are printed every five minutes, whatever the range. */
const NUMBER_STEP = 5;

/** Intervals a stretched face's marks may fall on, finest first. */
const FACE_STEPS = [5, 10, 15, 20, 30, 60] as const;

/** About as many marks as an hour face carries numbers. */
const MAX_STRETCHED_MARKS = 12;

/**
 * The interval a stretched face is marked at: the finest round one that does
 * not crowd the rim.
 *
 * Dividing the circle into a fixed number of parts instead would put the marks
 * at whatever the length divides into - 7.5 and 22.5 on a ninety - and the job
 * of a number on a dial is to be a position you recognise. 15, 30, 45 can be
 * read at a glance; 8, 23, 38 cannot, however exact each one is.
 */
function stretchedStep(faceMinutes: number): number {
	const fits = FACE_STEPS.find((step) => Math.floor(faceMinutes / step) <= MAX_STRETCHED_MARKS);
	if (fits !== undefined) return fits;

	// Longer than the ladder covers: the nearest half hour that still fits.
	const HALF_HOUR = 30;
	return Math.ceil(faceMinutes / MAX_STRETCHED_MARKS / HALF_HOUR) * HALF_HOUR;
}

/**
 * Marks and numbers for a face of the given range: one mark per minute, every
 * fifth longer, and a number every five minutes.
 *
 * Per-minute detail only stays legible up to an hour. A longer duration
 * rescales the face to fit and is marked at a round interval instead, every
 * mark numbered. The interval divides the length rather than the circle, so a
 * length that is not a multiple of it leaves the top of the dial unnumbered -
 * which costs nothing, because the exact length is already the clock beneath.
 */
export function faceLayout(faceMinutes: number): { marks: FaceMark[]; numbers: FaceNumber[] } {
	const degreesPerMinute = 360 / faceMinutes;

	if (faceMinutes > 60) {
		const step = stretchedStep(faceMinutes);
		const stops = Array.from({ length: Math.floor(faceMinutes / step) }, (_, i) => {
			const minutes = (i + 1) * step;
			return { minutes, degrees: minutes * degreesPerMinute };
		});

		return {
			marks: stops.map((stop) => ({ ...stop, major: true })),
			numbers: stops.map((stop) => ({ ...stop, label: String(stop.minutes) }))
		};
	}

	const marks = Array.from({ length: faceMinutes }, (_, i) => {
		const minutes = i + 1;
		return {
			minutes,
			degrees: minutes * degreesPerMinute,
			major: minutes % NUMBER_STEP === 0
		};
	});

	const numbers = Array.from({ length: Math.floor(faceMinutes / NUMBER_STEP) }, (_, i) => {
		const minutes = (i + 1) * NUMBER_STEP;
		return { minutes, degrees: minutes * degreesPerMinute, label: String(minutes) };
	});

	return { marks, numbers };
}

/** A point on the dial at `degrees` clockwise from 12 o'clock. */
export function polarPoint(
	degrees: number,
	radius: number,
	centre: number = DIAL_CENTRE
): { x: number; y: number } {
	const angle = (degrees / 180) * Math.PI;
	return { x: centre + radius * Math.sin(angle), y: centre - radius * Math.cos(angle) };
}
