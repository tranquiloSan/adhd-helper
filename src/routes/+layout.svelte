<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children } = $props();

	const TOOLS = [
		{ href: '/', label: 'Timer' },
		{ href: '/elapsed', label: 'Elapsed' },
		{ href: '/day', label: 'Day' },
		{ href: '/notes', label: 'Notes' }
	] as const;
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
