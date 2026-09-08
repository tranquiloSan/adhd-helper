export type DayStatus = 'idle' | 'running' | 'over';

export type DaySnapshot = {
	status: DayStatus;
	/** When the day was started, giving the span the dial is drawn against. */
	startedAt: number | null;
	endsAt: number | null;
	/** Whether the end has already been announced, so a reload does not repeat it. */
	announced: boolean;
};

/**
 * Counts down to an end time you name - "working until 15:00" - and does
 * nothing until you start it.
 *
 * Deliberately not derived from stored working hours: a real finishing time
 * varies day to day, so fixed hours would be wrong often, and a passive display
 * that is often wrong is worse than none. Naming today's end also removes the
 * out-of-hours and weekend cases entirely, since it simply is not running.
 */
export class DayCountdown {
	status = $state<DayStatus>('idle');

	#startedAt = $state<number | null>(null);
	#endsAt = $state<number | null>(null);
	#announced = $state(false);
	#now = $state(Date.now());

	get startedAt(): number | null {
		return this.#startedAt;
	}

	get endsAt(): number | null {
		return this.#endsAt;
	}

	get remainingMs(): number {
		if (this.status !== 'running' || this.#endsAt === null) return 0;
		return Math.max(0, this.#endsAt - this.#now);
	}

	get overdueMs(): number {
		if (this.status !== 'over' || this.#endsAt === null) return 0;
		return Math.max(0, this.#now - this.#endsAt);
	}

	/** True once the day has ended and nothing has said so yet. Survives a
	 *  reload, so a day that ended while the tab was shut still gets announced -
	 *  once. */
	get needsAnnouncement(): boolean {
		return this.status === 'over' && !this.#announced;
	}

	acknowledge(): void {
		this.#announced = true;
	}

	sync(now: number = Date.now()): void {
		this.#now = now;
		if (this.status === 'running' && this.#endsAt !== null && now >= this.#endsAt) {
			this.status = 'over';
		}
	}

	start(endsAt: number, now: number = Date.now()): void {
		if (endsAt <= now) return;
		this.#startedAt = now;
		this.#endsAt = endsAt;
		this.#announced = false;
		this.#now = now;
		this.status = 'running';
	}

	stop(now: number = Date.now()): void {
		this.#startedAt = null;
		this.#endsAt = null;
		this.#announced = false;
		this.#now = now;
		this.status = 'idle';
	}

	toSnapshot(): DaySnapshot {
		return {
			status: this.status,
			startedAt: this.#startedAt,
			endsAt: this.#endsAt,
			announced: this.#announced
		};
	}

	restore(snapshot: DaySnapshot, now: number = Date.now()): void {
		this.status = snapshot.status;
		this.#startedAt = snapshot.startedAt;
		this.#endsAt = snapshot.endsAt;
		this.#announced = snapshot.announced;
		this.#now = now;

		if (this.status === 'running' && this.#endsAt !== null && now >= this.#endsAt) {
			this.status = 'over';
		}
	}
}

/** Shared: it has to keep counting and announce its end from the layout, while
 *  you are looking at another tool. */
export const day = new DayCountdown();

/**
 * Turn a typed end time into a timestamp.
 *
 * A time that has already passed today means tomorrow. An evening that runs to
 * 03:00 is a real day to name, and there is nothing else "03:00" typed at 22:00
 * could mean. Accepts `1700` and `9:00` as well as `17:00`, since the shape is
 * unambiguous either way.
 */
export function resolveEndTime(value: string, now: number = Date.now()): number | null {
	const match = /^(\d{1,2}):?(\d{2})$/.exec(value.trim());
	if (match === null) return null;

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return null;

	const end = new Date(now);
	end.setHours(hours, minutes, 0, 0);
	// setDate rather than adding a day of milliseconds, so the wall-clock time
	// survives a clock change.
	if (end.getTime() <= now) end.setDate(end.getDate() + 1);
	return end.getTime();
}

/**
 * Where each whole hour falls inside the day, as a fraction from 0 to 1, and
 * the clock hour to label it with.
 *
 * This is what makes the day readable: without real times the track carries no
 * information and the fill is the only signal. With them it is a map of the
 * actual day.
 *
 * Steps by calendar hour rather than by adding an hour of milliseconds, so a
 * clock change does not shift every label, and a span that crosses midnight
 * carries on into the next day's hours.
 */
export function hourMarks(
	startedAt: number,
	endsAt: number
): { fraction: number; label: string }[] {
	const total = endsAt - startedAt;
	if (total <= 0) return [];

	const marks: { fraction: number; label: string }[] = [];
	const cursor = new Date(startedAt);
	cursor.setMinutes(0, 0, 0);
	cursor.setHours(cursor.getHours() + 1);

	while (cursor.getTime() < endsAt) {
		marks.push({
			fraction: (cursor.getTime() - startedAt) / total,
			label: String(cursor.getHours()).padStart(2, '0')
		});
		cursor.setHours(cursor.getHours() + 1);
	}

	return marks;
}
