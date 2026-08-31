import { CHAPTER_DELIMITER, MAX_TITLE_LENGTH } from '../constants/upload'
import type { ParsedChapter } from '../types/book'

/** Split a transcribed book into chapters. */
export function splitChapters(text: string): ParsedChapter[] {
  if (typeof text !== 'string' || text.trim() === '') return []

  const lines = text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')

  const segments: string[][] = [[]]
  for (const line of lines) {
    if (CHAPTER_DELIMITER.test(line)) segments.push([])
    else segments[segments.length - 1]!.push(line)
  }

  return segments
    .map((segment) => segment.join('\n').trim())
    .filter((segment) => segment !== '')
    .map((segment, idx) => ({ idx, ...titleAndBody(segment, idx) }))
}

function titleAndBody(segment: string, idx: number): Omit<ParsedChapter, 'idx'> {
  const lines = segment.split('\n')
  const headingAt = lines.findIndex((line) => line.trim() !== '')
  // The segment is non-empty after trimming, so a non-blank line always exists.
  const heading = lines[headingAt]!.trim()

  if (heading.length > MAX_TITLE_LENGTH) {
    return { title: `Chapter ${idx + 1}`, body: segment, charCount: segment.length }
  }

  const body = lines
    .slice(headingAt + 1)
    .join('\n')
    .trim()
  return { title: heading, body, charCount: body.length }
}
