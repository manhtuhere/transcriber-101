# transcriber-101

Turn a transcribed book into an audiobook you can listen to.

Upload a plain-text transcript with chapters separated by a line of 19 equals signs, and the
app splits it, synthesizes each chapter with Deepgram Aura, stores the audio in Supabase, and
gives you a player that tracks your position across the whole book.

Built as a personal tool: one user, one library.

```
transcript.txt ──> split on ═══ ──> Deepgram Aura ──> ffmpeg ──> Supabase Storage
                                                                        │
                        browser  ◀── signed URLs ── player with chapter markers
```

## How it works

Three pieces, deliberately separated:

| Piece | Runs where | Does |
| --- | --- | --- |
| **React SPA** | browser | upload, split, preview, library, player (React 19, TanStack Router + Query, Tailwind v4) |
| **Supabase** | hosted | Postgres, Auth, Storage, Realtime |
| **Worker** | your machine | claims pending chapters, calls Deepgram, encodes, uploads |

The worker is a local CLI rather than a server function because synthesis takes minutes and
needs ffmpeg — neither of which suits an edge runtime. Run it when you have books to convert;
it exits when the queue is empty.

### Chapter markers without a single file

A book is stored as one mp3 per chapter, never concatenated. Each chapter row carries
`duration_sec` and `start_offset_sec` (the cumulative duration of everything before it), and
the worker writes a `manifest.json` alongside the audio.

The player treats `startOffsetSec + audio.currentTime` as the position in the book. That gives
a continuous scrub bar, resume across chapters, and seeking that jumps between files — without
ever building a single large file, and regenerating one chapter rewrites one mp3 rather than
the whole book.

## Requirements

- **Node 22+** — pinned in `.nvmrc`. Node 20 breaks three dependencies: jsdom 30's engine
  range, execa 10's use of `Set.prototype.union`, and `realtime-js`, which needs a native
  `WebSocket` and throws from `createClient` without it.
- **ffmpeg and ffprobe** on `PATH` — `sudo apt install ffmpeg`. The worker concatenates PCM
  chunks and encodes once; without them it exits with a message rather than failing mid-book.
- A **Supabase** project and a **Deepgram** API key.

## Setup

```bash
nvm use              # Node 22
npm install
cp .env.example .env # then fill it in
```

Apply the schema to your Supabase project:

```bash
supabase link --project-ref <your-ref>
supabase db push     # runs supabase/migrations in order
```

Then generate the typed schema, which the whole codebase compiles against:

```bash
supabase gen types typescript --project-id <your-ref> > src/types/database.ts
```

Regenerate that file after **every** migration — it is generated, never hand-edited.

### Environment

`VITE_*` variables are inlined into the client bundle. The secret key and the Deepgram key must
never carry that prefix.

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | `sb_publishable_…`, safe to ship; RLS protects the data |
| `SUPABASE_URL` | worker, tests | |
| `SUPABASE_SECRET_KEY` | worker, tests | `sb_secret_…` from Project Settings → API Keys. **Not** an `sbp_` personal access token, which is account-level and will not authenticate against the project |
| `DEEPGRAM_API_KEY` | worker | |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | Playwright | credentials for the seeded test user |
| `VITE_AUTH_BYPASS` | dev only | see below |

## Using it

```bash
npm run dev          # http://localhost:5173
```

1. Sign in — magic link to your email.
2. **Add a book**: drop a `.txt`, check the parsed chapters, name it, pick a voice. The preview
   shows the character count and what synthesis will cost before anything is written.
3. **Save & queue** — the book is created with every chapter `pending`.
4. Run the worker:

```bash
npm run worker        # convert what is queued, then exit
npm run worker:watch  # or leave this running and it picks up new books itself
```

5. Watch the book page fill in — chapter statuses stream over Realtime. Failed chapters get a
   Retry button.
6. Listen. Position is saved per book in `localStorage`, so you resume where you stopped.
7. **Bookmark** anything worth coming back to with the ribbon on its cover. The library then
   offers a Favourites filter and a "Favourites first" sort.

### What it costs

Deepgram Aura is **$0.030 per 1k characters** (Aura-2) or **$0.0150** (Aura-1), so a ~300-page
book of roughly 500k characters runs about **$15 or $7.50**. The voice is chosen per book, and
the upload preview shows the estimate before you commit. There is a 500k-character cap per
book, checked before anything is written.

### Voices

Twenty to choose from, in two groups:

- **Storytelling (Aura-2)** — the eight English voices Deepgram itself tags for storytelling,
  including `draco` (warm British baritone) and `pluto` (smooth, calm baritone). Aura-2 has 37
  English voices, but the rest carry use cases like IVR and customer service: tuned for a
  two-second utterance, not four hours of prose.
- **Classic (Aura-1)** — all twelve English voices at half the price, and the only place to
  find British and Irish accents.

