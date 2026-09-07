<script lang="ts">
	import { browser } from '$app/environment';
	import { Alarm } from '$lib/alarm';
	import Dial from '$lib/Dial.svelte';
	import { day, endTimeToday } from '$lib/day.svelte';
	import { formatApproximate, formatDuration } from '$lib/format';
	import { loadEndTime, saveEndTime } from '$lib/persistence';

	let endTime = $state('17:00');
	let problem = $state('');

	if (browser) {
		const stored = loadEndTime();
		if (stored !== null) endTime = stored;
	}

	const totalMinutes = $derived(Math.round(day.totalMs / 60_000));
	const remainingMinutes = $derived(Math.round(day.remainingMs / 60_000));

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
		<Dial
			fraction={day.fraction}
			faceMinutes={Math.max(totalMinutes, 1)}
			dragMaxMinutes={Math.max(totalMinutes, 1)}
			valueMinutes={remainingMinutes}
			finished={day.status === 'over'}
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
					Until {endTime}
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
</main>
