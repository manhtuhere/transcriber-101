# Implementation Plan — TDD

Companion to [`../PLAN.md`](../PLAN.md), which holds the architecture. This document is the
build order: seven phases, each one a red → green → refactor cycle with its tests declared up
front.

**The rule for every phase: the tests in "Tests first" are written and failing before any
implementation file in that phase is created.** A phase is done when its tests pass and no
test from an earlier phase has broken.

## Status

All eight phases are built and **verified against the live project**:

| Suite | Result |
| --- | --- |
| Unit + UI | 176 passed |
| Integration (real Supabase, real ffmpeg, Deepgram mocked) | 23 passed |
| E2E (5 signed-out + 14 authenticated) | 19 passed |
| typecheck / lint / build | clean |

Audio is produced end to end: the synthesis suite runs real ffmpeg concat and encode, real
ffprobe, and real Storage uploads. Only Deepgram is mocked — with a generated WAV tone, so the
audio pipeline itself is exercised, not stubbed.

Runtime is **Node 22** (`.nvmrc`, `engines`). Node 20 broke three separate dependencies —
jsdom 30, execa 10, and `realtime-js` (no native `WebSocket`) — which is why the upgrade was
not optional.

### Found by these tests

**A real RLS hole.** `chapters`/`chunks` policies only checked `owner_id = auth.uid()`. Since
`owner_id` defaults to `auth.uid()`, any authenticated user could insert a chapter pointing at
someone else's `book_id`: the row passed as their own, stayed invisible to the book's owner,
and would still have been claimed and synthesized by the worker, which uses the secret key and
bypasses RLS — spending the owner's Deepgram credit and writing audio into their folder.
Migration `0005` adds an `EXISTS` check on the parent row; three regression tests cover insert,
move, and the worker's view.

Two of the failures were bugs in the tests themselves, both worth remembering:

- **A PostgREST builder is a lazy thenable.** `void supabase.from(...).update(...)` constructs
  the request and never sends it. The realtime test looked like a broken subscription when
  nothing had actually been updated. Always `await` or `.then()`.
- **`SUBSCRIBED` does not mean the server-side listener is ready.** Updating a row the instant
  the callback fires races registration and the payload is dropped. The test now waits before
  mutating.

## Test stack

| Layer | Tool | Location | Runs against |
| --- | --- | --- | --- |
| Unit | `vitest` (node env) | `src/**/*.test.ts`, `scripts/**/*.test.ts` | pure functions, no I/O |
| UI | `vitest` + `@testing-library/react` + `jsdom` | `src/**/*.test.tsx` | React components, data layer mocked |
| Integration | `vitest` (node env) | `test/integration/*.test.ts` | real Supabase project, real ffmpeg, Deepgram mocked |
| E2E | `@playwright/test` | `e2e/*.spec.ts` | real browser, real Supabase, seeded data |
| Types | `tsc --build` | whole repo | `npm run typecheck`, and `npm run build` runs it first |

To install in Phase 0 — versions below were checked against the registry for compatibility with
this repo's Vite 8 / React 19:

| Package | Version | Note |
| --- | --- | --- |
| `vitest`, `@vitest/coverage-v8` | 4.1.11 | **required** — its Vite range is `^6 \|\| ^7 \|\| ^8`; Vitest 3.2.7 tops out at `^7`, so it cannot run on this repo's Vite 8 |
| `jsdom` | 30.0.1 | requires Node `^22.22.2` — one of the three reasons this repo is on Node 22 |
| `@testing-library/react` | 16.3.3 | peer-supports React 19 |
| `@testing-library/user-event` | 14.6.6 | |
| `@testing-library/jest-dom` | 7.0.1 | peers `vitest`, no Jest needed |
| `msw` | 2.15.0 | node-side Deepgram interception |
| `@supabase/supabase-js` | 2.112.4 | |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | CSS-first config; `@theme` tokens, no tailwind.config.js |
| `@tanstack/react-router` | 1.170.32 | code-based route tree; file-based routing would generate `src/routes/` and `routeTree.gen.ts` outside the enforced layers |
| `@tanstack/react-query` | 5.102.8 | |
| ~~`execa`~~ | — | **dropped**: execa 10 calls `Set.prototype.union`. `node:child_process` `execFile` takes an argv array, spawns no shell, and needs no dependency |
| `dotenv` | 17.4.2 | loads `.env` for the worker, integration tests, and the Playwright config |
| `typescript`, `@types/node` | 5.x | the whole codebase is TypeScript |

**Node 22 is required**, pinned by `.nvmrc` and `engines: { node: ">=22.12.0" }`. Node 20
broke three dependencies in three different ways, which is what settled it:

