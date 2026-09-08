<script lang="ts">
	import { Alarm } from '$lib/alarm';
	import Dial from '$lib/Dial.svelte';
	import { RIM_SEGMENTS } from '$lib/dial-geometry';
	import { formatApproximate, formatDuration, formatTimeWithDay } from '$lib/format';
	import { isTypingTarget } from '$lib/keyboard';
	import { MAX_LENGTH_MINUTES, PRESET_MINUTES, parseLengthMinutes, timer } from '$lib/timer.svelte';

	const HOUR_MS = 3_600_000;

	let customLength = $state('');

	const clock = $derived(formatDuration(timer.remainingMs));

	/**
	 * Whole hours still to come, shown on the rim, and the part of the current
	 * hour left on the face.
	 *
	 * The face is a fixed hour and stays one, so a given amount of red always
	 * means the same amount of time - which is the property a face exists for and
	 * the one a resizing face quietly destroys. Anything longer is counted on the
	 * rim instead of stretching the face to hold it.
	 */
	const rimHours = $derived(Math.max(0, Math.ceil(timer.remainingMs / HOUR_MS) - 1) % RIM_SEGMENTS);
	const filled = $derived((timer.remainingMs - rimHours * HOUR_MS) / HOUR_MS);

	/** The duration is locked once started; only a reset unlocks it. */
	const editable = $derived(timer.status === 'idle');

	// Only the end time depends on this, and that is a clock time, so a second is
	// plenty. Not needed once running: the timer knows its own end exactly.
	let now = $state(Date.now());

	$effect(() => {
		if (timer.status === 'running' || timer.status === 'finished') return;
		const tick = () => (now = Date.now());
		const id = setInterval(tick, 1000);
		window.addEventListener('focus', tick);
		return () => {
			clearInterval(id);
			window.removeEventListener('focus', tick);
		};
	});

	/**
	 * When it lands, in wall-clock time.
	 *
	 * "25 minutes" does not tell you whether it clears the thing at three o'clock,
	 * which is exactly the arithmetic this tool exists to save you - the same
	 * argument the day already makes with its preview. Qualified with the day,
	 * because a long length can cross midnight and a bare 00:40 beside a running
	 * clock reads as this morning.
	 */
	const landing = $derived.by(() => {
		const endsAt =
			timer.status === 'running' || timer.status === 'finished'
				? timer.endsAt
				: now + timer.remainingMs;
		if (endsAt === null) return '';

		const at = formatTimeWithDay(endsAt, now);
		return timer.status === 'finished' ? `Ran out at ${at}` : `Ends ${at}`;
	});

	const caption = $derived.by(() => {
		switch (timer.status) {
			case 'idle':
				return 'Drag the dial or pick a length';
			case 'running':
				return 'Running';
			case 'paused':
				return 'Paused';
			case 'finished':
				return timer.overdueMs < 60_000
					? 'Time is up'
					: `Time was up ${formatApproximate(timer.overdueMs)} ago`;
		}
	});

	$effect(() => {
		const onKeydown = (event: KeyboardEvent) => {
			// Don't hijack keys aimed at a field, the dump, or the dial.
			if (isTypingTarget(event.target)) return;
			if (event.target instanceof SVGElement) return;
			if (event.code !== 'Space') return;
			event.preventDefault();
			void toggle();
		};
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	async function toggle() {
		switch (timer.status) {
			case 'idle':
				// Permission has to be asked for inside a gesture, so this is the moment.
				await Alarm.requestPermission();
				timer.start();
				return;
			case 'running':
				timer.pause();
				return;
			case 'paused':
				timer.resume();
				return;
			case 'finished':
				timer.reset();
				return;
		}
	}

	function setMinutes(minutes: number) {
		customLength = '';
		timer.setDurationMs(minutes * 60_000);
	}

	function applyCustomLength() {
		const typed = parseLengthMinutes(customLength);
		if (typed === null) return;
		timer.setDurationMs(Math.min(typed, MAX_LENGTH_MINUTES) * 60_000);
	}

	const isPreset = (minutes: number) => timer.durationMs === minutes * 60_000;

	const buttonLabel = $derived(
		timer.status === 'running'
			? 'Pause'
			: timer.status === 'paused'
				? 'Resume'
				: timer.status === 'finished'
					? 'Dismiss'
					: 'Start'
	);
</script>

<svelte:head>
	<meta
		name="description"
		content="A visual countdown timer for time blindness and hyperfocus overrun."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-4">
	<Dial
		fraction={filled}
		{rimHours}
		valueMinutes={Math.round(timer.durationMs / 60_000)}
		finished={timer.status === 'finished'}
		interactive={editable}
		onSetMinutes={setMinutes}
	/>

	<div class="grid place-items-center gap-1">
		<span class="text-7xl font-semibold tracking-tight text-neutral-50 tabular-nums">{clock}</span>
		<span class="text-sm text-neutral-400" aria-live="polite">{caption}</span>
		{#if landing !== ''}
			<span class="text-xs text-neutral-500 tabular-nums">{landing}</span>
		{/if}
	</div>

	<div class="flex flex-col items-center gap-5">
		<div class="flex flex-wrap justify-center gap-2">
			{#each PRESET_MINUTES as minutes (minutes)}
				<button
					type="button"
					onclick={() => setMinutes(minutes)}
					disabled={!editable}
					aria-pressed={isPreset(minutes)}
					class="rounded-full border px-4 py-1.5 text-sm transition disabled:opacity-40
						{isPreset(minutes)
						? 'border-red-500 bg-red-500/15 text-red-300'
						: 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}"
				>
					{minutes}
				</button>
			{/each}

			<label
				class="flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-sm"
			>
				<span class="sr-only">Custom length, in minutes or in hours with an h</span>
				<input
					type="text"
					placeholder="25 or 2h"
					bind:value={customLength}
					oninput={applyCustomLength}
					disabled={!editable}
					class="w-24 bg-transparent tabular-nums outline-none placeholder:text-neutral-500 disabled:opacity-40"
				/>
			</label>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={toggle}
				class="rounded-full bg-red-600 px-8 py-3 text-lg font-medium text-neutral-50 transition hover:bg-red-500"
			>
				{buttonLabel}
			</button>

			{#if timer.status !== 'idle'}
				<button
					type="button"
					onclick={() => timer.reset()}
					class="rounded-full border border-neutral-700 px-5 py-3 text-neutral-300 transition hover:border-neutral-500"
				>
					Reset
				</button>
			{/if}
		</div>

		<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
			Space starts and pauses. The length is locked once running - reset to change it. Drag the dial
			for anything up to an hour, or type longer: the custom field takes minutes, or hours with an h
			- 90, 2h and 1h30 all work. Each whole hour beyond the face is marked on the rim, so the face
			itself always means an hour and a given amount of red always means the same amount of time.
		</p>
	</div>

	<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
		A countdown you can read at a glance, for when time stops being noticeable and for getting
		pulled out of something you have sunk too long into. It keeps running if you reload, and tells
		you if it finished while the tab was shut.
	</p>
</main>
