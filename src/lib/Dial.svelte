<script lang="ts">
	import {
		DIAL_CENTRE,
		DIAL_SIZE,
		FACE_MINUTES,
		RIM_SEGMENTS,
		degreesFromPoint,
		faceLayout,
		minutesFromDegrees,
		polarPoint,
		rimSegmentPath,
		wedgePath
	} from '$lib/dial-geometry';

	type Props = {
		/** How much of the face to fill, 0 to 1. The countdown drains it; the
		 *  elapsed display fills it. */
		fraction: number;
		/** Minutes the dial currently represents. The whole length, not just the
		 *  part on the face, so a drag knows which hour it is starting in. */
		valueMinutes: number;
		/** Longest a drag may wind up to. */
		maxMinutes?: number;
		/** Hours lit on the ring, 0 to 12, and fractional: the hour in progress is
		 *  drawn as it goes. Time still to come on the countdown, time already
		 *  spent on the elapsed display - each pointing the same way as its own
		 *  wedge. */
		rimHours?: number;
		wedgeColour?: string;
		/** Turns the rim red. An empty face alone reads no differently from an
		 *  unstarted one. */
		finished?: boolean;
		interactive?: boolean;
		onSetMinutes?: (minutes: number) => void;
	};

	let {
		fraction,
		valueMinutes,
		maxMinutes = FACE_MINUTES,
		rimHours = 0,
		wedgeColour = '#dc2626',
		finished = false,
		interactive = false,
		onSetMinutes
	}: Props = $props();

	const SIZE = DIAL_SIZE;
	const CENTRE = DIAL_CENTRE;
	const RADIUS = 138;
	const LABEL_RADIUS = RADIUS - 21;
	/** The hour slots sit outside the disc. Drawn on the disc's own rim they
	 *  would be ink on a near-black page on one side and lost under a full wedge
	 *  on the other; out here each slot has the background to stand against. */
	const HOUR_RADIUS = RADIUS + 7;

	const FACE = '#f2ece0';
	const INK = '#1c1917';
	/** The unlit part of the hour ring: present enough to be a scale, quiet
	 *  enough not to compete with the face. */
	const TRACK = '#525252';

	let svg: SVGSVGElement | null = null;
	let dragging = $state(false);

	const clamped = $derived(Math.min(1, Math.max(0, fraction)));
	const wedge = $derived(wedgePath(clamped, RADIUS, CENTRE));
	const layout = faceLayout();

	/**
	 * The ring: twelve slots always drawn as a track, with the lit part laid over
	 * it and the hour in progress part-filled.
	 *
	 * Hiding the track when nothing was lit looked like the tidier rule and made
	 * the crossing worse - the whole ring appeared and disappeared as an hour
	 * changed hands, so two things moved at once. An empty ring is not a count of
	 * nothing anyway; it is the scale the count is read against, and a ruler with
	 * nothing measured on it is still a ruler.
	 */
	const hours = $derived(Math.min(RIM_SEGMENTS, Math.max(0, rimHours)));
	const slots = $derived(
		Array.from({ length: RIM_SEGMENTS }, (_, i) => ({
			index: i,
			track: rimSegmentPath(i, HOUR_RADIUS, CENTRE),
			lit: rimSegmentPath(i, HOUR_RADIUS, CENTRE, undefined, hours - i)
		}))
	);

	/**
	 * What a drag is holding still while it moves the other half.
	 *
	 * The face and the ring are a minute hand and an hour hand, and each is
	 * pointed at the same way: a drag on the face sets the minutes of the hour it
	 * is in, and a drag on the ring sets the hour and leaves the minutes. So on a
	 * 1h30 timer, pointing at the 10 means 1h10 rather than 10 minutes, and
	 * pointing at the fourth slot means 3h30.
	 *
	 * Which one a drag is working is decided when it starts and held for its
	 * whole life, so a face drag that strays off the disc - which is allowed, and
	 * is how you reach the last minute of an hour - cannot turn into an hour drag
	 * halfway through.
	 */
	let onRing = false;
	let dragHours = 0;
	let dragMinutes = 0;
	let lastDegrees = 0;

	const MAX_DRAG_HOURS = $derived(Math.max(0, Math.ceil(maxMinutes / FACE_MINUTES) - 1));

	/** Anything beyond the disc and its outline belongs to the ring. Measured
	 *  from the outside of the rim stroke, so the drawn disc is all face. */
	const RING_FROM = RADIUS + 3;

	function pointAt(clientX: number, clientY: number): { x: number; y: number } {
		const rect = svg!.getBoundingClientRect();
		return {
			x: ((clientX - rect.left) / rect.width) * SIZE,
			y: ((clientY - rect.top) / rect.height) * SIZE
		};
	}

	/** The hour `minutes` sits in, counting a whole hour as the top of its own
	 *  face rather than the bottom of the next one. */
	const hourOf = (minutes: number) => Math.max(0, Math.ceil(minutes / FACE_MINUTES) - 1);

	function commit(degrees: number) {
		const hours = onRing ? Math.floor(degrees / (360 / RIM_SEGMENTS)) : dragHours;
		const minutes = onRing ? dragMinutes : minutesFromDegrees(degrees, FACE_MINUTES);
		const clamped = Math.min(MAX_DRAG_HOURS, Math.max(0, hours));
		onSetMinutes?.(Math.min(maxMinutes, clamped * FACE_MINUTES + minutes));
	}

	function onPointerDown(event: PointerEvent) {
		if (!interactive || svg === null) return;
		dragging = true;
		svg.setPointerCapture(event.pointerId);

		const point = pointAt(event.clientX, event.clientY);
		onRing = Math.hypot(point.x - CENTRE, point.y - CENTRE) >= RING_FROM;

		dragHours = hourOf(valueMinutes);
		dragMinutes = valueMinutes - dragHours * FACE_MINUTES;
		lastDegrees = degreesFromPoint(point.x, point.y, CENTRE);
		commit(lastDegrees);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging || svg === null) return;
		const point = pointAt(event.clientX, event.clientY);
		const degrees = degreesFromPoint(point.x, point.y, CENTRE);

		// On the face, a large angle becoming small is a sweep forwards past
		// twelve o'clock, and the reverse is a sweep back - which is how a face
		// drag reaches an hour it did not start in. Pointer moves are sampled far
		// too often for a real drag to skip the window. The ring needs none of
		// this: the hour is wherever the pointer is.
		if (!onRing) {
			if (lastDegrees > 270 && degrees < 90) dragHours += 1;
			else if (lastDegrees < 90 && degrees > 270) dragHours -= 1;
			dragHours = Math.min(MAX_DRAG_HOURS, Math.max(0, dragHours));
		}

		lastDegrees = degrees;
		commit(degrees);
	}

	function onPointerUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		svg?.releasePointerCapture(event.pointerId);
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!interactive) return;

		const direction =
			event.key === 'ArrowUp' || event.key === 'ArrowRight'
				? 1
				: event.key === 'ArrowDown' || event.key === 'ArrowLeft'
					? -1
					: 0;
		if (direction === 0) return;

		// Shift is the keyboard's ring: whole hours rather than minutes.
		const step = event.shiftKey ? FACE_MINUTES : 1;
		event.preventDefault();
		onSetMinutes?.(Math.min(maxMinutes, Math.max(1, valueMinutes + direction * step)));
	}
