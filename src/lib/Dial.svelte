<script lang="ts">
	import {
		DIAL_CENTRE,
		DIAL_SIZE,
		FACE_MINUTES,
		RIM_SEGMENTS,
		faceLayout,
		minutesFromPoint,
		polarPoint,
		rimSegmentPath,
		wedgePath
	} from '$lib/dial-geometry';

	type Props = {
		/** How much of the face to fill, 0 to 1. The countdown drains it; the
		 *  elapsed display fills it. */
		fraction: number;
		/** Minutes the dial currently represents, for assistive tech. */
		valueMinutes: number;
		/** Whole hours on the rim, 0 to 12. Hours still to come on the countdown,
		 *  hours already spent on the elapsed display - each pointing the same way
		 *  as its own wedge. Zero leaves the rim plain. */
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

	/** The hour ring appears only when it has something to say. An hour or less
	 *  leaves the dial exactly as it has always been. */
	const hours = $derived(Math.min(RIM_SEGMENTS, Math.max(0, Math.round(rimHours))));
	const slots = $derived(
		hours === 0
			? []
			: Array.from({ length: RIM_SEGMENTS }, (_, i) => ({
					index: i,
					path: rimSegmentPath(i, HOUR_RADIUS, CENTRE),
					lit: i < hours
				}))
	);

	/** Turn a pointer position into whole minutes on the dial. */
	function minutesAt(clientX: number, clientY: number): number {
		if (svg === null) return valueMinutes;

		const rect = svg.getBoundingClientRect();
		return minutesFromPoint(
			((clientX - rect.left) / rect.width) * SIZE,
			((clientY - rect.top) / rect.height) * SIZE,
			FACE_MINUTES,
			CENTRE
		);
	}

	function onPointerDown(event: PointerEvent) {
		if (!interactive) return;
		dragging = true;
		svg?.setPointerCapture(event.pointerId);
		onSetMinutes?.(minutesAt(event.clientX, event.clientY));
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		onSetMinutes?.(minutesAt(event.clientX, event.clientY));
	}

	function onPointerUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		svg?.releasePointerCapture(event.pointerId);
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!interactive) return;

		const delta =
			event.key === 'ArrowUp' || event.key === 'ArrowRight'
				? 1
				: event.key === 'ArrowDown' || event.key === 'ArrowLeft'
					? -1
					: 0;
		if (delta === 0) return;

		event.preventDefault();
		const next = Math.min(FACE_MINUTES, Math.max(1, valueMinutes + delta));
		onSetMinutes?.(next);
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
	aria-valuemax={Math.max(FACE_MINUTES, valueMinutes)}
	aria-valuenow={valueMinutes}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onkeydown={onKeyDown}
>
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
	     hours. Unlit slots stay drawn, so the lit ones are a position on a scale
	     rather than a row to be counted. -->
	{#if slots.length > 0}
		<g fill="none" stroke-width="4" stroke-linecap="butt">
			{#each slots as slot (slot.index)}
				<path d={slot.path} stroke={slot.lit ? wedgeColour : TRACK} opacity={slot.lit ? 1 : 0.42} />
			{/each}
		</g>
	{/if}
</svg>