| Dependency | Failure on Node 20 |
| --- | --- |
| `jsdom` 30 | engine range starts at `^22.22.2` |
| `execa` 10 | calls `Set.prototype.union` at import time |
| `@supabase/realtime-js` | `Node.js detected but native WebSocket not found` — thrown from `createClient`, so *every* integration test died before reaching the network |

Installed here via nvm, so the system Node 20 at `/usr/bin/node` is untouched.

Vitest 4 configures multiple environments with `test.projects` in `vitest.config.ts`; the
separate workspace file from Vitest 2 is gone.

### TypeScript layout

Two project references under a solution `tsconfig.json`, because browser code and Node code
need different `lib` and `types`:

- **`tsconfig.app.json`** — `src` and `test`, DOM libs, `jsx: react-jsx`. `types` includes
  `node` solely for the test files that read fixtures off disk; nothing in `src/lib` or
  `src/pages` may import a node builtin.
- **`tsconfig.node.json`** — configs, `e2e`, `scripts`. Node types, no DOM.

`strict` plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax`, and `erasableSyntaxOnly` are on. `noUncheckedIndexedAccess` is the one
that changes how code is written: every array index comes back possibly-`undefined`, which is
what forces the splitter and the manifest builder to prove their indexes exist.

Database types are **generated, not hand-written**:

- `src/types/database.ts` — `supabase gen types typescript --project-id satvpduraxbmxapbjhrw`.
  Regenerate after every migration.
- `src/types/book.ts` — hand-written narrowing on top. The status columns are check
  constraints, not Postgres enums, so the generator widens them to `string`; `BookStatus` and
  `ChapterStatus` restore the unions, and `api.ts` is the single place rows are cast on the way
  in.

If those unions start drifting from the constraints, the fix is to convert the status columns
to real Postgres enums — then the generator emits the unions and `types/book.ts` shrinks.

### Atomic design layering

The full table lives in [`../CLAUDE.md`](../CLAUDE.md). The short version, lowest layer first:

```
constants → types → utils → lib → hooks
                      ↓              ↓
        atoms → molecules → organisms → templates → pages → app
                                                      ↑
                                       (pages compose hooks; only hooks
                                        may import lib/api or lib/supabase)
```

Three rules follow from it, and all three are what make the test pyramid work:

1. **Only hooks touch `lib/api`.** One hook per call in `src/hooks/`, keys centralised in
   `hooks/keys.ts`. Pages compose hooks; components take data and callbacks as props and may
   not import hooks. UI tests still mock `lib/api` at that one seam — hooks reach it
   transitively — so extracting the hooks needed no test changes at all.
2. **`utils/` is pure**: no framework, no I/O, only `types` and `constants`. Splitting,
   chunking, cost estimation, manifest building, and player position math all live here and get
   exhaustive unit tests with zero mocks.
3. **`constants/` imports nothing**, `types/` imports only `constants`, type-only. Every magic
   number, rate, regex, and status list has exactly one home.

**This is enforced by `src/test/architecture.test.ts`**, which walks the tree, resolves every
relative import to its layer, and fails on a violation — oxlint has no path-restriction rule,
so the test is the enforcement. It also checks filename casing and that `utils`/`constants`/
`types` hold no JSX. Each rule was verified by planting a deliberate violation and watching it
fail; do not weaken it to make a change pass, move the code instead.

### Shared helpers built in Phase 0

- `src/test/renderWithProviders.tsx` — wraps a component in `QueryClientProvider` (retry off) +
  `MemoryRouter` at a given route.
- `test/fixtures/book.txt` — 3-chapter sample separated by 19 `=`, with edge cases (trailing
  whitespace on a delimiter line, a chapter whose first line is blank).
- `test/fixtures/tone.wav` — 0.5 s WAV, the canned Deepgram response for tests.
- `scripts/seed-test.ts` — secret-key script that wipes and re-creates the e2e test user's
  books. Idempotent; every e2e run starts from it.

---

## Phase 0 — Test harness

No product code. This phase exists so every later phase can start with a failing test.

**Tests first**

Nothing to red/green — this phase's deliverable *is* the harness. Verify it by writing one
throwaway assertion per layer and deleting them once green:

| Layer | Smoke check |
| --- | --- |
| Unit | `vitest run` executes and reports a trivial `expect(1).toBe(1)` |
| UI | a `<div>hello</div>` renders through `renderWithProviders` and `getByText('hello')` finds it |
| E2E | the existing `e2e/app.spec.ts` still passes |

**Implementation**

- `vitest.config.ts` with three projects: `unit` (node), `ui` (jsdom, `setupFiles` loading
  `@testing-library/jest-dom`), and `integration` (node, long timeouts). The extension is the
  whole rule for the first two: `.ts` tests are pure logic and run in node, `.tsx` tests render
  and run in jsdom.
- `package.json` scripts: `test` (unit + ui watch), `test:run`, `test:e2e`, `test:all`.
- `.env.example` documenting `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  (`sb_publishable_…`), `SUPABASE_SECRET_KEY` (`sb_secret_…`), `DEEPGRAM_API_KEY`. Use the
  modern key pair, not the legacy `anon` / `service_role` JWTs — both are provisioned on the
  project, but the modern pair rotates independently.
