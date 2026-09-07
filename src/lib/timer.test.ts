import { describe, expect, it } from 'vitest';
import { DEFAULT_DURATION_MS, Timer, parseLengthMinutes, type TimerSnapshot } from './timer.svelte';

const MINUTE = 60_000;

/** An arbitrary fixed epoch, so no test depends on the real clock. */
const T0 = 1_700_000_000_000;

function startedTimer(durationMs = 10 * MINUTE) {
	const timer = new Timer();
	timer.setDurationMs(durationMs, T0);
	timer.start(T0);
	return timer;
}

describe('idle', () => {
	it('reports the full duration before starting', () => {
		const timer = new Timer();
		expect(timer.remainingMs).toBe(DEFAULT_DURATION_MS);
		expect(timer.status).toBe('idle');
	});

	it('has made no progress', () => {
		expect(new Timer().progress).toBe(0);
	});
});

describe('running', () => {
	it('derives remaining time from elapsed wall clock', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.sync(T0 + 4 * MINUTE);
		expect(timer.remainingMs).toBe(6 * MINUTE);
	});

	it('reports how much of the duration has been spent', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.sync(T0 + 4 * MINUTE);
		expect(timer.elapsedMs).toBe(4 * MINUTE);
	});

	it('counts the whole duration as spent once finished', () => {
		const timer = startedTimer(5 * MINUTE);
		timer.sync(T0 + 5 * MINUTE);
		expect(timer.elapsedMs).toBe(5 * MINUTE);
	});

	it('reports progress as the fraction used up', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.sync(T0 + 2.5 * MINUTE);
		expect(timer.progress).toBeCloseTo(0.25);
	});

	it('finishes once the end timestamp is reached', () => {
		const timer = startedTimer(5 * MINUTE);
		timer.sync(T0 + 5 * MINUTE);
		expect(timer.status).toBe('finished');
		expect(timer.remainingMs).toBe(0);
	});

	it('does not go negative when synced long after expiry', () => {
		const timer = startedTimer(5 * MINUTE);
		timer.sync(T0 + 90 * MINUTE);
		expect(timer.remainingMs).toBe(0);
		expect(timer.progress).toBe(1);
	});

	it('ignores a duration change while paused, since only a reset unlocks it', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.pause(T0 + 1 * MINUTE);
		timer.setDurationMs(30 * MINUTE, T0 + 1 * MINUTE);

		expect(timer.durationMs).toBe(10 * MINUTE);
		expect(timer.remainingMs).toBe(9 * MINUTE);
	});

	it('ignores a duration change mid-run', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.setDurationMs(30 * MINUTE, T0);
		expect(timer.durationMs).toBe(10 * MINUTE);
		expect(timer.status).toBe('running');
	});
});

describe('pause and resume', () => {
	it('keeps the remaining time still while paused', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.pause(T0 + 4 * MINUTE);

		// Six minutes of real time pass, but a paused timer must not move.
		timer.sync(T0 + 10 * MINUTE);
		expect(timer.status).toBe('paused');
		expect(timer.remainingMs).toBe(6 * MINUTE);
	});

	it('resumes with the time it had left, not the time it would have had', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.pause(T0 + 4 * MINUTE);
		timer.resume(T0 + 60 * MINUTE);

		expect(timer.status).toBe('running');
		expect(timer.remainingMs).toBe(6 * MINUTE);

		timer.sync(T0 + 61 * MINUTE);
		expect(timer.remainingMs).toBe(5 * MINUTE);
	});
});

describe('restore', () => {
	function snapshotOf(timer: Timer): TimerSnapshot {
		return JSON.parse(JSON.stringify(timer.toSnapshot())) as TimerSnapshot;
	}

	it('accounts for time that passed while the tab was closed', () => {
		const snapshot = snapshotOf(startedTimer(10 * MINUTE));

		const restored = new Timer();
		restored.restore(snapshot, T0 + 3 * MINUTE);

		expect(restored.status).toBe('running');
		expect(restored.remainingMs).toBe(7 * MINUTE);
	});

	it('comes back finished when it expired while closed, and says how long ago', () => {
		const snapshot = snapshotOf(startedTimer(5 * MINUTE));

		const restored = new Timer();
		restored.restore(snapshot, T0 + 20 * MINUTE);

		expect(restored.status).toBe('finished');
		expect(restored.overdueMs).toBe(15 * MINUTE);
	});

	it('round-trips a paused timer without resuming it', () => {
		const timer = startedTimer(10 * MINUTE);
		timer.pause(T0 + 1 * MINUTE);

		const restored = new Timer();
		restored.restore(snapshotOf(timer), T0 + 45 * MINUTE);

		expect(restored.status).toBe('paused');
		expect(restored.remainingMs).toBe(9 * MINUTE);
	});
});

describe('reset', () => {
	it('returns a finished timer to its full duration', () => {
		const timer = startedTimer(5 * MINUTE);
		timer.sync(T0 + 5 * MINUTE);
		timer.reset(T0 + 5 * MINUTE);

		expect(timer.status).toBe('idle');
		expect(timer.remainingMs).toBe(5 * MINUTE);
		expect(timer.overdueMs).toBe(0);
	});
});

describe('parseLengthMinutes', () => {
	it('reads a bare number as minutes', () => {
		expect(parseLengthMinutes('90')).toBe(90);
		expect(parseLengthMinutes('25m')).toBe(25);
	});

	it('reads hours, which is the whole point of it', () => {
		expect(parseLengthMinutes('2h')).toBe(120);
		expect(parseLengthMinutes('1.5h')).toBe(90);
	});

	it('reads the two together', () => {
		expect(parseLengthMinutes('1h30')).toBe(90);
		expect(parseLengthMinutes('1h30m')).toBe(90);
		expect(parseLengthMinutes('2 h 15')).toBe(135);
	});

	it('ignores case and surrounding space', () => {
		expect(parseLengthMinutes('  2H  ')).toBe(120);
	});

	it('rejects anything that is not a length', () => {
		// The pattern is all-optional, so an empty field has to be caught.
		expect(parseLengthMinutes('')).toBeNull();
		expect(parseLengthMinutes('   ')).toBeNull();
		expect(parseLengthMinutes('h')).toBeNull();
		expect(parseLengthMinutes('0')).toBeNull();
		expect(parseLengthMinutes('abc')).toBeNull();
		expect(parseLengthMinutes('2h2h')).toBeNull();
		// Not supported on purpose: "2h" says it without the multiplying.
		expect(parseLengthMinutes('4*60')).toBeNull();
	});
});
