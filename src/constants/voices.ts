// USD per 1000 characters, from Deepgram's pricing page (pay-as-you-go).
export const VOICE_RATES = {
  'aura-2': 0.03,
  'aura-1': 0.015,
} as const

export const MAX_VOICE_RATE = Math.max(...Object.values(VOICE_RATES))

export interface Voice {
  id: string
  label: string
  group: string
}

export const STORYTELLING_GROUP = 'Storytelling — Aura-2, $0.030 per 1k'
export const CLASSIC_GROUP = 'Classic — Aura-1, $0.015 per 1k'

/*
  A curated list, not Deepgram's whole catalogue.

  Aura-2 has 37 English voices, but most carry a documented use case of IVR,
  customer service or scheduling — tuned for a two-second utterance, not for
  four hours of prose. These eight are the ones Deepgram itself tags for
  storytelling, so they are the ones offered here.

  Aura-1 is half the price and has no storytelling tags — it predates them —
  so all twelve English voices are offered as the budget tier. Its British and
  Irish accents are variety Aura-2's storytelling set does not have.

  Two voices are called Athena and two are called Orpheus, one per generation.
  The group labels are what tell them apart, so they must stay visible in the
  picker.
*/
export const VOICES: readonly Voice[] = [
  // Deepgram's storytelling-tagged Aura-2 voices, feminine first by accident
  // of the alphabet rather than by preference.
  { id: 'aura-2-athena-en', label: 'Athena — calm, smooth, professional · American', group: STORYTELLING_GROUP },
  { id: 'aura-2-cora-en', label: 'Cora — smooth, melodic, caring · American', group: STORYTELLING_GROUP },
  { id: 'aura-2-cordelia-en', label: 'Cordelia — approachable, warm · American', group: STORYTELLING_GROUP },
  { id: 'aura-2-draco-en', label: 'Draco — warm, trustworthy baritone · British', group: STORYTELLING_GROUP },
  { id: 'aura-2-janus-en', label: 'Janus — smooth, trustworthy · Southern American', group: STORYTELLING_GROUP },
  { id: 'aura-2-minerva-en', label: 'Minerva — positive, friendly, natural · American', group: STORYTELLING_GROUP },
  { id: 'aura-2-orpheus-en', label: 'Orpheus — clear, confident · American', group: STORYTELLING_GROUP },
  { id: 'aura-2-pluto-en', label: 'Pluto — smooth, calm, empathetic baritone · American', group: STORYTELLING_GROUP },

  { id: 'aura-asteria-en', label: 'Asteria — feminine · American', group: CLASSIC_GROUP },
  { id: 'aura-luna-en', label: 'Luna — feminine · American', group: CLASSIC_GROUP },
  { id: 'aura-stella-en', label: 'Stella — feminine · American', group: CLASSIC_GROUP },
  { id: 'aura-athena-en', label: 'Athena — feminine · British', group: CLASSIC_GROUP },
  { id: 'aura-hera-en', label: 'Hera — feminine · American', group: CLASSIC_GROUP },
  { id: 'aura-orion-en', label: 'Orion — masculine · American', group: CLASSIC_GROUP },
  { id: 'aura-arcas-en', label: 'Arcas — masculine · American', group: CLASSIC_GROUP },
  { id: 'aura-perseus-en', label: 'Perseus — masculine · American', group: CLASSIC_GROUP },
  { id: 'aura-angus-en', label: 'Angus — masculine · Irish', group: CLASSIC_GROUP },
  { id: 'aura-orpheus-en', label: 'Orpheus — masculine · American', group: CLASSIC_GROUP },
  { id: 'aura-helios-en', label: 'Helios — masculine · British', group: CLASSIC_GROUP },
  { id: 'aura-zeus-en', label: 'Zeus — masculine · American', group: CLASSIC_GROUP },
]

/*
  Calm and smooth rather than energetic. The old default was Thalia, which
  Deepgram describes as enthusiastic and recommends for casual chat and
  customer service — the wrong register to sit inside for four hours.
*/
export const DEFAULT_VOICE = 'aura-2-athena-en'
