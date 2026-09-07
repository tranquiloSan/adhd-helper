export type TokenKind =
	| 'text'
	/** Syntax characters themselves, dimmed but never hidden. */
	| 'marker'
	| 'heading'
	| 'strong'
	| 'emphasis'
	| 'code'
	| 'quote'
	| 'link'
	| 'url';

export type Token = { text: string; kind: TokenKind };

/**
 * How each kind is painted.
 *
 * Lives here rather than in the editor so that anything showing what the
 * editor does - the hint on the notes page - paints it identically.
 *
 * Only properties that leave glyph positions alone: colour, stroke, underline,
 * background. The editor paints these behind a transparent textarea, and weight
 * or size would change advance widths and slide the text out from under the
 * caret.
 */
export const TOKEN_CLASSES: Record<TokenKind, string> = {
	text: '',
	marker: 'text-neutral-600',
	heading: 'text-neutral-50 [-webkit-text-stroke:0.4px_currentColor]',
	strong: 'text-neutral-100 [-webkit-text-stroke:0.35px_currentColor]',
	emphasis: 'text-amber-200/90',
	code: 'rounded bg-neutral-800 text-teal-300',
	quote: 'text-neutral-400',
	link: 'text-sky-300 underline decoration-sky-300/40',
	url: 'text-neutral-500'
};

/**
 * Inline constructs, matched in one pass so earlier ones win: code spans
 * protect their contents, and `**` is tried before `*`.
 */
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]*\]\([^)\n]*\))/g;

// The hashes must be followed by whitespace or the line's end, so "#tag" is
// not a heading.
const HEADING = /^(#{1,6})(?=\s|$)(\s*)(.*)$/;
const QUOTE = /^(>\s?)(.*)$/;
const LIST = /^(\s*)([-*+]\s|\d+\.\s)(.*)$/;

function push(tokens: Token[], text: string, kind: TokenKind): void {
	if (text !== '') tokens.push({ text, kind });
}

function inline(source: string, tokens: Token[], base: TokenKind): void {
	let last = 0;

	for (const match of source.matchAll(INLINE)) {
		const at = match.index;
		push(tokens, source.slice(last, at), base);
		const [whole] = match;

		if (whole.startsWith('`')) {
			push(tokens, '`', 'marker');
			push(tokens, whole.slice(1, -1), 'code');
			push(tokens, '`', 'marker');
		} else if (whole.startsWith('**')) {
			push(tokens, '**', 'marker');
			push(tokens, whole.slice(2, -2), 'strong');
			push(tokens, '**', 'marker');
		} else if (whole.startsWith('[')) {
			const split = whole.indexOf('](');
			push(tokens, '[', 'marker');
			push(tokens, whole.slice(1, split), 'link');
			push(tokens, '](', 'marker');
			push(tokens, whole.slice(split + 2, -1), 'url');
			push(tokens, ')', 'marker');
		} else {
			// A single * or _ pair.
			push(tokens, whole[0], 'marker');
			push(tokens, whole.slice(1, -1), 'emphasis');
			push(tokens, whole[0], 'marker');
		}

		last = at + whole.length;
	}

	push(tokens, source.slice(last), base);
}

/**
 * Split markdown source into styled tokens, leaving every character in place.
 *
 * The tokens are painted behind a transparent textarea, so the two must agree
 * character for character: `tokens.map((t) => t.text).join('')` is always the
 * input exactly. Nothing is hidden or reordered, and the styling a token may
 * carry is limited to what does not move glyphs - colour, stroke, underline,
 * background. Weight and size would change advance widths and drift the caret
 * away from the letters.
 */
export function highlight(source: string): Token[] {
	const tokens: Token[] = [];
	const lines = source.split('\n');

	lines.forEach((line, index) => {
		const heading = HEADING.exec(line);
		const quote = QUOTE.exec(line);
		const list = LIST.exec(line);

		if (heading !== null) {
			push(tokens, heading[1], 'marker');
			push(tokens, heading[2], 'heading');
			inline(heading[3], tokens, 'heading');
		} else if (quote !== null) {
			push(tokens, quote[1], 'marker');
			inline(quote[2], tokens, 'quote');
		} else if (list !== null) {
			push(tokens, list[1], 'text');
			push(tokens, list[2], 'marker');
			inline(list[3], tokens, 'text');
		} else {
			inline(line, tokens, 'text');
		}

		if (index < lines.length - 1) push(tokens, '\n', 'text');
	});

	return tokens;
}

/**
 * The URL of the link at a character offset, or null if there is no link there.
 *
 * Walks the tokens rather than re-scanning with a regex of its own, so what is
 * clickable is exactly what was painted as a link: a `[a](b)` inside backticks
 * is a code span, and stays one.
 *
 * The label and the URL are both live; the brackets between them are not, which
 * keeps this to a lookahead of one token.
 */
export function linkUrlAt(source: string, index: number): string | null {
	const tokens = highlight(source);
	let offset = 0;

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		const end = offset + token.text.length;

		if (index >= offset && index <= end) {
			if (token.kind === 'url') return token.text;
			if (token.kind === 'link') {
				return tokens.slice(i + 1).find((next) => next.kind === 'url')?.text ?? null;
			}
		}

		offset = end;
	}

	return null;
}

/** Schemes worth opening from a box you can paste anything into. */
const OPENABLE = ['http:', 'https:', 'mailto:'];

/**
 * A URL only if it is one we will open.
 *
 * The notes box holds whatever you pasted, so the scheme is checked rather than
 * assumed - `javascript:` in a link is the reason this is not just a click
 * through. A bare `example.com` is not opened either: guessing a scheme for
 * text that merely looks like a domain would eventually open the wrong thing.
 */
export function openableUrl(url: string | null): string | null {
	if (url === null) return null;
	try {
		return OPENABLE.includes(new URL(url.trim()).protocol) ? url.trim() : null;
	} catch {
		return null;
	}
}
