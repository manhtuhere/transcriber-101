import { PLAYBACK_SPEEDS } from '../../constants/playback'
import type { ManifestChapter } from '../../types/manifest'
import Button from '../atoms/Button'
import { INPUT_STYLE } from '../atoms/TextInput'
import ChapterTimeline from '../molecules/ChapterTimeline'
import FormField from '../molecules/FormField'
import SleepTimer from './SleepTimer'

interface PlayerControlsProps {
  chapters: ManifestChapter[]
  activeIdx: number
  bookPosition: number
  bookDuration: number
  speed: number
  playing: boolean
  canGoBack: boolean
  canGoForward: boolean
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
  onSeek: (bookSeconds: number) => void
  onSpeedChange: (speed: number) => void
  onBookmark: () => void
  bookmarking?: boolean
  onSkipBack: () => void
  onSkipForward: () => void
  skipSeconds: number
  sleepRemainingSec: number | null
  chapterRemainingSec: number
  onSleepStart: (seconds: number) => void
  onSleepCancel: () => void
}

export default function PlayerControls({
  chapters,
  activeIdx,
  bookPosition,
  bookDuration,
  speed,
  playing,
  canGoBack,
  canGoForward,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  onSpeedChange,
  onBookmark,
  bookmarking = false,
  onSkipBack,
  onSkipForward,
  skipSeconds,
  sleepRemainingSec,
  chapterRemainingSec,
  onSleepStart,
  onSleepCancel,
}: PlayerControlsProps) {
  return (
    <div className="rounded-md border border-rule bg-card p-6 shadow-[0_1px_2px_rgb(34_31_26_/_0.06)]">
      <ChapterTimeline
        chapters={chapters}
        totalDurationSec={bookDuration}
        bookPosition={bookPosition}
        activeIdx={activeIdx}
        onSeek={onSeek}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
          className="grid size-14 shrink-0 cursor-pointer place-items-center rounded-full
            bg-cloth text-card transition-colors hover:bg-cloth-soft"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
            {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5l12 7-12 7z" />}
          </svg>
        </button>

        <Button
          variant="ghost"
          onClick={onSkipBack}
          aria-label={`Back ${skipSeconds} seconds`}
          className="px-3.5"
        >
          −{skipSeconds}s
        </Button>
        <Button
          variant="ghost"
          onClick={onSkipForward}
          aria-label={`Forward ${skipSeconds} seconds`}
          className="px-3.5"
        >
          +{skipSeconds}s
        </Button>

        <Button variant="ghost" onClick={onPrevious} disabled={!canGoBack} className="px-3.5">
          Previous
        </Button>
        <Button variant="ghost" onClick={onNext} disabled={!canGoForward} className="px-3.5">
          Next
        </Button>
        <Button variant="ghost" onClick={onBookmark} disabled={bookmarking} className="px-3.5">
          Bookmark this spot
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule pt-4">
        <SleepTimer
          remainingSec={sleepRemainingSec}
          chapterRemainingSec={chapterRemainingSec}
          onStart={onSleepStart}
          onCancel={onSleepCancel}
        />

        <FormField htmlFor="speed" label="Speed" inline>
          <select
            id="speed"
            value={String(speed)}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            className={`${INPUT_STYLE} w-auto px-3 py-2 text-sm`}
          >
            {PLAYBACK_SPEEDS.map((option) => (
              <option key={option} value={String(option)}>
                {option}×
              </option>
            ))}
          </select>
        </FormField>

        <p className="ml-auto font-data text-[0.68rem] text-muted">
          space play · ← → skip {skipSeconds}s · n / p chapter
        </p>
      </div>
    </div>
  )
}
