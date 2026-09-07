# No cap on day length; the preview is the validation

Naming an end time that had already passed used to be an error - "That time has
already passed today." Letting a day end after midnight turns that guard into a
rollover, and the guard was quietly doing a second job: catching a typo. At
09:00, `07:00` typed for `17:00` was rejected; with a rollover it becomes a
22-hour day that the tool will happily draw a timeline of.

We did not put a cap back. The setup screen shows what you are about to start -
`5 hours, ending tomorrow at 03:00` - and you validate it by reading it.

A cap needs a threshold, and no threshold separates the cases. A sixteen-hour
Saturday is a real day someone might name, a twenty-two-hour day is a typo, and
a cap set anywhere between them is wrong in one direction or the other while
producing a rejection that has to justify a number nobody chose. The preview
costs nothing in the normal case, and it is not merely defensive there either:
nothing previously told you how long the day you were starting actually was,
which is exactly the arithmetic this tool exists to save you.

So the only hard rejections left are input that does not parse and an end time
that is not in the future, the second already guarded in `DayCountdown.start`.
A nonsense day is startable, and that is accepted: it counts down harmlessly,
says what it is, and Stop clears it.

This is a deliberate deletion of validation, which is the kind of thing that
comes back as a bug fix. Before adding a maximum day length, answer the question
the cap has to answer: what number is right for both the Saturday and the typo.
