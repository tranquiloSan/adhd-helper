# adhd-helper

A personal website hosting small tools for managing ADHD (inattentive type).
The tools are self-contained and kept few: another is added when something is
actually needed, not to round the set out.

## Language

**Tool**:
A single self-contained utility the site hosts.
_Avoid_: widget, app, feature

**Timer**:
The task countdown: a length in minutes, counting down to an alarm that repeats
until acknowledged.
_Avoid_: session, focus block, pomodoro

**Elapsed**:
The count-up display. Has no target and never sounds, so it can report a long
stretch without breaking one.
_Avoid_: stopwatch, tracker

**Stretch**:
One run of the elapsed count, from starting it until it is reset. Spans any
number of breaks, so it is not the same as the time spent counting.
_Avoid_: session, run, sitting

**Break**:
The interval a stretch spends paused - the time you were away, which the count
deliberately excludes. Pausing is the act; a break is what it leaves behind, and
it carries no description. Called an away period where it appears in the account
beside the worked ones.
_Avoid_: gap, interruption, rest, downtime

**Day**:
The countdown to an end time you name, running alongside the timer. Does nothing
until started, so there are no working hours to store.
_Avoid_: workday, schedule, shift

**Notes**:
The single box for a thought that would otherwise be lost. Working-memory
offload, and pointedly not somewhere work is tracked.
_Avoid_: todo, tasks, backlog

**Timeline**:
The horizontal track the day is drawn on, running from the time it started to
the end you named, with the remaining part filled. Its end is dragged to set
that time, so like the dial it is both the display and the main control.
_Avoid_: bar, progress bar, slider

**Dial**:
The circular face whose filled wedge shrinks as the remaining time falls, and
which is dragged to set the length. Both the display and the main control. A drag
reaches an hour, which is the whole face; longer is typed.
_Avoid_: disc, pie, wheel, gauge

**Face**:
The dial's span, which is an hour and never anything else. It sets the numbers
printed round the rim and how far a drag can reach, so a given amount of colour
always means the same amount of time. A length longer than an hour is carried by
the ring instead of stretching it.
_Avoid_: scale, range, size

**Ring**:
The twelve hour slots outside the disc, reading the whole time rather than the
part the face holds - still to come on the timer, already spent on the elapsed
count. The slot for the hour in progress fills as it goes, so the ring keeps
moving while the face swaps hours over. Boundaries land on the printed numbers,
so face and ring are a minute hand and an hour hand. Always drawn, lit or not,
and laps every twelve hours. Like the dial it is also a control: clicking a slot
sets the hour and leaves the minutes alone.
_Avoid_: rim, bezel, dots, pips

**Account**:
Everything that happened in the current stretch: the worked and away periods in
order, with the one you are in still open. The line under the elapsed clock is
its short form and the overlay is its long one. Emptied by a reset, so it never
becomes a record of work.
_Avoid_: log, history, timesheet
