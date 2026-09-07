# adhd-helper

A personal website hosting small tools for managing ADHD (inattentive type).
The tools are self-contained and deliberately few.

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
it carries no description.
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
which is dragged to set the length. Both the display and the main control.
_Avoid_: disc, pie, wheel, gauge

**Face**:
The dial's minute range, either 30 or 60. It sets the numbers printed round the
rim and how far a drag can reach.
_Avoid_: scale, range, size
