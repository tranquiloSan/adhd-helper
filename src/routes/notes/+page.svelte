<script lang="ts">
	import DumpEditor from '$lib/DumpEditor.svelte';
	import { formatAge } from '$lib/format';
	import { TOKEN_CLASSES, highlight } from '$lib/markdown-highlight';
	import { notes } from '$lib/notes.svelte';

	/**
	 * What the box will style, run through the same tokeniser and painted with
	 * the same classes, so the hint cannot drift from what typing actually does.
	 *
	 * One per entry, because headings, quotes and lists are matched per line.
	 */
	const EXAMPLES = [
		'# Heading',
		'**bold**',
		'*italic*',
		'`code`',
		'> Quote',
		'- List',
		'[link](url)'
	];

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

	<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
		<span class="text-neutral-500">Markdown is coloured as you type:</span>
		{#each EXAMPLES as example (example)}
			<span class="font-sans whitespace-pre"
				>{#each highlight(example) as token, index (index)}<span class={TOKEN_CLASSES[token.kind]}
						>{token.text}</span
					>{/each}</span
			>
		{/each}
		<span class="text-neutral-500">
			<kbd class="rounded border border-neutral-700 px-1">cmd</kbd> or
			<kbd class="rounded border border-neutral-700 px-1">ctrl</kbd> and a click opens a link
		</span>
	</div>

	<p class="max-w-prose self-center text-center text-xs leading-relaxed text-neutral-500">
		Nothing is hidden or reflowed - the symbols stay where you typed them, so the box is still plain
		text you can paste anywhere. Press <kbd class="rounded border border-neutral-700 px-1">n</kbd> on
		any other page to open this in a panel without leaving what you are doing. Nothing here is ever cleared
		for you - it would eventually delete something that mattered. The age above is the only nudge, so
		a pile cannot build up unnoticed. When it is telling you it has sat for days, move anything worth
		keeping into wherever you actually keep things, then clear it.
	</p>
</main>
