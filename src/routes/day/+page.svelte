<script lang="ts">
	import { browser } from '$app/environment';
	import { Alarm } from '$lib/alarm';
	import DayTimeline from '$lib/DayTimeline.svelte';
	import Dial from '$lib/Dial.svelte';
	import { day, endTimeToday, hourMarks } from '$lib/day.svelte';
	import { formatApproximate, formatDuration } from '$lib/format';
	import {
		loadDayView,
		loadEndTime,
		saveDayView,
		saveEndTime,
		type DayView
	} from '$lib/persistence';

	let endTime = $state('17:00');
	let problem = $state('');
	let view = $state<DayView>('bar');
	let now = $state(Date.now());

	if (browser) {
		const stored = loadEndTime();
		if (stored !== null) endTime = stored;

		const storedView = loadDayView();
		if (storedView !== null) view = storedView;
	}

	const totalMinutes = $derived(Math.round(day.totalMs / 60_000));
	const remainingMinutes = $derived(Math.round(day.remainingMs / 60_000));

	const marks = $derived(
		day.startedAt === null || day.endsAt === null ? [] : hourMarks(day.startedAt, day.endsAt)
	);

	// The layout drives the countdown itself; this only moves the marker.
	$effect(() => {
		const tick = () => (now = Date.now());
		const id = setInterval(tick, 1000);
		window.addEventListener('focus', tick);
		return () => {
			clearInterval(id);
			window.removeEventListener('focus', tick);
		};
	});

	function setView(next: DayView) {
		view = next;
		saveDayView(next);
	}

	async function startDay() {
		const endsAt = endTimeToday(endTime);
		if (endsAt === null) {
			problem = 'That is not a time.';
			return;
		}
		if (endsAt <= Date.now()) {
			problem = 'That time has already passed today.';
			return;
		}

		problem = '';
		saveEndTime(endTime);
		// Asked for inside the click, since permission needs a gesture.
		await Alarm.requestPermission();
		day.start(endsAt);
	}
</script>

<svelte:head>
	<title
		>{day.status === 'running' ? `${formatDuration(day.remainingMs)} left` : 'Day'} - adhd-helper</title
	>
	<meta name="description" content="Time remaining until an end time you name." />
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-4">
	{#if day.status === 'idle'}
		<div class="flex max-w-sm flex-col items-center gap-4 py-10">
			<p class="text-center text-neutral-300">When are you stopping today?</p>

			<div class="flex items-center gap-2">
				<input
					type="time"
					bind:value={endTime}
					aria-label="End of day"
					class="rounded-full border border-neutral-700 bg-transparent px-4 py-2 text-lg tabular-nums outline-none focus-visible:border-neutral-500"
				/>
				<button
					type="button"
					onclick={startDay}
					class="rounded-full bg-red-600 px-6 py-2 text-lg font-medium text-neutral-50 transition hover:bg-red-500"
				>
					Start
				</button>
			</div>

			{#if problem !== ''}
				<p class="text-sm text-red-400" aria-live="polite">{problem}</p>
			{/if}
		</div>
	{:else}
		{#if view === 'bar'}
			<DayTimeline
				startedAt={day.startedAt ?? now}
				endsAt={day.endsAt ?? now}
				{now}
				{marks}
				over={day.status === 'over'}
			/>
		{:else}
			<Dial
				fraction={day.fraction}
				faceMinutes={Math.max(totalMinutes, 1)}
				dragMaxMinutes={Math.max(totalMinutes, 1)}
				valueMinutes={remainingMinutes}
				{marks}
				finished={day.status === 'over'}
			/>
		{/if}

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
					Until {endTime}
				{/if}
			</span>
		</div>

		<div class="flex items-center gap-2 text-xs text-neutral-500">
			<span>Show as</span>
			{#each [{ id: 'bar', label: 'Bar' }, { id: 'dial', label: 'Dial' }] as const as option (option.id)}
				<button
					type="button"
					onclick={() => setView(option.id)}
					aria-pressed={view === option.id}
					class="rounded-full border px-3 py-1 transition {view === option.id
						? 'border-neutral-400 text-neutral-200'
						: 'border-neutral-800 text-neutral-500 hover:border-neutral-600'}"
				>
					{option.label}
				</button>
			{/each}
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
</main>
