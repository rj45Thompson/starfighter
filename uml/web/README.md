# The Starblast documentation corpus

Requirements for a **clone of Starblast.io** are claims about *that* game, not facts about
the code in this repository. `starblast.corpus.json` is what the documentation says, gathered
2026-09-09, and it is the ground space `uml/gml/starblast-web.spec.json` runs against.

| | |
|---|---:|
| claims | 36 |
| distinct terms | 28 |
| distinct sources | 10 |
| corroborated by 2+ sources | 7 |
| single-sourced | 21 |
| sources that contradict each other | 1 |

## What a citation into this proves, and what it does not

The code reader is a **parser**: it builds the ground space without a language model, which
is what makes citing it a check on one — a model cannot invent a symbol into a space it did
not build. A corpus gathered by searching and reading is gathered by a model, so a citation
into it proves less. Three things are done instead, and each is real:

- **Provenance.** Every atom carries the URL. A claim can be checked by opening the page.
- **Corroboration, counted.** `reads` is the number of independent sources carrying a claim.
  21 of 28 terms rest on one source and are reported as *attested, not corroborated*.
- **Contradiction, surfaced.** Where sources disagree both are kept and the disagreement is
  an anomaly — the same two-independent-readings check that worked on the code.

**The one contradiction found so far**, kept rather than resolved:

> *gem loss on damage* — one source says crystals fall off continuously as damage is taken
> once the shield is depleted; another describes loss only at death, when you respawn at
> tier one with minimal crystals. Deciding between them is a judgement somebody has to make
> and record.

## How it was gathered, and a limitation

This environment's egress proxy allows npm, PyPI and the Anthropic API and denies everything
else, so page fetches fail and only the server-side search tool reaches the web. Each claim is
therefore the content a search returned for the named source, not a verbatim quote from a
fetched page. A deployment with fetch access would populate the same structure with exact
quotations and a stronger guarantee; the shape does not change.

Queries used are recorded per claim in `found_by`, so a gather is repeatable.
