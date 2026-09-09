import { formatDuration } from '../../utils/format'
import Button from '../atoms/Button'
import { INPUT_STYLE } from '../atoms/TextInput'
import FormField from '../molecules/FormField'

interface SleepTimerProps {
  remainingSec: number | null
  /** Seconds left in the current chapter, for the "end of chapter" option. */
  chapterRemainingSec: number
  onStart: (seconds: number) => void
  onCancel: () => void
}

const MINUTES = [5, 10, 15, 30, 45, 60]

/** Sentinel: resolved against the current chapter when chosen. */
const END_OF_CHAPTER = 'chapter'

export default function SleepTimer({
  remainingSec,
  chapterRemainingSec,
  onStart,
  onCancel,
}: SleepTimerProps) {
  if (remainingSec !== null) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-ochre/40 bg-ochre/10 px-3 py-1.5">
        <span className="font-data text-xs text-ink" role="status">
          Sleeping in {formatDuration(remainingSec)}
        </span>
        <Button variant="bare" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <FormField htmlFor="sleep" label="Sleep" inline>
      <select
        id="sleep"
        value=""
        onChange={(event) => {
          const choice = event.target.value
          if (choice === '') return
          onStart(choice === END_OF_CHAPTER ? chapterRemainingSec : Number(choice) * 60)
        }}
        className={`${INPUT_STYLE} w-auto px-3 py-2 text-sm`}
      >
        <option value="">Off</option>
        {MINUTES.map((minutes) => (
          <option key={minutes} value={String(minutes)}>
            {minutes} min
          </option>
        ))}
        <option value={END_OF_CHAPTER}>End of chapter</option>
      </select>
    </FormField>
  )
}
