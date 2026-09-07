<script lang="ts">
	import { formatTimeOfDay } from '$lib/format';

	type Props = {
		startedAt: number;
		endsAt: number;
		/** Now, supplied rather than read, so the whole thing stays a pure drawing. */
		now: number;
		/** Whole-hour positions as fractions from 0 to 1, with clock labels. */
		marks: { fraction: number; label: string }[];
		over?: boolean;
	};

	let { startedAt, endsAt, now, marks, over = false }: Props = $props();

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
</script>

<svg
	viewBox="0 0 {WIDTH} {HEIGHT}"
	class="w-[min(92vw,42rem)]"
	role="img"
	aria-label="Time remaining in the day"
>
	<!-- The whole day. Red is what is left of it, matching the timer's language. -->
	<rect x="0" y={BAR_Y} width={WIDTH} height={BAR_H} rx="6" fill={TRACK} />

	{#if gone < 1}
		<clipPath id="day-clip">
			<rect x="0" y={BAR_Y} width={WIDTH} height={BAR_H} rx="6" />
		</clipPath>
		<rect
			x={gone * WIDTH}
			y={BAR_Y}
			width={(1 - gone) * WIDTH}
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

	<g fill="#737373" font-size="12">
		<text x="0" y={HEIGHT - 4} text-anchor="start">{formatTimeOfDay(startedAt)}</text>
		<text x={WIDTH} y={HEIGHT - 4} text-anchor="end">{formatTimeOfDay(endsAt)}</text>
	</g>
</svg>
