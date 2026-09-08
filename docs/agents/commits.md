# Commit messages

The log is the only place where a decision that left no trace in the code still
exists. A diff says what the code is now; it cannot say what it was, what else
was tried, or what the change cost. That is the message's job, and it is why
these are longer than most.

Read a few before writing one: `git log 4b589d0 -1`, `git log 62a30d8 -1`.

## The subject

A plain statement of what changed, in the imperative, sentence case, no full
stop. Between about forty and seventy characters - long enough to be specific,
which matters more here than fitting a terminal.

Two habits are worth keeping deliberately.

**Name the rejected alternative when there is one.** The contrast is usually the
whole point of the change, and it belongs where it will be read.

- `Mark a stretched dial at a round interval, not in twelfths`
- `Snap a dragged end to the clock, not to the moment you opened the page`
- `Show the markdown as a sample note rather than a row of chips`

**Join two related changes with ", and" rather than splitting a coherent change
in half.** If the second half only makes sense because of the first, they are
one commit.

- `Grow the dial to the next round face, and keep it draggable`
- `Let a day end after midnight, and set it by dragging`

Avoid subjects that restate the diff. `Update Dial.svelte` and `Fix bug` say
nothing a reader could not already see.

## The body

Prose, wrapped at eighty columns, blank line between paragraphs. **No bullet
lists** - the log has none, and a list of fragments loses exactly the connective
reasoning the body exists to carry. If a point needs a sentence, give it one.

Roughly:

- **What was wrong**, concretely, and how it showed up. If it was reported in
  use, say so - that is the strongest kind of evidence this project has.
- **Why the fix is this one.** Name the alternatives and what each cost. A
  rejected option with its reason is worth more than a description of the
  chosen one, because the rejected one is what someone will otherwise try again.
- **What it costs.** Every real change gives something up. Say what.
- **Anything swept up along the way**, in a closing sentence rather than left
  for a reader to find: _"That also settles the dial reporting an
  aria-valuenow of 120 against an aria-valuemax of 60. Drops a type import
  nothing used."_

Past tense for how things were, present for how they are now.

Point at things by name: `docs/adr/0005-the-dial-face-is-fixed-at-an-hour.md`,
or a commit like `e3a1e03`. Quote the old wording when the change is to prose.

## Issues

`Closes #6.` on its own line at the end. Issues carry the long-lived decisions
this repo parks; see `issue-tracker.md`.

## Where this stops

A message should not repeat what an ADR already says at length. When a decision
is big enough to have its own file in `docs/adr/`, the commit says what changed
and points at the ADR for the argument.

And it should be proportionate. A typo fix needs a subject and nothing else.
