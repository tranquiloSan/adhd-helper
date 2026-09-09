<script lang="ts">
	import { browser } from '$app/environment';
	import { Alarm } from '$lib/alarm';
	import DayTimeline from '$lib/DayTimeline.svelte';
	import { day, hourMarks, resolveEndTime, resolveStartTime } from '$lib/day.svelte';
	import {
		formatApproximate,
		formatCompact,
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

	// Revealed on request: naming an earlier start only moves the "3 hours in"
	// line, so it stays out of the way until asked for.
	let backdateOpen = $state(false);
	let startText = $state('');

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

	/** The named start, as a moment already gone, or null while the field is empty. */
	const backdateStartedAt = $derived(
		startText.trim() === '' ? null : resolveStartTime(startText, now)
	);

	/** What Start will record as the beginning, said in full so a mistype shows
	 *  before it is committed - the same job the end's preview does. */
	const startPreview = $derived.by(() => {
		if (!backdateOpen || startText.trim() === '') return null;
		if (backdateStartedAt === null) return { problem: 'That is not a time.' };
		return {
			text: `${formatApproximate(now - backdateStartedAt)} in, started ${formatTimeWithDay(backdateStartedAt, now)}`
		};
	});

	/**
	 * The track is the next twelve hours, before and after Start alike.
	 *
	 * It used to become the day itself once running, which stretched it to
	 * whatever length that day was - so a full bar meant four hours some days and
	 * eleven others, and pressing Start silently changed what an hour was worth.
	 * Fixed, an hour is the same width today as it was yesterday, and a day
	 * longer or shorter than usual says so the moment you start it.
	 */
	const marks = $derived(hourMarks(now, now + DRAG_SPAN_MS));

	/** The end being shown: the one being named, or the one running. */
	const shownEndsAt = $derived(day.status === 'idle' ? plannedEndsAt : day.endsAt);
	/** Where that end sits on the track - the handle while it is being named, the
	 *  edge of what is left once it is running. One number, both modes. */
	const trackFraction = $derived(shownEndsAt === null ? 0 : fractionForTime(now, shownEndsAt));
	/** How far past the track's reach the end sits, which only a day over twelve
	 *  hours can be, and only for the hours it has in hand. */
	const trackOverflow = $derived.by(() => {
		if (shownEndsAt === null) return '';
		const beyond = shownEndsAt - (now + DRAG_SPAN_MS);
		return beyond > 0 ? `+${formatCompact(beyond)}` : '';
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

		let startedAt: number | undefined;
		if (backdateOpen && startText.trim() !== '') {
			startedAt = resolveStartTime(startText, Date.now()) ?? undefined;
			if (startedAt === undefined) {
				problem = 'That start time is not a time.';
				return;
			}
		}

		problem = '';
		// Normalised, so a typed "1700" comes back as "17:00" next time.
		saveEndTime(formatTimeOfDay(endsAt));
		// Asked for inside the click, since permission needs a gesture.
		await Alarm.requestPermission();
		day.start(endsAt, Date.now(), startedAt);
		backdateOpen = false;
		startText = '';
	}
</script>

<svelte:head>
	<meta name="description" content="Time remaining until an end time you name." />
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-4">
	<!-- One track, drawn the same way throughout. Start adds the countdown under
	     it and takes the grip away; it does not touch the scale. -->
	<DayTimeline
		fraction={trackFraction}
		overflowLabel={trackOverflow}
		{marks}
		setting={day.status === 'idle'}
		over={day.status === 'over'}
		startLabel={formatTimeOfDay(now)}
		endLabel={shownEndsAt === null ? '' : formatTimeWithDay(shownEndsAt, now)}
		onmove={day.status === 'idle' ? setFromFraction : undefined}
		onnudge={day.status === 'idle' ? nudge : undefined}
	/>

	{#if day.status === 'idle'}
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

			<!-- For a day already underway when you name its end. Only the "3 hours
			     in" line moves; the track and countdown are anchored at now. -->
			{#if !backdateOpen}
				<button
					type="button"
					onclick={() => (backdateOpen = true)}
					class="text-xs text-neutral-500 underline decoration-neutral-700 underline-offset-2 transition hover:text-neutral-300"
				>
					Started earlier?
				</button>
			{:else}
				<label class="flex items-center gap-2 text-sm text-neutral-500">
					<span>Started at</span>
					<input
						type="text"
						inputmode="numeric"
						bind:value={startText}
						placeholder="09:00"
						aria-label="Start of day"
						class="w-20 rounded-full border border-neutral-700 bg-transparent px-3 py-1 text-center tabular-nums outline-none focus-visible:border-neutral-500"
					/>
				</label>
				<p class="h-4 text-sm" aria-live="polite">
					{#if startPreview?.problem}
						<span class="text-red-400">{startPreview.problem}</span>
					{:else if startPreview?.text}
						<span class="text-neutral-400">{startPreview.text}</span>
					{/if}
				</p>
			{/if}
		</div>
	{:else}
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
			<!-- How far in you are. The track shows only what is left, which is what
			     you look at; this is the other half, and a sentence is enough for
			     something you read rather than glance at. -->
			{#if day.startedAt !== null}
				<span class="text-xs text-neutral-500">
					started {formatTimeWithDay(day.startedAt, now)} - {formatApproximate(now - day.startedAt)} in
				</span>
			{/if}
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
		until you start it, so there are no working hours to configure and no weekends to get wrong. The
		track is the next twelve hours whether or not it has started, so an hour is always the same
		width and a day longer or shorter than usual looks it.
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
