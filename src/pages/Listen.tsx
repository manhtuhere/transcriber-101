import { useEffect, useRef, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import Alert from '../components/atoms/Alert'
import Spinner from '../components/atoms/Spinner'
import ChapterList from '../components/organisms/ChapterList'
import PlayerControls from '../components/organisms/PlayerControls'
import PageShell from '../components/templates/PageShell'
import { DEFAULT_SPEED } from '../constants/playback'
import { useAudioUrl } from '../hooks/useAudioUrl'
import { useManifest } from '../hooks/useManifest'
import {
  readSavedPosition,
  savePosition,
  toBookPosition,
  toChapterPosition,
} from '../utils/playback'

export default function Listen() {
  // strict: false rather than a `from` route id — the page reads the param
  // of whatever route matched, so it stays renderable on its own in tests
  // instead of only inside the app's full tree.
  const { id = '' } = useParams({ strict: false })
  const audioRef = useRef<HTMLAudioElement>(null)

  // Read straight from storage at mount. No effect is needed: the saved value
  // is a book position, and resolving it to a chapter is a pure function of the
  // manifest, done during render below.
  const [bookPosition, setBookPosition] = useState(() => readSavedPosition(id))
  const [chosenIdx, setChosenIdx] = useState<number | null>(null)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [playing, setPlaying] = useState(false)

  /*
    Where to land once the next chapter file reports its duration.
    Needed because loading a new src fires `timeupdate` at currentTime 0, which
    would otherwise write the chapter's start back over the position we are
    seeking to. While a seek is pending, timeupdate is ignored.
  */
  const pendingSeek = useRef<number | null>(null)

  const manifestQuery = useManifest(id)
  const manifest = manifestQuery.data

  // Until the listener picks a chapter, the active one is wherever the saved
  // position lands — derived, not stored, so the two can never disagree.
  const derivedIdx = manifest ? toChapterPosition(manifest.chapters, bookPosition).idx : 0
  const activeIdx = chosenIdx ?? derivedIdx
  const active = manifest?.chapters.find((chapter) => chapter.idx === activeIdx)

  const srcQuery = useAudioUrl(active?.path)

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed, srcQuery.data])

  function selectChapter(idx: number) {
    const chapter = manifest?.chapters.find((c) => c.idx === idx)
    if (!chapter) return
    setChosenIdx(idx)
    setBookPosition(chapter.startOffsetSec)
  }

  /** Seek anywhere in the book. Switches files when the target is elsewhere. */
  function seekBook(bookSeconds: number) {
    if (!manifest) return
    const target = toChapterPosition(manifest.chapters, bookSeconds)
    setBookPosition(bookSeconds)

    if (target.idx === activeIdx && audioRef.current) {
      audioRef.current.currentTime = target.offsetInChapter
    } else {
      pendingSeek.current = target.offsetInChapter
      setChosenIdx(target.idx)
    }
  }

  async function togglePlay() {
    const element = audioRef.current
    if (!element) return
    if (element.paused) await element.play().catch(() => undefined)
    else element.pause()
  }

  function onTimeUpdate() {
    const element = audioRef.current
    if (!element || !active) return
    // A seek is in flight; this event describes the old position.
    if (pendingSeek.current !== null) return

    const position = toBookPosition(active, element.currentTime)
    setBookPosition(position)
    savePosition(id, position)
  }

  /**
   * Seek once the file knows its length. The target is derived from the book
   * position, so this restores a saved offset on first load and is a no-op
   * after an explicit chapter change (which sets the position to that
   * chapter's start).
   */
  function onLoadedMetadata() {
    const element = audioRef.current
    if (!element || !active) return

    const want = pendingSeek.current ?? bookPosition - active.startOffsetSec
    pendingSeek.current = null

    if (want > 0.25 && Math.abs(element.currentTime - want) > 0.25) {
      element.currentTime = want
    }
    if (playing) void element.play().catch(() => undefined)
  }

  if (manifestQuery.isPending) return <Spinner label="Loading the book…" />
  if (manifestQuery.error) {
    return (
      <PageShell title="Listen">
        <Alert>{manifestQuery.error.message}</Alert>
      </PageShell>
    )
  }
  
  if (!manifest || !active) {
    return (
      <PageShell title="Listen">
        <Alert>This book has no playable chapters.</Alert>
      </PageShell>
    )
  }

  const isFirst = activeIdx === manifest.chapters[0]!.idx
  const isLast = activeIdx === manifest.chapters[manifest.chapters.length - 1]!.idx

  return (
    <PageShell title={manifest.title}>
      <p className="text-mute !mt-3">{manifest.author}</p>

      {/* No `controls`: native controls describe one file, and this book is
          many. The transport below works in book time instead. */}
      <audio
        ref={audioRef}
        src={srcQuery.data}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => {
          if (!isLast) selectChapter(activeIdx + 1)
        }}
      >
        <track kind="captions" />
      </audio>

      <PlayerControls
        chapters={manifest.chapters}
        activeIdx={activeIdx}
        bookPosition={bookPosition}
        bookDuration={manifest.totalDurationSec}
        speed={speed}
        playing={playing}
        canGoBack={!isFirst}
        canGoForward={!isLast}
        onTogglePlay={togglePlay}
        onPrevious={() => selectChapter(activeIdx - 1)}
        onNext={() => selectChapter(activeIdx + 1)}
        onSeek={seekBook}
        onSpeedChange={setSpeed}
      />

      <ChapterList chapters={manifest.chapters} activeIdx={activeIdx} onSelect={selectChapter} />
    </PageShell>
  )
}
