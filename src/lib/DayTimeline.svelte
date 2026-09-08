<script lang="ts">
	type Props = {
		/**
		 * Where the end sits on the track, 0 to 1.
		 *
		 * The same number in both modes, which is the point: while the day is
		 * being named this is the handle, and once it is running it is the edge of
		 * what is left. Pressing Start changes nothing about the track.
		 */
		fraction: number;
		/** The end is further off than the track reaches. */
		overflow?: boolean;
		/** Hour boundaries as fractions from 0 to 1, with clock labels. */
		marks: { fraction: number; label: string }[];
		/** Being named rather than counted down: draws the grip and takes input. */
		setting?: boolean;
		/** The day is done, so there is nothing left to fill. */
		over?: boolean;
		/** The times printed under each end of the track. */
		startLabel: string;
		endLabel: string;
		onmove?: (fraction: number) => void;
		onnudge?: (steps: number) => void;
	};

	let {
		fraction,
		overflow = false,
		marks,
		setting = false,
		over = false,
		startLabel,
		endLabel,
		onmove,
		onnudge
	}: Props = $props();

	const WIDTH = 600;
	/**
	 * The track itself, with the rest of the width kept clear for the overflow
	 * mark.
	 *
	 * Reserved always rather than only when it is needed, because taking the room
	 * from the track on the days that overflow would rescale the very thing this
	 * is all for. Twelve hours divide into it exactly.
	 */
	const TRACK_WIDTH = 576;
	const HEIGHT = 74;
	const BAR_Y = 10;
	const BAR_H = 30;
	const MID_Y = BAR_Y + BAR_H / 2;
	/** Blank between one hour and the next, so they read as hours rather than as
	 *  one length with lines drawn on it - the ring's treatment, unrolled. */
	const GAP = 2;

	const TRACK = '#f2ece0';
	const REMAINING = '#dc2626';
	/** The colour of things that point rather than measure - the grip, and the
	 *  mark that says the day runs off the end. */
	const INDICATOR = '#fafafa';

	const filled = $derived(over ? 0 : Math.min(1, Math.max(0, fraction)));

	/**
	 * One box per hour, the first a stub unless the track starts on the hour.
	 *
	 * The boundaries are real clock times rather than a grid laid from now, which
	 * is what lets them be labelled 14, 15, 16 - the thing a bar can say and a
	 * dial cannot.
	 *
	 * Keyed by position rather than by fraction: the track slides forward with
	 * the clock, so every fraction changes on every tick and a fraction key would
	 * rebuild the whole row once a second.
	 */
	const boxes = $derived.by(() => {
		const edges = [0, ...marks.map((mark) => mark.fraction), 1];
		return edges.slice(0, -1).map((from, i) => {
			const to = edges[i + 1];
			const x = from * TRACK_WIDTH + (i === 0 ? 0 : GAP / 2);
			const width = Math.max(0, to * TRACK_WIDTH - x - (i === edges.length - 2 ? 0 : GAP / 2));
			return { x, width };
		});
	});

	let svg: SVGSVGElement | null = null;
	let dragging = $state(false);

	function fractionAt(event: PointerEvent): number {
		if (svg === null) return 0;
		const rect = svg.getBoundingClientRect();
		// Scaled off the track rather than the whole drawing, since the drawing is
		// wider by the margin the overflow mark sits in.
		const across = (event.clientX - rect.left) / rect.width;
		return (across * WIDTH) / TRACK_WIDTH;
	}

	function onpointerdown(event: PointerEvent) {
		if (onmove === undefined) return;
		dragging = true;
		svg?.setPointerCapture(event.pointerId);
		onmove(fractionAt(event));
	}

	function onpointermove(event: PointerEvent) {
		if (!dragging || onmove === undefined) return;
		onmove(fractionAt(event));
	}

	function onpointerup(event: PointerEvent) {
		dragging = false;
		svg?.releasePointerCapture(event.pointerId);
	}

	// The text field is the exact instrument and the keyboard's main route, but
	// a control you can only reach with a pointer should not exist at all.
	function onkeydown(event: KeyboardEvent) {
		if (onnudge === undefined) return;
		const steps = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
		if (steps === 0) return;
		event.preventDefault();
		onnudge(event.shiftKey ? steps * 4 : steps);
	}
