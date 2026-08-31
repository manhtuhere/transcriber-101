import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import type { Manifest } from '../types/manifest'
import { positionKey } from '../utils/playback'
import Listen from './Listen'

vi.mock('../lib/api', () => ({ getManifest: vi.fn(), signAudioUrl: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

const manifest: Manifest = {
  bookId: 'b1',
  title: 'Moby Dick',
  author: 'Herman Melville',
  totalDurationSec: 270,
  chapters: [
    { idx: 0, title: 'Loomings', path: 'b1/0-loomings.mp3', startOffsetSec: 0, durationSec: 120 },
    { idx: 1, title: 'The Carpet-Bag', path: 'b1/1-bag.mp3', startOffsetSec: 120, durationSec: 90 },
    { idx: 2, title: 'The Spouter-Inn', path: 'b1/2-inn.mp3', startOffsetSec: 210, durationSec: 60 },
  ],
}

const audio = () => document.querySelector('audio')!

async function render() {
  return renderWithProviders(<Listen />, { route: '/books/b1/listen', path: '/books/$id/listen' })
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getManifest.mockResolvedValue(manifest)
  api.signAudioUrl.mockImplementation(async (path: string) => `https://cdn.test/${path}`)
})

describe('Listen', () => {
  test('renders the chapter list from the manifest', async () => {
    await render()
    expect(await screen.findByText('Loomings')).toBeInTheDocument()
    expect(screen.getByText('The Carpet-Bag')).toBeInTheDocument()
    expect(screen.getByText('The Spouter-Inn')).toBeInTheDocument()
  })

  test('shows each chapter duration', async () => {
    await render()
    expect(await screen.findByText('2:00')).toBeInTheDocument()
    expect(screen.getByText('1:30')).toBeInTheDocument()
  })

  test('marks the current chapter as active', async () => {
    await render()
    const first = await screen.findByRole('button', { name: /Loomings/ })
    expect(first).toHaveAttribute('aria-current', 'true')
  })

  test('clicking a chapter switches the audio source to that chapter file', async () => {
    await render()
    await userEvent.click(await screen.findByRole('button', { name: /The Carpet-Bag/ }))

    await waitFor(() => expect(audio().getAttribute('src')).toContain('1-bag.mp3'))
  })

  test('Next advances to the following chapter', async () => {
    await render()
    await userEvent.click(await screen.findByRole('button', { name: /^next$/i }))

    await waitFor(() => expect(audio().getAttribute('src')).toContain('1-bag.mp3'))
  })

  test('Previous is disabled on the first chapter', async () => {
    await render()
    expect(await screen.findByRole('button', { name: /^previous$/i })).toBeDisabled()
  })

  test('Next is disabled on the final chapter', async () => {
    await render()
    await userEvent.click(await screen.findByRole('button', { name: /The Spouter-Inn/ }))
    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled()
  })

  test('the position readout shows whole-book position, not chapter position', async () => {
    await render()
    await userEvent.click(await screen.findByRole('button', { name: /The Carpet-Bag/ }))

    // Chapter 1 starts at 120 s; at t=30 the book position is 2:30.
    audio().currentTime = 30
    audio().dispatchEvent(new Event('timeupdate'))

    expect(await screen.findByTestId('book-position')).toHaveTextContent('2:30')
  })

  test('shows the total book duration', async () => {
    await render()
    expect(await screen.findByTestId('book-duration')).toHaveTextContent('4:30')
  })

  test('changing playback speed sets audio.playbackRate', async () => {
    await render()
    await screen.findByText('Loomings')

    await userEvent.selectOptions(screen.getByLabelText(/speed/i), '1.5')
    await waitFor(() => expect(audio().playbackRate).toBe(1.5))
  })

  test('writes the book position to localStorage as playback advances', async () => {
    await render()
    await screen.findByText('Loomings')

    audio().currentTime = 42
    audio().dispatchEvent(new Event('timeupdate'))

    await waitFor(() => expect(localStorage.getItem(positionKey('b1'))).toBe('42'))
  })

  test('restores a saved position, selecting the right chapter and offset', async () => {
    localStorage.setItem(positionKey('b1'), '150')
    await render()

    await waitFor(() => expect(audio().getAttribute('src')).toContain('1-bag.mp3'))
    expect(await screen.findByTestId('book-position')).toHaveTextContent('2:30')
  })

  test('ignores a corrupt localStorage value and starts at the beginning', async () => {
    localStorage.setItem(positionKey('b1'), 'not-a-number')
    await render()

    await waitFor(() => expect(audio().getAttribute('src')).toContain('0-loomings.mp3'))
    expect(await screen.findByTestId('book-position')).toHaveTextContent('0:00')
  })

  test('shows an error when the manifest cannot be loaded', async () => {
    api.getManifest.mockRejectedValue(new Error('manifest missing'))
    await render()

    expect(await screen.findByRole('alert')).toHaveTextContent(/manifest missing/i)
  })
})