- `.gitignore`: add `.env`, `.env.local`.
- Delete `src/App.css` template content and `e2e/app.spec.ts`'s counter test in Phase 1, not
  here — keep a green baseline.

**Done when** all four commands run clean.

---

## Phase 1 — Schema, auth, RLS

**Goal:** a logged-in user can reach `/dashboard`; nobody else can, and no user can read
another user's rows.

### Tests first

**Integration — `test/integration/rls.test.ts`** (real project, two users created with the
secret key in `beforeAll`, torn down in `afterAll`)

Build the admin client **inside `beforeAll`**, never in the `describe` body:
`describe.skipIf` still executes its callback to collect the tests, so a top-level
`createClient` throws `supabaseKey is required` on a machine with no secret key and the whole
file reports as a failed suite instead of a clean skip.

```
test('owner reads own book')                → select by id returns 1 row
test('non-owner reads zero rows')           → user B select on A's book id returns []
test('non-owner update is rejected')        → update returns 0 rows affected
test('non-owner delete is rejected')        → delete returns 0 rows affected
test('anon client reads zero books')        → publishable-key client with no session returns []
test('owner_id defaults to auth.uid()')     → insert without owner_id, row comes back owned by caller
test('chapter inherits book ownership')     → user B cannot select chapters of A's book
test('audio bucket rejects anon download')  → unauthenticated storage download errors
```

**UI — `src/pages/Login.test.tsx`** (`api.signInWithOtp` mocked)

```
test('renders email field and submit button')
test('submitting a valid email calls signInWithOtp once with that email')
    → the component must wrap the call: react-query v5 invokes mutationFn as
      (variables, context), so passing the api function by reference makes it
      receive a second argument and the arity assertion fails
test('shows "check your email" confirmation after a successful send')
test('shows the error message when signInWithOtp rejects')
test('does not call signInWithOtp when the email field is empty')
```

**UI — `src/app/ProtectedRoute.test.tsx`** (`api.getSession` mocked)

```
test('renders children when a session exists')
test('redirects to /login when no session exists')
test('renders a loading state while the session is resolving')
```

**Unit — `src/lib/devAuth.test.ts`** — the dev auth bypass, a truth table over two inputs

```
test('is on only when dev mode and the flag agree')
test('is off in a production build even when the flag is set')  ← the one that matters
test('is off in dev when the flag is absent')
test('is off in dev when the flag is anything but the string "true"')
```

**UI — `src/app/ProtectedRoute.bypass.test.tsx`** (`devAuth` mocked to on)

The bypass is a module constant, so it cannot vary per test inside one file — the on state
gets its own file rather than a `vi.doMock` dance.

```
test('renders the protected page without a session')
test('does not call getSession at all')
test('shows a visible warning so bypassed state is never mistaken for a real session')
```

**E2E — `e2e/auth.spec.ts`**

```
test('unauthenticated visit to /dashboard redirects to /login')
    → goto('/dashboard'); expect(page).toHaveURL(/\/login/)
test('unauthenticated visit to /upload redirects to /login')
test('authenticated user lands on /dashboard')
    → uses storageState from global setup; heading "Your library" visible
test('authenticated user is not redirected away from /upload')
```

E2E auth uses a **setup project**, not Playwright's `globalSetup`. `globalSetup` is global by
definition: it runs before every project, so a missing `SUPABASE_SECRET_KEY` would block the
signed-out specs too, even though those need no key. A setup *project* is a per-project
dependency instead. Three projects:

| Project | Matches | Needs the secret key |
| --- | --- | --- |
| `anon` | `*.anon.spec.ts` | no — runs anywhere |
| `setup` | `auth.setup.ts` | yes |
| `chromium` | everything else, `dependencies: ['setup']`, `storageState` | yes |

`auth.setup.ts` calls `auth.admin.createUser({ email, password, email_confirm: true })` — the
`email_confirm` flag matters, since an unconfirmed user cannot `signInWithPassword` and the
failure reads as a wrong password — then signs in and writes the session into `storageState`
under supabase-js's `sb-<ref>-auth-token` localStorage key. Magic link is never exercised in
e2e; it is covered by the Login UI test.

