import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

// node:child_process rather than execa: execa 10 calls Set.prototype.union,
// which needs Node 22, and this machine runs Node 20. execFile takes an argv
// array and spawns no shell, so it is the right tool for two known binaries
// anyway — one less dependency.
const run = promisify(execFile)

export interface EncodedAudio {
  data: Buffer
  durationSec: number
  bytes: number
}

/** Throws with actionable text when ffmpeg is missing, rather than ENOENT. */
export async function assertFfmpeg(): Promise<void> {
  for (const bin of ['ffmpeg', 'ffprobe']) {
    try {
      await run(bin, ['-version'])
    } catch {
      throw new Error(
        `${bin} is not on PATH. The worker needs it to concatenate and measure audio. ` +
          'Install it with: sudo apt install ffmpeg',
      )
    }
  }
}

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await assertFfmpeg()
    return true
  } catch {
    return false
  }
}

/**
 * Concatenate WAV chunks and encode once to mono mp3.
 *
 * The single encode is the point. Concatenating mp3 files with `-c copy`
 * leaves audible gaps at the joins and a VBR header describing only the first
 * file, so the chunks arrive as PCM WAV and become mp3 exactly once, here.
 */
export async function concatToMp3(
  chunks: Buffer[],
  { bitrate = '64k' }: { bitrate?: string } = {},
): Promise<EncodedAudio> {
  if (chunks.length === 0) throw new Error('Cannot encode: no audio chunks.')

  const dir = await mkdtemp(join(tmpdir(), 'transcriber-'))

  try {
    const parts: string[] = []
    for (const [index, chunk] of chunks.entries()) {
      const path = join(dir, `${String(index).padStart(4, '0')}.wav`)
      await writeFile(path, chunk)
      parts.push(path)
    }

    // The concat demuxer takes a list file; paths are quoted for safety.
    const listPath = join(dir, 'parts.txt')
    await writeFile(listPath, parts.map((p) => `file '${p}'`).join('\n'))

    const outPath = join(dir, 'chapter.mp3')
    await run('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-ac', '1',
      '-b:a', bitrate,
      '-y', outPath,
    ])

    const data = await readFile(outPath)

    return { data, durationSec: await probeDuration(outPath), bytes: data.length }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function probeDuration(path: string): Promise<number> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    path,
  ])

  const seconds = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(seconds)) throw new Error(`ffprobe returned no duration for ${path}.`)
  return Math.round(seconds * 1000) / 1000
}
