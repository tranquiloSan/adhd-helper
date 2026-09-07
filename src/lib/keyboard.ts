/**
 * Whether a key event is someone typing, and so must not trigger a page
 * shortcut.
 *
 * Shared because getting it wrong is invisible until it bites: the timer's
 * space bar once paused the countdown while a space was being typed into the
 * dump, because the guard knew about inputs but not textareas.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}
