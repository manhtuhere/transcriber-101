// Rough throughput of one synthesis worker: characters of text per second of
// wall clock, including the ffmpeg pass. Refine once real books have run.
export const CHARS_PER_SECOND = 900

export const MIN_RUNTIME_SECONDS = 5

/*
  How many Deepgram requests the worker keeps in flight for one chapter.

  This is the single source of truth: `scripts/lib/synthesize.ts` imports it
  rather than carrying its own default, and `estimateRuntime` divides by it.
  They were 4 and 3 respectively, so every estimate shown on the upload form
  was a third faster than the worker could possibly be.
*/
export const DEFAULT_CONCURRENCY = 3
