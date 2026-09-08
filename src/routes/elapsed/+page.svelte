<script lang="ts">
	import { browser } from '$app/environment';
	import AccountOverlay from '$lib/AccountOverlay.svelte';
	import Dial from '$lib/Dial.svelte';
	import { FACE_MINUTES, RIM_SEGMENTS } from '$lib/dial-geometry';
	import { DEFAULT_THRESHOLD_MINUTES, elapsed } from '$lib/elapsed.svelte';
	import { formatApproximate, formatDuration, formatTimeWithDay } from '$lib/format';
	import { loadThresholdMinutes, saveThresholdMinutes } from '$lib/persistence';

	let accountOpen = $state(false);

	let thresholdMinutes = $state(DEFAULT_THRESHOLD_MINUTES);

	if (browser) {
		const storedThreshold = loadThresholdMinutes();
		if (storedThreshold !== null) thresholdMinutes = storedThreshold;
	}

	const elapsedMinutes = $derived(elapsed.elapsedMs / 60_000);
	const clock = $derived(formatDuration(elapsed.elapsedMs));

	// Only the day qualifier on the start time depends on this, and that changes
	// at midnight, so a minute is plenty. The layout drives the count itself.
	let now = $state(Date.now());

	$effect(() => {
		const tick = () => (now = Date.now());
		const id = setInterval(tick, 60_000);
		window.addEventListener('focus', tick);
		return () => {
			clearInterval(id);
			window.removeEventListener('focus', tick);
		};
	});

	/**
	 * The account of the stretch, which is what makes the start time honest:
	 * start plus elapsed plus breaks lands on the wall clock, and without the
	 * breaks the first two stop agreeing with it the moment you pause.
	 *
	 * A stretch restored from a snapshot written before breaks existed has no
	 * start time, so each part stands on its own.
	 */
	const account = $derived.by(() => {
		const parts: string[] = [];

		if (elapsed.stretchStartedAt !== null) {
			parts.push(`started ${formatTimeWithDay(elapsed.stretchStartedAt, now)}`);
		}
		// A count of no breaks is noise, not information.
		if (elapsed.breakCount > 0) {
			const breaks = elapsed.breakCount === 1 ? '1 break' : `${elapsed.breakCount} breaks`;
			parts.push(`${breaks}, ${formatApproximate(elapsed.breakMs)}`);
		}

		return parts.join(' - ');
	});

	/** Whole hours completed. The wedge restarts each hour, so this is what
	 *  distinguishes one hour from three. */
	const laps = $derived(Math.floor(elapsedMinutes / FACE_MINUTES));
	const fraction = $derived((elapsedMinutes % FACE_MINUTES) / FACE_MINUTES);

	/** The same time on the ring, counting up continuously and lapping every
	 *  twelve hours the way the face laps every one. The caption still says the
	 *  absolute count in words, so nothing is lost when the ring comes round. */
	const rimHours = $derived((elapsedMinutes / 60) % RIM_SEGMENTS);

	/**
	 * Warms once a stretch runs long. Visible if you glance, invisible if you
	 * don't - the display never interrupts.
	 *
	 * One step, not two. Colour used to carry magnitude as well, which it was bad
	 * at and which capped out after a couple of hours; the rim counts now, so
	 * colour is back to answering one question - have you been at this too long -
	 * and the threshold is the only thing that decides it.
	 */
	const wedgeColour = $derived(elapsedMinutes >= thresholdMinutes ? '#ea580c' : '#0d9488');

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
		// Saved only on a real change, so the default stays free to move.
		saveThresholdMinutes(thresholdMinutes);
	}

	const buttonLabel = $derived(
		elapsed.status === 'running' ? 'Pause' : elapsed.status === 'paused' ? 'Resume' : 'Start'
	);
</script>

<svelte:head>
	<meta
		name="description"
		content="Counts up, so you can see how long you have been at something."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-4">
	<Dial {fraction} {rimHours} valueMinutes={Math.round(elapsedMinutes)} {wedgeColour} />

	<div class="grid place-items-center gap-1">
		<span class="text-7xl font-semibold tracking-tight text-neutral-50 tabular-nums">{clock}</span>
		<span class="text-sm text-neutral-400" aria-live="polite">{caption}</span>
		{#if account !== ''}
			<span class="flex items-center gap-2 text-xs text-neutral-500">
				{account}
				<!-- The itemised version of the line to its left. Behind a button and
				     on this page only: a list of rows turns a glance into reading, so
				     it has to be somewhere you go rather than something you see. -->
				{#if elapsed.segments.length > 1}
					<button
						type="button"
						onclick={() => (accountOpen = true)}
						class="rounded-full border border-neutral-800 px-2 py-0.5 transition hover:border-neutral-600"
					>
						Itemise
					</button>
				{/if}
			</span>
		{/if}
	</div>

	{#if accountOpen}
		<AccountOverlay onclose={() => (accountOpen = false)} />
	{/if}

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
		without breaking the focus it took to get there. The wedge fills each hour and starts again
		while the ring outside it keeps counting up, an hour to a slot; the colour warms once a stretch
		runs long.
	</p>

	<p class="max-w-prose text-center text-xs leading-relaxed text-neutral-500">
		Press <kbd class="rounded border border-neutral-700 px-1">p</kbd> on any page to pause and pick up
		again - a break is timed for you and kept out of the count, so the time above is time you were actually
		here.
	</p>
</main>
