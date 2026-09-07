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
	import {
		loadDay,
		loadElapsed,
		loadNotes,
		saveDay,
		saveElapsed,
		saveNotes
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

	// The day countdown and the dump are hydrated and persisted here rather than
	// on their own pages: the day has to keep counting while you are looking at
	// another tool, and the end-of-day nudge needs to know whether the dump is
	// empty from wherever you happen to be.
	if (browser) {
		const storedDay = loadDay();
		if (storedDay !== null) day.restore(storedDay);

		const storedNotes = loadNotes();
		if (storedNotes !== null) notes.restore(storedNotes);

		const storedElapsed = loadElapsed();
		if (storedElapsed !== null) elapsed.restore(storedElapsed);
	}

	$effect(() => {
		if (day.status !== 'running') return;
		const id = setInterval(() => day.sync(), 1000);
		return () => clearInterval(id);
	});

	// Drives the elapsed dial as well as the strip, so the page does not tick too.
	$effect(() => {
		if (elapsed.status !== 'running') return;
		const id = setInterval(() => elapsed.sync(), 500);
		return () => clearInterval(id);
	});

	// A throttled tab runs behind on both counts, so catch up when looked at.
	$effect(() => {
		const resync = () => {
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

	$effect(() => {
		saveDay(day.toSnapshot());
	});

	$effect(() => {
		saveElapsed(elapsed.toSnapshot());
	});

	$effect(() => {
		saveNotes(notes.toSnapshot());
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
			if (event.key !== 'n') return;
			// Redundant on the notes page, which is the same box full size.
			if (page.url.pathname === resolve('/notes')) return;

			event.preventDefault();
			dumpOpen = true;
		};

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen flex-col">
	<nav class="flex justify-center gap-1 p-3 text-sm">
		{#each TOOLS as tool (tool.href)}
			<a
				href={resolve(tool.href)}
				aria-current={page.url.pathname === resolve(tool.href) ? 'page' : undefined}
				class="rounded-full px-3 py-1 transition {page.url.pathname === resolve(tool.href)
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
						? ', paused'
						: ''}
				</span>
			{/if}

			{#if day.status === 'running'}
				<span aria-live="polite">{formatDuration(day.remainingMs)} left today</span>
			{:else if day.status === 'over'}
				<span class="text-neutral-400" aria-live="polite">Day over.</span>
				{#if !notes.isEmpty}
					<span class="text-neutral-400">
						Move anything worth keeping out of your notes, then
					</span>
					<button
						type="button"
						onclick={() => notes.clear()}
						class="rounded-full border border-neutral-700 px-3 py-0.5 text-neutral-400 transition hover:border-neutral-500"
					>
						clear them
					</button>
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
