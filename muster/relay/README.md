# The Muster relay

A single Cloudflare Worker that holds the API key so visitors do not need one.
No dependencies, no build step, one file.

## Why not just put the key in the page

Muster is static HTML served from GitHub Pages. A key in that page is public:
visible in view-source, picked up by secret scanners within hours, and billed
to you meanwhile for whatever anyone does with it. There is no version of that
which is merely "less strict" — it is a key that stops working.

This Worker is the version that does work. The key lives in Cloudflare's secret
store; the page only ever talks to the Worker.

## Deploy — two ways, both free

**Dashboard, no CLI.** Cloudflare → Workers & Pages → Create → Worker. Paste
`worker.js` over the starter code, Deploy. Then Settings → Variables:

| Kind | Name | Value |
|---|---|---|
| Secret | `ANTHROPIC_API_KEY` | your key from console.anthropic.com |
| Secret | `ACCESS_CODE` | the access code you hand out with the link |
| Text | `ALLOWED_ORIGINS` | `https://rj45thompson.github.io` |
| Text | `MODEL` | `claude-opus-5` |
| Text | `EFFORT` | `low` |
| Text | `MAX_TOKENS` | `1200` |
| Text | `ALERT_WEBHOOK` | optional — see the zoo below |

**CLI.**

```
npm i -g wrangler
wrangler login
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put ACCESS_CODE
wrangler deploy
```

Either way you get a URL like `https://muster-relay.<you>.workers.dev`.

## Point Muster at it

Edit `relay.json` at the root of the site:

```json
{ "url": "https://muster-relay.YOU.workers.dev" }
```

That is the whole wiring. The page fetches that file on load; if it names a
URL, the chat connects by itself and the visitor sets up nothing. If the file
is missing, empty, or unreachable, the page falls back to asking for the
visitor's own key — it never breaks, it just asks.

## The access code

The page shows a lock screen, but understand what that is: the HTML is already
in the browser by then, so the screen is a doorknob anyone can step around with
the developer tools. It keeps a link you hand out from being wandered into. It
is not access control.

`ACCESS_CODE` is the half that is. The relay refuses any request without it, so
someone who bypasses the screen gets a page whose assistant will not talk to
them, and spends nothing of yours. The page never contains the code, only a
PBKDF2 verifier - salt, iteration count, derived key - so view-source cannot
reveal what the relay is checking for.

To change it: set the new `ACCESS_CODE` secret on the Worker, then replace
`GATE` in `index.html` with a verifier for the new phrase.

```python
import secrets, hashlib, binascii
phrase = "your-new-code"
salt = secrets.token_bytes(16)
print("salt:", binascii.hexlify(salt).decode())
print("hash:", binascii.hexlify(
    hashlib.pbkdf2_hmac("sha256", phrase.encode(), salt, 100000, 32)).decode())
```

If you want the page itself to be genuinely unreadable without a code, it has
to be served by something that can withhold it - Cloudflare Access in front of
it, or serve the HTML from this Worker. That is a different deployment, not a
stronger version of this one.

## The unusual activity zoo

Set `ALERT_WEBHOOK` to any URL that accepts a JSON POST and the relay reports
things that should not happen much. Nine species, each with the signal that
catches it:

| Species | Severity | What tripped it |
|---|---|---|
| `code_probing` | critical | Three or more **different** wrong codes from one address. Guessing, not typos. |
| `ip_fanout` | high | More than 25 addresses in ten minutes. The link has spread past who you gave it to. |
| `foreign_origin` | high | A request from a site that is not yours. |
| `injection` | high | A profile field shaped like an instruction override. A first name does not say "ignore all previous instructions". |
| `bad_code` | medium | A single wrong access code. |
| `no_origin` | medium | No Origin header, so not a browser tab. curl, a script, a scanner. |
| `hammering` | medium | One address hit the rate limit three times over. |
| `refusal` | medium | Claude declined the request, or the API errored. |
| `oversized` | low | A request at the size ceiling. Usually probing the limits. |

