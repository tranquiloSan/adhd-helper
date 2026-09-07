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
export type FaceNumber = { minutes: number; degrees: number };

/** Numbers are printed every five minutes, whatever the range. */
const NUMBER_STEP = 5;

/**
 * Marks and numbers for a face of the given range: one mark per minute, every
 * fifth longer, and a number every five minutes.
 *
 * Per-minute detail only stays legible up to an hour. A longer duration
 * rescales the face to fit, and then gets twelve plain marks and no numbers,
 * because minute marks would be too dense and the numbers would not be round.
 */
export function faceLayout(faceMinutes: number): { marks: FaceMark[]; numbers: FaceNumber[] } {
	const degreesPerMinute = 360 / faceMinutes;

	if (faceMinutes > 60) {
		return {
			marks: Array.from({ length: 12 }, (_, i) => ({
				minutes: ((i + 1) / 12) * faceMinutes,
				degrees: ((i + 1) / 12) * 360,
				major: true
			})),
			numbers: []
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
		return { minutes, degrees: minutes * degreesPerMinute };
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
