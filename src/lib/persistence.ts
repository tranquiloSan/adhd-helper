import { FACE_OPTIONS, type FaceMinutes } from './dial-geometry';
import type { TimerSnapshot, TimerStatus } from './timer.svelte';

const KEY = 'adhd-helper:timer';

const STATUSES: TimerStatus[] = ['idle', 'running', 'paused', 'finished'];

/** Stored data is untrusted: it may be from an older version, hand-edited, or
 *  another site's key collision. Validate before believing it. */
function isSnapshot(value: unknown): value is TimerSnapshot {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;

	return (
		typeof v.durationMs === 'number' &&
		Number.isFinite(v.durationMs) &&
		(v.endsAt === null || (typeof v.endsAt === 'number' && Number.isFinite(v.endsAt))) &&
		typeof v.pausedRemainingMs === 'number' &&
		Number.isFinite(v.pausedRemainingMs) &&
		typeof v.status === 'string' &&
		STATUSES.includes(v.status as TimerStatus)
	);
}

/**
 * Every access is wrapped: in a private window, or with site data blocked, the
 * `localStorage` accessor itself throws rather than returning null.
 */
export function loadSnapshot(): TimerSnapshot | null {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		return isSnapshot(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function saveSnapshot(snapshot: TimerSnapshot): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(snapshot));
	} catch {
		// Persistence is a convenience; losing it must not break the timer.
	}
}

const FACE_KEY = 'adhd-helper:face';

/** The chosen dial range is a preference, not timer state, so it is stored apart
 *  from the snapshot and survives a reset. */
export function loadFaceMinutes(): FaceMinutes | null {
	try {
		const raw = localStorage.getItem(FACE_KEY);
		if (raw === null) return null;
		const parsed = Number(raw);
		return FACE_OPTIONS.find((option) => option === parsed) ?? null;
	} catch {
		return null;
	}
}

export function saveFaceMinutes(faceMinutes: FaceMinutes): void {
	try {
		localStorage.setItem(FACE_KEY, String(faceMinutes));
	} catch {
		// Preference only; losing it must not break the timer.
	}
}