</script>

<svg
	bind:this={svg}
	viewBox="0 0 {SIZE} {SIZE}"
	class="w-[min(82vw,26rem)] touch-none rounded-full outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 {interactive
		? 'cursor-pointer'
		: 'cursor-default'}"
	role="slider"
	tabindex={interactive ? 0 : -1}
	aria-label="Timer duration in minutes"
	aria-disabled={!interactive}
	aria-valuemin={1}
	aria-valuemax={Math.max(maxMinutes, valueMinutes)}
	aria-valuenow={valueMinutes}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onkeydown={onKeyDown}
>
	<!-- A transparent backdrop, so the ring and the gaps between its slots are as
	     easy to hit as the disc. Without it only the four-unit-wide slots would
	     take a click, which is not a target anyone can aim at. -->
	<circle cx={CENTRE} cy={CENTRE} r={CENTRE} fill="transparent" />

	<!-- The face is a whole filled circle; the wedge sits on top of it. -->
	<circle cx={CENTRE} cy={CENTRE} r={RADIUS} fill={FACE} />

	{#if wedge !== ''}
		<path d={wedge} fill={wedgeColour} />
	{/if}

	<g stroke={INK} stroke-linecap="round">
		{#each layout.marks as mark (mark.minutes)}
			<line
				x1={CENTRE}
				y1={CENTRE - RADIUS}
				x2={CENTRE}
				y2={CENTRE - RADIUS + (mark.major ? 10 : 5)}
				stroke-width={mark.major ? 2 : 1}
				opacity={mark.major ? 0.7 : 0.4}
				transform="rotate({mark.degrees} {CENTRE} {CENTRE})"
			/>
		{/each}
	</g>

	<g fill={INK} font-size="13" font-weight="600" text-anchor="middle" opacity="0.85">
		{#each layout.numbers as number (number.minutes)}
			{@const point = polarPoint(number.degrees, LABEL_RADIUS, CENTRE)}
			<text x={point.x} y={point.y} dominant-baseline="middle">{number.label}</text>
		{/each}
	</g>

	<!-- Rim last, so wedge and marks stop cleanly against it. Red is the only
	     signal that the timer has finished, since an empty face alone reads the
	     same as one that has not been started. -->
	<circle
		cx={CENTRE}
		cy={CENTRE}
		r={RADIUS}
		fill="none"
		stroke={finished ? '#dc2626' : INK}
		stroke-width={finished ? 8 : 6}
		opacity="0.9"
	/>

	<!-- One slot per hour, outside the disc, its boundaries landing on the printed
	     numbers - twelve of each, so the face reads minutes and the ring reads
	     hours. Between them they are an hour hand and a minute hand: the same
	     time at two scales, which is why the ring can move smoothly through the
	     moment the face swaps over.

	     Lit in the face's own colour, because that is what a full slot stands
	     for - one more whole face of time. Taking the wedge's colour instead put
	     red on red the moment a whole-hour timer started, which is when the ring
	     carries the most. -->
	<g fill="none" stroke-width="4" stroke-linecap="butt">
		{#each slots as slot (slot.index)}
			<path d={slot.track} stroke={TRACK} opacity="0.42" />
		{/each}
		{#each slots as slot (slot.index)}
			{#if slot.lit !== ''}
				<path d={slot.lit} stroke={FACE} />
			{/if}
		{/each}
	</g>
</svg>