Three things about how it behaves.

**Nothing here blocks.** Blocking is done by the checks below; a detector that
is also a gate becomes a way to switch itself off. `injection` in particular
reports and then serves the request normally, because the profile is
quarantined as data either way.

**One message per species per 15 minutes** (`ALERT_COOLDOWN_S`), so a flood
cannot bury you. Suppressed events are counted, not dropped: the next message
says how many it stands for, so a quiet inbox never means a quiet relay.

**These are sightings, not an audit log.** The counters live in one isolate's
memory, which Cloudflare evicts when it likes. A clumsy attacker is seen
reliably; a distributed one is seen less often. Worth having, not worth
trusting as a complete record.

## Getting the alerts as email

A Worker cannot send email by itself, so the webhook is the mechanism and you
need one hop. The payload already carries preformatted `subject` and `text`
fields for exactly this, so a forwarder needs no transformation:

```json
{ "source": "muster-relay", "species": "code_probing", "severity": "critical",
  "meaning": "Several DIFFERENT wrong codes from one address...",
  "at": "2026-09-01T05:00:00.000Z",
  "detail": { "ip": "203.0.113.4", "distinctCodesTried": 3 },
  "sinceLastAlert": 0,
  "subject": "Muster relay: code_probing (critical)",
  "text": "Several DIFFERENT wrong codes from one address...\n\nspecies: ..." }
```

Easiest routes, no code:

- **Zapier / Make / Pipedream / IFTTT** - "webhook in, email out". Paste the URL
  they give you into `ALERT_WEBHOOK`, map `subject` and `text`. Free tiers cover
  this volume comfortably.
- **Slack or Discord** - both accept a JSON POST at an incoming-webhook URL. Not
  email, but it reaches your phone faster.
- **Cloudflare Email Workers** - keeps it inside Cloudflare with no third party.
  Needs a `send_email` binding and a verified destination address; check their
  current docs for the binding syntax rather than trusting a snippet.

## What stops this being an open Claude proxy

The one that matters: **the system prompt is a constant and no caller input
reaches it.** A relay that lets a caller influence its instructions is a
general-purpose Claude proxy running on your credit card. Here a caller
supplies chat turns and profile fields, and the profile travels as quarantined
data inside a user turn with its angle brackets stripped, so a value cannot
close the tag it sits in and pose as the surrounding document.

That was a real hole, not a hypothetical one: profile fields used to be
interpolated into the system prompt, and `security.test.mjs` is the suite that
caught it.

Around that: an origin allowlist (stops other sites embedding it — spoofable by
a script, so it is a filter rather than a wall), hard caps on turns, characters
and output tokens, a per-IP throttle, and the access code.

## The guard that is not in this code

Set a **spend limit** on the workspace this key belongs to, and use a key you
can revoke without touching anything else. Code can be wrong; a spend limit
cannot be argued with. Do this before you send the link to anyone.

## Cost

`EFFORT=low` and `MAX_TOKENS=1200` keep a typical exchange small. `MODEL` is
the big dial: Sonnet 5 is roughly two and a half times cheaper per token than
Opus 5 and is more than good enough for drafting a cover-letter paragraph.
Change the variable, no redeploy of the page needed.

## Tests

```
node relay/test/security.test.mjs   # 38 adversarial assertions
node relay/test/zoo.test.mjs        # 25 assertions on the detectors
```

No framework, nothing to install. Both import the real worker with a stubbed
upstream, so they check what would actually have been sent to Anthropic rather
than what the source appears to say.

## The contract, if you want to write your own

```
POST /
{ "messages": [{"role":"user","content":"..."}],
  "profile":  {"firstName":"...", "city":"..."},
  "hasResume": true,
  "appCount": 3,
  "code": "the access code, if one is set" }

→ text/event-stream, Anthropic's format, passed through unchanged
```

Anything else the page might send is ignored. Errors come back as
`{"error":{"message":"..."}}` with a real status code.
