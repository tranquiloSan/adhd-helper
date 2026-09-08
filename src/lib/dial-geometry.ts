/** Side of the dial's square viewBox. */
export const DIAL_SIZE = 300;
export const DIAL_CENTRE = DIAL_SIZE / 2;

/**
 * The dial's span in minutes. One hour, always, on both tools.
 *
 * A face that changes size is a face that means something different each time
 * it changes, which is the one thing a face must not do - see
 * `docs/adr/0005-the-dial-face-is-fixed-at-an-hour.md`. Anything longer than
 * the face is counted on the rim instead.
 */
export const FACE_MINUTES = 60;

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
 * Hour slots on the rim.
 *
 * Twelve, for two reasons that happen to agree: a boundary then lands on every
 * printed number, so the slots sit on anchors the eye already uses, and one lap
 * of the rim is twelve hours. The face reads minutes and the rim reads hours,
 * which is the division an analogue clock already makes.
 */
export const RIM_SEGMENTS = 12;

/** Degrees of blank between one slot and the next, so the rim reads as separate
 *  marks rather than one ring. */
const RIM_GAP_DEGREES = 4;

/**
 * An SVG path for one hour slot on the ring, or the first `fraction` of one.
 *
 * Open rather than closed, and meant to be stroked: the ring is a line, unlike
 * the wedge, which is a filled pie drawn from the centre. A slot spans a
 * twelfth of the circle, so it can never be the long way round and the large-arc
 * flag is always zero.
 *
 * A part-filled slot is what makes the ring a reading rather than a count: the
 * hour being spent is drawn as it goes, so the ring moves continuously while the
 * face - which can only ever show one hour - swaps over. Returns an empty string
 * for nothing to draw, matching `wedgePath`.
 */
export function rimSegmentPath(
	index: number,
	radius: number,
	centre: number = DIAL_CENTRE,
	gapDegrees: number = RIM_GAP_DEGREES,
	fraction: number = 1
): string {
	const filled = Math.min(1, Math.max(0, fraction));
	if (filled <= 0) return '';

	const span = 360 / RIM_SEGMENTS;
	const from = index * span + gapDegrees / 2;
	const to = from + (span - gapDegrees) * filled;

	const start = polarPoint(from, radius, centre);
	const end = polarPoint(to, radius, centre);

	return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
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
	maxMinutes: number = FACE_MINUTES,
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

export type FaceMark = { minutes: number; degrees: number; major: boolean };
export type FaceNumber = { minutes: number; degrees: number; label: string };

/** Numbers are printed every five minutes, which is what makes twelve of them. */
const NUMBER_STEP = 5;

/**
 * Marks and numbers for the face: one mark per minute, every fifth longer, and
 * a number every five minutes.
 *
 * Per-minute detail is legible because the face is an hour and stays one. The
 * numbers exist to be positions you recognise - 15, 30, 45 can be read at a
 * glance - and they only stay recognisable because they never move.
 */
export function faceLayout(): { marks: FaceMark[]; numbers: FaceNumber[] } {
	const degreesPerMinute = 360 / FACE_MINUTES;

	const marks = Array.from({ length: FACE_MINUTES }, (_, i) => {
		const minutes = i + 1;
		return {
			minutes,
			degrees: minutes * degreesPerMinute,
			major: minutes % NUMBER_STEP === 0
		};
	});

	const numbers = Array.from({ length: FACE_MINUTES / NUMBER_STEP }, (_, i) => {
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
