export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

/** Durations offered as one-click presets, in minutes. */
export const PRESET_MINUTES = [5, 10, 25] as const;

export const DEFAULT_DURATION_MS = 25 * 60_000;

/**
 * The longest length worth accepting, in minutes.
 *
 * A limit on the length, not on the dial: the face is a fixed hour and the rim
 * counts twelve, so ten hours is comfortably inside what the dial can say.
 */
export const MAX_LENGTH_MINUTES = 600;

/** Hours, minutes, or both: "90", "2h", "1h30", "1h30m", "1.5h". */
const TYPED_LENGTH = /^\s*(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m?)?\s*$/i;

/**
 * A typed length in minutes, or null if it is not a length.
 *
 * Hours are understood because the clock already speaks them - a two hour timer
 * reads "2:00:00" - so a field that only took minutes made you convert in your
 * head to say something the tool would immediately convert back.
 */
export function parseLengthMinutes(value: string): number | null {
	const match = TYPED_LENGTH.exec(value);
	if (match === null) return null;

	const [, hours, minutes] = match;
	// The pattern is all-optional, so an empty field matches it.
	if (hours === undefined && minutes === undefined) return null;

	const total = (hours === undefined ? 0 : Number(hours) * 60) + Number(minutes ?? 0);
	return total > 0 ? total : null;
}

/** The timer reduced to plain data, for storing between visits. */
export type TimerSnapshot = {
	durationMs: number;
	endsAt: number | null;
	pausedRemainingMs: number;
	status: TimerStatus;
};

/**
 * The timer.
 *
 * Remaining time is always *derived* from a stored end timestamp and a supplied
 * `now`, never accumulated by decrementing a counter. Browsers throttle timers
 * in background tabs, so a counter-based timer drifts or stalls precisely when a
 * focus timer needs to be trusted — and would also be unable to account for time
 * that passed while the tab was closed.
 *
 * This class deliberately holds no `$effect`: it never starts an interval or
 * touches the DOM. Whoever uses it drives `sync()`, which keeps the arithmetic
 * unit-testable with a fake clock.
 */
export class Timer {
	durationMs = $state(DEFAULT_DURATION_MS);
	status = $state<TimerStatus>('idle');

	/** Epoch ms at which the timer finishes. Non-null while running, and kept after
	 *  finishing so we can report how long ago that was. */
	#endsAt = $state<number | null>(null);
	#pausedRemainingMs = $state(0);
	#now = $state(Date.now());

	get remainingMs(): number {
		switch (this.status) {
			case 'idle':
				return this.durationMs;
			case 'running':
				return Math.max(0, (this.#endsAt ?? 0) - this.#now);
			case 'paused':
				return this.#pausedRemainingMs;
			case 'finished':
				return 0;
		}
	}

	/** The moment it finishes, or null when there is nothing running. Kept after
	 *  finishing, so "ran out at" can still say when. */
	get endsAt(): number | null {
		return this.#endsAt;
	}

	/** How much of the duration has been spent. */
	get elapsedMs(): number {
		return Math.max(0, this.durationMs - this.remainingMs);
	}

	/** Fraction of the duration used up: 0 at the start, 1 when finished. */
	get progress(): number {
		if (this.durationMs <= 0) return 1;
		return Math.min(1, Math.max(0, this.elapsedMs / this.durationMs));
	}

	/** How long ago a finished timer ran out. Non-zero mainly when it expired
	 *  while the tab was closed. */
	get overdueMs(): number {
		if (this.status !== 'finished' || this.#endsAt === null) return 0;
		return Math.max(0, this.#now - this.#endsAt);
	}

	/** Advance the timer's idea of the current time, finishing it if it has run
	 *  out. The only way `status` becomes `finished`. */
	sync(now: number = Date.now()): void {
		this.#now = now;
		if (this.status === 'running' && this.#endsAt !== null && now >= this.#endsAt) {
			this.status = 'finished';
		}
	}

	/**
	 * Only an idle timer's duration can be changed; a started one is locked until
	 * reset. The friction is the point — being able to nudge a running timer
	 * onwards is how overrunning stops feeling like a decision.
	 */
	setDurationMs(ms: number, now: number = Date.now()): void {
		if (this.status !== 'idle') return;
		this.durationMs = Math.max(0, Math.round(ms));
		this.reset(now);
	}

	start(now: number = Date.now()): void {
		if (this.durationMs <= 0) return;
		this.#endsAt = now + this.durationMs;
		this.#pausedRemainingMs = 0;
		this.#now = now;
		this.status = 'running';
	}

	pause(now: number = Date.now()): void {
		if (this.status !== 'running') return;
		this.#pausedRemainingMs = Math.max(0, (this.#endsAt ?? 0) - now);
		this.#endsAt = null;
		this.#now = now;
		this.status = 'paused';
	}

	resume(now: number = Date.now()): void {
		if (this.status !== 'paused') return;
		this.#endsAt = now + this.#pausedRemainingMs;
		this.#now = now;
		this.status = 'running';
	}

	reset(now: number = Date.now()): void {
		this.#endsAt = null;
		this.#pausedRemainingMs = 0;
		this.#now = now;
		this.status = 'idle';
	}

	toSnapshot(): TimerSnapshot {
		return {
			durationMs: this.durationMs,
			endsAt: this.#endsAt,
			pausedRemainingMs: this.#pausedRemainingMs,
			status: this.status
		};
	}

	/**
	 * Rebuild from stored data. A timer that was running and has since run out
	 * comes back `finished` rather than resuming, keeping `endsAt` so `overdueMs`
	 * can report how long ago it happened.
	 */
	restore(snapshot: TimerSnapshot, now: number = Date.now()): void {
		this.durationMs = snapshot.durationMs;
		this.#endsAt = snapshot.endsAt;
		this.#pausedRemainingMs = snapshot.pausedRemainingMs;
		this.status = snapshot.status;
		this.#now = now;

		if (this.status === 'running' && this.#endsAt !== null && now >= this.#endsAt) {
			this.status = 'finished';
		}
	}
}

/** Shared: the alarm has to fire while another tool is on screen, so the timer
 *  is driven from the layout rather than from its own page. */
export const timer = new Timer();
