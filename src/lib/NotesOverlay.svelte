<script lang="ts">
	import DumpEditor from '$lib/DumpEditor.svelte';
	import { formatAge } from '$lib/format';
	import { notes } from '$lib/notes.svelte';

	type Props = { onclose: () => void };
	let { onclose }: Props = $props();

	const now = Date.now();

	const age = $derived(notes.updatedAt === null ? null : formatAge(now - notes.updatedAt));

	/** Only a click on the backdrop itself closes; one inside the panel must not. */
	function onBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) onclose();
	}
</script>

<!-- Escape is bound globally in the layout, so this is reachable and dismissable
     from the keyboard without a handler here. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex justify-center bg-neutral-950/85 p-4 pt-16 backdrop-blur-sm"
	onclick={onBackdropClick}
>
	<div
		class="flex h-fit w-full max-w-2xl flex-col gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 p-3 shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-label="Brain dump"
	>
		<DumpEditor autofocus heightClass="h-56" />

		<div class="flex items-center justify-between text-xs text-neutral-500">
			<span>
				{#if notes.isEmpty}
					Esc to close.
				{:else if age !== null}
					Untouched for {age}. Esc to close.
				{/if}
			</span>

			<button
				type="button"
				onclick={() => notes.clear()}
				disabled={notes.isEmpty}
				class="rounded-full border border-neutral-800 px-3 py-1 transition hover:border-neutral-600 disabled:opacity-40"
			>
				Clear
			</button>
		</div>
	</div>
</div>
