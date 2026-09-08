# The account is itemised in an overlay, and breaks still carry no description

`0002-elapsed-records-breaks-notes-are-not-timestamped.md` chose counters over a
list of intervals, and refused break descriptions outright. Both were parked with
a trigger. One has fired; the other was offered and turned down.

The list arrived first, and for a reason the parked issue did not predict. It
guessed the trigger would be needing a specific interval - that you were away
from 14:32 to 14:51. What was actually wanted was to see the shape of the day
after the fact, out of curiosity rather than need. That is a weaker case than the
one anticipated, and it is still enough, because the objection it has to clear
turned out not to apply.

The objection was that "Elapsed is a face you glance at, and a scrolling list of
rows turns a glance into reading". That is true of a list on the page, which is
what was being imagined. It is not true of a list behind a button. The face is
unchanged, the one-line summary beside it is unchanged, and the itemised version
is somewhere you go rather than something you are shown. The cost 0002 refused to
pay is simply not on the bill.

So the summary line and the overlay are the same account at two lengths - which
is why the overlay is not called a log. A log is a thing you keep. This is emptied
by a reset along with the counters, because it describes the stretch you are in
and nothing else. Persisting it across stretches would quietly turn Elapsed into
a record of work, which the glossary says the notes are pointedly not, and the
same reasoning holds here.

Descriptions stayed refused, and this time by the person who proposed them. Asked
directly what the labels were for, the answer was that the types were not
actually wanted - which is 0002's argument surviving contact with use rather than
being overridden by it. A period says when it ran and nothing else. The rows read
"worked" and "away" for that reason: they name a stretch of time, not a thing
that has been categorised.

One implementation decision is worth recording because the tidier version is the
wrong one. The counters remain the authority on the totals even though the list
could derive them. Deriving would mean the stored list becoming load-bearing, and
`loadElapsed` must never reject a snapshot for missing a field it did not used to
have - that would drop a stretch that is still running, which is the one thing a
reload is not allowed to do. The account defaults to empty when absent, exactly
as the break fields did before it, and a stretch from an earlier version keeps
running with nothing to itemise. The small redundancy is what buys that.

Revisit the derivation once no snapshot without an account can plausibly still be
in a browser. Revisit descriptions only if the rows start getting annotated
somewhere else, which would mean notes.
