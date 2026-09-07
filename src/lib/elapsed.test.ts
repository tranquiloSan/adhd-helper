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

describe('elapsed breaks', () => {
	it('remembers when the stretch began, across a break', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);
		elapsed.resume(T0 + 50 * MINUTE);

		expect(elapsed.stretchStartedAt).toBe(T0);
	});

	it('times the break you are on', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);
		elapsed.sync(T0 + 26 * MINUTE);

		expect(elapsed.currentBreakMs).toBe(6 * MINUTE);
		// Not a completed break until it ends.
		expect(elapsed.breakCount).toBe(0);
		expect(elapsed.breakMs).toBe(0);
	});

	it('banks a break once it ends, and counts it', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);
		elapsed.resume(T0 + 39 * MINUTE);

		expect(elapsed.breakCount).toBe(1);
		expect(elapsed.breakMs).toBe(19 * MINUTE);
		expect(elapsed.currentBreakMs).toBe(0);
	});

	it('adds breaks up', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 10 * MINUTE);
		elapsed.resume(T0 + 25 * MINUTE);
		elapsed.pause(T0 + 40 * MINUTE);
		elapsed.resume(T0 + 45 * MINUTE);

		expect(elapsed.breakCount).toBe(2);
		expect(elapsed.breakMs).toBe(20 * MINUTE);
	});

	it('reports no break while running', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.sync(T0 + 5 * MINUTE);
		expect(elapsed.currentBreakMs).toBe(0);
	});

	it('forgets the breaks on reset', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 10 * MINUTE);
		elapsed.resume(T0 + 25 * MINUTE);
		elapsed.reset(T0 + 30 * MINUTE);

		expect(elapsed.stretchStartedAt).toBeNull();
		expect(elapsed.breakCount).toBe(0);
		expect(elapsed.breakMs).toBe(0);
	});

	it('keeps a break running across a period with the tab closed', () => {
		const paused = new Elapsed();
		paused.start(T0);
		paused.pause(T0 + 12 * MINUTE);

		const restored = new Elapsed();
		restored.restore(
			JSON.parse(JSON.stringify(paused.toSnapshot())) as ElapsedSnapshot,
			T0 + 70 * MINUTE
		);

		expect(restored.status).toBe('paused');
		expect(restored.elapsedMs).toBe(12 * MINUTE);
		expect(restored.currentBreakMs).toBe(58 * MINUTE);
	});
});

/**
 * The reason the start time is worth showing at all. Two figures that do not
 * add up to the wall clock are worse than one, so this is the property the
 * whole feature rests on.
 */
describe('elapsed accounts for every moment since it started', () => {
	const accountedTo = (elapsed: Elapsed) =>
		(elapsed.stretchStartedAt ?? 0) + elapsed.elapsedMs + elapsed.breakMs + elapsed.currentBreakMs;

	it('holds while running', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.sync(T0 + 33 * MINUTE);
		expect(accountedTo(elapsed)).toBe(T0 + 33 * MINUTE);
	});

	it('holds while on a break', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);
		elapsed.sync(T0 + 26 * MINUTE);
		expect(accountedTo(elapsed)).toBe(T0 + 26 * MINUTE);
	});

	it('holds after several breaks', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 10 * MINUTE);
		elapsed.resume(T0 + 25 * MINUTE);
		elapsed.pause(T0 + 40 * MINUTE);
		elapsed.resume(T0 + 45 * MINUTE);
		elapsed.sync(T0 + 90 * MINUTE);
		expect(accountedTo(elapsed)).toBe(T0 + 90 * MINUTE);
	});
});
