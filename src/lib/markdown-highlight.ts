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
