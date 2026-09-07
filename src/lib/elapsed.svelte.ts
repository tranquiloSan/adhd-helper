export type ElapsedStatus = 'idle' | 'running' | 'paused';

/** How long a stretch has to run before the dial starts warming. One full lap
 *  of the hour face, so the colour changing and the wedge coming round are the
 *  same moment rather than two unrelated signals. */
export const DEFAULT_THRESHOLD_MINUTES = 60;

export type ElapsedSnapshot = {
	status: ElapsedStatus;
	startedAt: number | null;
	accumulatedMs: number;
};

/**
 * Counts up, with no target and nothing to reach.
 *
 * Deliberately has no alarm: the point is to be able to notice a long stretch
 * without breaking one. Like the countdown, it derives everything from
 * timestamps rather than accumulating on an interval, and holds no `$effect`.
 */
export class Elapsed {
	status = $state<ElapsedStatus>('idle');

	/** When the stretch currently running began. */
	#startedAt = $state<number | null>(null);
	/** Time banked from stretches before the current one. */
	#accumulatedMs = $state(0);
	#now = $state(Date.now());

	get elapsedMs(): number {
		if (this.status === 'running' && this.#startedAt !== null) {
			return this.#accumulatedMs + Math.max(0, this.#now - this.#startedAt);
		}
		return this.#accumulatedMs;
	}

	sync(now: number = Date.now()): void {
		this.#now = now;
	}

	start(now: number = Date.now()): void {
		this.#startedAt = now;
		this.#accumulatedMs = 0;
		this.#now = now;
		this.status = 'running';
	}

	pause(now: number = Date.now()): void {
		if (this.status !== 'running') return;
		if (this.#startedAt !== null) {
			this.#accumulatedMs += Math.max(0, now - this.#startedAt);
		}
		this.#startedAt = null;
		this.#now = now;
		this.status = 'paused';
	}

	resume(now: number = Date.now()): void {
		if (this.status !== 'paused') return;
		this.#startedAt = now;
		this.#now = now;
		this.status = 'running';
	}

	reset(now: number = Date.now()): void {
		this.#startedAt = null;
		this.#accumulatedMs = 0;
		this.#now = now;
		this.status = 'idle';
	}

	toSnapshot(): ElapsedSnapshot {
		return {
			status: this.status,
			startedAt: this.#startedAt,
			accumulatedMs: this.#accumulatedMs
		};
	}

	/**
	 * Rebuild from stored data. A stretch left running keeps running, so time
	 * that passed with the tab shut counts — the same rule the countdown uses,
	 * and the one a stopwatch would follow.
	 */
	restore(snapshot: ElapsedSnapshot, now: number = Date.now()): void {
		this.status = snapshot.status;
		this.#startedAt = snapshot.startedAt;
		this.#accumulatedMs = snapshot.accumulatedMs;
		this.#now = now;
	}
}
