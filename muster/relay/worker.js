/* Muster relay — one Cloudflare Worker, no dependencies, no build step.
 *
 * Why this exists: Muster is a static page, so it has nowhere to keep an API
 * key. Putting one in the page would publish it — view-source, secret
 * scanners, and a bill for whatever strangers do with it. This Worker holds
 * the key instead, so visitors chat with nothing of their own to set up.
 *
 * Raw fetch rather than the Anthropic SDK on purpose: this is a pass-through
 * proxy. It forwards the upstream event stream body untouched, so parsing and
 * re-serialising it through a client would add work and a build step for no
 * gain. One file you can paste into the Cloudflare dashboard.
 *
 * THE SECURITY MODEL, stated plainly, because a public relay on your key is
 * exactly the thing that gets abused:
 *
 *   1. The system prompt is built HERE and the client's is ignored. This is
 *      the one that matters. A relay that forwards a caller's system prompt is
 *      an open Claude proxy with your credit card on it. Here the caller can
 *      only supply chat turns and profile fields; the instructions are ours.
 *   2. Origin allowlist. Stops other sites embedding it. Spoofable by a
 *      script, so it is a filter, not a wall — which is why 1, 3 and 4 exist.
 *   3. Hard caps: turns, characters, output tokens. Bounds the cost of any
 *      single request no matter what is asked.
 *   4. Optional per-IP rate limit, if you bind one (see wrangler.toml).
 *   5. An access code, if you set ACCESS_CODE. This is the real gate behind
 *      the one on the page: that screen is a doorknob anyone can step around,
 *      but a request without the code never reaches Anthropic and never costs
 *      anything. Set it when you hand the link to people.
 *
 * And the guard that does not live in this file at all: set a spend limit on
 * the workspace whose key this is, and use a key you can revoke. Code can be
 * wrong; a spend limit cannot be argued with.
 */

const MODEL       = "claude-opus-5";   // override with the MODEL env var
const EFFORT      = "low";             // chat, not hard reasoning — see README
const MAX_TOKENS  = 1200;
const MAX_TURNS   = 24;                // conversation length the relay will carry
const MAX_CHARS   = 24000;             // total characters across those turns
const FIELD_CHARS = 200;               // per profile field

/* Only these keys are read off the client's profile, and only as short
 * strings. Anything else it sends is dropped rather than trusted. */
const PROFILE_KEYS = [
  "firstName", "lastName", "email", "phone",
  "city", "region", "postal", "country",
  "linkedin", "github", "website",
  "currentTitle", "currentCompany", "yearsExperience", "salary", "availability",
  "workAuth", "sponsorship", "referral"
];

const DEFAULT_ORIGINS = [
  "https://rj45thompson.github.io"
];

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "origin"
  };
}

function allowedOrigin(request, env) {
  const list = (env.ALLOWED_ORIGINS || "").split(",")
    .map((s) => s.trim()).filter(Boolean);
  const allowed = list.length ? list : DEFAULT_ORIGINS;
  const origin = request.headers.get("origin") || "";
  return allowed.includes(origin) ? origin : null;
}

/* Compare without leaking length or position through timing. Digest both
 * sides and diff every byte: same work whatever the input. */
async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a || "")),
    crypto.subtle.digest("SHA-256", enc.encode(b || ""))
  ]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

function bad(status, message, origin) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: Object.assign({ "content-type": "application/json" },
                           origin ? corsHeaders(origin) : {})
  });
}

/* The instructions. Built here every time, from validated fields only. */
function charter(profile, hasResume, appCount) {
  const known = PROFILE_KEYS
    .filter((k) => profile[k])
    .map((k) => `${k}: ${profile[k]}`)
    .join("\n");

  return "You are the assistant inside Muster, a job-application workspace. "
    + "You help one person get applications out. Be concrete and brief: short "
    + "paragraphs, no preamble, no filler. Ask at most one clarifying question, "
    + "and only if you genuinely cannot proceed.\n\n"
    + "You cannot browse, open files, send email, or fill forms yourself — a "
    + "browser extension does the filling. If something needs doing out there, "
    + "say plainly what to do, and draft the exact wording where that helps.\n\n"
    + "Never invent facts about this person. If a detail is missing, write the "
    + "sentence and mark the gap in square brackets.\n\n"
    + "One standing rule about relocation: never frame them as someone who needs "
    + "to relocate or wants relocation support. Write it as availability that is "
    + "already true — \"available on site in <city>\", \"available to start "
    + "immediately\". Framing it as a hurdle costs interviews.\n\n"
    + "Stay on job applications, resumes, interviews and the search itself. If "
    + "asked for something unrelated, say that is not what you are here for and "
    + "offer the nearest thing that is.\n\n"
    + (known ? "What you already know about them:\n" + known
             : "Their profile is still empty.")
    + (hasResume ? "\nThey have a resume saved, which you cannot read." : "")
    + `\nApplications logged: ${appCount}.`;
}

