import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { splitChapters } from './splitChapters'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(resolve(here, '../../test/fixtures/book.txt'), 'utf8')

const eq = (n: number) => '='.repeat(n)

describe('splitChapters', () => {
  test('splits on a line of exactly 19 equals signs', () => {
    const chapters = splitChapters(fixture)
    expect(chapters).toHaveLength(3)
    expect(chapters.map((c) => c.title)).toEqual(['Chapter One', 'Chapter Two', 'Chapter Three'])
  })

  test('splits on more than 19 equals signs', () => {
    expect(splitChapters(`A\n\nfirst\n${eq(25)}\nB\n\nsecond`)).toHaveLength(2)
  })

  test('does not split on 18 equals signs', () => {
    const chapters = splitChapters(`A\n\nfirst\n${eq(18)}\nstill first`)
    expect(chapters).toHaveLength(1)
    expect(chapters[0]!.body).toContain(eq(18))
  })

  test('does not split on equals signs with other text on the line', () => {
    expect(splitChapters(`A\n\nlet x = y ${eq(20)} done\nmore`)).toHaveLength(1)
  })

  test('tolerates trailing whitespace and \\r on the delimiter line', () => {
    expect(splitChapters(`A\n\nfirst\n${eq(19)}  \r\nB\n\nsecond`)).toHaveLength(2)
  })

  test('normalizes CRLF to LF in chapter bodies', () => {
    const [chapter] = splitChapters('A\r\n\r\nline one\r\nline two')
    expect(chapter!.body).toBe('line one\nline two')
    expect(chapter!.body).not.toContain('\r')
  })

  test('strips a leading BOM from the first chapter', () => {
    const [chapter] = splitChapters('﻿Chapter One\n\nbody')
    expect(chapter!.title).toBe('Chapter One')
  })

  test('drops empty segments from leading, trailing, and doubled delimiters', () => {
    const text = `${eq(19)}\nA\n\nfirst\n${eq(19)}\n${eq(19)}\nB\n\nsecond\n${eq(19)}\n`
    const chapters = splitChapters(text)
    expect(chapters).toHaveLength(2)
    expect(chapters.map((c) => c.title)).toEqual(['A', 'B'])
  })

  test('uses the first non-empty line as the title', () => {
    const [chapter] = splitChapters('\n\n  The Reckoning  \n\nbody text')
    expect(chapter!.title).toBe('The Reckoning')
  })

  test('does not repeat the title line in the body', () => {
    const [chapter] = splitChapters('The Reckoning\n\nbody text')
    expect(chapter!.body).toBe('body text')
    expect(chapter!.body).not.toContain('The Reckoning')
  })

  test('falls back to "Chapter N" when the first line is prose, not a heading', () => {
    const prose =
      'It was the best of times, it was the worst of times, it was the age of wisdom, ' +
      'it was the age of foolishness, it was the epoch of belief.'
    const [chapter] = splitChapters(prose)
    expect(chapter!.title).toBe('Chapter 1')
    expect(chapter!.body).toBe(prose)
  })

  test('numbers the fallback title by position, not by segment index', () => {
    const prose = 'x'.repeat(200)
    const chapters = splitChapters(`A\n\nfirst\n${eq(19)}\n${prose}`)
    expect(chapters[1]!.title).toBe('Chapter 2')
  })

  test('assigns contiguous idx starting at 0', () => {
    expect(splitChapters(fixture).map((c) => c.idx)).toEqual([0, 1, 2])
  })

  test('reports charCount as the body length after trimming', () => {
    const [chapter] = splitChapters('Title\n\n  body text  \n\n')
    expect(chapter!.body).toBe('body text')
    expect(chapter!.charCount).toBe('body text'.length)
  })

  test('returns an empty array for empty or whitespace-only input', () => {
    expect(splitChapters('')).toEqual([])
    expect(splitChapters('   \n\n  \t ')).toEqual([])
    expect(splitChapters(eq(19))).toEqual([])
  })

  test('returns a single chapter when the text has no delimiter', () => {
    expect(splitChapters('Title\n\nbody')).toHaveLength(1)
  })
})