### Implementation

- Migration `0001_init.sql`: `books`, `chapters`, `chunks` per `PLAN.md` §2 —
  `owner_id uuid not null default auth.uid() references auth.users`, `enable row level security`,
  and a `for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())` policy on
  each. Indexes on `chapters(book_id, idx)` and `chapters(status)`.
- Migration `0002_storage.sql`: private `audio` bucket + owner-scoped storage policies keyed on
  the first path segment being a book the caller owns.
- `src/types/database.ts` (generated), `src/types/book.ts` (narrowed unions),
  `src/vite-env.d.ts` (typed `import.meta.env`).
- `src/lib/supabase.ts` — `createClient<Database>` so every query is typed against the schema.
- `src/lib/api.ts` (`signInWithOtp`, `getSession`, `signOut`).
- `src/lib/devAuth.ts` — the dev auth bypass. Two independent conditions:
  `import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true'`, written inline so Vite
  folds it to `false` at build time and the branch leaves the bundle entirely. Verified by
  building with `VITE_AUTH_BYPASS=true` and confirming the banner text, the console warning,
  and the variable name are all absent from `dist/`. `ProtectedRoute` disables the session
  query with `enabled: !AUTH_BYPASS` rather than returning early, so the hook still runs
  unconditionally and `getSession` never fires.

  Playwright forces `VITE_AUTH_BYPASS: 'false'` in its `webServer.env`. Without that, a local
  `.env` with the bypass on would fail the signed-out specs — they assert the very redirect the
  bypass removes — and the failure would read as a broken redirect. Confirmed by flipping the
  local flag on and re-running the `anon` project green.

  The bypass grants no data: requests still go out unauthenticated and RLS answers with empty
  results. It is for client-side pages, `/upload` above all.
- `src/pages/Login.tsx`, `src/app/ProtectedRoute.tsx`, router in `src/app/App.tsx` with
  `/login`, `/dashboard`, `/upload` placeholders.

**Done when** all Phase 1 tests are green and `e2e/app.spec.ts`'s template tests are deleted.

---

## Phase 2 — Chapter splitter and preview

**Goal:** drop a `.txt` on `/upload` and see a correct, editable chapter table with a cost
estimate. Nothing is written to the database yet.

### Tests first

**Unit — `src/utils/splitChapters.test.ts`** — the highest-value tests in the project. Pure
function, no mocks.

```js
splitChapters(text) → [{ idx, title, body, charCount }]
```

```
test('splits on a line of exactly 19 equals signs')          → 3 segments from the 2-delimiter fixture
test('splits on more than 19 equals signs')                  → '=' * 25 also delimits
test('does not split on 18 equals signs')                    → stays one chapter
test('does not split on equals signs with other text on the line')
    → 'a = b ==================' is body text, not a delimiter
test('tolerates trailing whitespace and \\r on the delimiter line')
test('normalizes CRLF to LF in chapter bodies')
test('strips a leading BOM from the first chapter')
test('drops empty segments from leading, trailing, and doubled delimiters')
    → text starting with a delimiter yields no empty chapter 0
test('uses the first non-empty line as the title')
test('does not repeat the title line in the body')
test('falls back to "Chapter N" when the first line is prose, not a heading')
    → "usable heading" is defined as a first non-empty line of <= 80 chars;
      anything longer stays in the body and the chapter is named positionally
test('numbers the fallback title by position, not by segment index')
test('assigns contiguous idx starting at 0')
test('reports charCount as the body length after trimming')
test('returns an empty array for empty or whitespace-only input')
test('returns a single chapter when the text has no delimiter')
```

**Unit — `src/utils/estimate.test.ts`**

```
estimateCost(totalChars) → { usd }        estimateRuntime(totalChars) → { seconds }
```

```
test('cost is chars / 1000 * rate')                → 500_000 chars → 15.00 at $0.03/1k
test('cost rounds to cents')
test('zero chars costs zero')
test('runtime scales with chars and respects the concurrency cap')
test('runtime is never below a floor for a tiny book')  → non-zero for 10 chars
```

**UI — `src/pages/Upload.test.tsx`** (`api` mocked, no network)

