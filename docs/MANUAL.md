# Science Digest: operations manual

How to run the app, change it, add papers to it and put it on the internet.
Written for the owner, not for a programmer. Every technical word is explained in
[part 12, the glossary](#12-glossary); the first time one appears it is in *italics*.

Commands are typed in the *terminal*, inside the project folder (`~/Game/sciencedigest`).

---

## 1. What you have

Three things in one folder:

1. **The app.** A phone-first website with three tabs: **Today** (the Life Game), **Library**
   (the reads) and **Me** (theme, account, how scoring works). It can be installed to a phone's
   home screen and opens without a connection.
2. **The content pipeline.** Commands that take a paper from an open repository, pull the facts
   out of it, check every fact against the paper's own text, write the read, and refuse to
   publish anything that breaks the content rules. You approve each paper yourself.
3. **The database design.** Tables, access rules and tests for Supabase, ready to be switched on.

### Where things live

| You want to change... | Look in |
|---|---|
| Colours, fonts | `app/globals.css` (the ten colour tokens at the top) |
| The Today screen | `components/game/Dashboard.tsx`, `components/game/LifeBar.tsx` |
| How a protocol card looks (tick rows, ring, settings) | `components/protocol/primitives.tsx` |
| One paper's simulator or widget | `components/papers/<slug>/` |
| The read page layout | `components/read/Article.tsx` |
| The Me screen | `components/me/Settings.tsx` |
| The words of a read, its protocol steps, its Instagram deck | `content/papers/<slug>/editorial.json` |
| How the score is worked out | `lib/score.ts` **and** `supabase/migrations/20261112000200_scoring.sql` |
| Evidence weights (1.0 / 0.7 / 0.4 / 0) | `lib/evidence.ts` **and** `evidence_weight()` in the core migration |
| The content rules (banned words and so on) | `lib/pipeline/lint.ts` |
| Which AI model the pipeline uses | `.env.local` (or `lib/ai/provider.ts`) |
| Database tables and access rules | `supabase/migrations/` |

Files you never edit by hand, because a command writes them: `lib/content/generated.ts`,
`content/generated/`, `supabase/seed.sql`, `supabase/tests/database/90_parity.generated.test.sql`.

---

## 2. Run it on your Mac

```
npm install        # once, and again whenever package.json changes
npm run dev        # starts the app
```

Open http://localhost:3000. To see it on your phone, connect the phone to the same Wi-Fi and
open `http://<your-mac's-ip>:3000`.

With nothing else set up the app runs in **demo mode**: everything works, and whatever you tick
is kept in that browser only. The Me tab has a switch, "Preview the app as a member", so you can
check the members' read (the HIIT paper) without a database.

### The five checks

Run these before you call any change finished. Each must end without errors.

| Command | What it checks | Jargon |
|---|---|---|
| `npm run lint` | Code style, and the widget guard (part 4.6) | *lint* |
| `npm run typecheck` | That pieces of code fit together | *TypeScript* |
| `npm test` | The scoring, store, sync, CAPTCHA, companion and pipeline logic (132 small tests) | *unit test* |
| `npm run build` | That every paper passes the content rules, then builds the real app | *build* |
| `npm run db:test` | The database's access rules (177 checks) | *pgTAP* |

`npm run db:test` needs Docker Desktop running. Without Docker, `npm run db:test:local` runs the
same 177 checks twice (with and without the seed and other people's data) on a local Postgres.

Two more, for changes to pages or sign-in:

| Command | What it checks |
|---|---|
| `npm run test:http` | After `npm run build`: a missing paper answers 404, every real paper 200 |
| `npm run test:browser` | In a real browser, with the CAPTCHA script blocked: ticking still works, the queue keeps the ticks, Me says "offline". Builds its own copy with a fake database address, so it never touches the real project. Needs `npx playwright install chromium` once |

---

## 3. Put it on the internet

Two free services to start. Neither choice is permanent: the app talks to Supabase through two
files (`lib/supabase/client.ts`, `lib/supabase/remote.ts`) and any host that runs Next.js works.

### 3.1 The database: Supabase

1. Create a project at supabase.com. Note the project's *reference id* and database password.
2. Install the command-line tool and connect the folder to the project:
   ```
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref <your-reference-id>
   supabase db push --remote --dry-run --include-seed   # shows what would change
   supabase db push --remote --include-seed
   ```
   The last command creates every table and loads the three starter papers. On Supabase CLI 3.x,
   leaving out `--remote` targets a local Docker database, not your project.
3. In the Supabase dashboard: **Authentication → Sign In / Providers → turn on "Allow anonymous
   sign-ins"**. This is what lets a visitor start ticking without making an account.
4. Copy `.env.example` to `.env.local` and fill in the first two lines from **Project Settings →
   API** (the project URL and the *publishable key*).
5. `npm run dev` again. The Me tab now shows "Everything is saved" instead of "Demo mode".

**Before real visitors arrive, turn on CAPTCHA.** Anonymous sign-in without it lets a script
create unlimited users. The code is in place (`lib/captcha/turnstile.ts`, used by `ensureUser()`
in `lib/store/sync.ts`); with no site key it does nothing. Do these **in this order**:

1. **Create a Turnstile site.** Cloudflare dashboard → **Turnstile** → **Add widget**. Hostnames:
   your live domain(s), e.g. `sciencedigest-a4ms.vercel.app` and any custom domain, plus
   `localhost` if you want to try it under `npm run dev`. Widget mode: **Invisible**. Cloudflare
   shows a **site key** (public) and a **secret key** (private).
2. **Give the site the site key.** In the host (Vercel → Settings → Environment Variables) add
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the site key, then **redeploy** (variables starting
   `NEXT_PUBLIC_` are built into the site, so a redeploy is needed). Optional: the same line in
   `.env.local`.
3. **Only then switch Supabase on.** Supabase → **Authentication → Attack Protection** → enable
   **CAPTCHA protection**, provider **Turnstile by Cloudflare**, paste the **secret key**, save.

Doing 3 before 2 is live breaks every *new* visitor: Supabase rejects any sign-in without a token,
and the deployed site does not send one yet, so a first tap never reaches the server (the Me tab
shows the error; ticks stay on the device and retry). People already signed in are not affected,
because they never sign in again. The secret key goes only into Supabase, never into the
repository, `.env.local` or Vercel.

### 3.2 The website: a host

Push the folder to a GitHub repository, then import that repository at vercel.com (or Netlify, or
Cloudflare). Add the same two `NEXT_PUBLIC_SUPABASE_...` values under the host's "Environment
variables". Every push to GitHub then publishes a new version by itself.

Check the host's free plan terms before you charge money: some free plans are for non-commercial
projects only.

### 3.3 Releasing a change

```
npm run lint && npm run typecheck && npm test && npm run build
git add -A && git commit -m "what changed and why" && git push
```

If the change touched `supabase/migrations/`, also run `supabase db push`.
If it touched `content/papers/`, run `supabase db push --include-seed`.

---

## 4. Recipes for common changes

Each recipe says what to edit and how to confirm it worked.

### 4.1 Change the colours

`app/globals.css`, top of the file. Ten tokens, defined twice: once for light, once for dark.

Worked example, a deeper orange in dark mode:

```css
[data-theme="dark"] {
  --accent: #ff5500;        /* was #ff6a00: fills, bars, ticks */
  --accent-text: #ff7a2e;   /* was #ff8a33: orange used as TEXT; keep it lighter than --accent */
```

`--accent-ink` is the text colour used **on top of** orange (black). `--accent-text` is orange
used as text on the page background; in light mode it must be dark enough to read on white.
Save, and the running app updates. Check both themes on the Me tab.

### 4.2 Change the starter habits

`components/game/Dashboard.tsx`, the line starting `const STARTER_HABITS`. These are the
suggestions a new user sees ("Drink 3 L of water"). They are only suggestions: once added, a
habit belongs to the user.

### 4.2b Change the companion

- **What it says and when it changes mood:** `lib/companion/mood.ts`. The moods follow today's
  ticked boxes and the streak. Keep it that way: a test fails if a line mentions health.
- **How the cat is drawn:** `components/game/Companion.tsx`, the `Cat` component (plain SVG
  shapes) and the `POSE` table (tail angle and eyes per mood).
- **Own picture:** `lib/companion/avatar.ts`. The picture stays in the browser. To make it
  follow a user across devices you would add Supabase Storage; that means hosting user images.

### 4.2c The three kinds of habit widget

`components/game/HabitTiles.tsx`. `Tile` is the small view, `Detail` the opened view, `AddHabit`
the form. `tapSize()` decides how much one tap adds (1, 5, 10 or 250 depending on the target).
The suggestions offered to a new user are the `STARTERS` list at the top (this replaces 4.2).

### 4.3 Change wording on a screen

Find the words with a search (`grep -rn "Add to Life Game" components app`), edit them in place.
Keep interface words plain: say what a button does ("Add to Life Game"), not "Submit".

### 4.4 Change how long before a protocol pauses

Two places, because the phone and the database must agree:

- `lib/score.ts`: `export const DORMANCY_DAYS = 7;`
- `supabase/migrations/20261112000200_scoring.sql`: `(p_date - e.last_active_on) > 7`

Do not edit an old *migration* once it has been pushed to a live database. Add a new one instead
(part 8). Then:

```
npm run parity:gen     # rewrites the test that compares the two
npm test && npm run db:test
```

If you change only one side, the parity test fails and tells you. That is its job.

### 4.5 Change the evidence weights

Same two-place pattern: `lib/evidence.ts` (`WEIGHT_TENTHS`, in tenths: 10, 7, 4, 0) and
`evidence_weight()` in SQL. Then `npm run parity:gen` and the tests. Because scores are worked
out and never saved, every past day recalculates with the new weights: nobody's history is
frozen on the old rule.

### 4.6 Give a paper its own simulator or widget

A new paper works with no code: it gets a standard widget and the standard "estimate explorer"
simulator. To build something specific:

1. Create `components/papers/<slug>/Simulator.tsx` and/or `Widget.tsx`. Copy the nearest
   existing one as a starting point.
2. In `components/papers/registry.tsx`, add one line to the `SIMULATORS` map (key = the
   `simulator.kind` in that paper's `editorial.json`) and/or one line to `WIDGETS`.

**The widget guard.** A file under `components/papers/` may not talk to the database, reach
into saved state, or work out a percentage. It receives everything from `useProtocol(slug)` and
draws it. `npm run lint` refuses a file that breaks this. Every number a simulator shows must
come from the paper: in `editorial.json` simulator values are written as `"fact:<id>"` or
`{ "n": 8000, "ref": "threshold" }`, and the build fails on a bare number.

### 4.7 Make a paper free or members-only

`content/papers/<slug>/editorial.json`, the line `"accessTier": "free"` or `"premium"`. Then
`npm run content:build`. A members' paper keeps its title, summary and protocol public (so
search engines and Instagram links land somewhere); only the full read is held back.

### 4.8 Correct a mistake in a published read

Edit `content/papers/<slug>/editorial.json`, run `npm run content:build`, release. Because
devices store only what the user did (ids and dates), the correction reaches everyone on their
next visit. Nothing old is left behind on phones.

To remove a protocol step, set `"retired": true` on it. **Never delete a step or rename its
`key`**: people's history points at it.

---

## 5. Add a paper

One command per stage. A paper lives in `content/papers/<slug>/` as three files.

```
source.txt        the paper's text, exactly as downloaded
extraction.json   facts pulled from it, each with the passage it came from
editorial.json    the read, the protocol, the simulator settings, the Instagram deck
```

### Once: set up the model

In `.env.local` set `AI_API_KEY` (from console.anthropic.com) and the two `AI_MODEL_...` lines.
Use a strong model for both. Reading a clinical paper accurately is the hard step, and at ten
papers a week the cost is a few dollars a month.

### Each paper

```
npm run retractions                            # refresh the retraction list (daily is enough)
npm run paper -- fetch PMC10051082 my-slug     # 0. download; licence + retraction check
npm run paper -- extract my-slug               # 1+2. model reads the paper; the gate checks it
npm run paper -- draft my-slug                 # 3+4. model writes the read; the lint checks it
npm run dev                                    #     ...read the draft (see below)
npm run paper -- approve my-slug               # 5. you publish it
npm run content:build                          # rebuild what the app reads
```

Find the `PMC...` id on the paper's page at europepmc.org or pmc.ncbi.nlm.nih.gov.

**What each stage refuses.**

| Stage | Refuses when |
|---|---|
| fetch | the licence is not CC-BY, CC-BY-SA or CC0; the paper is in the retraction list |
| the gate | any quoted passage is not found in `source.txt`; a number is not inside its quote; the design or species is not supported by its quote |
| the lint | a banned hype word; a causal verb for a non-randomized study; a relative figure with no absolute one; a number that no cited fact contains; no limitation; too close to the paper's own wording |
| the lint, on the three layers | a read still in the old flat shape; a technical word (`lib/pipeline/jargon.ts`) in the mechanism or protocol with no glossary entry, or in the mechanism's opening sentence; a glossary entry explained with another technical word; a caveat in the mechanism (limitation, confound, self-reported, p-values, 95%, CI, sample size, dropout, funded); throat-clearing ("it is worth noting", "interestingly" …); a sentence over 30 words; a layer over its budget (mechanism 350, protocol 150, audit 250 words) |

**The three layers.** `editorial.json` holds the read as `layers.mechanism` (why it happens: the
picture first, then the name), `layers.protocol` (what was tested) and `layers.audit` (the raw
effect size, what the weak end of the range means, the limitations, what summaries miss), plus a
`glossary` of `{ term, plain }`. The build prints each layer's word count, its average sentence
and its longest one. Sentences over 22 words and likely passives are warnings: read them, then
decide. The full shape and two worked examples are in `.claude/skills/science-content/SKILL.md`.
| approve | either of the two above fails |

**Another study beside the paper.** A read may cite a second study (`content/context/<slug>/`).
It goes through the same download and the same gate, and stops there: no read of its own, no
protocol, no weight.

```
npm run paper -- fetch PMC1234567 other-slug --role context
npm run paper -- extract other-slug --role context
```

The read cites one of its facts as `[other-slug/fact_id]`; the page shows "From another study",
the citation and that study's own grade, and the receipts list it with its DOI.

**Background concepts.** Textbook knowledge the paper does not state ("what adenosine does")
goes in `content/concepts/<slug>.json`: a term, a plain explanation, a mental model and a
reference (DOI or ISBN). **No numbers**: a digit fails. A draft may use a concept you have not
reviewed; a published read may not, and `approve` refuses. To review one, in your own Terminal:

```
npm run paper -- approve-concept adenosine      # shows it, asks you to type the slug back
```

It will not run from a script or an assistant. If a concept's wording changes later, it needs
approving again.

**Reading a draft before you approve it.** A draft has `"publishedAt": null` and is not in the
app. To preview it, temporarily put a date in that field, run `npm run content:build`, look at
it in `npm run dev`, then either approve it or set the field back to `null`. Read the whole
thing against the paper: the checks catch invented numbers and banned language, not a true
sentence that misses the point.

**When a stage fails**, the message says which rule and where. Either fix the JSON file by hand
(they are plain text) or run the stage again. Do not loosen the rule to make the paper pass.

---

## 6. Instagram: review and approve

Every published paper gets a deck (5 to 8 slides and a caption), written by the same pipeline
from the same checked facts. Nothing is ever posted automatically.

```
npm run dev
```

Open http://localhost:3000/admin/queue. For each deck: swipe through the slides, read the
caption, press **"I have read every slide: approve"**. Approving writes a small file to
`content/queue/`; commit it, and git is your record of what you signed off and when. If the
wording changes later, the deck drops back to "changed" and asks for review again.

The page exists only on your own machine. On the deployed site it answers "not found", so
there is no admin page on the internet to protect.

**Slide images.** This page shows the wording. Rendering slides as 1080×1350 images is the job
of the carousel Studio (the twelve `lib/carousel/` files from the earlier build). They are not
in this folder yet: see part 10.

---

## 7. The nightly retraction check

```
npm run retractions
```

Downloads the Retraction Watch list (free, updated every working day) and checks every paper
you have published, and every context study in `content/context/`, against it. A retracted
context study gets a `withdrawn.json` in its folder; from then on `npm run content:build` fails
on any read that still cites it, naming the sentence to remove. This catches a paper retracted **after** you wrote about it,
which no summary account does. If one is found, the command says which, exits with an error,
and (when `SUPABASE_SERVICE_ROLE_KEY` is set) hides the read and drops its protocol's weight to
zero in the database. Then run the two commands it prints.

To run it every night without thinking: a scheduled GitHub Action, or `crontab -e` on a machine
that stays on. `0 3 * * * cd ~/Game/sciencedigest && npm run retractions` runs it at 03:00.

---

## 8. Change the database

Never edit a migration that has been pushed to a live database. Add a new one:

```
supabase migration new add_something        # creates an empty, dated file in supabase/migrations/
# write the SQL in it
supabase db reset                           # rebuild your LOCAL database from scratch
npm run db:test
supabase db push                            # apply to the live project
```

Write a test for the new rule in `supabase/tests/database/`, and make sure it **fails** when
the rule is removed. `npm run db:mutation` does exactly that for the existing rules: it breaks
one rule at a time in a copy and confirms the tests notice.

**Without Docker.** `npm run db:test:local` runs the same tests against a plain Postgres with
the pgTAP extension (for example `brew install postgresql@16 pgtap`):

```
PGADMIN_URL=postgres://<you>@127.0.0.1:5432/postgres npm run db:test:local
```

Ask before changing the shape of a table that holds user history (`step_checkins`,
`equipped_protocols`, `user_program_state`). Those are the expensive ones to undo.

---

## 9. A store app later

The app is already installable from the browser (Share → Add to Home Screen). For the App
Store and Play Store, the same code can be wrapped with Capacitor, which puts a website inside
a native shell. Everything that matters (scoring, saving, the pipeline) imports nothing from
the web framework, so a fully native app could also reuse it unchanged. Neither is set up yet.

---

## 10. What is not built yet

Stated plainly so nothing surprises you.

| Not built | What it needs |
|---|---|
| **Payments.** The Membership page says joining is not open | A Stripe account; a small server route that sets `subscription_tier` when Stripe confirms a payment |
| **Instagram slide images** | The twelve carousel files. Copy them in, then map `content/generated/carousels.json` to their deck format |
| **Posting to Instagram** | Deliberately manual. The queue stops at "ready to post" |
| **A store app** | Part 9 |
| **Home-screen widgets on Android and iPhone** | A native wrapper first (part 9). A website cannot place a widget on the phone's home screen |

**Written but never run against the real service** (the build machine had no access to them):
`npm run paper -- fetch` (Europe PMC), `npm run paper -- extract` and `draft` (the AI model),
`npm run retractions` (GitLab), and everything in part 3 (Supabase and the host). Their pure
logic is unit-tested. Expect to fix a detail the first time you run each one.

---

## 11. Working with Claude Code

`CLAUDE.md` in the project root is read by Claude Code at the start of every session. It lists
the rules that must not be broken and the checks to run. Useful ways to ask:

- "Add a simulator for `<slug>` following part 4.6 of the manual. Show me the lint and build output."
- "Change the dormancy window to 10 days following part 4.4. Show the parity test passing."
- "The lint rejected my draft with `[H5]`. Explain the rule and propose a fix to editorial.json."

Ask for the output of the five checks every time. "It should work" is not evidence.

---

## 12. Glossary

| Word | Meaning here |
|---|---|
| **Terminal** | The app where you type commands (Terminal on a Mac) |
| **npm** | The tool that installs the project's building blocks and runs its commands |
| **Build** | Turning the source files into the fast version that visitors get |
| **Deploy / release** | Putting a new build on the internet |
| **Environment variable** | A setting kept outside the code, in `.env.local` or the host's dashboard. Used for keys |
| **Next.js** | The framework the website is built with |
| **Component** | One reusable piece of screen: a button, a card, a whole page |
| **Tailwind** | The styling system: the short words in `className="..."` |
| **TypeScript** | JavaScript with labels saying what kind of thing each value is, so mismatches are caught early |
| **Lint** | An automatic check for mistakes. There are two here: one for code (`npm run lint`), one for content (`lib/pipeline/lint.ts`) |
| **Unit test** | A small program that checks one piece of logic gives the right answer |
| **Supabase** | The hosted database plus sign-in service |
| **Postgres** | The database software inside Supabase |
| **Migration** | A dated file of database changes. Applied in order, never edited after going live |
| **Seed** | The starter data loaded into a new database (`supabase/seed.sql`) |
| **RLS (row level security)** | Rules inside the database that decide which rows each person may see or change. The real lock; anything in the browser is only a curtain |
| **Anonymous sign-in** | A visitor gets a real user id on their first tap, with no email. Adding an email later keeps the same id and history |
| **Publishable key** | The Supabase key that is safe to ship in the app. It can only do what RLS allows |
| **Service role key** | The Supabase key that bypasses RLS. Server only. Never put it in a `NEXT_PUBLIC_` variable |
| **pgTAP** | The tool the database tests are written in |
| **Parity test** | The test that proves the phone's scoring and the database's scoring give identical answers |
| **Mutation test** | Deliberately breaking a rule to confirm a test notices |
| **Store (Zustand)** | The app's memory on the device: what you equipped and ticked |
| **Sync queue** | Ticks waiting to be sent to the server, kept safe while offline |
| **Hydrated** | The moment the app has loaded your saved state after the page appears |
| **PWA** | A website that can be installed like an app and opened offline |
| **Service worker** | The small file (`public/sw.js`) that makes offline opening work |
| **Slug** | A paper's short name in web addresses: `steps-days-per-week` |
| **Protocol** | The trackable routine drawn from one paper |
| **Step** | One line of a protocol. *Action*: a tick box. *Weekly target*: counted from ticks. *Condition*: true or false from your settings |
| **Equip** | Add a paper's protocol to your Life Game |
| **Dormant** | A protocol untouched for over a week. It pauses and stops counting against the score |
| **Extraction** | Stage 1: pulling facts out of a paper, each with the passage it came from |
| **The gate** | Stage 2: code that checks every extracted fact against the paper's text |
| **Editorial** | Stage 3: writing the read from the checked facts only |
| **Fact / ref** | One checked statement from the paper, with an id. A sentence's `[ref]` names the facts it rests on |
| **RCT** | Randomized controlled trial: people are assigned to groups by chance. The design that can show cause |
| **Observational study** | Researchers watch what people already do. Shows what goes together, not what causes what |
| **Meta-analysis** | Many studies' results pooled into one estimate |
| **Effect size** | How big the difference was, in real units (kg, percentage points) |
| **95% CI (confidence interval)** | The range the true average plausibly sits in. If it includes zero, the study cannot tell an effect from none |
| **Absolute vs relative** | "Risk fell from 4% to 3%" is absolute (1 point). "Risk fell 25%" is relative, and sounds bigger. The lint requires the absolute figure |
| **GRADE** | A standard way researchers rate how far a result can be trusted: high, moderate, low, very low |
| **Evidence-weighted adherence** | The main score: how much of what you took on is in place today, each item counted by its evidence grade |
| **Consistency** | The second number: of today's tick boxes, how many you ticked. Every box equal |
| **CC-BY** | A licence that lets anyone reuse a paper, commercially too, if they credit the authors |
| **DOI / PMCID** | A paper's permanent ids. The DOI works at doi.org; the PMCID at PubMed Central |
| **Retraction** | A journal withdrawing a paper because it should not be relied on |

---

## 13. When something goes wrong

| You see | Likely cause | Do |
|---|---|---|
| `content build failed` | A published paper breaks a content rule | Read the lines above it: rule, place, sentence. Fix `editorial.json` |
| `generated files are out of date` | You edited a paper but did not rebuild | `npm run content:build` |
| `parity` test fails | Scoring was changed on one side only | Change the other side, then `npm run parity:gen` |
| Lint error mentioning "Per-paper components" | A simulator or widget broke the widget guard | Get the value from `useProtocol()` instead (part 4.6) |
| Me tab says "Demo mode" on the live site | The two Supabase variables are missing on the host | Add them in the host's dashboard, redeploy |
| "Could not reach the server" or "captcha verification process failed" on the Me tab | Anonymous sign-in is off; or CAPTCHA is on in Supabase but the site key is not deployed, or this hostname is not on the Turnstile site | Part 3.1 step 3; the CAPTCHA steps under part 3.1 |
| A change does not appear on a phone | The installed app is showing its saved copy | Close and reopen it; pages are fetched fresh whenever there is a connection |
| `quote not found in the source` | The model paraphrased instead of copying | Fix the quote in `extraction.json` by copying from `source.txt`, or run `extract` again |
