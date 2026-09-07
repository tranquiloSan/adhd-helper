<script lang="ts">
	import DumpEditor from '$lib/DumpEditor.svelte';
	import { formatAge } from '$lib/format';
	import { notes } from '$lib/notes.svelte';

	let now = $state(Date.now());

	const age = $derived(notes.updatedAt === null ? null : formatAge(now - notes.updatedAt));

	// Age changes by the hour, so a slow tick and a nudge on refocus is plenty.
	$effect(() => {
		const tick = () => (now = Date.now());
		const id = setInterval(tick, 60_000);
		window.addEventListener('focus', tick);
		return () => {
			clearInterval(id);
			window.removeEventListener('focus', tick);
		};
	});
</script>

<svelte:head>
	<title>Notes - adhd-helper</title>
	<meta name="description" content="Somewhere to put a thought before it goes." />
</svelte:head>

<main class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-4">
	<DumpEditor heightClass="h-[55vh]" />

	<div class="flex items-center justify-between text-xs text-neutral-500">
		<span aria-live="polite">
			{#if notes.isEmpty}
				Empty.
			{:else if age !== null}
				Untouched for {age}.
			{/if}
		</span>

		<button
			type="button"
			onclick={() => notes.clear()}
			disabled={notes.isEmpty}
			class="rounded-full border border-neutral-800 px-4 py-1 transition hover:border-neutral-600 disabled:opacity-40"
		>
			Clear
		</button>
	</div>

	<p class="max-w-prose text-xs leading-relaxed text-neutral-500">
		Press <kbd class="rounded border border-neutral-700 px-1">n</kbd> on any other page to open this in
		a panel without leaving what you are doing. Nothing here is ever cleared for you - it would eventually
		delete something that mattered. The age above is the only nudge, so a pile cannot build up unnoticed.
		When it is telling you it has sat for days, move anything worth keeping into wherever you actually
		keep things, then clear it.
	</p>
</main>
