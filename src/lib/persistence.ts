import { FACE_LADDER, type FaceMinutes } from './dial-geometry';
import type { DaySnapshot, DayStatus } from './day.svelte';
import type { ElapsedSnapshot, ElapsedStatus } from './elapsed.svelte';
import type { NotesSnapshot } from './notes.svelte';
import type { TimerSnapshot, TimerStatus } from './timer.svelte';

const KEYS = {
	timer: 'adhd-helper:timer',
	face: 'adhd-helper:face',
	elapsed: 'adhd-helper:elapsed',
	// Bumped: an earlier version wrote this on mount, so stored values were
	// defaults nobody chose and the default could never be improved on.
	threshold: 'adhd-helper:elapsed-threshold-2',
	notes: 'adhd-helper:notes',
	day: 'adhd-helper:day',
	endTime: 'adhd-helper:day-end-time'
} as const;

/**
 * Every access is wrapped: in a private window, or with site data blocked, the
 * `localStorage` accessor itself throws rather than returning null.
 */
function read<T>(key: string, parse: (value: unknown) => T | null): T | null {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return null;
		return parse(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
}

function write(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Persistence is a convenience; losing it must not break a tool.
	}
}

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

const isNullableNumber = (value: unknown): value is number | null =>
	value === null || isFiniteNumber(value);

const TIMER_STATUSES: TimerStatus[] = ['idle', 'running', 'paused', 'finished'];
const ELAPSED_STATUSES: ElapsedStatus[] = ['idle', 'running', 'paused'];

// Stored data is untrusted: it may be from an older version, hand-edited, or a
// key collision. Validate before believing it.
export function loadSnapshot(): TimerSnapshot | null {
	return read(KEYS.timer, (value) => {
		if (typeof value !== 'object' || value === null) return null;
		const v = value as Record<string, unknown>;
		const valid =
			isFiniteNumber(v.durationMs) &&
			isNullableNumber(v.endsAt) &&
			isFiniteNumber(v.pausedRemainingMs) &&
			TIMER_STATUSES.includes(v.status as TimerStatus);
		return valid ? (v as unknown as TimerSnapshot) : null;
	});
}

export function saveSnapshot(snapshot: TimerSnapshot): void {
	write(KEYS.timer, snapshot);
}

/** The chosen dial range is a preference, not timer state, so it is stored
 *  apart from the snapshot and survives a reset. Validated against the whole
 *  ladder, not just the two buttons: a face grown to fit a typed length is a
 *  face like any other, and rejecting it would silently drop back to 30. */
export function loadFaceMinutes(): FaceMinutes | null {
	return read(KEYS.face, (value) => FACE_LADDER.find((option) => option === value) ?? null);
}

export function saveFaceMinutes(faceMinutes: FaceMinutes): void {
	write(KEYS.face, faceMinutes);
}

export function loadElapsed(): ElapsedSnapshot | null {
	return read(KEYS.elapsed, (value) => {
		if (typeof value !== 'object' || value === null) return null;
		const v = value as Record<string, unknown>;
		const valid =
			isNullableNumber(v.startedAt) &&
			isFiniteNumber(v.accumulatedMs) &&
			ELAPSED_STATUSES.includes(v.status as ElapsedStatus);
		if (!valid) return null;

		// The break fields arrived after the first version shipped, so they are
		// defaulted rather than required. Requiring them would reject every
		// snapshot already in a browser and drop a stretch that is still
		// running - the one thing a reload is not allowed to do.
		return {
			status: v.status as ElapsedStatus,
			startedAt: v.startedAt as number | null,
			accumulatedMs: v.accumulatedMs as number,
			firstStartedAt: isNullableNumber(v.firstStartedAt) ? v.firstStartedAt : null,
			pausedAt: isNullableNumber(v.pausedAt) ? v.pausedAt : null,
			breakMs: isFiniteNumber(v.breakMs) ? v.breakMs : 0,
			breakCount: isFiniteNumber(v.breakCount) ? v.breakCount : 0
		};
	});
}

export function saveElapsed(snapshot: ElapsedSnapshot): void {
	write(KEYS.elapsed, snapshot);
}

export function loadThresholdMinutes(): number | null {
	return read(KEYS.threshold, (value) =>
		isFiniteNumber(value) && value > 0 ? Math.round(value) : null
	);
}

export function saveThresholdMinutes(minutes: number): void {
	write(KEYS.threshold, minutes);
}

export function loadNotes(): NotesSnapshot | null {
	return read(KEYS.notes, (value) => {
		if (typeof value !== 'object' || value === null) return null;
		const v = value as Record<string, unknown>;
		const valid = typeof v.text === 'string' && isNullableNumber(v.updatedAt);
		return valid ? (v as unknown as NotesSnapshot) : null;
	});
}

export function saveNotes(snapshot: NotesSnapshot): void {
	write(KEYS.notes, snapshot);
}

const DAY_STATUSES: DayStatus[] = ['idle', 'running', 'over'];

export function loadDay(): DaySnapshot | null {
	return read(KEYS.day, (value) => {
		if (typeof value !== 'object' || value === null) return null;
		const v = value as Record<string, unknown>;
		const valid =
			isNullableNumber(v.startedAt) &&
			isNullableNumber(v.endsAt) &&
			typeof v.announced === 'boolean' &&
			DAY_STATUSES.includes(v.status as DayStatus);
		return valid ? (v as unknown as DaySnapshot) : null;
	});
}

export function saveDay(snapshot: DaySnapshot): void {
	write(KEYS.day, snapshot);
}

/** Last end time used, so tomorrow's prefill is already right. */
export function loadEndTime(): string | null {
	return read(KEYS.endTime, (value) =>
		typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : null
	);
}

export function saveEndTime(value: string): void {
	write(KEYS.endTime, value);
}