/* Everything the client sends, checked before any of it is used. */
function readBody(body) {
  if (!body || typeof body !== "object") return { error: "Malformed request." };

  const raw = Array.isArray(body.messages) ? body.messages : null;
  if (!raw || !raw.length) return { error: "No messages." };
  if (raw.length > MAX_TURNS) return { error: "Conversation too long." };

  let chars = 0;
  const messages = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) {
      return { error: "Malformed message." };
    }
    if (typeof m.content !== "string" || !m.content) {
      return { error: "Malformed message." };
    }
    chars += m.content.length;
    if (chars > MAX_CHARS) return { error: "Conversation too long." };
    messages.push({ role: m.role, content: m.content });
  }
  // The Messages API requires the conversation to end on a user turn.
  if (messages[messages.length - 1].role !== "user") {
    return { error: "Malformed request." };
  }

  const src = (body.profile && typeof body.profile === "object") ? body.profile : {};
  const profile = {};
  for (const k of PROFILE_KEYS) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) profile[k] = v.trim().slice(0, FIELD_CHARS);
  }

  const appCount = Number.isFinite(body.appCount)
    ? Math.max(0, Math.min(9999, Math.floor(body.appCount))) : 0;

  return { messages, profile, hasResume: body.hasResume === true, appCount };
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      return origin
        ? new Response(null, { status: 204, headers: corsHeaders(origin) })
        : new Response(null, { status: 403 });
    }
    if (request.method !== "POST") return bad(405, "POST only.", origin);
    if (!origin) return bad(403, "This relay does not serve that origin.", null);
    if (!env.ANTHROPIC_API_KEY) return bad(500, "The relay has no API key set.", origin);

    // Optional: bind a rate limiter in wrangler.toml and this starts working.
    if (env.RATE_LIMITER) {
      const ip = request.headers.get("cf-connecting-ip") || "anon";
      try {
        const { success } = await env.RATE_LIMITER.limit({ key: ip });
        if (!success) return bad(429, "Too many messages too quickly.", origin);
      } catch { /* never fail the request because the limiter is unhappy */ }
    }

    let body;
    try { body = await request.json(); }
    catch { return bad(400, "Malformed request.", origin); }

    const read = readBody(body);
    if (read.error) return bad(400, read.error, origin);

    // Set ACCESS_CODE and the relay is private, whatever anyone does to the
    // page. Leave it unset and the relay is open to the allowed origins.
    if (env.ACCESS_CODE) {
      const code = typeof body.code === "string" ? body.code : "";
      if (!(await sameSecret(code, env.ACCESS_CODE))) {
        return bad(403, "That access code was refused.", origin);
      }
    }

    // Note what is NOT taken from the client: system, model, max_tokens,
    // effort, tools. Those are the parameters that would turn this into a
    // general-purpose proxy on someone else's key.
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: env.MODEL || MODEL,
        max_tokens: Number(env.MAX_TOKENS) || MAX_TOKENS,
        stream: true,
        output_config: { effort: env.EFFORT || EFFORT },
        system: charter(read.profile, read.hasResume, read.appCount),
        messages: read.messages
      })
    });

    if (!upstream.ok || !upstream.body) {
      // Say what happened without handing back Anthropic's raw error, which
      // can name the account.
      const code = upstream.status;
      const message = code === 401 || code === 403
          ? "The relay's API key was rejected."
        : code === 429 ? "Busy right now. Try again in a moment."
        : code === 400 ? "That request could not be sent."
        : "The assistant is unavailable right now.";
      return bad(code === 401 || code === 403 ? 500 : code, message, origin);
    }

    // Pass the event stream straight through, untouched.
    return new Response(upstream.body, {
      status: 200,
      headers: Object.assign({
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        "connection": "keep-alive"
      }, corsHeaders(origin))
    });
  }
};
