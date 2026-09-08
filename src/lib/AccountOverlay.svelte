<script lang="ts">
	import { elapsed } from '$lib/elapsed.svelte';
	import { formatDuration, formatTimeOfDay, formatTimeWithDay } from '$lib/format';

	type Props = { onclose: () => void };
	let { onclose }: Props = $props();

	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	// The dump's overlay leans on the layout's global Escape, which is wired to
	// the dump alone. This one has to bind its own.
	$effect(() => {
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onclose();
		};
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	const rows = $derived(
		elapsed.segments.map((segment) => ({
			kind: segment.kind,
			from: formatTimeOfDay(segment.startedAt),
			// An open period has no end yet; it is the one you are in.
			to: segment.endedAt === null ? null : formatTimeOfDay(segment.endedAt),
			length: formatDuration((segment.endedAt ?? now) - segment.startedAt)
		}))
	);

	/** Only a click on the backdrop itself closes; one inside the panel must not. */
	function onBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) onclose();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex justify-center bg-neutral-950/85 p-4 pt-16 backdrop-blur-sm"
	onclick={onBackdropClick}
>
	<div
		class="flex h-fit max-h-[70vh] w-full max-w-lg flex-col gap-3 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-label="The account of this stretch"
	>
		<p class="text-xs text-neutral-500">
			{#if elapsed.stretchStartedAt === null}
				Nothing to account for yet.
			{:else}
				Started {formatTimeWithDay(elapsed.stretchStartedAt, now)}.
			{/if}
		</p>

		<div class="-mx-1 overflow-y-auto px-1">
			<table class="w-full text-sm tabular-nums">
				<thead class="sr-only">
					<tr><th scope="col">From</th><th scope="col">Until</th><th scope="col">For</th></tr>
				</thead>
				<tbody>
					{#each rows as row, i (i)}
						<tr class={row.kind === 'break' ? 'text-neutral-500' : 'text-neutral-300'}>
							<td class="py-1 pr-3">
								{row.from} - {row.to ?? '…'}
							</td>
							<td class="py-1 pr-3 text-neutral-500">
								{row.kind === 'break' ? 'away' : 'worked'}
							</td>
							<td class="py-1 text-right">{row.length}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<p class="text-xs text-neutral-500">Esc to close.</p>
	</div>
</div>
