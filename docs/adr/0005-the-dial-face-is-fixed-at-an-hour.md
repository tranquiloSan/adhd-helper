# The dial's face is fixed at an hour, and whole hours move to a ring outside it

Supersedes `0004-dial-faces-are-a-ladder.md`.

The ladder was reported, after a day of use, to change how long a length feels.
That is not a preference, it is the failure the face exists to prevent, and 0004
says so itself: "on a 30-minute face 25 minutes covers 25/30 of the circle, so a
given amount of red always means the same amount of time".

Read that sentence against the ladder it was written to justify. It is only true
_within_ one face, and a ladder is a machine for changing faces. Half a circle is
15 minutes on a 30, 30 minutes on a 60 and an hour on a 120. A fitted face
destroys the property immediately, which is why 0004 rejected it; the ladder
destroys it slowly, which is why it took a day of use to notice. Both end in the
same place, and only the second one feels like it is working.

So the option was the one 0004 never weighed. It considered a face equal to the
length, two fixed sizes, and a ladder - and not a single face that never changes
at all, which is the opposite extreme from a fitted face rather than a weaker
version of it. Elapsed had been using exactly that since it shipped, so the two
dials in the same tool set disagreed about what half a circle meant, and only one
of them was telling the truth.

A face that never changes needs somewhere to put a length longer than itself.
The face prints a number every five minutes, so it carries twelve of them, and
twelve is also what a ring of hours wants: one slot per hour, its boundaries
landing on numbers the eye already uses, one lap of the ring being twelve hours.
The countdown's ring holds the time still to come and the elapsed display's holds
the time already spent - each pointing the same way as its own wedge, which is
the rule the wedge itself has always followed.

The ring reads the _whole_ time and fills the slot for the hour in progress as
that hour is spent, rather than ticking over one slot at a time. So the face and
the ring are a minute hand and an hour hand: the same time twice, at two scales,
an arrangement nobody has needed explaining since clocks acquired them. The
redundancy is the point. It is also what makes the ring worth having, because a
ring that moved once an hour would be a thing you checked rather than a thing you
saw.

Three details of the drawing were each got wrong first, so they are worth
recording. The ring is _outside_ the disc rather than on the disc's rim: on the
rim it is ink against a near-black page on its outer half and buried under a full
wedge on its inner half, and a full wedge is exactly the state a whole-hour timer
starts in, so the marks vanished at the moment they carried the most. The lit
part wears the _face's_ colour rather than the wedge's, which is the same problem
one step further in - a red ring on a red disc is legible only at its edge, and a
full slot means one more whole face of time anyway, so the face's colour is what
it should have been saying all along. And the unlit slots are _always_ drawn:
hiding them looked tidier and made the crossing worse, because the ring then
appeared and disappeared as an hour changed hands and two things moved at once.
An empty ring is not a count of nothing; it is the scale the count is read
against, and a ruler with nothing measured on it is still a ruler.

The cost is a discontinuity on the face. At 61 minutes it holds a one-minute
sliver; at 60 it is full. That happens once per hour crossed, and it is the same
discontinuity Elapsed has had since `e3a1e03`, where the wedge fills for an hour
and starts again - lived with daily and never remarked on. What keeps it reading
as an event rather than a glitch is that nothing else jumps with it: the ring
passes through 1.02, 1.00 and 0.98 slots without a step, and the clock underneath
counts straight through. The face rearranges while the two things either side of
it keep going, which is the whole reason the ring is continuous.

What this buys, beyond the calibration, is subtraction. The ladder needed eleven
rungs, a function to pick one, a second marking scheme for faces past an hour, a
rule for coarsening it, two buttons, a grown-face chip, a fit-back-down button, a
stored preference, a reconciliation between that preference and a stored length,
and four lines of copy explaining the whole arrangement to someone whose dial is
supposed to be glanceable. All of it is gone. A face with no state cannot be in
the wrong state.

Both halves are pointed at the same way, which is what makes the hour hand and
minute hand more than a description. A drag on the face sets the minutes of the
hour it is already in, and winds past twelve o'clock to change which hour that
is. A click on the ring sets the hour straight out and keeps the minutes. So 1h30
pointed at the 10 is 1h10, and pointed at the fourth slot is 3h30.

The first version clamped a face drag to the face and was plainly wrong in use:
with 1h30 typed, pointing at the 10 gave ten minutes and silently threw the hour
away. A face showing one hour of a longer length has to mean that hour when you
point at it, or it is not a control at all. Winding is then the way back out, and
it is the one a physical dial would have offered anyway - keep going round and
the length grows, turn back and it shrinks, with a floor at zero and a ceiling at
the longest length.

Two details the ring needs to be usable. Which half a drag is working is decided
when it starts and held for its whole life, because a face drag is allowed to
stray off the disc - that is how you reach the last minute of an hour - and must
not turn into an hour drag halfway through. And the ring's slots are four units
wide, which is not a target anyone can aim at, so a transparent backdrop makes
everything beyond the disc's outline count as the ring.

None of that endangers what 0004 was protecting. Its reason for a held face - that
a drag must not rescale the thing it is aiming at - is satisfied more completely
by a face that cannot change at all than by one that changes on a ladder. The
hour a drag is working in moves; the face it is aiming at never does.

Before making the face resize again, answer the question this ADR turns on: what
does a given amount of red mean, and does it still mean the same thing tomorrow.
