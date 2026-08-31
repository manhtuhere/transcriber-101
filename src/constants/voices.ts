// USD per 1000 characters, from Deepgram's pricing page (pay-as-you-go).
// Aura-1 is half the price of Aura-2 and is the sensible default for a book
// you just want to listen to.
export const VOICE_RATES = {
  'aura-2': 0.03,
  'aura-1': 0.015,
} as const

export const MAX_VOICE_RATE = Math.max(...Object.values(VOICE_RATES))

export const VOICES = [
  { id: 'aura-2-thalia-en', label: 'Aura-2 Thalia (en) — $0.030/1k' },
  { id: 'aura-asteria-en', label: 'Aura-1 Asteria (en) — $0.015/1k' },
] as const

export const DEFAULT_VOICE = VOICES[0].id
