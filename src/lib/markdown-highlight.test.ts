import { describe, expect, it } from 'vitest';
import { highlight, linkUrlAt, openableUrl, type Token } from './markdown-highlight';

const joined = (tokens: Token[]) => tokens.map((token) => token.text).join('');
const kindsOf = (source: string, kind: Token['kind']) =>
	highlight(source)
		.filter((token) => token.kind === kind)
		.map((token) => token.text);

describe('highlight preserves the source exactly', () => {
	// The tokens are painted behind a transparent textarea. Lose or reorder a
	// single character and the caret drifts away from the letters.
	const samples = [
		'',
		'plain text',
		'# A heading',
		'###### deep',
		'#not a heading',
		'- a list item\n- another',
		'1. first\n2. second',
		'> quoted',
		'**bold** and *italic* and _also italic_',
		'`code` and **`both`**',
		'[label](https://example.com)',
		'trailing spaces   \n\n\nblank lines',
		'*unclosed and **mixed* markers',
		'  - indented item',
		'emoji and accents: café \u{1F345}'
	];

	for (const sample of samples) {
		it(`round-trips ${JSON.stringify(sample.slice(0, 32))}`, () => {
			expect(joined(highlight(sample))).toBe(sample);
		});
	}
});

describe('highlight recognises constructs', () => {
	it('marks a heading and keeps its hashes visible', () => {
		expect(kindsOf('## Title', 'marker')).toContain('##');
		expect(kindsOf('## Title', 'heading')).toContain('Title');
	});

	it('does not treat a hash without a heading shape as one', () => {
		expect(kindsOf('#tag', 'heading')).toEqual([]);
	});

	it('prefers a double star to a single one', () => {
		expect(kindsOf('**strong**', 'strong')).toEqual(['strong']);
		expect(kindsOf('**strong**', 'emphasis')).toEqual([]);
	});

	it('keeps code spans out of other constructs', () => {
		expect(kindsOf('`a *b* c`', 'code')).toEqual(['a *b* c']);
		expect(kindsOf('`a *b* c`', 'emphasis')).toEqual([]);
	});

	it('splits a link into label and target', () => {
		expect(kindsOf('[docs](https://x.dev)', 'link')).toEqual(['docs']);
		expect(kindsOf('[docs](https://x.dev)', 'url')).toEqual(['https://x.dev']);
	});

	it('marks list bullets and quote arrows without swallowing the text', () => {
		expect(kindsOf('- item', 'marker')).toEqual(['- ']);
		expect(kindsOf('> said', 'quote')).toEqual(['said']);
	});
});

describe('linkUrlAt', () => {
	const source = 'see [docs](https://example.com/a) and more';

	it('finds the url from the label you can read', () => {
		expect(linkUrlAt(source, source.indexOf('docs'))).toBe('https://example.com/a');
	});

	it('finds it from the url itself', () => {
		expect(linkUrlAt(source, source.indexOf('example'))).toBe('https://example.com/a');
	});

	it('finds nothing in ordinary text', () => {
		expect(linkUrlAt(source, 1)).toBeNull();
	});

	it('leaves a link inside a code span alone, exactly as the styling does', () => {
		const code = 'try `[a](https://example.com)` first';
		expect(linkUrlAt(code, code.indexOf('example'))).toBeNull();
	});

	it('picks the link that was clicked, not the first one', () => {
		const two = '[one](https://a.test) [two](https://b.test)';
		expect(linkUrlAt(two, two.indexOf('two'))).toBe('https://b.test');
	});
});

describe('openableUrl', () => {
	it('passes the schemes worth opening', () => {
		expect(openableUrl('https://example.com')).toBe('https://example.com');
		expect(openableUrl('http://example.com')).toBe('http://example.com');
		expect(openableUrl('mailto:someone@example.test')).toBe('mailto:someone@example.test');
	});

	it('refuses a scheme that would run code, which is why it checks at all', () => {
		expect(openableUrl('javascript:alert(1)')).toBeNull();
		expect(openableUrl('data:text/html,hi')).toBeNull();
	});

	it('refuses a bare domain rather than guessing a scheme for it', () => {
		expect(openableUrl('example.com')).toBeNull();
	});

	it('refuses nothing at all', () => {
		expect(openableUrl(null)).toBeNull();
		expect(openableUrl('')).toBeNull();
		expect(openableUrl('   ')).toBeNull();
	});
});
