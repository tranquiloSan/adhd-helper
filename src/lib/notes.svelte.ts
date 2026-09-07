export type NotesSnapshot = {
	text: string;
	/** When the text last changed, or null while empty. Drives the age hint. */
	updatedAt: number | null;
};

/**
 * One box for the thought that vanishes if it is not written down immediately.
 * Working-memory offload, which is not a task list - tasks live in the work
 * issue tracker.
 *
 * Nothing is ever cleared automatically: auto-clearing would eventually destroy
 * something that mattered, with no way back. The age hint exists so a pile
 * cannot form silently instead.
 */
export class Notes {
	text = $state('');
	updatedAt = $state<number | null>(null);

	get isEmpty(): boolean {
		return this.text.trim() === '';
	}

	set(text: string, now: number = Date.now()): void {
		this.text = text;
		this.updatedAt = text.trim() === '' ? null : now;
	}

	clear(now: number = Date.now()): void {
		this.set('', now);
	}

	toSnapshot(): NotesSnapshot {
		return { text: this.text, updatedAt: this.updatedAt };
	}

	restore(snapshot: NotesSnapshot): void {
		this.text = snapshot.text;
		this.updatedAt = snapshot.updatedAt;
	}
}

/** Shared, because the day countdown's end-of-day nudge needs to know from the
 *  layout whether there is anything in here. */
export const notes = new Notes();
