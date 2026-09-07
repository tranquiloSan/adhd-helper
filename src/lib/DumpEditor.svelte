<script lang="ts">
	import { highlight, type TokenKind } from '$lib/markdown-highlight';
	import { notes } from '$lib/notes.svelte';

	type Props = {
		/** Focus as soon as it appears. The overlay wants this; the page does not. */
		autofocus?: boolean;
		heightClass?: string;
	};

	let { autofocus = false, heightClass = 'h-[50vh]' }: Props = $props();

	let textarea: HTMLTextAreaElement | null = null;
	let mirror: HTMLDivElement | null = null;

	const tokens = $derived(highlight(notes.text));

	/**
	 * Styling may only use properties that leave glyph positions alone - colour,
	 * stroke, underline, background. Weight and size change advance widths, which
	 * would slide the painted text out from under the caret.
	 */
	const CLASSES: Record<TokenKind, string> = {
		text: '',
		marker: 'text-neutral-600',
		heading: 'text-neutral-50 [-webkit-text-stroke:0.4px_currentColor]',
		strong: 'text-neutral-100 [-webkit-text-stroke:0.35px_currentColor]',
		emphasis: 'text-amber-200/90',
		code: 'rounded bg-neutral-800 text-teal-300',
		quote: 'text-neutral-400',
		link: 'text-sky-300 underline decoration-sky-300/40',
		url: 'text-neutral-500'
	};

	$effect(() => {
		if (autofocus) textarea?.focus();
	});

	/** The painted layer has to follow the textarea exactly. */
	function syncScroll() {
		if (mirror === null || textarea === null) return;
		mirror.scrollTop = textarea.scrollTop;
		mirror.scrollLeft = textarea.scrollLeft;
	}
</script>

<!-- Both layers carry identical metrics: same font, size, leading, padding and
     wrapping. The border lives on the wrapper so neither child offsets the
     other. -->
<div
	class="relative w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60 focus-within:border-neutral-600 {heightClass}"
>
	<div
		bind:this={mirror}
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 overflow-hidden p-3 font-sans text-base leading-relaxed break-words whitespace-pre-wrap"
	>
		{#each tokens as token, index (index)}<span class={CLASSES[token.kind]}>{token.text}</span
			>{/each}<br />
	</div>

	<textarea
		bind:this={textarea}
		value={notes.text}
		oninput={(event) => notes.set(event.currentTarget.value)}
		onscroll={syncScroll}
		placeholder="Whatever you would otherwise forget."
		aria-label="Brain dump"
		spellcheck="false"
		class="relative h-full w-full resize-none bg-transparent p-3 font-sans text-base leading-relaxed break-words whitespace-pre-wrap text-transparent caret-neutral-50 outline-none placeholder:text-neutral-600"
	></textarea>
</div>