```
test('shows an empty state before a file is chosen')
test('renders one row per chapter after a file is dropped')
    → fixture book.txt → 3 rows, titles match
test('shows per-chapter character counts')
test('shows total cost and estimated runtime for the whole book')
    → assert a human duration, not a digit: the fixture is small enough to hit
      the runtime floor, which renders "under a minute"
test('editing a chapter title updates that row only')
test('removing a chapter renumbers the remaining rows contiguously')
test('rejects a non-text file with a visible error and renders no rows')
    → upload with { applyAccept: false }: user-event enforces the accept
      attribute and would swallow the file before the component sees it, but a
      real browser treats accept as a picker hint only, so the guard is real
test('rejects a file over the size cap with a visible error')
test('disables the queue button until title and author are filled')
test('does not call api.createBook on parse alone')   → guards against premature writes
```

**E2E — `e2e/upload-preview.spec.ts`**

```
test('uploading a text file shows its chapters')
    → setInputFiles(book.txt); expect rows = 3; first row title "Chapter One"
test('the cost estimate is visible before queueing')
    → expect(getByTestId('cost-estimate')).toContainText('$')
test('an unsupported file type shows an error and no chapter rows')
test('the queue button is disabled until metadata is complete')
```

### Implementation

- `src/utils/splitChapters.ts`, `src/utils/estimate.ts`.
- `src/pages/Upload.tsx` — file input + drop zone, `<table>` of editable rows, estimate panel,
  disabled **Save & queue** button. All state local; no writes.

**Done when** the splitter's 16 unit tests pass with no branches added that a test did not
demand.

---

## Phase 3 — Save and queue

**Goal:** confirming the preview writes one `book` and N `chapter` rows and the book shows up
on `/dashboard` as `processing`.

### Tests first

**Unit — `src/utils/buildInsert.test.ts`**

```
buildBookInsert(meta, chapters) → { book, chapters }
```

```
test('book status is "processing" on queue')
test('every chapter row starts at status "pending"')
test('chapter rows carry idx, title, text_content, char_count')
test('every chapter gets the selected voice')
test('source_hash is stable for identical text')      → same input, same hash
test('source_hash differs when any chapter body changes')
test('audio_path, duration_sec and start_offset_sec are null before synthesis')
```

**UI — `src/pages/Upload.test.tsx`** (extended)

```
test('clicking Save & queue calls createBook once with the built payload')
test('the queue button is disabled while the request is in flight')
test('navigates to /books/:id on success')
test('shows an error and stays on the page when createBook rejects')
test('a second click does not create a second book')  → idempotency guard
```

**UI — `src/pages/Dashboard.test.tsx`** (`api.listBooks` mocked)

```
test('renders an empty state when there are no books')
test('renders one card per book')
test('a card shows title, author, and chapter count')
test('a processing book shows a "Processing" badge and no play link')
test('a ready book shows its total duration and a play link')
test('a failed book shows a "Failed" badge')
test('shows an error state when listBooks rejects')
```

**E2E — `e2e/queue.spec.ts`**

```
test('uploading then queueing creates a book visible on the dashboard')
    → upload fixture → fill title/author → click Save & queue
    → expect URL /books/<id>; goto /dashboard; card with that title visible, badge "Processing"
test('the queued book lists all three chapters as pending')
    → on /books/:id, 3 rows, each status "Pending"
```

E2E cleanup: the spec deletes the book it created in `afterEach` via the secret-key client so
runs stay repeatable.

### Implementation

- `src/utils/buildInsert.ts`.
- `src/lib/api.ts`: `createBook`, `listBooks`, `getBook`, `updateChapter`.
- `src/pages/Dashboard.tsx`, `src/pages/BookDetail.tsx` (static list for now).
- Wire the **Save & queue** button.

---

## Phase 4 — Worker: chunking and synthesis

**Goal:** `npm run worker` turns every `pending` chapter into an mp3 in Storage. Pure logic
first, then the I/O shell around it.

### Tests first

**Unit — `scripts/lib/chunkText.test.ts`**

```
chunkText(text, maxChars = 1800) → string[]
```

```
test('returns one chunk when the text is under the limit')
test('never returns a chunk longer than maxChars')
test('splits on sentence boundaries, not mid-sentence')
    → each chunk ends with . ! ? or is the final chunk
test('never splits inside a word')
    → rejoining chunks equals the original text
test('rejoining all chunks reproduces the input exactly')  → the round-trip invariant
test('hard-splits a single sentence longer than maxChars at a space')
test('returns an empty array for empty input')
test('preserves paragraph breaks inside a chunk')
```

**Unit — `scripts/lib/manifest.test.ts`**

```
buildManifest(book, chapters) → manifest object
```

```
test('startOffsetSec of the first chapter is 0')
test('startOffsetSec accumulates preceding durations')   → [120, 90, 60] → offsets [0, 120, 210]
test('totalDurationSec is the sum of chapter durations')
test('chapters are ordered by idx regardless of input order')
test('throws when a chapter is missing a duration')      → refuses to build from an unfinished book
```

