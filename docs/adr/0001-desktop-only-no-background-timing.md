# Desktop only, with no background timing

The alarm only has to be reliable on a desktop browser with the tab open. There
is deliberately no service worker, no web app manifest and no phone support; the
site says so in its own copy rather than pretending otherwise.

This looks like an omission, so to be explicit: it is not one, and adding a
service worker will not fix it. iOS only permits notifications for a site
installed to the Home Screen, suspends an installed PWA's JavaScript in the
background, will not keep a service worker alive waiting for a time to arrive,
and has no Notification Triggers API for scheduling a local notification. The
only mechanism that reliably fires at a future time on iOS is Web Push, which
needs a server holding the subscription and a scheduler to send it.

That server is the whole cost: it ends the static build, moves hosting off
GitHub Pages, and makes the alarm depend on uptime we would have to maintain —
roughly one to three days of work plus ongoing upkeep, against one line of copy.
The tool is used at a desk, on a computer, so we chose the line of copy. Revisit
only if background phone alarms become a real requirement, and expect to add a
backend when doing so.
