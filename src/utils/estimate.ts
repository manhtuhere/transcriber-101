import {
  CHARS_PER_SECOND,
  DEFAULT_CONCURRENCY,
  MIN_RUNTIME_SECONDS,
} from '../constants/synthesis'
import { MAX_VOICE_RATE, VOICE_RATES } from '../constants/voices'

function rateFor(voice: string): number {
  if (voice.startsWith('aura-2')) return VOICE_RATES['aura-2']
  if (voice.startsWith('aura-')) return VOICE_RATES['aura-1']
  // Unknown voice: quote the most expensive rate so the estimate is never
  // cheaper than the bill.
  return MAX_VOICE_RATE
}

export function estimateCost(totalChars: number, voice: string): { usd: number } {
  const usd = (totalChars / 1000) * rateFor(voice)
  return { usd: Math.round(usd * 100) / 100 }
}

export function estimateRuntime(
  totalChars: number,
  { concurrency = DEFAULT_CONCURRENCY }: { concurrency?: number } = {},
): { seconds: number } {
  const seconds = totalChars / CHARS_PER_SECOND / concurrency
  return { seconds: Math.max(seconds, MIN_RUNTIME_SECONDS) }
}