**Unit — `scripts/lib/deepgram.test.ts`** (`msw` intercepting `api.deepgram.com`)

Deepgram's `encoding` and `container` are **separate** query parameters — `encoding` defaults
to `mp3`, `container` to `wav`. There is no `encoding=wav`; PCM WAV is
`encoding=linear16&container=wav`. Model ids carry a language suffix (`aura-2-thalia-en`).

```
test('posts the chunk text as JSON to /v1/speak')
test('sends the Authorization: Token header')
test('sends the full model id including the language suffix')
    → query model === 'aura-2-thalia-en'
test('requests linear16 in a wav container at 24000 Hz')
    → asserts encoding, container and sample_rate separately — guards the encoding=wav mistake
test('returns the audio buffer on 200')
test('retries on 429 and succeeds on the second attempt')
test('retries on 500 with exponential backoff')
test('gives up after the retry cap and throws with the status code')
test('does not retry on 401')          → an auth error is not transient
test('does not retry on 413 and names the character limit in the error')
    → 413 is "Input Text Exceeds Character Limits": the chunker is broken, retrying cannot help
test('never sends a chunk at or above the 2000-char API limit')
    → property check over the fixture book: every outgoing body is < 2000 chars
```

**Integration — `test/integration/synthesize.test.ts`** (real ffmpeg, real Supabase Storage,
Deepgram served `tone.wav` by msw)

```
test('synthesizes a chapter end to end')
    → seeds a 2-chunk chapter; runs synthesizeChapter
    → status becomes "ready", audio_path is set, duration_sec ≈ 2 × 0.5 s (±0.1)
test('uploads a playable mp3 to audio/<bookId>/<idx>-<slug>.mp3')
    → downloads it back; ffprobe reports codec mp3, 1 channel
test('marks the chapter failed and records the error when Deepgram gives up')
    → msw returns 500 always; status "failed", error text non-empty, no partial upload
test('skips a chunk whose (text_hash, voice) is already cached')
    → second run issues zero Deepgram requests
test('claim_next_chapter returns exactly one row per call')
test('claim_next_chapter sets that row to synthesizing and stamps claimed_at')
test('claim_next_chapter returns no rows when nothing is pending')
test('two concurrent claim_next_chapter calls return different chapters')
    → SKIP LOCKED holds; issue both before either commits
test('resets a claim older than the stale timeout back to pending')
test('writes manifest.json and flips the book to ready once the last chapter finishes')
test('does not flip the book to ready while any chapter is still pending')
```

**E2E — `e2e/worker-result.spec.ts`** — the browser cannot run the worker, so this spec seeds
a **completed** book with real audio via `scripts/seed-test.ts` and asserts the UI reflects it.

```
test('a fully synthesized book shows as Ready on the dashboard')
test('the book detail page shows every chapter as Ready with a duration')
```

### Implementation

- Migration `0003_claim.sql` — the claim function. **`FOR UPDATE SKIP LOCKED` cannot be
  expressed through `supabase-js`**: PostgREST has no row-locking clause, so the claim must live
  in Postgres and be reached with `rpc('claim_next_chapter')`. The statement below was executed
  against the project to confirm the syntax, then rolled back:

  ```sql
  create function claim_next_chapter() returns setof chapters
  language sql as $$
    update chapters c set status = 'synthesizing', claimed_at = now()
    from (select id from chapters
          where status = 'pending' order by book_id, idx
          for update skip locked limit 1) picked
    where c.id = picked.id
    returning c.*;
  $$;
  ```

  The worker connects with the secret key, so RLS is bypassed and no `security definer` is
  needed.
- `scripts/lib/chunkText.ts`, `scripts/lib/manifest.ts`, `scripts/lib/deepgram.ts`,
  `scripts/lib/audio.ts` (ffmpeg concat + ffprobe via `execa`).
- `scripts/worker.ts` — claim loop over `rpc('claim_next_chapter')`, stale-claim reset,
  per-chapter orchestration, manifest write, book rollup.
- `package.json`: `"worker": "node scripts/worker.ts"`.

**Done when** the integration suite passes twice in a row without manual cleanup between runs.

---

## Phase 5 — Bookstore and player

**Goal:** `/dashboard` is the library and `/books/:id/listen` plays a book with working chapter
markers.

### Tests first

**Unit — `src/utils/playback.test.ts`** — the chapter-marker math, pure and mock-free.

```
toBookPosition(chapter, currentTime) → seconds
toChapterPosition(manifest, bookSeconds) → { idx, offsetInChapter }
formatDuration(seconds) → 'H:MM:SS'
```

