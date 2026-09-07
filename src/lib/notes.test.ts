import { describe, expect, it } from 'vitest';
import { Notes } from './notes.svelte';
import { formatAge } from './format';

const T0 = 1_700_000_000_000;
const HOUR = 3_600_000;

describe('notes', () => {
	it('starts empty, with no age to report', () => {
		const notes = new Notes();
		expect(notes.isEmpty).toBe(true);
		expect(notes.updatedAt).toBeNull();
	});

	it('stamps the time when text is written', () => {
		const notes = new Notes();
		notes.set('ring the dentist', T0);
		expect(notes.isEmpty).toBe(false);
		expect(notes.updatedAt).toBe(T0);
	});

	it('treats whitespace as empty, so blank space reports no age', () => {
		const notes = new Notes();
		notes.set('   \n  ', T0);
		expect(notes.isEmpty).toBe(true);
		expect(notes.updatedAt).toBeNull();
	});

	it('round-trips through a snapshot', () => {
		const notes = new Notes();
		notes.set('two things', T0);

		const restored = new Notes();
		restored.restore(JSON.parse(JSON.stringify(notes.toSnapshot())));
		expect(restored.text).toBe('two things');
		expect(restored.updatedAt).toBe(T0);
	});

	it('clearing empties it and drops the age', () => {
		const notes = new Notes();
		notes.set('done with this', T0);
		notes.clear(T0 + HOUR);

		expect(notes.text).toBe('');
		expect(notes.updatedAt).toBeNull();
	});
});

describe('formatAge', () => {
	it('does not bother being precise under an hour', () => {
		expect(formatAge(20 * 60_000)).toBe('less than an hour');
	});

	it('counts hours, then days', () => {
		expect(formatAge(HOUR)).toBe('an hour');
		expect(formatAge(5 * HOUR)).toBe('5 hours');
		expect(formatAge(24 * HOUR)).toBe('a day');
		expect(formatAge(72 * HOUR)).toBe('3 days');
	});
});
