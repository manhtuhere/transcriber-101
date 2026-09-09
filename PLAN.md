# Audiobook App — Implementation Plan

Upload a text-transcribed book (chapters separated by a line of 19 `=`), split it into
chapters, synthesize each chapter with Deepgram, store the audio in Supabase, and present the
finished book in a bookstore at `/dashboard`.

**Decisions locked in**

1. **Supabase for the prototype** — project `satvpduraxbmxapbjhrw` (currently empty: no tables,
   no storage buckets).
2. **Personal tool** — one user (`manhtuhere@gmail.com`). No multi-tenant accounts.
3. **No `.m4b`** — chapter markers live in the database and in a per-book `manifest.json`, not
   baked into an audio container.

> **Deepgram note:** speech-to-text is Deepgram's headline product, but **Deepgram Aura** is
> their text-to-speech API — that is what synthesizes chapter audio here. Output formats are
> mp3 / wav / aac / opus. There is no video container; an audio-only "mp4" is `.m4a`.

## 1. Architecture

Supabase covers Postgres, Storage, and Auth. The one thing it cannot host is the synthesis
job: Edge Functions have a wall-clock limit and no ffmpeg, and a chapter can take minutes.
Since this is a personal tool, the worker is a **local Node CLI** you run on your machine —
no VPS, no queue service, no container.

```
React SPA ──supabase-js──> Supabase (Postgres + Storage + Auth)
                                 ▲
                                 │ secret key
                       Local Node worker (npm run worker)
                                 │  chunk → Deepgram Aura → concat (ffmpeg)
                                 └──> Supabase Storage  (audio/<bookId>/…)
```

The SPA never talks to Deepgram and never holds a secret key. Reads and writes go through
`supabase-js` with the **publishable** key (`sb_publishable_…`) and RLS; the worker uses the
**secret** key (`sb_secret_…`, the modern replacement for the legacy `service_role` JWT) locally
and is the only thing that writes audio. The project has both legacy and modern keys
provisioned — use the modern pair, which rotate independently.

### Stack

| Concern | Pick | Why |
| --- | --- | --- |
| DB + Auth + Storage | **Supabase** | one service, project already provisioned |
| Frontend | existing **Vite + React 19** scaffold | already in the repo |
| Data layer | **`@supabase/supabase-js`** + **`@tanstack/react-query`** | direct-to-Postgres via RLS, no API tier to write |
| Routing | **`@tanstack/react-router`** | `/upload`, `/dashboard`, `/books/$id`, listen — code-based tree in `src/app/router.tsx` |
| Worker | **local Node script** (`scripts/worker.js`) | ffmpeg access, no timeout ceiling, zero hosting |
| Queue | **`chapters.status` + `FOR UPDATE SKIP LOCKED`** | a table poll is enough for one user; no pg-boss |
| Audio tooling | system **ffmpeg / ffprobe** via `execa` | concat chunks, probe duration |
| Deploy | `vite build` → **Cloudflare Pages** (or Supabase static hosting) | static, free |

**Later, if it outgrows this:** move the worker onto a small VPS on a cron/systemd timer, and
move audio to Cloudflare R2 if Supabase egress becomes the binding cost. Neither changes the
schema.

### Storage budget

Speech mp3 at **64 kbps mono ≈ 28 MB/hour**, so a 10-hour book ≈ 280 MB. The Supabase free
tier gives 1 GB storage and 5 GB egress — roughly **3 books** before it needs a paid plan.
Encode mono at 48–64 kbps (or Opus, ~half the size) and treat storage as the first limit you
will hit.

## 2. Data model

Two tables plus a chunk cache. Every table carries `owner_id uuid default auth.uid()` and an
RLS policy of `owner_id = auth.uid()` — the single-user version of multi-tenancy, and it costs
nothing to keep.

- **books** — `id, owner_id, title, author, description, cover_url,
  status(draft|processing|ready|failed), source_hash, total_duration_sec, created_at`
- **chapters** — `id, book_id, owner_id, idx, title, text_content, char_count, tts_voice,
  audio_path, duration_sec, start_offset_sec, bytes,
  status(pending|synthesizing|ready|failed), error, claimed_at, created_at`
