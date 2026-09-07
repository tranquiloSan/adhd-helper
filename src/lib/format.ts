/**
 * Format a millisecond duration as a clock string: `m:ss`, or `h:mm:ss` once the
 * duration reaches an hour.
 *
 * Rounds up, so a timer set to 25 minutes reads "25:00" on the first frame
 * rather than flicking straight to 24:59.
 */
export function formatDuration(ms: number): string {
	const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
	const seconds = totalSeconds % 60;
	const minutes = Math.floor(totalSeconds / 60) % 60;
	const hours = Math.floor(totalSeconds / 3600);

	const pad = (n: number) => String(n).padStart(2, '0');
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Format a duration as a rough phrase, for "finished 12 minutes ago". */
export function formatApproximate(ms: number): string {
	const minutes = Math.round(ms / 60_000);
	if (minutes < 1) return 'less than a minute';
	if (minutes === 1) return '1 minute';
	if (minutes < 60) return `${minutes} minutes`;

	const hours = Math.round(minutes / 60);
	return hours === 1 ? '1 hour' : `${hours} hours`;
}

/** How long something has sat untouched, for "untouched for 3 days". */
export function formatAge(ms: number): string {
	const hours = Math.floor(ms / 3_600_000);
	if (hours < 1) return 'less than an hour';
	if (hours < 24) return hours === 1 ? 'an hour' : `${hours} hours`;

	const days = Math.floor(hours / 24);
	return days === 1 ? 'a day' : `${days} days`;
}

/** A timestamp as a 24-hour clock time, zero-padded. */
export function formatTimeOfDay(timestamp: number): string {
	const date = new Date(timestamp);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