The default is `aura-2-athena-en`, calm and smooth. The model id is the only lever Deepgram
offers: there is no SSML and no parameter for rate, pitch or style.

The voice is fixed when the book is created; changing it afterwards is not built yet.

Storage is the other limit: mono mp3 at 64 kbps is about 28 MB per hour, so a 10-hour book is
~280 MB against Supabase's 1 GB free tier.

### Dev auth bypass

### Signing in during development

The sign-in page carries a **"Sign in as developer"** button in dev: one click, no magic-link
round trip. Set `VITE_DEV_EMAIL` and `VITE_DEV_PASSWORD` in `.env` and create that user in
Supabase (Authentication → Users → Add user, with **Auto Confirm User** on).

It produces a **real session**, so your books load and row-level security applies exactly as it
does in production. An earlier version faked a signed-out state instead; that could read
nothing, and let you reach Save & queue and press a button that always failed with
`42501 new row violates row-level security policy` — because `auth.uid()` was null, so
`owner_id` defaulted to null and failed the policy's `with check`. Testing against a real
session is the only version worth having.

It is compiled out of production builds: `import.meta.env.DEV` folds the branch away, and a
test greps the built bundle for the button text, the env var names and the credentials
themselves.

## Development

```bash
npm run typecheck    # tsc --build, both project references
npm run test         # unit + UI, watch
npm run test:run     # unit + UI, once
npm run test:int     # integration — needs SUPABASE_SECRET_KEY and ffmpeg
npm run test:e2e     # Playwright, all projects
npm run lint
npm run build        # typechecks first, then bundles
npm run worker       # drain the pending-chapter queue once
npm run worker:watch # keep draining as books are queued
npm run clean:storage -- --dry-run   # find audio whose book row is gone
```

Signed-out e2e specs need no keys: `npx playwright test --project=anon`.

### Layout

Atomic design, one directory per layer, and **a layer may import only from the layers below
it**:

```
constants → types → utils → lib → hooks
                      ↓              ↓
        atoms → molecules → organisms → templates → pages → app
                                                      ↑
                                       (pages compose hooks; only hooks
                                        may import lib/api or lib/supabase)
```

Every Supabase read and write is one hook in `src/hooks/` — `useBooks`, `useBook`,
`useCreateBook`, `useRetryChapter`, `useManifest`, `useAudioUrl`, `useSession`, `useSignIn`,
`useSignOut`, `useChapterUpdates` — with the query keys centralised in `hooks/keys.ts`.

This is enforced by `src/test/architecture.test.ts`, which resolves every relative import to
its layer and fails on a violation — oxlint has no path-restriction rule, so the test is the
enforcement. Conventions in full: [`CLAUDE.md`](CLAUDE.md).

Styling is Tailwind v4. `src/index.css` is tokens and base styles only; layout and spacing
live on the components. `PageShell` owns page rhythm via `space-y-6`, so sections carry no top
margin of their own.

Worker code lives outside `src/` in `scripts/`: pure modules in `scripts/lib/` (`chunkText`,
`manifest`, `deepgram`, `env`), the two that touch the world (`audio` shells out to ffmpeg,
`synthesize` drives Supabase), and `scripts/worker.ts`.

### Tests

| Layer | Files | Runs against |
| --- | --- | --- |
| Unit | `src/**/*.test.ts`, `scripts/**/*.test.ts` | pure functions, no mocks |
| UI | `src/**/*.test.tsx` | jsdom, `lib/api` mocked |
| Integration | `test/integration/*.test.ts` | real Supabase, real ffmpeg, Deepgram mocked |
| E2E | `e2e/*.spec.ts` | real browser |

The extension is the rule: `.ts` tests are pure and run in node, `.tsx` tests render in jsdom.

Two things worth knowing before writing more of these:

- **A PostgREST builder is a lazy thenable.** `void supabase.from(...).update(...)` builds the
  request and never sends it. Always `await` or `.then()`.
- **`describe.skipIf` still runs its callback** to collect tests, so build clients inside
  `beforeAll` — a top-level `createClient` throws on a machine with no keys and the file
  reports as a failed suite rather than a clean skip.

## Known gaps

- The **worker still needs a process running** — `npm run worker:watch` picks work up as it
  is queued, but nothing starts that for you at boot. A systemd user unit would finish the job.
- **Positions are per-browser**, held in `localStorage` rather than the database, so resume
  does not follow you to another device.
- **No cover art** — covers are generated from each book's title and chapter count.
- An **intermittent integration failure**, seen twice, both times when integration ran straight
  after the other suites. Clean on every isolated run. Cause unknown; the leading guess is
  Supabase auth throttling from creating test users in quick succession.

## Documents

- [`PLAN.md`](PLAN.md) — architecture and the decisions behind it
- [`doc/implementation-plan.md`](doc/implementation-plan.md) — the TDD build order, phase by
  phase, with a log of every claim verified against a live source
- [`CLAUDE.md`](CLAUDE.md) — conventions for working in this repo
