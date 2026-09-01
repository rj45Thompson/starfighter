# Running the page tests

    npm i -D playwright && npx playwright install chromium
    node test/chat.test.mjs     # the chat box: 23 assertions
    node test/heal.test.mjs     # finding the desk on its own: 14

Both build their own copy of `index.html` with the lock screen's verifier
swapped for a code they know, and drive that copy in a real browser. The page
that ships still contains no code — that is the whole point of the verifier,
and a test that needed the real one would have defeated it.

`heal.test.mjs` serves its copy from `rj45thompson.github.io`, so the code that
keys off the hosted hostname is the code under test rather than a stand-in.

Point `CHROME` at a browser if playwright cannot find one.

Elsewhere:

    python link/test/publish.test.py                # the address publisher: 10
    pwsh -File link/test/pubwatch.test.ps1          # the launcher's watcher: 6
    node relay/test/security.test.mjs               # the relay, adversarially: 38
    node relay/test/zoo.test.mjs                    # what it alerts on: 25