</script>

<!-- The tabindex is only ever set together with role="slider", but both are
     decided at runtime, so the check cannot see them agree. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<svg
	bind:this={svg}
	viewBox="0 0 {WIDTH} {HEIGHT}"
	class="w-[min(92vw,42rem)] {setting ? 'cursor-ew-resize touch-none' : ''}"
	role={setting ? 'slider' : 'img'}
	tabindex={setting ? 0 : undefined}
	aria-label={setting ? 'End of day' : 'Time remaining in the day'}
	aria-valuemin={setting ? 0 : undefined}
	aria-valuemax={setting ? 100 : undefined}
	aria-valuenow={setting ? Math.round(filled * 100) : undefined}
	aria-valuetext={setting ? endLabel : undefined}
	onpointerdown={setting ? onpointerdown : undefined}
	onpointermove={setting ? onpointermove : undefined}
	onpointerup={setting ? onpointerup : undefined}
	onpointercancel={setting ? onpointerup : undefined}
	onkeydown={setting ? onkeydown : undefined}
>
	<!-- Twelve hours from now, always, whichever mode this is in - so an hour is
	     the same width today as it was yesterday, and red means the same amount
	     of time it has always meant. -->
	{#each boxes as box, i (i)}
		<rect x={box.x} y={BAR_Y} width={box.width} height={BAR_H} rx="2" fill={TRACK} />
	{/each}

	<!-- Red is what is left, cut by the same hour boundaries so the count and the
	     fill are one drawing rather than two. -->
	{#if filled > 0}
		<clipPath id="day-fill">
			<rect x="0" y={BAR_Y} width={filled * TRACK_WIDTH} height={BAR_H} />
		</clipPath>
		<g clip-path="url(#day-fill)">
			{#each boxes as box, i (i)}
				<rect x={box.x} y={BAR_Y} width={box.width} height={BAR_H} rx="2" fill={REMAINING} />
			{/each}
		</g>
	{/if}

	<!-- A day too long for the track runs off the end rather than squeezing it.
	     In its own clear space and in the pointing colour, because an overflowing
	     day fills the track and a red mark against a red bar cannot be seen. The
	     clock above says how much there really is. -->
	{#if overflow}
		<g
			stroke={INDICATOR}
			stroke-width="3"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M {TRACK_WIDTH + 8} {MID_Y - 7} l 7 7 l -7 7" />
			<path d="M {TRACK_WIDTH + 17} {MID_Y - 7} l 7 7 l -7 7" />
		</g>
	{/if}

	<g fill="#a3a3a3" font-size="12" text-anchor="middle">
		{#each marks as mark (mark.label)}
			<text x={mark.fraction * TRACK_WIDTH} y={BAR_Y + BAR_H + 16}>{mark.label}</text>
		{/each}
	</g>

	{#if setting}
		<!-- The grip. Wider than it looks: the whole track takes the pointer, so
		     this only has to say which edge moves. -->
		<g transform="translate({filled * TRACK_WIDTH}, 0)">
			<line y1={BAR_Y - 5} y2={BAR_Y + BAR_H + 5} stroke={INDICATOR} stroke-width="2.5" />
			<circle cy={MID_Y} r="7" fill={INDICATOR} />
			<circle cy={MID_Y} r="2.5" fill={REMAINING} />
		</g>
	{/if}

	<g fill="#737373" font-size="12">
		<text x="0" y={HEIGHT - 4} text-anchor="start">{startLabel}</text>
		{#if setting}
			<text
				x={Math.min(TRACK_WIDTH - 42, Math.max(42, filled * TRACK_WIDTH))}
				y={HEIGHT - 4}
				text-anchor="middle"
				fill="#d4d4d4">{endLabel}</text
			>
		{:else}
			<text x={TRACK_WIDTH} y={HEIGHT - 4} text-anchor="end">{endLabel}</text>
		{/if}
	</g>
</svg>
