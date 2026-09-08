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

/**
 * A duration in the fewest characters that still read as one: "45m", "4h".
 *
 * For places with no room for a phrase - the mark saying a day runs off the end
 * of its track. Rounded to the hour once past one, because it answers roughly
 * how far beyond and the clock above answers it exactly.
 */
export function formatCompact(ms: number): string {
	const minutes = Math.round(Math.max(0, ms) / 60_000);
	if (minutes < 60) return `${minutes}m`;
	return `${Math.round(minutes / 60)}h`;
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Whole days apart by the calendar rather than by elapsed time, so 23:50 and
 *  00:10 are a day apart even though twenty minutes separate them. */
function calendarDaysApart(from: number, to: number): number {
	const a = new Date(from);
	const b = new Date(to);
	a.setHours(0, 0, 0, 0);
	b.setHours(0, 0, 0, 0);
	return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * A clock time, qualified with the day whenever it is not today.
 *
 * A bare time is a lie outside today: "18:00" beside "15:00:00 elapsed" reads
 * as this evening. Used where a time can legitimately belong to another day -
 * a stretch that ran overnight, or a day that ends after midnight - while
 * `formatTimeOfDay` stays bare for times known to be inside the span.
 */
export function formatTimeWithDay(timestamp: number, now: number = Date.now()): string {
	const time = formatTimeOfDay(timestamp);
	const days = calendarDaysApart(now, timestamp);

	if (days === 0) return time;
	if (days === -1) return `${time} yesterday`;
	if (days === 1) return `${time} tomorrow`;

	const date = new Date(timestamp);
	// Beyond a week the weekday name repeats, so it stops identifying a day.
	if (Math.abs(days) < 7) return `${WEEKDAYS[date.getDay()]} ${time}`;
	return `${time} on ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
