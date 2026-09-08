import { describe, expect, it } from 'vitest';
import {
	DIAL_CENTRE,
	FACE_MINUTES,
	RIM_SEGMENTS,
	faceLayout,
	minutesFromPoint,
	polarPoint,
	rimSegmentPath,
	wedgePath
} from './dial-geometry';

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
	it('marks every minute of the hour face, numbering every fifth', () => {
		const { marks, numbers } = faceLayout();
		expect(marks).toHaveLength(60);
		expect(numbers.map((n) => n.minutes)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
	});

	it('puts the last number at the top of the dial', () => {
		const { numbers } = faceLayout();
		expect(numbers.at(-1)?.degrees).toBe(360);
	});

	it('numbers as many positions as the rim has hour slots, so the two line up', () => {
		expect(faceLayout().numbers).toHaveLength(RIM_SEGMENTS);
	});

	it('marks every fifth minute as major, which is where the numbers go', () => {
		const { marks } = faceLayout();
		expect(marks.filter((mark) => mark.major).map((mark) => mark.minutes)).toEqual([
			5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60
		]);
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

describe('rimSegmentPath', () => {
	/** Pull the two endpoints out of "M x y A r r 0 0 1 x y". */
	const endpoints = (path: string) => {
		const n = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
		return { start: { x: n[0], y: n[1] }, end: { x: n[7], y: n[8] } };
	};

	it('starts the first slot at the top of the dial', () => {
		const { start } = endpoints(rimSegmentPath(0, RADIUS, C, 0));
		expect(start.x).toBeCloseTo(C);
		expect(start.y).toBeCloseTo(C - RADIUS);
	});

	it('runs clockwise, so a slot ends further round than it starts', () => {
		const { start, end } = endpoints(rimSegmentPath(0, RADIUS, C, 0));
		expect(end.x).toBeGreaterThan(start.x);
	});

	it('is an open arc, never the long way round', () => {
		const path = rimSegmentPath(5, RADIUS, C);
		expect(path).toContain('A');
		expect(path).not.toContain('Z');
		// Large-arc flag: a twelfth of a circle can never need it.
		expect(path).toMatch(/A \d+ \d+ 0 0 1 /);
	});

	it('leaves a gap either side rather than eating into the next slot', () => {
		const gapless = endpoints(rimSegmentPath(0, RADIUS, C, 0));
		const gapped = endpoints(rimSegmentPath(0, RADIUS, C, 6));

		// Both ends pulled inwards by half the gap, so the slot stays centred.
		expect(gapped.start.x).toBeGreaterThan(gapless.start.x);
		expect(gapped.end.x).toBeLessThan(gapless.end.x);
	});

	it('closes the circle: the last slot ends where the first one starts', () => {
		const first = endpoints(rimSegmentPath(0, RADIUS, C, 0));
		const last = endpoints(rimSegmentPath(RIM_SEGMENTS - 1, RADIUS, C, 0));
		expect(last.end.x).toBeCloseTo(first.start.x);
		expect(last.end.y).toBeCloseTo(first.start.y);
	});

	it('divides the hour face into as many slots as it has numbers', () => {
		expect(360 / RIM_SEGMENTS).toBe(30);
		expect(FACE_MINUTES / RIM_SEGMENTS).toBe(5);
	});
});
