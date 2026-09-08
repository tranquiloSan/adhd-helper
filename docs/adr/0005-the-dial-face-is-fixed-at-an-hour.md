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
twelve is also what a ring of whole hours wants: one slot per hour, its
boundaries landing on numbers the eye already uses, one lap of the ring being
twelve hours. The face reads minutes and the ring reads hours, which is the
division an analogue clock made a long time ago. The countdown's ring holds the
hours still to come and the elapsed display's holds the hours already spent -
each pointing the same way as its own wedge, which is the rule the wedge itself
has always followed.

The ring is drawn _outside_ the disc rather than on the disc's rim, and that is
not decoration. Drawn on the rim it is ink against a near-black page on its outer
half and buried under a full wedge on its inner half - and a full wedge is
exactly the state a timer of a whole number of hours starts in, so the marks
would vanish at the moment they carry the most. Outside the disc each slot has
the background to stand against. The disc keeps the plain dark outline it has
always had, so nothing about the familiar object changes; the hours are a
separate ring that is simply absent under an hour.

The cost is a discontinuity. At 61 minutes the face holds a one-minute sliver and
one slot is lit; at 60 the slot clears and the face refills. That reads as an
hour being promoted off the ring onto the face, and it happens once per hour
crossed. It is worth being plain that this is not smooth, and equally plain that
it is the same discontinuity Elapsed has had since `e3a1e03`, where the wedge
fills for an hour and starts again - lived with daily and never complained about.
The clock underneath never jumps, so there is always something continuous to read
while the picture rearranges.

What this buys, beyond the calibration, is subtraction. The ladder needed eleven
rungs, a function to pick one, a second marking scheme for faces past an hour, a
rule for coarsening it, two buttons, a grown-face chip, a fit-back-down button, a
stored preference, a reconciliation between that preference and a stored length,
and four lines of copy explaining the whole arrangement to someone whose dial is
supposed to be glanceable. All of it is gone. A face with no state cannot be in
the wrong state.

Dragging now reaches an hour and no further, and a longer length is typed. That
is the one thing genuinely lost, and it is the cheap half of the pair: the reason
0004 gave for a held face - that a drag must not rescale the thing it is aiming
at - is satisfied more completely by a face that cannot change than by one that
changes on a ladder.

Before making the face resize again, answer the question this ADR turns on: what
does a given amount of red mean, and does it still mean the same thing tomorrow.