```
test('book position is startOffsetSec plus currentTime')
test('book position at the very start of chapter 0 is 0')
test('resolves a book position inside the first chapter')
test('resolves a book position inside a later chapter')
test('a position exactly on a chapter boundary resolves to the later chapter')
test('a position past the end clamps to the final chapter end')
test('a negative position clamps to chapter 0 at offset 0')
test('round-trips: toChapterPosition(toBookPosition(c, t)) returns c and t')
test('formats sub-hour durations without an hour component')
test('formats hours, zero-padding minutes and seconds')
```

**UI — `src/pages/Listen.test.tsx`** (`api.getBookWithManifest` mocked; `HTMLMediaElement`
methods stubbed in the jsdom setup file)

```
test('renders the chapter list from the manifest')
test('marks the current chapter as active')
test('clicking a chapter switches the audio source to that chapter file')
test('Next advances to the following chapter and starts at 0')
test('Next on the final chapter is disabled')
test('Previous on the first chapter is disabled')
test('the scrub bar shows whole-book position, not chapter position')
    → chapter 1 at t=30 with offset 120 renders "0:02:30"
test('changing playback speed sets audio.playbackRate')
test('playback position is written to localStorage on timeupdate')
test('a saved position is restored on mount, selecting the right chapter and offset')
test('a corrupt localStorage value is ignored and playback starts at 0')
```

**UI — `src/pages/Dashboard.test.tsx`** (extended)

```
test('cards are sorted newest first')
test('clicking a ready card navigates to its listen route')
```

**E2E — `e2e/listen.spec.ts`** (against the seeded ready book)

```
test('opening a book from the dashboard reaches the player')
test('the player lists every chapter with its duration')
test('clicking chapter 2 loads the chapter 2 audio file')
    → expect audio src to contain '1-' ; a network request for that mp3 is observed
test('pressing play advances currentTime')
    → play, wait, expect currentTime > 0
test('reloading the page resumes near the saved position')
    → play ~3 s, reload, expect the displayed position to be within 2 s of where it stopped
```

### Implementation

- `src/utils/playback.ts`.
- `src/pages/Listen.tsx` — `<audio>`, chapter list, transport controls, speed selector,
  `localStorage` resume keyed `pos:<bookId>`.
- `src/pages/Dashboard.tsx` — cards link to `/books/:id/listen` when `status === 'ready'`.
- `api.getBookWithManifest` — signed URLs for the bucket, cached for the session.

---

## Phase 6 — Progress, retry, polish

**Goal:** watching a book synthesize is useful, and a failed chapter is one click from
recovery.

### Tests first

**UI — `src/pages/BookDetail.test.tsx`**

```
test('shows a progress summary of ready over total chapters')   → "2 of 3 chapters ready"
test('renders a status badge per chapter')
test('shows the error text on a failed chapter')
test('a failed chapter has a Retry button')
test('a ready chapter has no Retry button')
test('clicking Retry calls retryChapter with that chapter id')
test('the chapter row flips to Pending after a successful retry')
test('a realtime update to a chapter row re-renders its status without a reload')
    → emit a mocked subscription payload; badge changes Pending → Ready
test('shows a Failed banner when the book itself is failed')
```

**Integration — `test/integration/realtime.test.ts`** — Realtime is **opt-in per table**. The
project's `supabase_realtime` publication has `puballtables = false` (verified), so without a
migration the subscription connects, reports `SUBSCRIBED`, and then silently never fires. This
test is what makes that failure loud instead of a mystery:

```
test('the chapters table is a member of the supabase_realtime publication')
    → query pg_publication_tables; fails until the migration ships
test('an update to a chapter delivers a realtime payload to a subscriber')
    → subscribe, update the row with the secret key, await the event with a timeout
```

**Integration — `test/integration/retry.test.ts`**

```
test('retryChapter resets status to pending and clears the error')
test('retryChapter on a ready chapter is a no-op')
test('a re-run worker picks up the retried chapter')
test('the cached chunks are reused so the retry issues no Deepgram request for unchanged text')
```

**E2E — `e2e/retry.spec.ts`** (seed one book with a `failed` chapter)

```
test('a failed chapter shows its error on the book page')
test('clicking Retry flips the chapter badge to Pending')
test('the dashboard badge follows the book status')
```

### Implementation

- Migration `0004_realtime.sql` — `alter publication supabase_realtime add table public.chapters;`
  and `alter table public.chapters replica identity full;` (the latter so update payloads carry
  the previous row, not just the primary key).
