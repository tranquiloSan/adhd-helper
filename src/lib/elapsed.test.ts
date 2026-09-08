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

/**
 * The account: the same stretch the counters describe, itemised. The counters
 * stay the authority on the totals, so what matters here is that the periods
 * line up with them and that a stretch stored before the account existed still
 * survives a reload.
 */
describe('the account of a stretch', () => {
	it('opens a worked period when the stretch starts', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);

		expect(elapsed.segments).toEqual([{ kind: 'work', startedAt: T0, endedAt: null }]);
	});

	it('closes the worked period and opens a break when paused', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);

		expect(elapsed.segments).toEqual([
			{ kind: 'work', startedAt: T0, endedAt: T0 + 20 * MINUTE },
			{ kind: 'break', startedAt: T0 + 20 * MINUTE, endedAt: null }
		]);
	});

	it('closes the break and opens work again on resume', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);
		elapsed.resume(T0 + 32 * MINUTE);

		expect(elapsed.segments).toHaveLength(3);
		expect(elapsed.segments.at(-2)).toEqual({
			kind: 'break',
			startedAt: T0 + 20 * MINUTE,
			endedAt: T0 + 32 * MINUTE
		});
		expect(elapsed.segments.at(-1)).toEqual({
			kind: 'work',
			startedAt: T0 + 32 * MINUTE,
			endedAt: null
		});
	});

	it('itemises the same breaks the counters total up', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);
		elapsed.resume(T0 + 32 * MINUTE);
		elapsed.pause(T0 + 50 * MINUTE);
		elapsed.resume(T0 + 55 * MINUTE);

		const breaks = elapsed.segments.filter((segment) => segment.kind === 'break');
		const total = breaks.reduce((sum, b) => sum + ((b.endedAt ?? 0) - b.startedAt), 0);

		expect(breaks).toHaveLength(elapsed.breakCount);
		expect(total).toBe(elapsed.breakMs);
	});

	it('forgets the account on reset, like the counters', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);
		elapsed.pause(T0 + 20 * MINUTE);
		elapsed.reset(T0 + 25 * MINUTE);

		expect(elapsed.segments).toEqual([]);
	});

	it('survives a round trip through storage', () => {
		const before = new Elapsed();
		before.start(T0);
		before.pause(T0 + 20 * MINUTE);

		const after = new Elapsed();
		after.restore(
			JSON.parse(JSON.stringify(before.toSnapshot())) as ElapsedSnapshot,
			T0 + 30 * MINUTE
		);

		expect(after.segments).toEqual(before.segments);
	});

	it('does not hand back a snapshot that later edits can reach into', () => {
		const elapsed = new Elapsed();
		elapsed.start(T0);

		const snapshot = elapsed.toSnapshot();
		elapsed.pause(T0 + 20 * MINUTE);

		expect(snapshot.segments).toHaveLength(1);
		expect(snapshot.segments?.[0].endedAt).toBeNull();
	});

	// The regression that matters: the account arrived last, so a stored stretch
	// without one is an older version, not a broken snapshot. Rejecting it would
	// drop a stretch that is still running.
	it('keeps a stretch from before the account existed, and just has nothing to itemise', () => {
		const legacy: ElapsedSnapshot = {
			status: 'running',
			startedAt: T0,
			accumulatedMs: 0,
			firstStartedAt: T0,
			pausedAt: null,
			breakMs: 0,
			breakCount: 0
		};

		const elapsed = new Elapsed();
		elapsed.restore(legacy, T0 + 40 * MINUTE);

		expect(elapsed.status).toBe('running');
		expect(elapsed.elapsedMs).toBe(40 * MINUTE);
		expect(elapsed.segments).toEqual([]);
	});
});
