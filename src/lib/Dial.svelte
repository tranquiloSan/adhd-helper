<script lang="ts">
	import { DIAL_CENTRE, DIAL_SIZE, minutesFromPoint, wedgePath } from '$lib/dial-geometry';

	type Props = {
		remainingMs: number;
		durationMs: number;
		finished: boolean;
		/** Whether the dial can be dragged. False once the timer has started. */
		interactive: boolean;
		onSetMinutes: (minutes: number) => void;
	};

	let { remainingMs, durationMs, finished, interactive, onSetMinutes }: Props = $props();

	const SIZE = DIAL_SIZE;
	const CENTRE = DIAL_CENTRE;
	const RADIUS = 138;
	const LABEL_RADIUS = RADIUS - 21;

	const FACE = '#f2ece0';
	const WEDGE = '#dc2626';
	const INK = '#1c1917';

	/** Dragging always works in whole minutes on the 60-minute face. */
	const MAX_DRAG_MINUTES = 60;

	let svg: SVGSVGElement | null = null;
	let dragging = $state(false);

	const remainingMinutes = $derived(remainingMs / 60_000);
	const durationMinutes = $derived(Math.round(durationMs / 60_000));

	/**
	 * A real Time Timer has a fixed 60-minute face: 25 minutes covers 25/60 of the
	 * circle, so a given amount of red always means the same amount of time. The
	 * face only rescales for a duration that will not fit on it, and then the
	 * per-minute detail is dropped as meaningless.
	 */
	const faceMinutes = $derived(Math.max(60, Math.ceil(durationMs / 60_000)));
	const detailed = $derived(faceMinutes === 60);

	const fraction = $derived(Math.min(1, Math.max(0, remainingMinutes / faceMinutes)));

	const wedge = $derived(wedgePath(fraction, RADIUS, CENTRE));

	/** One mark per minute, every fifth one longer. Only meaningful on the
	 *  60-minute face; a rescaled face gets the twelve major marks alone. */
	const marks = $derived.by(() =>
		Array.from({ length: 60 }, (_, i) => ({
			index: i,
			degrees: (i / 60) * 360,
			major: i % 5 === 0
		})).filter((mark) => detailed || mark.major)
	);

	const numbers = $derived.by(() =>
		Array.from({ length: 12 }, (_, i) => {
			const step = i + 1;
			const angle = (step / 12) * 2 * Math.PI;
			return {
				minutes: step * 5,
				x: CENTRE + LABEL_RADIUS * Math.sin(angle),
				y: CENTRE - LABEL_RADIUS * Math.cos(angle)
			};
		})
	);

	/** Turn a pointer position into whole minutes on the dial. */
	function minutesAt(clientX: number, clientY: number): number {
		if (svg === null) return durationMinutes;

		const rect = svg.getBoundingClientRect();
		return minutesFromPoint(
			((clientX - rect.left) / rect.width) * SIZE,
			((clientY - rect.top) / rect.height) * SIZE,
			MAX_DRAG_MINUTES,
			CENTRE
		);
	}

	function onPointerDown(event: PointerEvent) {
		if (!interactive) return;
		dragging = true;
		svg?.setPointerCapture(event.pointerId);
		onSetMinutes(minutesAt(event.clientX, event.clientY));
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		onSetMinutes(minutesAt(event.clientX, event.clientY));
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
		const next = Math.min(MAX_DRAG_MINUTES, Math.max(1, durationMinutes + delta));
		onSetMinutes(next);
	}
</script>

<svg
	bind:this={svg}
	viewBox="0 0 {SIZE} {SIZE}"
	class="w-[min(82vw,26rem)] touch-none select-none {interactive
		? 'cursor-pointer'
		: 'cursor-default'}"
	role="slider"
	tabindex={interactive ? 0 : -1}
	aria-label="Timer duration in minutes"
	aria-disabled={!interactive}
	aria-valuemin={1}
	aria-valuemax={MAX_DRAG_MINUTES}
	aria-valuenow={durationMinutes}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onkeydown={onKeyDown}
>
	<!-- The face is a whole filled circle; the wedge sits on top of it. -->
	<circle cx={CENTRE} cy={CENTRE} r={RADIUS} fill={FACE} />

	{#if wedge !== ''}
		<path d={wedge} fill={WEDGE} />
	{/if}

	<g stroke={INK} stroke-linecap="round">
		{#each marks as mark (mark.index)}
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

	{#if detailed}
		<g fill={INK} font-size="13" font-weight="600" text-anchor="middle" opacity="0.85">
			{#each numbers as number (number.minutes)}
				<text x={number.x} y={number.y} dominant-baseline="middle">{number.minutes}</text>
			{/each}
		</g>
	{/if}

	<!-- Rim last, so wedge and marks stop cleanly against it. Red is the only
	     signal that the timer has finished, since an empty face alone reads the
	     same as one that has not been started. -->
	<circle
		cx={CENTRE}
		cy={CENTRE}
		r={RADIUS}
		fill="none"
		stroke={finished ? WEDGE : INK}
		stroke-width={finished ? 8 : 6}
		opacity="0.9"
	/>
</svg>
