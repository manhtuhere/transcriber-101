import { describe, expect, test } from 'vitest'
import { estimateCost } from '../utils/estimate'
import { CLASSIC_GROUP, DEFAULT_VOICE, STORYTELLING_GROUP, VOICES } from './voices'

/*
  Twenty model ids, typed by hand from Deepgram's docs. A typo does not fail
  until the worker is mid-book and Deepgram rejects the request, by which point
  the queue is running and the spend has started. These checks are cheap.
*/
describe('the voice catalogue', () => {
  test('every id matches Deepgram\'s documented model format', () => {
    // aura-<name>-<lang> for Aura-1, aura-2-<name>-<lang> for Aura-2.
    for (const voice of VOICES) {
      expect(voice.id, voice.id).toMatch(/^aura-(2-)?[a-z]+-[a-z]{2}$/)
    }
  })

  test('no id appears twice', () => {
    const ids = VOICES.map((voice) => voice.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every voice has a label and a group', () => {
    for (const voice of VOICES) {
      expect(voice.label.length, voice.id).toBeGreaterThan(0)
      expect([STORYTELLING_GROUP, CLASSIC_GROUP]).toContain(voice.group)
    }
  })

  test('the storytelling group holds only Aura-2 voices, and vice versa', () => {
    for (const voice of VOICES) {
      const isAura2 = voice.id.startsWith('aura-2-')
      expect(voice.group === STORYTELLING_GROUP, voice.id).toBe(isAura2)
    }
  })

  test('every voice prices as a known tier, never at the unknown-voice fallback', () => {
    for (const voice of VOICES) {
      const expected = voice.id.startsWith('aura-2-') ? 30 : 15
      expect(estimateCost(1_000_000, voice.id).usd, voice.id).toBe(expected)
    }
  })

  test('the default is a voice we actually offer', () => {
    expect(VOICES.map((voice) => voice.id)).toContain(DEFAULT_VOICE)
  })

  test('the default is tagged for storytelling, not for customer service', () => {
    const voice = VOICES.find((option) => option.id === DEFAULT_VOICE)
    expect(voice?.group).toBe(STORYTELLING_GROUP)
  })

  // Two Athenas and two Orpheuses exist, one per generation. Distinct ids, and
  // the group label is what disambiguates them in the picker.
  test('names repeated across generations still have distinct ids', () => {
    const athenas = VOICES.filter((voice) => voice.label.startsWith('Athena'))
    expect(athenas).toHaveLength(2)
    expect(athenas[0]!.id).not.toBe(athenas[1]!.id)
  })
})
