# The day's track is the next twelve hours, before and after Start

The timeline used to become the day once it was running, spanning `startedAt` to
`endsAt`. So the track was as long as whatever day you had named, and a full bar
meant six hours on a short day and eleven on a long one. Two days of different
lengths were drawn identically at the moment you started them.

That is the fitted face, in a straight line. It is the thing
`0005-the-dial-face-is-fixed-at-an-hour.md` was written about and the thing 0004
before it half-recognised: an instrument that resizes itself to its contents
reports the same picture every time and therefore reports nothing. The dials were
fixed and the bar was left, which made it the only surface in the tool set where
a given amount of red did not mean a given amount of time.

The track is now the next twelve hours, anchored at now, in both modes. Three
things follow from that, and the third is the one that made it obviously right.

The scale is honest. An hour is the same width today as it was yesterday, so a
day longer or shorter than usual says so the moment it starts - which is the only
thing calibration buys, and the reason a track sized to a typical day would have
been wrong. Eight hours was considered, since a nine-to-five is the common case;
it was rejected precisely because the common case would then start full, and
every day at or above it would look identical.

Twelve is not chosen either. It is what the drag already reached, it is what the
dial's ring holds, and it is the timer's longest length - so the number was
already in the tool three times before the bar used it.

And the seam at Start is gone rather than fixed. Issue #10 parked the fact that
the idle ruler and the running day were different scales, so pressing Start
changed what an hour was worth. With one anchor and one span either side, Start
now adds the countdown, takes away the grip, and touches nothing else. The two
screens are the same instrument, which is what #6 claimed and did not achieve.

Two things were given up, both deliberately.

A day longer than twelve hours does not fit. It fills the track and gets a mark
at the end saying it continues, in the same spirit as the timer clamping its ring
at a full lap rather than inventing a second scale for a rare case. This does not
reintroduce the cap that `0003-no-cap-on-day-length.md` refused: a long day is
still startable, still counts down correctly, and the preview still reads
"16 hours, ending tomorrow at 01:00" before you commit to it. The drawing is
bounded; the day is not. And it is self-correcting - a sixteen-hour day is
off-scale for four hours and an ordinary calibrated bar for the remaining twelve.

The marker and the spent part of the day are gone, because now is the left edge.
The bar answers what is left, which is what it is looked at for and what its own
description has always said. How far in you are is a sentence instead - "started
09:00 - 4 hours in" - which is the right register for something read rather than
glanced at, and the same shape as the account line under the elapsed clock.

`DayCountdown.totalMs` and `fraction` went with the elastic bar. They had already
stopped being used by anything but their own tests.
