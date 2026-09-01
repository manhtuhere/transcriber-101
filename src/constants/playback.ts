export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const

export const DEFAULT_SPEED = 1

/** localStorage key prefix for the resume position, one entry per book. */
export const POSITION_KEY_PREFIX = 'pos:'

/*
  Speed is stored once, not per book: it is a property of the listener, not of
  the book. Someone who listens at 1.5x does so for everything.
*/
export const SPEED_KEY = 'speed'

/**
 * How long a signed audio URL stays valid. Long enough to hear a book out in
 * one sitting without the player having to re-sign anything mid-listen.
 */
export const AUDIO_URL_TTL_SEC = 60 * 60 * 4
