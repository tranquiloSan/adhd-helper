# Dial faces are a ladder of round lengths, held rather than derived

**Superseded by `0005-the-dial-face-is-fixed-at-an-hour.md`.** The face is now a
fixed hour. Kept because the two wrong versions recorded below are still wrong,
and because the argument that overturned this one is the argument it makes for
itself - which is worth being able to read in the original.

The dial's face was two fixed sizes, 30 and 60 minutes, and a longer length had
nowhere to go. Making the face fit the length looks like the obvious fix, and it
is wrong twice over. Both wrong versions were built and shipped before this one,
so they are worth recording rather than rediscovering.

A face equal to the length has nothing round to divide into. Ninety minutes in
twelve parts is 7.5, a hundred is 8.3333, and the numbers on a dial exist to be
positions you recognise - 15, 30, 45 can be read at a glance, and 8, 23, 38
cannot, however exactly each one marks its own tick. Marking the length at a
round interval instead of dividing the circle fixes the fractions but leaves the
top of a 121-minute face unnumbered, which is honest and still slightly wrong.

A face derived from the length also cannot be dragged. A drag maps the whole
circle onto the face, so dragging a face that is defined by the duration
rescales it while you are aiming at it: the wedge moves as you move. That is the
same reason the day's timeline has a fixed twelve-hour reach rather than an
elastic one, and it is why the derived face had to be display-only, which in
turn made a long length unreachable except by typing.

So the face is a ladder - 30, 60, 90, 120, 150, 180, 240, 300, 360, 480, 600 -
and a typed length grows it to the next rung that fits. Every rung divides into
whole minutes, so no face the dial can wear has a fraction on it. The face is
held state, not derived, so a drag maps onto something fixed and cannot rescale
anything mid-drag. And the two buttons stay on screen throughout, with a third
control to shrink the face onto the length, so nothing is a one-way door.

What this preserves is the property a face is for, which a fitted face quietly
destroys: on a 30-minute face 25 minutes covers 25/30 of the circle, so a given
amount of red always means the same amount of time. A face that always fitted
its length would mean a full circle every time and would carry no information at
all.

The cost is that the face is not the number you typed. Ask for 91 minutes and
the dial says 120 with the wedge just short of full. That is the same bargain
the tool already made for 25 minutes on a 30-minute face, so it needs no new
idea to read - and the exact length is the clock underneath, which is the number
you actually watch.
