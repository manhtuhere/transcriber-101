# transcriber-101 — conventions

An audiobook pipeline: upload a transcribed book split by lines of 19 `=`, synthesize each
chapter with Deepgram Aura, store the audio in Supabase, listen at `/dashboard`.

Architecture lives in [`PLAN.md`](PLAN.md); the TDD build order lives in
[`doc/implementation-plan.md`](doc/implementation-plan.md).

## Source layout

Atomic design, one directory per layer. **A layer may import only from the layers listed
against it.**

| Layer | Directory | May import from |
| --- | --- | --- |
| constants | `src/constants/` | nothing |
| types | `src/types/` | constants (type-only) |
| utils | `src/utils/` | types, constants |
| lib | `src/lib/` | types, constants, utils |
| hooks | `src/hooks/` | + lib |
| atoms | `src/components/atoms/` | types, constants, utils |
| molecules | `src/components/molecules/` | + atoms |
| organisms | `src/components/organisms/` | + molecules |
| templates | `src/components/templates/` | + organisms |
| pages | `src/pages/` | + templates, **hooks** |
| app | `src/app/` | + pages |

Node-side worker code lives outside `src/` in `scripts/`: `scripts/lib/` holds pure,
unit-tested modules (`chunkText`, `manifest`, `deepgram`, `env`) plus the two that touch the
outside world (`audio` shells out to ffmpeg, `synthesize` drives Supabase), and
`scripts/worker.ts` is the entrypoint.

Plus four standing rules:

1. **Only hooks touch `lib/api` and `lib/supabase`.** One hook per call, in `src/hooks/`:
   `useBooks`, `useBook`, `useCreateBook`, `useRetryChapter`, `useManifest`, `useAudioUrl`,
   `useSession`, `useSignIn`, `useSignOut`, `useChapterUpdates`. Pages compose hooks;
   components take data and callbacks as props and may not import hooks at all. That is what
   makes every component renderable in a test without mocking the network.

   Query keys live in `src/hooks/keys.ts`, never inline — a key written by hand at one call
   site and by hand again at the invalidation site is how a screen goes stale.

   `lib/devAuth` is exempt: it is a build-time flag, not data.
2. **`utils/` is pure.** No framework imports, no I/O — only `types` and `constants`. These
   are the functions that get exhaustive unit tests with zero mocks.
3. **`constants/` imports nothing** and `types/` holds type-only imports. `types` may read
   `constants` so a union can be derived from the array that defines it
   (`typeof BOOK_STATUSES[number]`), which stops the two drifting apart.
4. **Components and pages are `PascalCase.tsx`**; `utils`, `constants` and `types` are never
   `.tsx`.

`src/main.tsx` is the Vite entrypoint and belongs to no layer.

### This is enforced, not suggested

`src/test/architecture.test.ts` walks the tree, resolves every relative import to its layer,
and fails the build on a violation. It runs in `npm run test:run`. oxlint has no
path-restriction rule, so the test is the enforcement — do not weaken it to make a change
pass; move the code instead.

## Styling

Tailwind v4, wired through `@tailwindcss/vite`. `src/index.css` holds only tokens
(`@theme`), base element styles, and the three `@utility` helpers utilities genuinely cannot
express — the spine shadow, the Fraunces optical-size axis, and the timeline playhead.
Everything else is utility classes on the component.

- **Spacing is set by the container, not by the child.** `PageShell` owns the page rhythm with
  `space-y-6`; a section carries no top margin of its own. A component that has to remember its
  own margin is how a button ends up touching the paragraph above it.
- **Variants own their padding, never a `className` override.** Tailwind resolves conflicting
  utilities by stylesheet order, not by the order they appear in a `className` string, so a
  caller passing `px-0` cannot reliably beat a `px-6` in a shared base. Add a variant instead —
  that is why `Button` has `bare` alongside `primary` and `ghost`.
- Repeated control styling lives in the atom that owns it (`INPUT_STYLE` in `TextInput`), not
  in a global class.

## Routing

TanStack Router, defined **in code** in `src/app/router.tsx` — not file-based. File-based
routing would generate a `src/routes/` tree and a `routeTree.gen.ts`, both outside the layers
`architecture.test.ts` enforces.

- The tree is registered via `declare module '@tanstack/react-router'`, so `to`, `params` and
  route ids are all type-checked. A wrong path is a compile error.
- Links carry params separately: `<Link to="/books/$id/listen" params={{ id }} />`, never an
  interpolated string.
- Auth is a **pathless layout route** (`id: 'protected'`) whose component is `ProtectedRoute`.
- `/` redirects in `beforeLoad` rather than rendering a component that navigates, so there is
  no flash of an empty page.
- Pages read params with `useParams({ strict: false })` rather than a `from` route id, so a
  page stays renderable on its own in a test instead of only inside the app's full tree.

