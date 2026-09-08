<script lang="ts">
	import DumpEditor from '$lib/DumpEditor.svelte';
	import { formatAge } from '$lib/format';
	import { TOKEN_CLASSES, highlight } from '$lib/markdown-highlight';
	import { notes } from '$lib/notes.svelte';

	/**
	 * A note as the box would colour it, run through the same tokeniser and
	 * painted with the same classes - so the example cannot drift from what
	 * typing actually does.
	 *
	 * One string with newlines, because headings, quotes and lists are matched
	 * per line and this is meant to read as a note rather than as a key.
	 */
	const SAMPLE = [
		'# Heading',
		'Plain text, **bold**, *italic* and `code`.',
		'> A quote',
		'- A list item',
		'[A link](https://example.com)'
	].join('\n');

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

	<div class="flex flex-col gap-2 text-xs text-neutral-500">
		<span>A note, coloured as you type:</span>

		<!-- The same wrapper the editor wears, so the example reads as the box it
		     is an example of. -->
		<div
			class="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap"
		>
			{#each highlight(SAMPLE) as token, index (index)}<span class={TOKEN_CLASSES[token.kind]}
					>{token.text}</span
				>{/each}
		</div>

		<span>
			Nothing is hidden or reflowed - the symbols stay where you typed them, so the box is still
			plain text you can paste anywhere.
			<kbd class="rounded border border-neutral-700 px-1">cmd</kbd> or
			<kbd class="rounded border border-neutral-700 px-1">ctrl</kbd> and a click opens a link.
		</span>
	</div>

	<p class="max-w-prose self-center text-center text-xs leading-relaxed text-neutral-500">
		Press <kbd class="rounded border border-neutral-700 px-1">n</kbd> on any other page to open this in
		a panel without leaving what you are doing. Nothing here is ever cleared for you - it would eventually
		delete something that mattered. The age above is the only nudge, so a pile cannot build up unnoticed.
		When it is telling you it has sat for days, move anything worth keeping into wherever you actually
		keep things, then clear it.
	</p>
</main>
