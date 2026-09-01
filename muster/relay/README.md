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

## What stops this being an open Claude proxy

The one that matters: **the system prompt is built in the Worker and the
caller's is ignored.** A relay that forwards a caller-supplied system prompt is
a general-purpose Claude proxy running on your credit card. Here a caller can
supply only chat turns and profile fields; the instructions, model, token cap
and effort are all set server-side.

Around that: an origin allowlist (stops other sites embedding it — spoofable by
a script, so it is a filter rather than a wall), hard caps on turns, characters
and output tokens, and an optional per-IP rate limit you can bind in
`wrangler.toml`.

## The guard that is not in this code

Set a **spend limit** on the workspace this key belongs to, and use a key you
can revoke without touching anything else. Code can be wrong; a spend limit
cannot be argued with. Do this before you send the link to anyone.

## Cost

`EFFORT=low` and `MAX_TOKENS=1200` keep a typical exchange small. `MODEL` is
the big dial: Sonnet 5 is roughly two and a half times cheaper per token than
Opus 5 and is more than good enough for drafting a cover-letter paragraph.
Change the variable, no redeploy of the page needed.

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