`renderWithProviders` builds a real router over an in-memory history per test, so links resolve
to real hrefs. **It is async** — TanStack resolves the initial match off the first tick, so a
synchronous render would hand back an empty container:

```tsx
await renderWithProviders(<Listen />, { route: '/books/b1/listen', path: '/books/$id/listen' })
```

## Types

- `src/types/database.ts` is **generated**:
  `supabase gen types typescript --project-id satvpduraxbmxapbjhrw`. Regenerate after every
  migration; never edit it by hand.
- `src/types/book.ts` narrows on top. Status columns are check constraints, not Postgres
  enums, so the generator widens them to `string`; `api.ts` is the single place rows are cast
  to the narrowed types on the way in.

## Bookmarks

`books.favorited_at` is a nullable timestamp, not a boolean: null means "not bookmarked", and a
value records when it was marked, so the shelf can sort by it without a second column.

`useToggleFavorite` updates the cached list before the round trip finishes and restores it on
failure — a bookmark that waits on the network feels broken. Filtering and sorting live in
`utils/shelf.ts` as pure functions, so the shelf's behaviour is unit-tested without rendering.

The star is a `<button>` and a **sibling** of the card's link, never a child. A card is one
link and one tab stop; nesting interactive content inside an anchor is invalid HTML and would
make the star unreachable by keyboard.

## Testing

TDD: the tests come first, and a phase is done when they pass.

| Layer | Files | Environment |
| --- | --- | --- |
| Unit | `src/**/*.test.ts` | node — pure logic, no mocks |
| UI | `src/**/*.test.tsx` | jsdom + Testing Library, `lib/api` mocked |
| Integration | `test/integration/*.test.ts` | real Supabase, needs `SUPABASE_SECRET_KEY` |
| E2E | `e2e/*.spec.ts` | real browser |

The extension is the rule: `.ts` tests are pure and run in node, `.tsx` tests render and run
in jsdom.

E2E has three Playwright projects: `anon` (`*.anon.spec.ts`, signed out, needs no key),
`setup` (creates the test user), and `chromium` (everything else, depends on `setup`).

Requires **Node 22** (`.nvmrc`). Node 20 breaks jsdom 30, execa 10 and realtime-js.

```bash
npm run typecheck     # tsc --build
npm run test:run      # unit + UI
npm run test:int      # integration (skips cleanly without a secret key)
npx playwright test --project=anon   # signed-out e2e, no key needed
npm run lint
npm run worker        # drain the pending-chapter queue (needs ffmpeg + keys)
npm run clean:storage # remove audio whose book row is gone (--dry-run to preview)
```

## The worker

`npm run worker` claims pending chapters one at a time and synthesizes them. Claiming goes
through the `claim_next_chapter` Postgres function, not a query: PostgREST has no row-locking
clause, so `FOR UPDATE SKIP LOCKED` cannot be expressed through supabase-js. Killing the
process mid-book is safe — `release_stale_claims` returns abandoned rows to `pending` on the
next run.

Chunks are requested from Deepgram as `encoding=linear16&container=wav` (those are two
separate parameters; there is no `encoding=wav`), concatenated as PCM, and encoded to mp3
exactly once — stitching mp3 frames directly leaves gaps and a wrong VBR header.

Requires `ffmpeg` and `ffprobe` on PATH.

## Storage has no foreign key

Deleting a book cascades to its chapters, but the audio objects in Storage are left behind.
Integration tests clear their own uploads in `afterAll`; `npm run clean:storage` sweeps
anything orphaned by an interrupted run. Worth remembering against a 1 GB free tier.

## Secrets

`VITE_*` variables are inlined into the client bundle. The Supabase **secret** key
(`sb_secret_…`) and `DEEPGRAM_API_KEY` must never carry that prefix — they belong to the
worker and to tests only. The publishable key (`sb_publishable_…`) is browser-safe; RLS is
what protects the data.

## Signing in during development

`VITE_DEV_EMAIL` / `VITE_DEV_PASSWORD` back a "Sign in as developer" button on the sign-in
page. It is a **real** Supabase session, so RLS applies exactly as in production.

Do not reintroduce a session-less bypass. The previous one rendered the app signed out, which
meant reads returned nothing and writes failed with `42501 new row violates row-level security
policy` — `auth.uid()` is null without a session, so `owner_id` defaults to null and fails the
policy's `with check`. The error surfaced as a raw Postgres code on a button that could never
succeed.

**Every call site must gate this behind a literal `import.meta.env.DEV`** — and each function
in `lib/devAuth.ts` opens with `if (!import.meta.env.DEV) return`. Vite replaces the literal
with `false` at build time, so the branch folds and the button, the env var names and the
credentials never reach production. A bare function call cannot fold, because a return value is
not known at compile time. Never pass `import.meta.env` around as an object: Vite inlines the
whole thing, so the variable names survive even when the values are inert.
`src/test/bundle.test.ts` checks the built output — verified by putting real credentials in
`.env`, building, and grepping for them.
