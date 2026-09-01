import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import type { BookWithChapters, Chapter } from '../types/book'
import BookDetail from './BookDetail'

vi.mock('../lib/api', () => ({
  getBook: vi.fn(),
  retryChapter: vi.fn(),
  subscribeToChapters: vi.fn(() => () => {}),
  deleteBook: vi.fn(),
  updateBook: vi.fn(),
  uploadCover: vi.fn(),
  removeCover: vi.fn(),
  signCoverUrl: vi.fn(),
}))
const api = vi.mocked(await import('../lib/api'))

const chapter = (idx: number, over: Partial<Chapter> = {}): Chapter =>
  ({
    id: `c${idx}`,
    book_id: 'b1',
    idx,
    title: `Chapter ${idx + 1}`,
    status: 'ready',
    duration_sec: 120,
    error: null,
    ...over,
  }) as Chapter

const book = (chapters: Chapter[], status = 'processing'): BookWithChapters =>
  ({ id: 'b1', title: 'Moby Dick', author: 'H. M.', status, chapters }) as BookWithChapters

async function render() {
  return renderWithProviders(<BookDetail />, { route: '/books/b1', path: '/books/$id' })
}

beforeEach(() => {
  vi.clearAllMocks()
  api.subscribeToChapters.mockReturnValue(() => {})
})

describe('BookDetail', () => {
  test('shows a progress summary of ready over total chapters', async () => {
    api.getBook.mockResolvedValue(
      book([chapter(0), chapter(1), chapter(2, { status: 'pending', duration_sec: null })]),
    )
    await render()
    expect(await screen.findByText(/2 of 3 chapters ready/i)).toBeInTheDocument()
  })

  test('renders a status badge per chapter', async () => {
    api.getBook.mockResolvedValue(
      book([chapter(0), chapter(1, { status: 'pending', duration_sec: null })]),
    )
    await render()
    expect(await screen.findByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  test('shows the error text on a failed chapter', async () => {
    api.getBook.mockResolvedValue(
      book([chapter(0, { status: 'failed', error: 'Deepgram 500' })]),
    )
    await render()
    expect(await screen.findByText(/deepgram 500/i)).toBeInTheDocument()
  })

  test('a failed chapter has a Retry button', async () => {
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'boom' })]))
    await render()
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('a ready chapter has no Retry button', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await screen.findByText('Ready')
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  test('clicking Retry calls retryChapter with that chapter id', async () => {
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'boom' })]))
    api.retryChapter.mockResolvedValue(undefined)
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /retry/i }))
    await waitFor(() => expect(api.retryChapter).toHaveBeenCalledWith('c0'))
  })

  test('refetches after a successful retry so the badge updates', async () => {
    api.getBook
      .mockResolvedValueOnce(book([chapter(0, { status: 'failed', error: 'boom' })]))
      .mockResolvedValue(book([chapter(0, { status: 'pending', duration_sec: null })]))
    api.retryChapter.mockResolvedValue(undefined)
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /retry/i }))
    expect(await screen.findByText('Pending')).toBeInTheDocument()
  })

  test('subscribes to realtime chapter updates for this book', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await waitFor(() => expect(api.subscribeToChapters).toHaveBeenCalledWith('b1', expect.any(Function)))
  })

  test('a realtime notification refetches the book', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await screen.findByText('Ready')

    const notify = api.subscribeToChapters.mock.calls[0]![1]
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'later boom' })]))
    notify()

    expect(await screen.findByText(/later boom/i)).toBeInTheDocument()
  })

  test('unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    api.subscribeToChapters.mockReturnValue(unsubscribe)
    api.getBook.mockResolvedValue(book([chapter(0)]))

    const { unmount } = await render()
    await screen.findByText('Ready')
    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

  test('shows a Listen link once the book is ready', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)], 'ready'))
    await render()
    expect(await screen.findByRole('link', { name: /listen/i })).toHaveAttribute(
      'href',
      '/books/b1/listen',
    )
  })

  test('shows a failed banner when the book itself is failed', async () => {
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'x' })], 'failed'))
    await render()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('Deleting a book', () => {
  test('asks before deleting, because the audio cost money to make', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /delete this book/i }))

    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeInTheDocument()
    expect(api.deleteBook).not.toHaveBeenCalled()
  })

  test('confirming deletes the book', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    api.deleteBook.mockResolvedValue(undefined)
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /delete this book/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete permanently/i }))

    await waitFor(() => expect(api.deleteBook).toHaveBeenCalledWith('b1'))
  })

  test('backing out leaves the book alone', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /delete this book/i }))
    await userEvent.click(screen.getByRole('button', { name: /keep it/i }))

    expect(screen.getByRole('button', { name: /delete this book/i })).toBeInTheDocument()
    expect(api.deleteBook).not.toHaveBeenCalled()
  })

  test('a failure is shown rather than swallowed', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    api.deleteBook.mockRejectedValue(new Error('storage unreachable'))
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /delete this book/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete permanently/i }))

    expect(await screen.findByText(/storage unreachable/i)).toBeInTheDocument()
  })
})

describe('Editing a book', () => {
  const openEditor = async () =>
    userEvent.click(await screen.findByRole('button', { name: /edit title, author and cover/i }))

  test('is a mode, so the page reads as a page until asked', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()

    expect(await screen.findByRole('heading', { name: 'Moby Dick' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  })

  test('opens seeded with what the book already says', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await openEditor()

    expect(screen.getByLabelText('Title')).toHaveValue('Moby Dick')
    expect(screen.getByLabelText('Author')).toHaveValue('H. M.')
  })

  test('saves the corrected title and author', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    api.updateBook.mockResolvedValue(undefined)
    await render()
    await openEditor()

    await userEvent.clear(screen.getByLabelText('Title'))
    await userEvent.type(screen.getByLabelText('Title'), 'Moby-Dick')
    await userEvent.clear(screen.getByLabelText('Author'))
    await userEvent.type(screen.getByLabelText('Author'), 'Herman Melville')
    await userEvent.click(screen.getByRole('button', { name: /save details/i }))

    await waitFor(() =>
      expect(api.updateBook).toHaveBeenCalledWith('b1', {
        title: 'Moby-Dick',
        author: 'Herman Melville',
      }),
    )
  })

  test('cancelling saves nothing and restores what was there', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await openEditor()

    await userEvent.clear(screen.getByLabelText('Title'))
    await userEvent.type(screen.getByLabelText('Title'), 'Something else')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(api.updateBook).not.toHaveBeenCalled()
    await openEditor()
    expect(screen.getByLabelText('Title')).toHaveValue('Moby Dick')
  })

  // A title is what the shelf is read by; an empty one would leave a nameless card.
  test('refuses to save an empty title', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await openEditor()

    await userEvent.clear(screen.getByLabelText('Title'))
    expect(screen.getByRole('button', { name: /save details/i })).toBeDisabled()
  })

  test('uploads a chosen cover against this book', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    api.uploadCover.mockResolvedValue(undefined)
    await render()
    await openEditor()

    const cover = new File([new Uint8Array(10)], 'cover.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText(/cover/i), cover, { applyAccept: false })

    await waitFor(() => expect(api.uploadCover).toHaveBeenCalledWith('b1', cover))
  })
})
