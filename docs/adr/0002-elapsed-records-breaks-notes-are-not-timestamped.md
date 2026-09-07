# Elapsed records breaks; notes are not timestamped

Elapsed counts only running time, so a stretch containing a lunch reads as
unbroken work. Two ways to account for the missing time were on the table: a
stamp key that inserted the current clock time and elapsed position into the
notes box, so a thought carried the moment it was had; or Elapsed recording its
own pauses as breaks. We built breaks and deliberately did not build the stamp.

The deciding argument is what each one is worth over time. A stamp saves you
glancing at the clock and typing five characters, and its value grows the longer
you keep the notes - which is exactly backwards, because notes are built to be
emptied. The age hint exists so that a pile cannot form, the end-of-day nudge
asks you to clear the box, and the page copy tells you to move anything worth
keeping somewhere else. Instrumenting a record designed not to outlive the week
is effort spent on something that will not be read. A break is the opposite
case: nothing else in the tool or on the machine can tell you afterwards that
you were away for nineteen minutes, so it is a capability rather than a
shortcut. Timestamping notes would also pull them toward being a log of work,
which the glossary says they are not.

Two shapes fell out of that. Breaks carry no description, because a break is
labelled at the two worst moments available - as you stand up to leave, or the
second you sit down wanting to get going again - and anything with words in it
belongs in notes. And a break is stored as a count and a total rather than a
list of intervals, because Elapsed is a face you glance at, and a scrolling list
of rows turns a glance into reading. Counters are a strict subset of a list, so
nothing is lost by starting here.

What this buys is an invariant worth keeping true: start time plus elapsed plus
breaks lands on the wall clock. Without breaks, showing a start time would
actively mislead, because the two numbers stop agreeing the moment you pause.

Revisit the stamp if you catch yourself typing times into notes by hand. When it
returns it should be a button inside the notes editor rather than a global key,
because by then the case you want is stamping while writing.