- Supabase Realtime subscription on `chapters` filtered by `book_id`.
- `api.retryChapter`.
- `src/pages/BookDetail.tsx` — progress bar, badges, retry buttons, error display.

---

## Phase 7 — Hardening

No new features. Close the gaps the earlier phases deliberately left open.

**Tests first**

```
test('an upload over the character cap is rejected before any write')     — UI
test('the worker exits non-zero when DEEPGRAM_API_KEY is missing')        — unit
test('the worker exits non-zero when ffmpeg is not on PATH')              — unit
test('the built bundle contains no secret key value')                      — unit, greps dist/
    → pattern must be /sb_secret_[A-Za-z0-9_-]{10,}/, NOT a bare "sb_secret_":
      supabase-js ships that literal in its own key-prefix check and a naive
      grep flags a clean build, greps dist/
test('signing out clears the session and redirects to /login')            — E2E
test('a direct link to another user\'s book renders not-found, not their data') — E2E
```

**Implementation:** env validation at worker start, char cap constant shared by UI and worker,
sign-out control, a 404 route, and a coverage gate in `test:all` (fail under 80 % on `src/lib`
and `scripts/lib`, the two directories that hold all the logic).

---

## Command reference

```bash
npm run typecheck     # tsc --build across both projects
npm run test          # unit + UI, watch
npm run test:run      # unit + UI, once
npm run test:int      # integration — needs .env with the secret key
npm run test:e2e      # Playwright, all projects — needs the secret key
npx playwright test --project=anon   # signed-out specs only, no key needed
npm run test:all      # everything, with the coverage gate
npm run worker        # drain the pending-chapter queue
npm run seed:test     # reset e2e fixtures
```

## Verification log

Checked 2026-08-28 against live sources, not memory. Two of these were bugs that would have
surfaced as confusing Phase 4 failures.

| Claim | Verdict | Source |
| --- | --- | --- |
| Aura per-request character limit is 2000 | **confirmed** — over it returns `413 Input Text Exceeds Character Limits` and produces no audio | Deepgram TTS docs |
| Aura-2 costs $0.030/1k chars; ~$15 for a 500k-char book | **confirmed**; Aura-1 is $0.0150, halving it | Deepgram pricing page |
| `encoding=wav` requests WAV output | **wrong** — `encoding` and `container` are separate params (defaults `mp3` / `wav`). PCM WAV is `encoding=linear16&container=wav` | Deepgram Speak API reference |
| Model id is `aura-2-<voice>` | **imprecise** — ids carry a language suffix, e.g. `aura-2-thalia-en` | Deepgram voices docs |
| The worker can claim rows with `FOR UPDATE SKIP LOCKED` via `supabase-js` | **wrong** — PostgREST has no row-locking clause; it must be a Postgres function called with `rpc()`. The claim SQL was executed against the project and returned exactly one row, then the scratch table was dropped | project `satvpduraxbmxapbjhrw` |
| Realtime works on `chapters` once subscribed | **incomplete** — `supabase_realtime` has `puballtables = false`, so the table needs explicit publication membership or the subscription silently never fires | project `satvpduraxbmxapbjhrw` |
| Vitest works with this repo's Vite 8 | **conditional** — only Vitest 4; 3.2.7 caps at Vite `^7` | npm registry |
| RTL supports React 19 | **confirmed** — 16.3.3 peers `^18 \|\| ^19` | npm registry |
| `auth.uid()` is available as a column default | **confirmed** — `auth.uid()` returns `uuid` | project `satvpduraxbmxapbjhrw` |
| Modern `sb_publishable_…` / `sb_secret_…` keys exist on the project | **confirmed** — legacy `anon` JWT is also present but should not be used | project `satvpduraxbmxapbjhrw` |
| `describe.skipIf` skips a suite without running its body | **wrong** — the callback still runs to collect tests, so a top-level `createClient` throws before the skip applies | observed converting Phase 1 to TypeScript |
| A bare `sb_secret_` grep proves the bundle is clean | **wrong** — supabase-js ships that literal in its own key-prefix check; match the payload too | build output |

Not verifiable here, still assumed: Supabase free-tier limits (1 GB storage / 5 GB egress) and
the 64 kbps mono ≈ 28 MB/hour encoding estimate. Both are capacity planning, not correctness —
they change when the first real book lands, not before.

## Phase dependency order

```
0 harness
└─ 1 schema + auth ── 2 splitter + preview ── 3 save + queue ─┬─ 4 worker ─┐
                                                             └─ 5 store + player ─ 6 progress + retry ─ 7 hardening
```

Phases 4 and 5 are independent once Phase 3 lands: the player is built against seeded data, so
it does not wait on the worker.
