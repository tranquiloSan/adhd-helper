<script lang="ts">
	import {
		DIAL_CENTRE,
		DIAL_SIZE,
		faceLayout,
		minutesFromPoint,
		polarPoint,
		wedgePath,
		type FaceMinutes
	} from '$lib/dial-geometry';

	type Props = {
		/** How much of the face to fill, 0 to 1. The countdown drains it; the
		 *  elapsed display fills it. */
		fraction: number;
		/** Range the face is laid out for. May exceed an hour, in which case the
		 *  per-minute detail is dropped. */
		faceMinutes: number;
		/** Furthest a drag may reach, and the slider's maximum. */
		dragMaxMinutes: number;
		/** Minutes the dial currently represents, for assistive tech. */
		valueMinutes: number;
		wedgeColour?: string;
		/** Turns the rim red. An empty face alone reads no differently from an
		 *  unstarted one. */
		finished?: boolean;
		interactive?: boolean;
		onSetMinutes?: (minutes: number) => void;
	};

	let {
		fraction,
		faceMinutes,
		dragMaxMinutes,
		valueMinutes,
		wedgeColour = '#dc2626',
		finished = false,
		interactive = false,
		onSetMinutes
	}: Props = $props();

	const SIZE = DIAL_SIZE;
	const CENTRE = DIAL_CENTRE;
	const RADIUS = 138;
	const LABEL_RADIUS = RADIUS - 21;

	const FACE = '#f2ece0';
	const INK = '#1c1917';

	let svg: SVGSVGElement | null = null;
	let dragging = $state(false);

	const clamped = $derived(Math.min(1, Math.max(0, fraction)));
	const wedge = $derived(wedgePath(clamped, RADIUS, CENTRE));
	const layout = $derived(faceLayout(faceMinutes));

	/** Turn a pointer position into whole minutes on the dial. */
	function minutesAt(clientX: number, clientY: number): number {
		if (svg === null) return valueMinutes;

		const rect = svg.getBoundingClientRect();
		return minutesFromPoint(
			((clientX - rect.left) / rect.width) * SIZE,
			((clientY - rect.top) / rect.height) * SIZE,
			dragMaxMinutes,
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
		const next = Math.min(dragMaxMinutes, Math.max(1, valueMinutes + delta));
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
	aria-valuemax={dragMaxMinutes}
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
			<text x={point.x} y={point.y} dominant-baseline="middle">{number.minutes}</text>
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
</svg>
