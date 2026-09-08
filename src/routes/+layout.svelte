<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { Alarm } from '$lib/alarm';
	import { day } from '$lib/day.svelte';
	import { elapsed } from '$lib/elapsed.svelte';
	import { formatDuration } from '$lib/format';
	import { isTypingTarget } from '$lib/keyboard';
	import { notes } from '$lib/notes.svelte';
	import NotesOverlay from '$lib/NotesOverlay.svelte';
	import { timer } from '$lib/timer.svelte';
	import {
		loadDay,
		loadElapsed,
		loadNotes,
		loadSnapshot,
		saveDay,
		saveElapsed,
		saveNotes,
		saveSnapshot
	} from '$lib/persistence';

	let { children } = $props();

	const TOOLS = [
		{ href: '/', label: 'Timer' },
		{ href: '/elapsed', label: 'Elapsed' },
		{ href: '/day', label: 'Day' },
		{ href: '/notes', label: 'Notes' }
	] as const;

	const alarm = new Alarm();

	let dumpOpen = $state(false);

	// Every tool is hydrated and persisted here rather than on its own page: the
	// day has to keep counting while you are looking at another tool, the
	// end-of-day nudge needs to know whether the dump is empty from wherever you
	// happen to be, and the countdown's alarm has to fire wherever you happen to
	// be. A tool owned by its page stops existing the moment you navigate away,
	// which is exactly when it most needs to still be running.
	if (browser) {
		const storedTimer = loadSnapshot();
		if (storedTimer !== null) timer.restore(storedTimer);

		const storedDay = loadDay();
		if (storedDay !== null) day.restore(storedDay);

		const storedNotes = loadNotes();
		if (storedNotes !== null) notes.restore(storedNotes);

		const storedElapsed = loadElapsed();
		if (storedElapsed !== null) elapsed.restore(storedElapsed);
	}

	// Only advances the countdown's idea of "now"; it never accumulates elapsed
	// time, so throttling in a background tab cannot make it drift. A background
	// tab does throttle this to about once a minute after five minutes, so a
	// buried alarm can be up to that late - the fix for which is a timeout
	// scheduled at the end, not a faster interval.
	$effect(() => {
		if (timer.status !== 'running') return;
		const id = setInterval(() => timer.sync(), 100);
		return () => clearInterval(id);
	});

	$effect(() => {
		if (day.status !== 'running') return;
		const id = setInterval(() => day.sync(), 1000);
		return () => clearInterval(id);
	});

	// Drives the elapsed dial as well as the strip, so the page does not tick too.
	// Runs while paused as well, because a break counts up when the stretch is
	// not.
	$effect(() => {
		if (elapsed.status === 'idle') return;
		const id = setInterval(() => elapsed.sync(), 500);
		return () => clearInterval(id);
	});

	// A throttled tab runs behind on both counts, so catch up when looked at.
	$effect(() => {
		const resync = () => {
			timer.sync();
			day.sync();
			elapsed.sync();
		};
		document.addEventListener('visibilitychange', resync);
		window.addEventListener('focus', resync);
		return () => {
			document.removeEventListener('visibilitychange', resync);
			window.removeEventListener('focus', resync);
		};
	});

	// One notice, then quiet. Acknowledging is persisted, so a day that ended
	// while the tab was shut is announced when you return - but only once.
	$effect(() => {
		if (!day.needsAnnouncement) return;
		alarm.once('Your day is done.', 'Day over');
		day.acknowledge();
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
		saveSnapshot(timer.toSnapshot());
	});

	$effect(() => {
		saveDay(day.toSnapshot());
	});

	$effect(() => {
		saveElapsed(elapsed.toSnapshot());
	});

	$effect(() => {
		saveNotes(notes.toSnapshot());
	});

	/** The countdown owns the tab whenever it is running or waiting to be
	 *  dismissed - it is the only tool with an alarm, so it is the only one whose
	 *  state you need to see from somewhere else. Otherwise the tool on screen
	 *  says what it is. */
	const pageTitle = $derived.by(() => {
		if (timer.status === 'finished') return 'Time is up - adhd-helper';
		if (timer.status === 'running') return `${formatDuration(timer.remainingMs)} - adhd-helper`;

		// Matched on the route id, not the path: `resolve` returns a relative URL
		// when the site is prerendered, so comparing it against `pathname` never
		// matches in the built HTML and every page would claim to be the timer.
		switch (page.route.id) {
			case '/elapsed':
				return elapsed.status === 'running'
					? `${formatDuration(elapsed.elapsedMs)} elapsed - adhd-helper`
					: 'Elapsed - adhd-helper';
			case '/day':
				return day.status === 'running'
					? `${formatDuration(day.remainingMs)} left - adhd-helper`
					: 'Day - adhd-helper';
			case '/notes':
				return 'Notes - adhd-helper';
			default:
				return 'Timer - adhd-helper';
		}
	});

	// "n" from anywhere opens the dump, already focused. Capture has to cost
	// nothing, and navigating to a page costs more than the thought survives.
	$effect(() => {
		const onKeydown = (event: KeyboardEvent) => {
			// Checked before the typing guard, so Escape works from inside the box.
			if (event.key === 'Escape') {
				dumpOpen = false;
				return;
			}

			if (isTypingTarget(event.target)) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;

			// Pausing has to cost nothing from wherever you are, or a break does
			// not get recorded and the elapsed figure quietly swallows it. Does
			// nothing when idle: starting a stretch stays deliberate.
			if (event.key === 'p') {
				if (elapsed.status === 'running') elapsed.pause();
				else if (elapsed.status === 'paused') elapsed.resume();
				return;
			}

			if (event.key !== 'n') return;
			// Redundant on the notes page, which is the same box full size.
			if (page.route.id === '/notes') return;

			event.preventDefault();
			dumpOpen = true;
		};

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<!--
	The tab title lives here rather than on each page, because the countdown can
	be running while another tool is on screen and the title is the one signal
	that reaches you there. It cannot be a per-page title with an override: head
	elements appear in the order they are created, and a title created later -
	when the countdown starts - would sit behind the page's own and be ignored.
-->
<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{pageTitle}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<nav class="flex justify-center gap-1 p-3 text-sm">
		{#each TOOLS as tool (tool.href)}
			<a
				href={resolve(tool.href)}
				aria-current={page.route.id === tool.href ? 'page' : undefined}
				class="rounded-full px-3 py-1 transition {page.route.id === tool.href
					? 'bg-neutral-800 text-neutral-100'
					: 'text-neutral-500 hover:text-neutral-300'}"
			>
				{tool.label}
			</a>
		{/each}
	</nav>

	{#if elapsed.status !== 'idle' || day.status !== 'idle'}
		<div
			class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-1 text-xs text-neutral-500"
		>
			{#if elapsed.status !== 'idle'}
				<span aria-live="polite">
					{formatDuration(elapsed.elapsedMs)} elapsed{elapsed.status === 'paused'
						? ` - on a break ${formatDuration(elapsed.currentBreakMs)}`
						: ''}
				</span>
			{/if}

			{#if day.status === 'running'}
				<span aria-live="polite">{formatDuration(day.remainingMs)} left today</span>
			{:else if day.status === 'over'}
				<span class="text-neutral-400" aria-live="polite">Day over.</span>
				<!-- A reminder, not a control: clearing has to stay a deliberate act on the
				     notes themselves, where what you are about to lose is in front of you. -->
				{#if !notes.isEmpty}
					<span class="text-neutral-400">
						Don't forget your notes - move anything worth keeping, then clear them.
					</span>
				{/if}
			{/if}
		</div>
	{/if}

	{#if dumpOpen}
		<NotesOverlay onclose={() => (dumpOpen = false)} />
	{/if}

	{@render children()}

	<footer
		class="mt-auto max-w-prose self-center p-6 text-center text-xs leading-relaxed text-neutral-500"
	>
		<p>
			Built for a desktop browser. On a phone the alarm will not fire once the tab is in the
			background, so treat it as desktop-only.
		</p>
		<p class="mt-2">
			<a
				href="https://github.com/tranquiloSan/adhd-helper"
				class="underline decoration-neutral-700 underline-offset-2 transition hover:text-neutral-300"
			>
				Source on GitHub
			</a>
			- open an issue there if something is broken or you want something added.
		</p>
	</footer>
</div>