- **chunks** — `id, chapter_id, owner_id, idx, text, text_hash, audio_path, status`

`start_offset_sec` is the cumulative duration of all preceding chapters. That, plus
`duration_sec`, is the chapter-marker representation — see §5.

Cache synthesis by `(text_hash, tts_voice)`. Editing one chapter then re-synthesizes only the
changed chunks, so no double spend.

Storage bucket `audio`, private, one signed-URL read path:
`audio/<bookId>/<idx>-<slug>.mp3` and `audio/<bookId>/manifest.json`.

Realtime is **opt-in per table**: the project's `supabase_realtime` publication has
`puballtables = false`, so `alter publication supabase_realtime add table public.chapters;`
must ship in a migration or the progress UI silently never updates.

## 3. Chapter splitting

- Delimiter: a line that is only equals signs — `/^\s*={19,}\s*$/m` (lenient on the exact count
  and on surrounding whitespace).
- Strip BOM, normalize CRLF → LF, split, trim segments, drop empties.
- Chapter title = first non-empty line of the segment, else `Chapter N`. Editable before
  generating.
- Guardrails: `.txt` / `.md` only, UTF-8, max upload size (e.g. 5 MB), max total chars per book
  (cost cap).
- Splitting runs **in the browser** — it is pure string work, needs no server, and lets the
  preview render instantly. Only the confirmed result is written to Postgres.
- After splitting, show a **preview**: chapter list, per-chapter char count, estimated cost,
  estimated runtime. Nothing is synthesized until you confirm.

## 4. TTS pipeline

Deepgram Aura has a **2000-char per-request limit** (exceeding it returns `413 Input Text
Exceeds Character Limits` and produces no audio), so each chapter must be chunked.

The worker loop claims one `pending` chapter, processes it, and repeats until none are left.
The claim **cannot be expressed through `supabase-js`** — PostgREST has no row-locking clause —
so it lives in Postgres as a function the worker calls with `rpc('claim_next_chapter')`:

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

The worker connects with the secret key, so RLS is bypassed and the function needs no
`security definer`.

Per chapter:

1. **Chunk** — split on sentence boundaries into pieces ≤ ~1800 chars. Never split mid-word or
   mid-sentence.
2. **Synthesize** each chunk — `POST https://api.deepgram.com/v1/speak`, header
   `Authorization: Token <KEY>`, body `{ text }`, query
   `?model=aura-2-thalia-en&encoding=linear16&container=wav&sample_rate=24000`.
   `encoding` and `container` are **separate** parameters (`encoding` defaults to `mp3`,
   `container` to `wav`); there is no `encoding=wav`. Small concurrency cap, exponential
   backoff on 429/5xx, **no retry on 401 or 413** — 413 is
   `Input Text Exceeds Character Limits` and means the chunker is broken, not that the request
   was unlucky. Skip chunks already cached by `(text_hash, voice)`.
3. **Concatenate** — request **WAV** chunks, concat PCM, encode once to mono mp3. Cleaner than
   `mp3 -c copy`, which leaves gaps and VBR-header artifacts.
4. **Probe** — `ffprobe` for `duration_sec` and `bytes`.
5. **Upload** to `audio/<bookId>/<idx>-<slug>.mp3`.
6. Set `chapter.status = ready`. When every chapter is ready → recompute `start_offset_sec`
   across chapters, write `manifest.json`, set `book.status = ready` and `total_duration_sec`.
7. On failure → `status = failed` plus the error text; per-chapter retry just sets it back to
   `pending`.

Because the worker is local, `npm run worker` can be left running while it chews through a
book, and killing it mid-book is safe — claimed rows get reset by a `claimed_at` timeout on
the next start.

