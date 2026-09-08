<script lang="ts">
	import { browser } from '$app/environment';
	import { Alarm } from '$lib/alarm';
	import DayTimeline from '$lib/DayTimeline.svelte';
	import { day, hourMarks, resolveEndTime } from '$lib/day.svelte';
	import {
		formatApproximate,
		formatDuration,
		formatTimeOfDay,
		formatTimeWithDay
	} from '$lib/format';
	import { loadEndTime, saveEndTime } from '$lib/persistence';
	import {
		DRAG_SPAN_MS,
		fractionForTime,
		nudgeTime,
		timeForFraction
	} from '$lib/timeline-geometry';

	let endTime = $state('17:00');
	let problem = $state('');
	let now = $state(Date.now());

	if (browser) {
		const stored = loadEndTime();
		if (stored !== null) endTime = stored;
	}

	/**
	 * The end being named, as an absolute moment.
	 *
	 * The typed time is the single source of truth and a drag writes into it, so
	 * a duration is never a mode - it is only what the readout tells you about
	 * the time you picked. Resolving through `resolveEndTime` is also what makes
	 * an end after midnight mean tomorrow.
	 */
	const plannedEndsAt = $derived(resolveEndTime(endTime, now));

	/** What you are about to start. This is the only thing standing between a
	 *  mistyped time and a nonsense day, so it says both figures. */
	const preview = $derived(
		plannedEndsAt === null
			? null
			: `${formatApproximate(plannedEndsAt - now)}, ending ${formatTimeWithDay(plannedEndsAt, now)}`
	);

	/** Being set up, the track is a ruler running from now for as far as a drag
	 *  reaches. Once running, it is the day itself. */
	const marks = $derived.by(() => {
		if (day.status === 'idle') return hourMarks(now, now + DRAG_SPAN_MS);
		if (day.startedAt === null || day.endsAt === null) return [];
		return hourMarks(day.startedAt, day.endsAt);
	});

	// The layout drives the countdown itself; this only moves the marker - and,
	// before the day starts, walks the ruler forward under the handle.
	$effect(() => {
		const tick = () => (now = Date.now());
		const id = setInterval(tick, 1000);
		window.addEventListener('focus', tick);
		return () => {
			clearInterval(id);
			window.removeEventListener('focus', tick);
		};
	});

	function setFromFraction(fraction: number) {
		endTime = formatTimeOfDay(timeForFraction(now, fraction));
		problem = '';
	}

	function nudge(steps: number) {
		if (plannedEndsAt === null) return;
		endTime = formatTimeOfDay(nudgeTime(now, plannedEndsAt, steps));
	}

	async function startDay() {
		const endsAt = resolveEndTime(endTime, Date.now());
		if (endsAt === null) {
			problem = 'That is not a time.';
			return;
		}

		problem = '';
		// Normalised, so a typed "1700" comes back as "17:00" next time.
		saveEndTime(formatTimeOfDay(endsAt));
		// Asked for inside the click, since permission needs a gesture.
		await Alarm.requestPermission();
		day.start(endsAt);
	}
</script>

<svelte:head>
	<meta name="description" content="Time remaining until an end time you name." />
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-4">
	{#if day.status === 'idle'}
		<DayTimeline
			startedAt={now}
			endsAt={now + DRAG_SPAN_MS}
			{now}
			{marks}
			startLabel={formatTimeOfDay(now)}
			endLabel={plannedEndsAt === null ? '' : formatTimeWithDay(plannedEndsAt, now)}
			handleFraction={plannedEndsAt === null ? 0 : fractionForTime(now, plannedEndsAt)}
			onmove={setFromFraction}
			onnudge={nudge}
		/>

		<div class="flex flex-col items-center gap-3">
			<p class="text-center text-neutral-300">When are you stopping?</p>

			<div class="flex items-center gap-2">
				<input
					type="text"
					inputmode="numeric"
					bind:value={endTime}
					aria-label="End of day"
					class="w-24 rounded-full border border-neutral-700 bg-transparent px-4 py-2 text-center text-lg tabular-nums outline-none focus-visible:border-neutral-500"
				/>
				<button
					type="button"
					onclick={startDay}
					class="rounded-full bg-red-600 px-6 py-2 text-lg font-medium text-neutral-50 transition hover:bg-red-500"
				>
					Start
				</button>
			</div>

			<p class="h-4 text-sm" aria-live="polite">
				{#if problem !== ''}
					<span class="text-red-400">{problem}</span>
				{:else if preview !== null}
					<span class="text-neutral-400">{preview}</span>
				{/if}
			</p>
		</div>
	{:else}
		<DayTimeline
			startedAt={day.startedAt ?? now}
			endsAt={day.endsAt ?? now}
			{now}
			{marks}
			over={day.status === 'over'}
			startLabel={formatTimeOfDay(day.startedAt ?? now)}
			endLabel={formatTimeWithDay(day.endsAt ?? now, now)}
		/>

		<div class="grid place-items-center gap-1">
			<span class="text-7xl font-semibold tracking-tight text-neutral-50 tabular-nums">
				{day.status === 'over' ? '0:00' : formatDuration(day.remainingMs)}
			</span>
			<span class="text-sm text-neutral-400" aria-live="polite">
				{#if day.status === 'over'}
					{day.overdueMs < 60_000
						? 'Day over'
						: `Day ended ${formatApproximate(day.overdueMs)} ago`}
				{:else}
					Until {formatTimeWithDay(day.endsAt ?? now, now)}
				{/if}
			</span>
		</div>

		<button
			type="button"
			onclick={() => day.stop()}
			class="rounded-full border border-neutral-700 px-5 py-3 text-neutral-300 transition hover:border-neutral-500"
		>
			{day.status === 'over' ? 'Clear' : 'Stop'}
		</button>
	{/if}

	<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
		Start it with the time you are stopping, and it shows what is left of the day. It does nothing
		until you start it, so there are no working hours to configure and no weekends to get wrong.
		Coarse by design: it tells you the afternoon is half gone, never anything finer.
	</p>

	{#if day.status === 'idle'}
		<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
			Drag the end of the track to say when you are stopping, or type the time. A time that has
			already gone means tomorrow, so an evening can run to 03:00. Dragging reaches twelve hours;
			past that, type it. Nothing is checked beyond the reading above - if it says twenty-two hours,
			you mistyped.
		</p>
	{/if}
</main>
