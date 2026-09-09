export type ElapsedStatus = 'idle' | 'running' | 'paused';

/** How long a stretch has to run before the dial starts warming. One full lap
 *  of the hour face, so the colour changing and the wedge coming round are the
 *  same moment rather than two unrelated signals. */
export const DEFAULT_THRESHOLD_MINUTES = 60;

/**
 * One stretch of the account: time worked, or time away.
 *
 * A break still carries no description - ADR 0002, and confirmed in use when the
 * types turned out not to be wanted. A segment says when it ran and nothing
 * else; anything with words in it belongs in notes.
 */
export type Segment = { kind: 'work' | 'break'; startedAt: number; endedAt: number | null };

export type ElapsedSnapshot = {
	status: ElapsedStatus;
	startedAt: number | null;
	accumulatedMs: number;
	/** When the whole stretch began, breaks included. */
	firstStartedAt: number | null;
	/** When the break currently running began, or null when not on one. */
	pausedAt: number | null;
	/** Time spent on breaks that have finished. */
	breakMs: number;
	breakCount: number;
	/** The account, in order. Optional because it arrived after the first
	 *  versions shipped, and a stored snapshot without it is still a stretch. */
	segments?: Segment[];
};

/**
 * Counts up, with no target and nothing to reach.
 *
 * Deliberately has no alarm: the point is to be able to notice a long stretch
 * without breaking one. Like the countdown, it derives everything from
 * timestamps rather than accumulating on an interval, and holds no `$effect`.
 *
 * Breaks are recorded but never labelled, and the numbers are kept so that
 * `stretchStartedAt + elapsedMs + breakMs + currentBreakMs` lands on now. That
 * invariant is the whole reason the start time is worth showing: without the
 * break totals the two figures stop agreeing the moment you pause.
 *
 * The counters stay the authority on those totals even though `segments` could
 * derive them. Deriving is the tidier end state, but requiring the new field
 * would reject every snapshot already in a browser and drop a stretch that is
 * still running, which is the one thing a reload must not do. The small
 * redundancy buys that safety.
 */
export class Elapsed {
	status = $state<ElapsedStatus>('idle');

	/** When the segment currently running began. Not the stretch's start: a
	 *  pause throws this away and a resume sets a new one. */
	#startedAt = $state<number | null>(null);
	/** Time banked from segments before the current one. */
	#accumulatedMs = $state(0);
	#firstStartedAt = $state<number | null>(null);
	#pausedAt = $state<number | null>(null);
	#breakMs = $state(0);
	#breakCount = $state(0);
	#segments = $state<Segment[]>([]);
	#now = $state(Date.now());

	get elapsedMs(): number {
		if (this.status === 'running' && this.#startedAt !== null) {
			return this.#accumulatedMs + Math.max(0, this.#now - this.#startedAt);
		}
		return this.#accumulatedMs;
	}

	/**
	 * When the stretch began, breaks included.
	 *
	 * Held rather than derived, because it cannot be recovered afterwards: once
	 * a break has happened, resume time minus elapsed points at a moment the
	 * stretch was not running.
	 */
	get stretchStartedAt(): number | null {
		return this.#firstStartedAt;
	}

	/** Breaks that have finished. The one you are on is not one of them yet. */
	get breakCount(): number {
		return this.#breakCount;
	}

	get breakMs(): number {
		return this.#breakMs;
	}

	/** Every worked and away period of this stretch, oldest first, with the one
	 *  you are in still open. Emptied by a reset, like the counters. */
	get segments(): Segment[] {
		return this.#segments;
	}

	/** The break you are on, counting up. Zero whenever you are not on one. */
	get currentBreakMs(): number {
		if (this.status !== 'paused' || this.#pausedAt === null) return 0;
		return Math.max(0, this.#now - this.#pausedAt);
	}

	sync(now: number = Date.now()): void {
		this.#now = now;
	}

	/** Close the period currently open, if there is one. */
	#closeSegment(now: number): void {
		const open = this.#segments[this.#segments.length - 1];
		if (open !== undefined && open.endedAt === null) open.endedAt = now;
	}

	/**
	 * Begin a stretch. `startedAt` defaults to now, but a stretch you only thought
	 * to start after an hour of work can be told when it really began, so the count
	 * opens at that hour rather than zero. A time in the future would count
	 * backwards, so it is clamped to now.
	 */
	start(now: number = Date.now(), startedAt: number = now): void {
		const began = Math.min(startedAt, now);
		this.#startedAt = began;
		this.#accumulatedMs = 0;
		this.#firstStartedAt = began;
		this.#pausedAt = null;
		this.#breakMs = 0;
		this.#breakCount = 0;
		this.#segments = [{ kind: 'work', startedAt: began, endedAt: null }];
		this.#now = now;
		this.status = 'running';
	}

	pause(now: number = Date.now()): void {
		if (this.status !== 'running') return;
		if (this.#startedAt !== null) {
			this.#accumulatedMs += Math.max(0, now - this.#startedAt);
		}
		this.#startedAt = null;
		this.#pausedAt = now;
		this.#closeSegment(now);
		this.#segments.push({ kind: 'break', startedAt: now, endedAt: null });
		this.#now = now;
		this.status = 'paused';
	}

	resume(now: number = Date.now()): void {
		if (this.status !== 'paused') return;
		if (this.#pausedAt !== null) {
			this.#breakMs += Math.max(0, now - this.#pausedAt);
			this.#breakCount += 1;
		}
		this.#pausedAt = null;
		this.#startedAt = now;
		this.#closeSegment(now);
		this.#segments.push({ kind: 'work', startedAt: now, endedAt: null });
		this.#now = now;
		this.status = 'running';
	}

	reset(now: number = Date.now()): void {
		this.#startedAt = null;
		this.#accumulatedMs = 0;
		this.#firstStartedAt = null;
		this.#pausedAt = null;
		this.#breakMs = 0;
		this.#breakCount = 0;
		this.#segments = [];
		this.#now = now;
		this.status = 'idle';
	}

	toSnapshot(): ElapsedSnapshot {
		return {
			status: this.status,
			startedAt: this.#startedAt,
			accumulatedMs: this.#accumulatedMs,
			firstStartedAt: this.#firstStartedAt,
			pausedAt: this.#pausedAt,
			breakMs: this.#breakMs,
			breakCount: this.#breakCount,
			segments: this.#segments.map((segment) => ({ ...segment }))
		};
	}

	/**
	 * Rebuild from stored data. A stretch left running keeps running, so time
	 * that passed with the tab shut counts - the same rule the countdown uses,
	 * and the one a stopwatch would follow. A break left open is still open for
	 * the same reason, which is what keeps the invariant true across a reload.
	 */
	restore(snapshot: ElapsedSnapshot, now: number = Date.now()): void {
		this.status = snapshot.status;
		this.#startedAt = snapshot.startedAt;
		this.#accumulatedMs = snapshot.accumulatedMs;
		this.#firstStartedAt = snapshot.firstStartedAt;
		this.#pausedAt = snapshot.pausedAt;
		this.#breakMs = snapshot.breakMs;
		this.#breakCount = snapshot.breakCount;
		// A stretch from before the account existed keeps running; it just has
		// nothing to itemise.
		this.#segments = (snapshot.segments ?? []).map((segment) => ({ ...segment }));
		this.#now = now;
	}
}

/** Shared: the strip shows it from every page, so it has to keep counting
 *  while another tool is on screen. */
export const elapsed = new Elapsed();
