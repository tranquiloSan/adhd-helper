<script lang="ts">
	import { browser } from '$app/environment';
	import Dial from '$lib/Dial.svelte';
	import { DEFAULT_THRESHOLD_MINUTES, Elapsed } from '$lib/elapsed.svelte';
	import { formatDuration } from '$lib/format';
	import {
		loadElapsed,
		loadThresholdMinutes,
		saveElapsed,
		saveThresholdMinutes
	} from '$lib/persistence';

	/** The elapsed dial always uses an hour face and laps past it. */
	const FACE_MINUTES = 60;

	const elapsed = new Elapsed();
	let thresholdMinutes = $state(DEFAULT_THRESHOLD_MINUTES);

	if (browser) {
		const snapshot = loadElapsed();
		if (snapshot !== null) elapsed.restore(snapshot);

		const storedThreshold = loadThresholdMinutes();
		if (storedThreshold !== null) thresholdMinutes = storedThreshold;
	}

	const elapsedMinutes = $derived(elapsed.elapsedMs / 60_000);
	const clock = $derived(formatDuration(elapsed.elapsedMs));

	/** Whole hours completed. The wedge restarts each hour, so this is what
	 *  distinguishes one hour from three. */
	const laps = $derived(Math.floor(elapsedMinutes / FACE_MINUTES));
	const fraction = $derived((elapsedMinutes % FACE_MINUTES) / FACE_MINUTES);

	/** Warms as a stretch gets long. Visible if you glance, invisible if you
	 *  don't - the display never interrupts. */
	const wedgeColour = $derived(
		elapsedMinutes >= thresholdMinutes * 2
			? '#dc2626'
			: elapsedMinutes >= thresholdMinutes
				? '#ea580c'
				: '#0d9488'
	);

	const caption = $derived.by(() => {
		switch (elapsed.status) {
			case 'idle':
				return 'Not started';
			case 'running':
				return laps > 0 ? `Running - past ${laps === 1 ? 'an hour' : `${laps} hours`}` : 'Running';
			case 'paused':
				return 'Paused';
		}
	});

	$effect(() => {
		if (elapsed.status !== 'running') return;
		const id = setInterval(() => elapsed.sync(), 500);
		return () => clearInterval(id);
	});

	$effect(() => {
		const resync = () => elapsed.sync();
		document.addEventListener('visibilitychange', resync);
		window.addEventListener('focus', resync);
		return () => {
			document.removeEventListener('visibilitychange', resync);
			window.removeEventListener('focus', resync);
		};
	});

	$effect(() => {
		saveElapsed(elapsed.toSnapshot());
	});

	$effect(() => {
		saveThresholdMinutes(thresholdMinutes);
	});

	function toggle() {
		switch (elapsed.status) {
			case 'idle':
				elapsed.start();
				return;
			case 'running':
				elapsed.pause();
				return;
			case 'paused':
				elapsed.resume();
				return;
		}
	}

	function applyThreshold(event: Event) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		if (!Number.isFinite(value) || value <= 0) return;
		thresholdMinutes = Math.round(value);
	}

	const buttonLabel = $derived(
		elapsed.status === 'running' ? 'Pause' : elapsed.status === 'paused' ? 'Resume' : 'Start'
	);
</script>

<svelte:head>
	<title>{elapsed.status === 'running' ? `${clock} elapsed` : 'Elapsed'} - adhd-helper</title>
	<meta
		name="description"
		content="Counts up, so you can see how long you have been at something."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-4">
	<Dial
		{fraction}
		faceMinutes={FACE_MINUTES}
		dragMaxMinutes={FACE_MINUTES}
		valueMinutes={Math.round(elapsedMinutes)}
		{wedgeColour}
	/>

	<div class="grid place-items-center gap-1">
		<span class="text-7xl font-semibold tracking-tight text-neutral-50 tabular-nums">{clock}</span>
		<span class="text-sm text-neutral-400" aria-live="polite">{caption}</span>
	</div>

	<div class="flex flex-col items-center gap-5">
		<label class="flex items-center gap-2 text-xs text-neutral-500">
			<span>Warm after</span>
			<input
				type="number"
				min="1"
				max="600"
				inputmode="numeric"
				value={thresholdMinutes}
				oninput={applyThreshold}
				class="w-16 rounded-full border border-neutral-800 bg-transparent px-3 py-1 tabular-nums outline-none focus-visible:border-neutral-600"
			/>
			<span>min</span>
		</label>

		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={toggle}
				class="rounded-full bg-teal-600 px-8 py-3 text-lg font-medium text-neutral-50 transition hover:bg-teal-500"
			>
				{buttonLabel}
			</button>

			{#if elapsed.status !== 'idle'}
				<button
					type="button"
					onclick={() => elapsed.reset()}
					class="rounded-full border border-neutral-700 px-5 py-3 text-neutral-300 transition hover:border-neutral-500"
				>
					Reset
				</button>
			{/if}
		</div>
	</div>

	<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
		Counts up with no target and no alarm, so it can tell you how long you have been at something
		without breaking the focus it took to get there. The wedge fills each hour and starts again; the
		colour warms once a stretch runs long.
	</p>
</main>
