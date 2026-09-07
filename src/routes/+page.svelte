<script lang="ts">
	import { browser } from '$app/environment';
	import { Alarm } from '$lib/alarm';
	import Dial from '$lib/Dial.svelte';
	import { formatApproximate, formatDuration } from '$lib/format';
	import { isTypingTarget } from '$lib/keyboard';
	import { FACE_OPTIONS, type FaceMinutes } from '$lib/dial-geometry';
	import { loadFaceMinutes, loadSnapshot, saveFaceMinutes, saveSnapshot } from '$lib/persistence';
	import { PRESET_MINUTES, Timer } from '$lib/timer.svelte';

	const timer = new Timer();
	const alarm = new Alarm();

	// Restored during component init rather than in an effect, so the persisting
	// effect below cannot write the default state over the stored one first.
	let faceMinutes = $state<FaceMinutes>(30);

	if (browser) {
		const snapshot = loadSnapshot();
		if (snapshot !== null) timer.restore(snapshot);

		const storedFace = loadFaceMinutes();
		if (storedFace !== null) faceMinutes = storedFace;
	}

	let customMinutes = $state('');

	const clock = $derived(formatDuration(timer.remainingMs));
	const spent = $derived(formatDuration(timer.elapsedMs));

	/**
	 * A real Time Timer has a fixed face: on a 30-minute face, 25 minutes covers
	 * 25/30 of the circle, so a given amount of red always means the same amount
	 * of time. The face only rescales for a duration that will not fit on it.
	 */
	const face = $derived(Math.max(faceMinutes, Math.ceil(timer.durationMs / 60_000)));
	const filled = $derived(timer.remainingMs / 60_000 / face);
	/** The duration is locked once started; only a reset unlocks it. */
	const editable = $derived(timer.status === 'idle');

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

	const pageTitle = $derived(
		timer.status === 'finished'
			? 'Time is up - adhd-helper'
			: timer.status === 'running'
				? `${clock} - adhd-helper`
				: 'Timer - adhd-helper'
	);

	// The interval only advances the timer's idea of "now"; it never accumulates
	// elapsed time, so throttling in a background tab cannot make it drift.
	$effect(() => {
		if (timer.status !== 'running') return;
		const id = setInterval(() => timer.sync(), 100);
		return () => clearInterval(id);
	});

	// A throttled tab can be seconds behind, so catch up the moment it is looked at.
	$effect(() => {
		const resync = () => timer.sync();
		document.addEventListener('visibilitychange', resync);
		window.addEventListener('focus', resync);
		return () => {
			document.removeEventListener('visibilitychange', resync);
			window.removeEventListener('focus', resync);
		};
	});

	$effect(() => {
		saveSnapshot(timer.toSnapshot());
	});

	$effect(() => {
		saveFaceMinutes(faceMinutes);
	});

	// Cleanup runs when the status changes away from finished, which is what
	// stops the alarm when it is dismissed.
	$effect(() => {
		if (timer.status !== 'finished') return;
		alarm.start('Your timer has finished.');
		return () => alarm.stop();
	});

	$effect(() => {
		if (timer.status !== 'running') return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	});

	$effect(() => {
		const onKeydown = (event: KeyboardEvent) => {
			// Don't hijack keys aimed at a field, the dump, or the dial.
			if (isTypingTarget(event.target)) return;
			if (event.target instanceof SVGElement) return;
			if (event.code !== 'Space') return;
			event.preventDefault();
			toggle();
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
		customMinutes = '';
		timer.setDurationMs(minutes * 60_000);
	}

	function applyCustomMinutes() {
		const minutes = Number(customMinutes);
		if (!Number.isFinite(minutes) || minutes <= 0) return;
		timer.setDurationMs(minutes * 60_000);
	}

	function setFace(minutes: FaceMinutes) {
		faceMinutes = minutes;
		// A duration longer than the new face could not be dragged back down, so
		// bring it inside the range.
		if (timer.durationMs > minutes * 60_000) setMinutes(minutes);
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
	<title>{pageTitle}</title>
	<meta
		name="description"
		content="A visual countdown timer for time blindness and hyperfocus overrun."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-4">
	<Dial
		fraction={filled}
		faceMinutes={face}
		dragMaxMinutes={faceMinutes}
		valueMinutes={Math.round(timer.durationMs / 60_000)}
		finished={timer.status === 'finished'}
		interactive={editable}
		onSetMinutes={setMinutes}
	/>

	<div class="grid place-items-center gap-1">
		<span class="text-7xl font-semibold tracking-tight text-neutral-50 tabular-nums">{clock}</span>
		<span class="text-sm text-neutral-400" aria-live="polite">
			{caption}{#if timer.elapsedMs >= 1000}<span class="text-neutral-500">
					&middot; {spent} gone</span
				>{/if}
		</span>
	</div>

	<div class="flex flex-col items-center gap-5">
		<div class="flex items-center gap-2 text-xs text-neutral-500">
			<span>Dial</span>
			{#each FACE_OPTIONS as option (option)}
				<button
					type="button"
					onclick={() => setFace(option)}
					disabled={!editable}
					aria-pressed={faceMinutes === option}
					class="rounded-full border px-3 py-1 transition disabled:opacity-40
						{faceMinutes === option
						? 'border-neutral-400 text-neutral-200'
						: 'border-neutral-800 text-neutral-500 hover:border-neutral-600'}"
				>
					{option} min
				</button>
			{/each}
		</div>

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
				<span class="sr-only">Custom duration in minutes</span>
				<input
					type="number"
					min="1"
					max="600"
					inputmode="numeric"
					placeholder="Custom"
					bind:value={customMinutes}
					oninput={applyCustomMinutes}
					disabled={!editable}
					class="w-20 bg-transparent tabular-nums outline-none placeholder:text-neutral-500 disabled:opacity-40"
				/>
				<span class="text-neutral-500">min</span>
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

		<p class="text-xs text-neutral-500">
			Space starts and pauses. The length is locked once running - reset to change it.
		</p>
	</div>

	<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
		A countdown you can read at a glance, for when time stops being noticeable and for getting
		pulled out of something you have sunk too long into. It keeps running if you reload, and tells
		you if it finished while the tab was shut.
	</p>
</main>
