import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const here = dirname(fileURLToPath(import.meta.url))
export const FIXTURE_DIR = resolve(here, '../../.stress-fixtures')

/*
  Prose to build the book from. Real sentences rather than filler, because the
  chunker splits on sentence terminators — a fixture of one endless sentence
  would exercise only the hard-split fallback and would flatter or damn the
  timings for the wrong reason.
*/
const SENTENCES = [
  'The sea was calm that morning, and the harbour showed no sign of what had passed.',
  'He turned the page slowly, as though the paper itself might object.',
  'Nobody spoke of it again; the matter was closed, and the town went back to its business.',
  'Rain came in from the west and stayed for three days.',
  'She had read the letter twice before she understood what it did not say!',
  'Was there ever a colder winter on that coast?',
  'The lamps were lit at four, and by five the street was quiet.',
  'It is a curious thing, to be remembered for the one year you would rather forget.',
]

/** One paragraph of a few sentences, picked deterministically. */
function paragraph(seed: number): string {
  const out: string[] = []
  for (let i = 0; i < 5; i += 1) {
    out.push(SENTENCES[(seed * 7 + i * 3) % SENTENCES.length]!)
  }
  return out.join(' ')
}

export interface Fixture {
  path: string
  bytes: number
  chapters: number
}

/**
 * Write a transcript of roughly `targetBytes`, split into `chapters` chapters.
 *
 * Streamed to disk rather than built as one string: assembling 50 MB by
 * concatenation is itself the slowest part of the test, and it would measure
 * the fixture rather than the parser.
 *
 * The file is cached between runs and is gitignored — a 50 MB fixture has no
 * business in the repository.
 */
export async function buildTranscript(targetBytes: number, chapters: number): Promise<Fixture> {
  mkdirSync(FIXTURE_DIR, { recursive: true })
  const path = resolve(FIXTURE_DIR, `book-${targetBytes}-${chapters}.txt`)

  if (existsSync(path) && statSync(path).size >= targetBytes) {
    return { path, bytes: statSync(path).size, chapters }
  }

  const perChapter = Math.floor(targetBytes / chapters)

  async function* content() {
    for (let c = 0; c < chapters; c += 1) {
      if (c > 0) yield `\n${'='.repeat(19)}\n`
      yield `Chapter ${c + 1}\n\n`

      let written = 0
      let seed = c * 101
      while (written < perChapter) {
        const block = `${paragraph(seed)}\n\n`
        written += block.length
        seed += 1
        yield block
      }
    }
  }

  await pipeline(content(), createWriteStream(path))
  return { path, bytes: statSync(path).size, chapters }
}

/** Peak-ish heap use, in MB, around a synchronous call. */
export function measure<T>(fn: () => T): { result: T; ms: number; heapMb: number } {
  globalThis.gc?.()
  const before = process.memoryUsage().heapUsed
  const start = performance.now()

  const result = fn()

  const ms = performance.now() - start
  const heapMb = (process.memoryUsage().heapUsed - before) / 1024 / 1024
  return { result, ms, heapMb }
}
