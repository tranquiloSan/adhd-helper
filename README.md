# adhd-helper

Small, glanceable tools for the way time goes missing with ADHD.

### → [tranquilosan.github.io/adhd-helper](https://tranquilosan.github.io/adhd-helper/)

Nothing to install and no account. Everything you type stays in your own
browser — there is no server to send it to.

## The tools

| Tool        | What it does                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Timer**   | Drag the dial, or type a length — `90`, `2h`, `1h30`. Time left is a shrinking wedge; the alarm repeats until you stop it. |
| **Elapsed** | Counts up, with no target and no alarm. Says when you started, and <kbd>p</kbd> on any page takes a break and times it.    |
| **Day**     | Say when you are stopping — drag the end of the bar, or type the time. Runs against real clock times, and past midnight.   |
| **Notes**   | Press <kbd>n</kbd> on any page for a box to put a thought in before it goes. Markdown is styled as you type.               |

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
  nineteen minutes.
  [ADR&nbsp;0002](docs/adr/0002-elapsed-records-breaks-notes-are-not-timestamped.md)
- **The dial's face is a fixed size, not a snug fit.** Ask for 91 minutes and
  you get a 120-minute face with the wedge at 91/120, the same bargain 25
  minutes on a 30-minute face already makes. A face that fitted every length
  exactly would put its marks on fractions, and would rescale under your finger
  as you dragged it. [ADR&nbsp;0004](docs/adr/0004-dial-faces-are-a-ladder.md)
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
