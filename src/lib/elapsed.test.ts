import { describe, expect, it } from 'vitest';
import { Elapsed, type ElapsedSnapshot } from './elapsed.svelte';

const MINUTE = 60_000;
const T0 = 1_700_000_000_000;

describe('elapsed', () => {
	it('reports nothing before starting', () => {
		expect(new Elapsed().elapsedMs).toBe(0);
	});

	it('counts up from the wall clock', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.sync(T0 + 7 * MINUTE);
		expect(elapsed.elapsedMs).toBe(7 * MINUTE);
	});

	it('holds still while paused', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 4 * MINUTE);

		elapsed.sync(T0 + 30 * MINUTE);
		expect(elapsed.elapsedMs).toBe(4 * MINUTE);
	});

	it('banks earlier stretches when resumed', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 4 * MINUTE);
		elapsed.resume(T0 + 60 * MINUTE);
		elapsed.sync(T0 + 63 * MINUTE);

		expect(elapsed.elapsedMs).toBe(7 * MINUTE);
	});

	it('keeps counting across a period with the tab closed', () => {
		const running = new Elapsed();
		running.start(T0);
		const snapshot = JSON.parse(JSON.stringify(running.toSnapshot())) as ElapsedSnapshot;

		const restored = new Elapsed();
		restored.restore(snapshot, T0 + 90 * MINUTE);

		expect(restored.status).toBe('running');
		expect(restored.elapsedMs).toBe(90 * MINUTE);
	});

	it('restores a paused stretch without resuming it', () => {
		const paused = new Elapsed();
		paused.start(T0);
		paused.pause(T0 + 12 * MINUTE);

		const restored = new Elapsed();
		restored.restore(paused.toSnapshot(), T0 + 500 * MINUTE);

		expect(restored.status).toBe('paused');
		expect(restored.elapsedMs).toBe(12 * MINUTE);
	});

	it('starts from zero again after a reset', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.sync(T0 + 20 * MINUTE);
		elapsed.reset(T0 + 20 * MINUTE);

		expect(elapsed.status).toBe('idle');
		expect(elapsed.elapsedMs).toBe(0);
	});
});
