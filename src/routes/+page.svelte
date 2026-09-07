<script lang="ts">
	import { browser } from '$app/environment';
	import { Alarm } from '$lib/alarm';
	import Dial from '$lib/Dial.svelte';
	import { formatApproximate, formatDuration } from '$lib/format';
	import { isTypingTarget } from '$lib/keyboard';
	import { FACE_OPTIONS, MAX_FACE_MINUTES, faceFor, type FaceMinutes } from '$lib/dial-geometry';
	import { loadFaceMinutes, loadSnapshot, saveFaceMinutes, saveSnapshot } from '$lib/persistence';
	import { PRESET_MINUTES, Timer, parseLengthMinutes } from '$lib/timer.svelte';

	const timer = new Timer();
	const alarm = new Alarm();

	const DEFAULT_FACE: FaceMinutes = 30;

	// Restored during component init rather than in an effect, so the persisting
	// effect below cannot write the default state over the stored one first.
	let faceMinutes = $state<FaceMinutes>(DEFAULT_FACE);

	if (browser) {
		const snapshot = loadSnapshot();
		if (snapshot !== null) timer.restore(snapshot);

		// A stored duration can be longer than the stored face, because it could
		// be before faces grew to fit. Reconciled once here rather than derived
		// for ever, so the face stays a fixed thing a drag cannot rescale.
		const storedFace = loadFaceMinutes() ?? DEFAULT_FACE;
		faceMinutes = faceFor(Math.max(storedFace, Math.ceil(timer.durationMs / 60_000)));
	}

	let customLength = $state('');

	const clock = $derived(formatDuration(timer.remainingMs));

	/**
	 * A real Time Timer has a fixed face: on a 30-minute face, 25 minutes covers
	 * 25/30 of the circle, so a given amount of red always means the same amount
	 * of time.
	 *
	 * The face is therefore held, never derived from the duration. Deriving it
	 * would rescale the face under the pointer mid-drag - the wedge being aimed
	 * at would move as it was dragged - and would lose the property above, which
	 * is the whole point of having a face.
	 */
	const filled = $derived(timer.remainingMs / 60_000 / faceMinutes);
	/** The duration is locked once started; only a reset unlocks it. */
	const editable = $derived(timer.status === 'idle');

	/** A face grown to fit a typed length, rather than one of the two offered.
	 *  Still a face: draggable, and switchable back with the buttons. */
	const grown = $derived(!FACE_OPTIONS.some((option) => option === faceMinutes));

	/**
	 * The smallest face the current length fits on.
	 *
	 * Ceiling rather than rounding, because a length of 60.5 does not fit on a
	 * 60 face - it needs the next one up.
	 */
	const smallestFace = $derived(faceFor(Math.ceil(timer.durationMs / 60_000)));
	/** Offered only when it would move: a control that never does anything is
	 *  noise, and pressing 30 or 60 clamps the length whereas this does not. */
	const canFit = $derived(smallestFace < faceMinutes);

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
		customLength = '';
		timer.setDurationMs(minutes * 60_000);
	}

	function applyCustomLength() {
		const typed = parseLengthMinutes(customLength);
		if (typed === null) return;

		// Clamped to the longest face, so a length always has a face that fits.
		const minutes = Math.min(typed, MAX_FACE_MINUTES);
		timer.setDurationMs(minutes * 60_000);
		// Grown to the next round face rather than to the length itself, so the
		// marks stay round - and left there, so the buttons can put it back.
		if (minutes > faceMinutes) faceMinutes = faceFor(minutes);
	}

	function setFace(minutes: FaceMinutes) {
		faceMinutes = minutes;
		// A duration longer than the new face could not be dragged back down, so
		// bring it inside the range.
		if (timer.durationMs > minutes * 60_000) setMinutes(minutes);
	}

	/** Shrink the face to the length, rather than the length to a face. Needs no
	 *  clamp: the smallest face that fits is still one that fits. */
	function fitFace() {
		faceMinutes = smallestFace;
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
		{faceMinutes}
		dragMaxMinutes={faceMinutes}
		valueMinutes={Math.round(timer.durationMs / 60_000)}
		finished={timer.status === 'finished'}
		interactive={editable}
		onSetMinutes={setMinutes}
	/>

	<div class="grid place-items-center gap-1">
		<span class="text-7xl font-semibold tracking-tight text-neutral-50 tabular-nums">{clock}</span>
		<span class="text-sm text-neutral-400" aria-live="polite">{caption}</span>
	</div>

	<div class="flex flex-col items-center gap-5">
		<div class="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
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

			{#if grown}
				<!-- The face in use, shown beside the two that can still be picked. -->
				<span class="inline-flex items-center gap-2">
					<span
						class="rounded-full border border-neutral-400 px-3 py-1 text-neutral-200 tabular-nums"
					>
						{faceMinutes} min
					</span>
					<span>- rounded up to fit what you typed</span>
				</span>
			{/if}

			{#if canFit}
				<button
					type="button"
					onclick={fitFace}
					disabled={!editable}
					class="rounded-full border border-neutral-800 px-3 py-1 tabular-nums transition hover:border-neutral-600 disabled:opacity-40"
				>
					Fit to {smallestFace} min
				</button>
			{/if}
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
			Space starts and pauses. The length is locked once running - reset to change it. Type a length
			longer than the dial holds and the face grows to the next round size that fits, marked at a
			round interval instead of every minute. It stays there, and stays draggable, until you pick
			one of the sizes above again or fit it back down to the length. The custom field takes
			minutes, or hours with an h - 90, 2h and 1h30 all work.
		</p>
	</div>

	<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
		A countdown you can read at a glance, for when time stops being noticeable and for getting
		pulled out of something you have sunk too long into. It keeps running if you reload, and tells
		you if it finished while the tab was shut.
	</p>
</main>
