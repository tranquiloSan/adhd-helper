<script lang="ts">
	import { TOKEN_CLASSES, highlight, linkUrlAt, openableUrl } from '$lib/markdown-highlight';
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

	$effect(() => {
		if (autofocus) textarea?.focus();
	});

	/**
	 * Follow a link on modifier-click, the way an editor does.
	 *
	 * It has to be a modifier: the textarea is on top and owns clicks, because
	 * that is what places the caret and selects text. The caret is also how we
	 * learn where the pointer landed - the browser has already moved it there by
	 * the time this runs, so `selectionStart` is the clicked offset.
	 */
	function followLink(event: MouseEvent) {
		if (!event.metaKey && !event.ctrlKey) return;
		if (textarea === null) return;

		const url = openableUrl(linkUrlAt(notes.text, textarea.selectionStart));
		if (url === null) return;

		event.preventDefault();
		window.open(url, '_blank', 'noopener,noreferrer');
	}

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
		{#each tokens as token, index (index)}<span class={TOKEN_CLASSES[token.kind]}>{token.text}</span
			>{/each}<br />
	</div>

	<textarea
		bind:this={textarea}
		value={notes.text}
		oninput={(event) => notes.set(event.currentTarget.value)}
		onscroll={syncScroll}
		onclick={followLink}
		placeholder="Whatever you would otherwise forget."
		aria-label="Brain dump"
		spellcheck="false"
		class="relative h-full w-full resize-none bg-transparent p-3 font-sans text-base leading-relaxed break-words whitespace-pre-wrap text-transparent caret-neutral-50 outline-none placeholder:text-neutral-600"
	></textarea>
</div>
