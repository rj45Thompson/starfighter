# Muster

A workspace for running a job search — your profile, your résumé, what you have
sent, and an assistant that drafts the awkward parts — with a browser extension
that fills the applications.

**Live: https://rj45thompson.github.io/starfighter/muster/**

## The point

The assistant answers from a Claude subscription that is already signed in on
your own computer. There is no API key in this repository, in the page, in the
browser, or on the wire, and there is no key for a visitor to bring. That is the
whole design constraint, and most of what follows is a consequence of it.

The page is one HTML file. No build step, no framework, no dependencies, no
bundler. Open it from a file:// URL and it works.

## Running it

**The page alone** needs nothing. Open `index.html`, or the live link above.
Your profile, résumé and applications are yours, in your browser, and the chat
tells you plainly that it has nothing to talk to yet.

**With the assistant** you also run the desk — the small server in
[sandra-fire-jobs](https://github.com/rj45Thompson/sandra-fire-jobs) that puts a
question to the Claude Code CLI and hands back the answer. Start it with
`bridge_up.ps1`; it opens the chat at `http://127.0.0.1:8770/muster.html` and
prints a link you can send to somebody else.

## How the chat finds Claude

Four routes, best first, all of them probed rather than assumed:

| | |
|---|---|
| **Inside claude.ai** | Opened as an Artifact, Claude is already present. Nothing to configure. |
| **A desk named in a link** | `…/index.html#desk=https://x.trycloudflare.com&code=…` — the launcher prints one. The address and the code both travel in the link, so there is nothing to paste anywhere. |
| **A relay this deployment ships** | `relay.json` beside the page. Optional; `relay/` has a Cloudflare Worker if you want one. |
| **A desk on this machine** | `http://127.0.0.1:8770`, found by probing. Nothing to carry and nothing to publish. |

An address that answers `/health` is used; one that does not steps aside for one
that does. This matters more than it sounds: a quick tunnel takes a new hostname
every run and hands the old one to somebody else, who will answer — with a
refusal. A remembered address is treated as a guess, not a fact.

### The local route, and why the desk serves the page

A page on `github.io` reaching `http://127.0.0.1` has to clear mixed-content
rules, a CORS preflight, ad blockers, and — since Chrome 138 — a local-network
permission. That last one is the awkward one: while the permission is
unanswered the browser **holds the request**, silently, with no error. Measured
on Chromium 141 from an https page:

```
nothing listening   →  refused in about 4ms
a desk listening    →  held indefinitely
```

So the failure only appears when the desk is actually up, which is a confusing
way to find out about it. The page copes — it stops waiting without cancelling
the request, says which of the two situations it is in, and connects by itself
if the permission is granted later.

The route with none of these problems is the desk serving the page itself. Same
origin as `/bridge/chat`, so the browser asks nothing, no access code is needed,
and there is no published address to go stale.

## The extension

`apply-assist/` fills job applications from the profile you have already filled
in once. It is packaged by `tools/build-extension.mjs` and downloadable from the
live site; unzip it, open `chrome://extensions`, turn on Developer mode, choose
**Load unpacked**, and pick the `apply-assist` folder inside.

A fill blocked by a sign-in page does not report failure. It says so, waits, and
finishes the application by itself once you are through — so you sign in exactly
as you would have anyway, with a password this code never sees.

The same watcher handles the other two reasons fields go missing: a form that
has not hydrated yet (Greenhouse, Workday) and a later step of a multi-step
application.

### What it will not do

It never submits an application for you. It refuses passwords, payment details,
SIN or SSN, and every equal-opportunity question — those are yours to answer
deliberately. Everything inside a sign-in, registration or 2FA form is skipped
whatever else it scores, and there is deliberately no username rule to weaken
later. Nothing it reads leaves your machine.

## Layout

```
index.html                the whole web app
apply-assist/             the Chrome extension
relay/                    an optional Cloudflare Worker relay
link/                     the launcher and address publisher for the desk
test/                     the page's tests
tools/build-extension.mjs packages the extension
```

`apply-assist.zip` is built, never committed. It was committed once and went
stale against its own source — `content.js` and `fields.js` had both moved on —
so anyone who downloaded it got an older extension than the one described here.
Run `node tools/build-extension.mjs` before publishing a new one.

Muster lives in a subdirectory of `starfighter` for now, which is why the URL
above reads the way it does. It is meant to be its own repository — the layout
here is already the layout it wants, so moving it is a copy, not a rewrite. The
Pages workflow and CI that go with the standalone repo are not in this tree,
because this repository serves a different site from its root.

## Tests

No framework. Every suite is a script that exits non-zero when something is
wrong.

```
node test/access.test.mjs        26   the page opens, and nothing gates it
node test/chat.test.mjs          21   attachments, turns, errors
node test/heal.test.mjs          15   finding a desk, and losing one
node test/dash.test.mjs          14   the chat living on the dashboard
node test/stale.test.mjs         19   an address that has gone, and a held request

node apply-assist/test/detect.test.js      71   which field is which
node apply-assist/test/dynamic.test.js     25   forms that arrive late
node apply-assist/test/usecases.test.js    61   whole applications, end to end

node relay/test/security.test.mjs         38
node relay/test/zoo.test.mjs              25
```

`test/e2e.live.mjs` is not in that list on purpose: it drives the real page
against a real desk over a real socket, so it needs one running and it spends
real tokens.

The page tests refuse to touch `127.0.0.1` unless a test asks for it
(`sealLocal` in `test/testkit.mjs`). Without that, a desk running on the
developer's machine leaks into three of them and quietly changes their results.
Do not remove it to make a test pass.

## License

Proprietary — see [LICENSE](LICENSE).