**Cost (verified against Deepgram's pricing page):** Aura-2 is **$0.030 per 1k characters**
pay-as-you-go, Aura-1 **$0.0150**. A ~300-page book ≈ 500k chars ≈ **$15 on Aura-2, $7.50 on
Aura-1**. Keep the voice model configurable per book — Aura-1 halves the bill for anything you
just want to listen to. Always show the estimate and require confirmation.

## 5. Chapter markers without `.m4b`

Markers are data, not container metadata. Two representations, both derived from the same rows:

- **In Postgres** — each chapter row already has `idx`, `title`, `duration_sec`, and
  `start_offset_sec`. That is the marker table.
- **In Storage** — the worker writes `audio/<bookId>/manifest.json` on completion:

```json
{
  "bookId": "…", "title": "…", "author": "…",
  "totalDurationSec": 34210,
  "chapters": [
    { "idx": 0, "title": "Chapter One", "path": "0-chapter-one.mp3",
      "startOffsetSec": 0, "durationSec": 1284 }
  ]
}
```

The player loads the manifest (or the rows), plays one chapter file at a time, and treats
`startOffsetSec + currentTime` as the whole-book position. That gives a continuous scrub bar
and resume-across-chapters without ever concatenating the book into a single file — and
regenerating one chapter only rewrites one mp3 and the manifest.

## 6. Frontend

| Route | Content |
| --- | --- |
| `/` | landing (replace the Vite template) |
| `/login` | Supabase magic link, allowlisted to one email |
| `/upload` | drag-drop `.txt` or paste, book metadata, editable chapter preview table, voice select, cost + time estimate, **Save & queue** |
| `/books/:id` | processing view — per-chapter status, retry failed chapters, live via Supabase Realtime on the `chapters` table |
| `/dashboard` | **the bookstore** — grid of book cards (cover, title, author, chapter count, total duration, status badge) |
| `/books/:id/listen` | player — chapter list, HTML5 `<audio>`, playback speed, prev/next, resume position in `localStorage`, download links |

Auth: Supabase magic link. Because it is a personal tool, RLS is the whole authorization model
— every route is behind a session, and `/dashboard` is your library rather than a public store.
Realtime subscriptions replace the polling/SSE that a custom API tier would have needed.

## 7. Configuration

- Frontend `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`).
- Worker `.env` (gitignored, never shipped to the client): `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY` (`sb_secret_…`), `DEEPGRAM_API_KEY`.
- Local prerequisite: `ffmpeg` and `ffprobe` on `PATH`.
- Schema changes go through migration files applied to the project, so the schema is
  reproducible rather than hand-clicked.

## 8. Milestones

1. **Schema + auth** — migrations for `books` / `chapters` / `chunks`, RLS policies, `audio`
   bucket, magic-link login, `supabase-js` client wired into the SPA.
2. **Splitter + preview** — browser-side split on `={19,}`, editable preview table, cost
   estimate, write book + chapters as `draft`/`pending`. Unit tests on the splitter.
3. **Worker** — claim loop, chunker, Deepgram call, WAV→mp3 concat, ffprobe, Storage upload,
   manifest write. Test on a 2-chapter sample before spending on a real book.
4. **Bookstore + player** — `/dashboard` grid, `/books/:id/listen` with manifest-driven chapter
   markers, `/books/:id` live progress.
5. **Polish** — retry UI, chunk cache reuse, stale-claim reset, Playwright e2e with Deepgram
   mocked.

## 9. Risks and gotchas

- **Chunk boundaries** — bad splits cut words and break prosody. Sentence-boundary split with a
  hard cap under 1800 chars.
- **mp3 concat artifacts** — synthesize WAV, concat PCM, encode once.
- **Cost and runtime** — long books cost real money and take many minutes. Estimate and confirm;
  cap chars per book.
- **Storage ceiling** — ~3 books on the Supabase free tier (§1). Encode mono and low-bitrate.
- **Secret key** — worker-only, gitignored, never in any `VITE_` variable. Leaking it bypasses
  every RLS policy.
- **Deepgram rate / concurrency limits** — capped parallelism plus backoff.
- **Idempotency** — re-queueing skips `ready` chapters; chunk cache keyed on
  `(text_hash, voice)`.
- **Copyright** — this uploads full book text. Private bucket, RLS, single user — keep it that
  way.
