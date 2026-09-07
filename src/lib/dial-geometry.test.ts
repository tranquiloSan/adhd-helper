import { describe, expect, it } from 'vitest';
import { DIAL_CENTRE, minutesFromPoint, wedgePath } from './dial-geometry';

const RADIUS = 100;
const C = DIAL_CENTRE;

describe('wedgePath', () => {
	it('draws nothing when no time remains', () => {
		expect(wedgePath(0, RADIUS)).toBe('');
	});

	it('draws a full disc as two arcs, since one 360 degree arc renders nothing', () => {
		const path = wedgePath(1, RADIUS);
		expect(path.match(/A /g)).toHaveLength(2);
	});

	it('ends at 3 o_clock for a quarter, taking the short way round', () => {
		const path = wedgePath(0.25, RADIUS);
		// Sweeping 90 degrees clockwise from the top lands at (centre + r, centre).
		expect(path).toContain(`1 ${C + RADIUS} ${C}`);
		expect(path).toContain('0 0 1');
	});

	it('takes the long way round past a half', () => {
		expect(wedgePath(0.75, RADIUS)).toContain('0 1 1');
	});

	it('clamps a fraction above one to a full disc', () => {
		expect(wedgePath(2, RADIUS)).toBe(wedgePath(1, RADIUS));
	});
});

describe('minutesFromPoint', () => {
	it('reads the top of the dial as a full face, not zero', () => {
		expect(minutesFromPoint(C, C - 100, 60)).toBe(60);
	});

	it('reads clockwise: right is a quarter, bottom a half, left three quarters', () => {
		expect(minutesFromPoint(C + 100, C, 60)).toBe(15);
		expect(minutesFromPoint(C, C + 100, 60)).toBe(30);
		expect(minutesFromPoint(C - 100, C, 60)).toBe(45);
	});

	it('snaps to whole minutes', () => {
		// Two degrees past the top is 0.33 of a minute, which rounds back to the top.
		const twoDegrees = (2 * Math.PI) / 180;
		const x = C + 100 * Math.sin(twoDegrees);
		const y = C - 100 * Math.cos(twoDegrees);
		expect(minutesFromPoint(x, y, 60)).toBe(60);
	});

	it('ignores distance from the centre, so a drag off the disc still tracks', () => {
		expect(minutesFromPoint(C + 900, C, 60)).toBe(minutesFromPoint(C + 10, C, 60));
	});
});
