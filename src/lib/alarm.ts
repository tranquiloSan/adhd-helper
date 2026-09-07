/** How long between re-sounds while the alarm goes unacknowledged. */
const REPEAT_MS = 20_000;

const BEEPS = 3;
const BEEP_SPACING_S = 0.45;
const BEEP_LENGTH_S = 0.4;

/**
 * The finished-timer alarm: a generated tone plus a desktop notification,
 * repeating until acknowledged.
 *
 * A single chime is the main way a timer fails someone in hyperfocus, hence the
 * repeat. Sound is also the only channel that reaches a buried tab — a page
 * cannot raise its own window — so the notification is a supplement, not the
 * primary signal.
 */
export class Alarm {
	#context: AudioContext | null = null;
	#repeatId: ReturnType<typeof setInterval> | null = null;
	#notification: Notification | null = null;

	/** Must be called from a user gesture, or browsers reject it. */
	static async requestPermission(): Promise<void> {
		if (typeof Notification === 'undefined') return;
		if (Notification.permission !== 'default') return;
		try {
			await Notification.requestPermission();
		} catch {
			// Denied or unsupported; the alarm still sounds.
		}
	}

	get isSounding(): boolean {
		return this.#repeatId !== null;
	}

	/** Sounds and notifies exactly once, with no repeat. End of day is when you
	 *  least want a dismiss-me alarm sitting on top of a thought. */
	once(message: string, title: string): void {
		this.#sound();
		this.#notify(message, title);
	}

	start(message: string): void {
		if (this.#repeatId !== null) return;

		this.#sound();
		this.#notify(message, 'Time is up');
		this.#repeatId = setInterval(() => this.#sound(), REPEAT_MS);
	}

	stop(): void {
		if (this.#repeatId !== null) {
			clearInterval(this.#repeatId);
			this.#repeatId = null;
		}
		this.#notification?.close();
		this.#notification = null;
	}

	#notify(message: string, title: string): void {
		if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
		try {
			// A tag means a repeat replaces the previous notification instead of
			// stacking up a column of them.
			this.#notification = new Notification(title, {
				body: message,
				tag: 'adhd-helper:timer',
				requireInteraction: true
			});
		} catch {
			// Some platforms reject constructed notifications; ignore.
		}
	}

	#sound(): void {
		const context = this.#ensureContext();
		if (context === null) return;

		// Autoplay policy suspends a context created without a gesture — which is
		// exactly the case when a timer expired while the tab was closed. Resuming
		// is best-effort; the notification and the screen still report the finish.
		if (context.state === 'suspended') void context.resume().catch(() => {});

		for (let i = 0; i < BEEPS; i++) {
			this.#beep(context, context.currentTime + i * BEEP_SPACING_S);
		}
	}

	#beep(context: AudioContext, at: number): void {
		const oscillator = context.createOscillator();
		const gain = context.createGain();

		oscillator.type = 'sine';
		oscillator.frequency.value = 880;

		// Ramped rather than switched, so it doesn't click.
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(0.25, at + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + BEEP_LENGTH_S);

		oscillator.connect(gain).connect(context.destination);
		oscillator.start(at);
		oscillator.stop(at + BEEP_LENGTH_S);
	}

	#ensureContext(): AudioContext | null {
		if (this.#context !== null) return this.#context;
		try {
			this.#context = new AudioContext();
			return this.#context;
		} catch {
			return null;
		}
	}
}
