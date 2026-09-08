import { describe, expect, it } from 'vitest';
import { formatCompact, formatTimeWithDay } from './format';

/** An arbitrary Wednesday, built locally so the expectations do not depend on
 *  the machine's timezone. */
function at(day: number, hours: number, minutes = 0): number {
	return new Date(2026, 8, day, hours, minutes, 0, 0).getTime();
}

describe('formatTimeWithDay', () => {
	const now = at(9, 14, 30);

	it('leaves a time today bare', () => {
		expect(formatTimeWithDay(at(9, 9, 5), now)).toBe('09:05');
	});

	it('names yesterday, for a stretch that ran overnight', () => {
		expect(formatTimeWithDay(at(8, 18, 0), now)).toBe('18:00 yesterday');
	});

	it('names tomorrow, for a day that ends after midnight', () => {
		expect(formatTimeWithDay(at(10, 3, 0), now)).toBe('03:00 tomorrow');
	});

	it('is by the calendar, not by the hours between', () => {
		// Twenty minutes apart, but a different day, which is the case a bare
		// time gets wrong.
		expect(formatTimeWithDay(at(10, 0, 10), at(9, 23, 50))).toBe('00:10 tomorrow');
	});

	it('uses the weekday within the week', () => {
		expect(formatTimeWithDay(at(12, 18, 0), now)).toBe('Sat 18:00');
	});

	it('falls back to the date once a weekday stops identifying a day', () => {
		expect(formatTimeWithDay(at(17, 18, 0), now)).toBe('18:00 on 17 Sep');
	});
});

describe('formatCompact', () => {
	it('gives minutes below an hour', () => {
		expect(formatCompact(45 * 60_000)).toBe('45m');
		expect(formatCompact(59 * 60_000)).toBe('59m');
	});

	it('rounds to the hour above one, since the clock has the exact figure', () => {
		expect(formatCompact(60 * 60_000)).toBe('1h');
		expect(formatCompact(4 * 3_600_000 + 5 * 60_000)).toBe('4h');
		expect(formatCompact(4 * 3_600_000 + 40 * 60_000)).toBe('5h');
	});

	it('never goes negative', () => {
		expect(formatCompact(-5000)).toBe('0m');
	});
});
