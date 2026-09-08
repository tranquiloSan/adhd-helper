# adhd-helper

Small, glanceable tools for the way time goes missing with ADHD.

### → [tranquilosan.github.io/adhd-helper](https://tranquilosan.github.io/adhd-helper/)

Nothing to install and no account. Everything you type stays in your own
browser — there is no server to send it to.

## The tools

| Tool        | What it does                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Timer**   | Drag the dial or type a length — `90`, `2h`, `1h30`. An hour to the face, an hour to a slot on the ring outside it. Says when it will land, and the alarm repeats until you stop it. |
| **Elapsed** | Counts up, with no target and no alarm. Says when you started and itemises the breaks; <kbd>p</kbd> on any page takes one and times it.                                              |
| **Day**     | Say when you are stopping — drag the end of the track, or type the time. The track is the next twelve hours, so a long day looks long.                                               |
| **Notes**   | Press <kbd>n</kbd> on any page for a box to put a thought in before it goes. Markdown is styled as you type.                                                                         |

## A few deliberate choices

- **Time is derived from timestamps, never counted by a ticker.** Browsers
  throttle background tabs, so a counting timer drifts or stalls exactly when
  you need it. Close the tab mid-timer and it comes back correct.
- **The countdown locks once started.** Changing it means resetting first. That
  friction is the point: nudging a running timer onwards is how "five more
  minutes" happens.
- **Nothing is ever deleted for you.** The notes box tells you how long it has
  sat untouched, and waits for you to clear it.
- **Notes are not timestamped, and the Elapsed tool records breaks instead.** A
  timestamp is worth having in a log you keep; the notes box is built to be
  emptied. Nothing else, though, can tell you afterwards that you were away for
  nineteen minutes — so Elapsed keeps the account, and shows it when asked.
  [ADR&nbsp;0002](docs/adr/0002-elapsed-records-breaks-notes-are-not-timestamped.md),
  [ADR&nbsp;0006](docs/adr/0006-the-account-is-an-overlay-not-the-face.md)
- **A given amount of red always means the same amount of time.** The dial's
  face is an hour and never anything else; the day's track is always the next
  twelve hours. An instrument that resized itself to fit would draw the same
  picture whatever you put in it, and so tell you nothing — a full bar would
  mean six hours one day and eleven the next. Anything longer than the face
  goes on the ring outside the dial, an hour to a slot.
  [ADR&nbsp;0005](docs/adr/0005-the-dial-face-is-fixed-at-an-hour.md),
  [ADR&nbsp;0007](docs/adr/0007-the-day-track-is-a-fixed-twelve-hours.md)
- **Desktop only.** iOS suspends background pages and only permits
  notifications for installed web apps, so a phone alarm needs a server behind
  it. [ADR&nbsp;0001](docs/adr/0001-desktop-only-no-background-timing.md) has
  the detail.

## Running it locally

Needs Node 24 — `nvm use`, or `nix develop` if you use direnv.

```sh
npm install
npm run dev
```

`npm run lint`, `npm run check`, `npm test` and `npm run build` are the same
checks CI runs.

Found a problem or want something added?
[Open an issue](https://github.com/tranquiloSan/adhd-helper/issues).
