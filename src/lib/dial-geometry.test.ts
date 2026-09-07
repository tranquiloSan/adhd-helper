import { describe, expect, it } from 'vitest';
import { DIAL_CENTRE, faceLayout, minutesFromPoint, polarPoint, wedgePath } from './dial-geometry';

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

describe('faceLayout', () => {
	it('marks every minute of a thirty minute face, numbering every fifth', () => {
		const { marks, numbers } = faceLayout(30);
		expect(marks).toHaveLength(30);
		expect(numbers.map((n) => n.minutes)).toEqual([5, 10, 15, 20, 25, 30]);
	});

	it('marks every minute of an hour face, numbering every fifth', () => {
		const { marks, numbers } = faceLayout(60);
		expect(marks).toHaveLength(60);
		expect(numbers.map((n) => n.minutes)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
	});

	it('puts the last number at the top of the dial', () => {
		const { numbers } = faceLayout(30);
		expect(numbers.at(-1)?.degrees).toBe(360);
	});

	it('drops per-minute detail past an hour, where it would be unreadable', () => {
		const { marks } = faceLayout(90);
		expect(marks.length).toBeLessThan(90);
		expect(marks.every((mark) => mark.major)).toBe(true);
	});

	it('numbers a stretched face at a round interval, never a fraction', () => {
		expect(faceLayout(90).numbers.map((n) => n.label)).toEqual([
			'10',
			'20',
			'30',
			'40',
			'50',
			'60',
			'70',
			'80',
			'90'
		]);
		expect(faceLayout(150).numbers.map((n) => n.label)).toEqual([
			'15',
			'30',
			'45',
			'60',
			'75',
			'90',
			'105',
			'120',
			'135',
			'150'
		]);
	});

	it('coarsens the interval as the face grows, rather than crowding the rim', () => {
		const step = (faceMinutes: number) => faceLayout(faceMinutes).numbers[0].minutes;
		expect(step(61)).toBe(5);
		expect(step(90)).toBe(10);
		expect(step(150)).toBe(15);
		expect(step(200)).toBe(20);
		expect(step(600)).toBe(60);

		for (const faceMinutes of [61, 90, 100, 120, 150, 200, 360, 600, 1500]) {
			expect(faceLayout(faceMinutes).numbers.length).toBeLessThanOrEqual(12);
		}
	});

	it('puts the last number at the top when the length is a multiple of the interval', () => {
		expect(faceLayout(120).numbers.at(-1)?.degrees).toBe(360);
	});

	it('leaves the top unnumbered otherwise, since the clock already has the total', () => {
		const { numbers } = faceLayout(121);
		expect(numbers.at(-1)?.minutes).toBe(120);
		expect(numbers.at(-1)?.degrees).toBeLessThan(360);
	});
});

describe('polarPoint', () => {
	it('places zero degrees at the top', () => {
		const { x, y } = polarPoint(0, 100, 150);
		expect(x).toBeCloseTo(150);
		expect(y).toBeCloseTo(50);
	});

	it('runs clockwise', () => {
		expect(polarPoint(90, 100, 150).x).toBeCloseTo(250);
		expect(polarPoint(180, 100, 150).y).toBeCloseTo(250);
	});
});
