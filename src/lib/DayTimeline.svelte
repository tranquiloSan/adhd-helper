<script lang="ts">
	type Props = {
		startedAt: number;
		endsAt: number;
		/** Now, supplied rather than read, so the whole thing stays a pure drawing. */
		now: number;
		/** Whole-hour positions as fractions from 0 to 1, with clock labels. */
		marks: { fraction: number; label: string }[];
		over?: boolean;
		/** The times printed under each end of the track. */
		startLabel: string;
		endLabel: string;
		/**
		 * Where the draggable end sits, 0 to 1. Set only while the day is being
		 * chosen: the track is then a ruler running from now for as far as a drag
		 * reaches, and this is the end picked out within it.
		 */
		handleFraction?: number | null;
		onmove?: (fraction: number) => void;
		onnudge?: (steps: number) => void;
	};

	let {
		startedAt,
		endsAt,
		now,
		marks,
		over = false,
		startLabel,
		endLabel,
		handleFraction = null,
		onmove,
		onnudge
	}: Props = $props();

	const WIDTH = 600;
	const HEIGHT = 74;
	const BAR_Y = 10;
	const BAR_H = 30;

	const TRACK = '#f2ece0';
	const REMAINING = '#dc2626';
	const INK = '#1c1917';

	const total = $derived(Math.max(1, endsAt - startedAt));
	/** How much of the day has gone, 0 to 1. */
	const gone = $derived(Math.min(1, Math.max(0, (now - startedAt) / total)));

	const setting = $derived(handleFraction !== null);

	/**
	 * Red is the day you have left. While it is being set that is everything
	 * from now up to the handle; once it is running it is everything from the
	 * marker to the end.
	 */
	const fillFrom = $derived(setting ? 0 : gone);
	const fillTo = $derived(setting ? (handleFraction ?? 0) : 1);

	let svg: SVGSVGElement | null = null;
	let dragging = $state(false);

	function fractionAt(event: PointerEvent): number {
		if (svg === null) return 0;
		const rect = svg.getBoundingClientRect();
		return (event.clientX - rect.left) / rect.width;
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
	aria-valuenow={setting ? Math.round((handleFraction ?? 0) * 100) : undefined}
	aria-valuetext={setting ? endLabel : undefined}
	onpointerdown={setting ? onpointerdown : undefined}
	onpointermove={setting ? onpointermove : undefined}
	onpointerup={setting ? onpointerup : undefined}
	onpointercancel={setting ? onpointerup : undefined}
	onkeydown={setting ? onkeydown : undefined}
>
	<!-- The whole day. Red is what is left of it, matching the timer's language. -->
	<rect x="0" y={BAR_Y} width={WIDTH} height={BAR_H} rx="6" fill={TRACK} />

	{#if fillTo > fillFrom}
		<clipPath id="day-clip">
			<rect x="0" y={BAR_Y} width={WIDTH} height={BAR_H} rx="6" />
		</clipPath>
		<rect
			x={fillFrom * WIDTH}
			y={BAR_Y}
			width={(fillTo - fillFrom) * WIDTH}
			height={BAR_H}
			fill={REMAINING}
			clip-path="url(#day-clip)"
		/>
	{/if}

	<!-- Hour dividers, so remaining whole hours can be counted without reading. -->
	<g stroke={INK} stroke-width="1" opacity="0.28">
		{#each marks as mark (mark.label)}
			<line x1={mark.fraction * WIDTH} y1={BAR_Y} x2={mark.fraction * WIDTH} y2={BAR_Y + BAR_H} />
		{/each}
	</g>

	<g fill="#a3a3a3" font-size="12" text-anchor="middle">
		{#each marks as mark (mark.label)}
			<text x={mark.fraction * WIDTH} y={BAR_Y + BAR_H + 16}>{mark.label}</text>
		{/each}
	</g>

	<!-- Now. Drawn over the bar so the boundary is unambiguous once the fill is
	     nearly gone. -->
	{#if !over}
		<line
			x1={gone * WIDTH}
			y1={BAR_Y - 5}
			x2={gone * WIDTH}
			y2={BAR_Y + BAR_H + 5}
			stroke="#fafafa"
			stroke-width="2.5"
		/>
	{/if}

	{#if setting}
		<!-- The grip. Wider than it looks: the whole track takes the pointer, so
		     this only has to say which edge moves. -->
		<g transform="translate({(handleFraction ?? 0) * WIDTH}, 0)">
			<line y1={BAR_Y - 5} y2={BAR_Y + BAR_H + 5} stroke="#fafafa" stroke-width="2.5" />
			<circle cy={BAR_Y + BAR_H / 2} r="7" fill="#fafafa" />
			<circle cy={BAR_Y + BAR_H / 2} r="2.5" fill={REMAINING} />
		</g>
	{/if}

	<g fill="#737373" font-size="12">
		<text x="0" y={HEIGHT - 4} text-anchor="start">{startLabel}</text>
		{#if setting}
			<text
				x={Math.min(WIDTH - 42, Math.max(42, (handleFraction ?? 0) * WIDTH))}
				y={HEIGHT - 4}
				text-anchor="middle"
				fill="#d4d4d4">{endLabel}</text
			>
		{:else}
			<text x={WIDTH} y={HEIGHT - 4} text-anchor="end">{endLabel}</text>
		{/if}
	</g>
</svg>
