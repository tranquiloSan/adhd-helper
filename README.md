# adhd-helper

Small, glanceable tools for the way time goes missing with ADHD.

### → [tranquilosan.github.io/adhd-helper](https://tranquilosan.github.io/adhd-helper/)

Nothing to install and no account. Everything you type stays in your own
browser — there is no server to send it to.

## The tools

| Tool        | What it does                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Timer**   | Drag the dial to set minutes. Time left is a shrinking wedge you can read at a glance; the alarm repeats until you stop it. |
| **Elapsed** | Counts up. No target and no alarm, so it can tell you how long you have been at something without breaking it.              |
| **Day**     | Say when you are stopping. Shows what is left of the day as a bar marked with real clock times.                             |
| **Notes**   | Press <kbd>n</kbd> on any page for a box to put a thought in before it goes. Markdown is styled as you type.                |

## A few deliberate choices

- **Time is derived from timestamps, never counted by a ticker.** Browsers
  throttle background tabs, so a counting timer drifts or stalls exactly when
  you need it. Close the tab mid-timer and it comes back correct.
- **The countdown locks once started.** Changing it means resetting first. That
  friction is the point: nudging a running timer onwards is how "five more
  minutes" happens.
- **Nothing is ever deleted for you.** The notes box tells you how long it has
  sat untouched, and waits for you to clear it.
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
